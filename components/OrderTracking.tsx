import React, { useState, useEffect } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, MapPin, ShoppingBag, ArrowRight, XCircle, Store, ShieldAlert, Activity } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Order, TradeInRequest } from '../types';

const OrderTracking: React.FC = () => {
  const [trackingId, setTrackingId] = useState('');
  const [trackingType, setTrackingType] = useState<'order' | 'troc' | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [troc, setTroc] = useState<TradeInRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check URL params on mount for auto-tracking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get('id');
    
    if (idFromUrl) {
      setTrackingId(idFromUrl);
      fetchTrackingInfo(idFromUrl);
    }
  }, []);

  const fetchTrackingInfo = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    setTroc(null);
    setTrackingType(null);

    try {
      // 1. Essayer de trouver une commande
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id.trim())
        .maybeSingle();

      if (orderData) {
        setTrackingType('order');
        setOrder({
          id: orderData.id,
          items: orderData.items,
          total: orderData.total,
          status: orderData.status,
          paymentMethod: orderData.payment_method,
          customerName: orderData.customer_name,
          customerPhone: orderData.customer_phone,
          customerCity: orderData.customer_city,
          deliveryMode: orderData.delivery_mode,
          date: orderData.date
        });
        return;
      }

      // 2. Si pas de commande, essayer de trouver un Troc
      const { data: trocData, error: trocError } = await supabase
        .from('trade_in_requests')
        .select('*')
        .eq('id', id.trim())
        .maybeSingle();

      if (trocData) {
        setTrackingType('troc');
        setTroc(trocData as TradeInRequest);
        return;
      }

      // Si aucun des deux n'est trouvé
      throw new Error("Numéro introuvable. Vérifiez votre ID de commande ou de Troc.");

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchTrackingInfo(trackingId);
  };

  const getOrderStepStatus = (stepIndex: number, currentStatus: Order['status']) => {
    if (currentStatus === 'cancelled') return 'inactive';

    let activeIndex = 0;
    if (currentStatus === 'confirmed') activeIndex = 0; 
    if (currentStatus === 'shipped' || currentStatus === 'ready') activeIndex = 1; 
    if (currentStatus === 'delivered') activeIndex = 2;

    if (stepIndex < activeIndex) return 'completed';
    if (stepIndex === activeIndex) return 'active';
    return 'inactive';
  };

  const getTrocStepStatus = (stepIndex: number, currentStatus: TradeInRequest['status']) => {
    if (currentStatus === 'cancelled' || currentStatus === 'refused') return 'inactive';

    let activeIndex = 0;
    if (currentStatus === 'pending') activeIndex = 0; 
    if (currentStatus === 'validated') activeIndex = 1; 
    if (currentStatus === 'accepted' || currentStatus === 'completed') activeIndex = 2;

    if (stepIndex < activeIndex) return 'completed';
    if (stepIndex === activeIndex) return 'active';
    return 'inactive';
  };

  return (
    <div className="pt-24 pb-20 px-4 min-h-screen max-w-4xl mx-auto">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-5">
            <h1 className="text-4xl md:text-5xl font-bold text-white font-tech uppercase drop-shadow-lg mb-4">
                Suivi de <span className="text-xeption-gold">Dossier</span>
            </h1>
            <p className="text-gray-300 max-w-xl mx-auto">
                Saisissez votre numéro de commande ou de dossier Troc pour voir où en est votre demande en temps réel.
            </p>
        </div>

        {/* Search Box */}
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-xl shadow-2xl mb-12 max-w-2xl mx-auto relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-xeption-gold/10 rounded-full blur-[60px]"></div>
            
            <form onSubmit={handleTrack} className="relative z-10 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input 
                        type="text" 
                        value={trackingId}
                        onChange={(e) => setTrackingId(e.target.value)}
                        placeholder="ID de Commande ou de Troc..." 
                        className="w-full bg-black/50 border border-white/20 text-white pl-12 pr-4 py-4 rounded-lg focus:border-xeption-gold outline-none font-mono tracking-wider transition-all placeholder-gray-600"
                    />
                </div>
                <button 
                    type="submit"
                    disabled={loading || !trackingId}
                    className="bg-xeption-gold text-black font-bold font-tech uppercase px-8 py-4 rounded-lg hover:bg-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Recherche...' : 'Tracer'}
                </button>
            </form>
            
            {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm text-center">
                    {error}
                </div>
            )}
        </div>

        {/* --- RESULT AREA: COMMANDES --- */}
        {trackingType === 'order' && order && (
            <div className="animate-in slide-in-from-bottom-10 fade-in duration-500">
                {order.status === 'cancelled' && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8 flex items-center gap-4 text-red-500">
                        <XCircle className="w-8 h-8" />
                        <div>
                            <h3 className="font-bold text-lg font-tech uppercase">Commande Annulée</h3>
                            <p className="text-sm text-red-400/80">Cette commande a été annulée et remboursée/restockée.</p>
                        </div>
                    </div>
                )}

                {order.status !== 'cancelled' && (
                <div className="bg-[#18181b] border border-white/10 rounded-xl p-8 mb-8 shadow-2xl relative overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-white/10 pb-6">
                        <div>
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Commande</span>
                            <h2 className="text-2xl font-mono font-bold text-white mt-1">#{order.id.slice(0, 8)}...</h2>
                        </div>
                        <div className="mt-4 md:mt-0 text-right">
                             <span className="text-gray-500 text-xs font-bold uppercase tracking-widest block">Date</span>
                             <span className="text-white text-sm">{new Date(order.date).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="relative px-4 mb-8">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-800 -translate-y-1/2 hidden md:block"></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                            {/* Step 1 */}
                            <div className={`flex flex-col items-center text-center group transition-all duration-500`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 mb-4 z-20 transition-all ${
                                    getOrderStepStatus(0, order.status) !== 'inactive' 
                                    ? 'bg-xeption-gold border-xeption-gold text-black shadow-[0_0_20px_rgba(255,215,0,0.5)]' 
                                    : 'bg-black border-gray-700 text-gray-500'
                                }`}>
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                                <h3 className={`font-bold uppercase font-tech text-lg ${getOrderStepStatus(0, order.status) !== 'inactive' ? 'text-white' : 'text-gray-600'}`}>Confirmée</h3>
                                <p className="text-xs text-gray-500 mt-2">Commande validée.</p>
                            </div>

                            {/* Step 2 */}
                            <div className="flex flex-col items-center text-center">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 mb-4 z-20 transition-all ${
                                     getOrderStepStatus(1, order.status) === 'completed' ? 'bg-xeption-gold border-xeption-gold text-black' :
                                     getOrderStepStatus(1, order.status) === 'active' ? 'bg-black border-xeption-gold text-xeption-gold animate-pulse' :
                                     'bg-black border-gray-700 text-gray-500'
                                }`}>
                                    {order.deliveryMode === 'pickup' ? <Store className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                                </div>
                                <h3 className={`font-bold uppercase font-tech text-lg ${getOrderStepStatus(1, order.status) !== 'inactive' ? 'text-white' : 'text-gray-600'}`}>
                                    {order.deliveryMode === 'pickup' ? 'Dispo Boutique' : 'En Route'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-2">
                                    {order.deliveryMode === 'pickup' ? 'Colis prêt au comptoir.' : 'Remis au livreur.'}
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="flex flex-col items-center text-center">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 mb-4 z-20 transition-all ${
                                     order.status === 'delivered'
                                     ? 'bg-green-500 border-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.5)]' 
                                     : 'bg-black border-gray-700 text-gray-500'
                                }`}>
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                                <h3 className={`font-bold uppercase font-tech text-lg ${order.status === 'delivered' ? 'text-green-500' : 'text-gray-600'}`}>
                                    {order.deliveryMode === 'pickup' ? 'Récupérée' : 'Livrée'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-2">Merci pour votre confiance.</p>
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </div>
        )}

        {/* --- RESULT AREA: TROC --- */}
        {trackingType === 'troc' && troc && (
            <div className="animate-in slide-in-from-bottom-10 fade-in duration-500">
                {troc.status === 'cancelled' || troc.status === 'refused' ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-8 flex items-center gap-4 text-red-500">
                        <XCircle className="w-8 h-8" />
                        <div>
                            <h3 className="font-bold text-lg font-tech uppercase">Dossier Annulé / Refusé</h3>
                            <p className="text-sm text-red-400/80">L'appareil n'a pas passé l'inspection finale ou la demande a été annulée.</p>
                        </div>
                    </div>
                ) : (
                <div className="bg-[#18181b] border border-xeption-gold/20 rounded-xl p-8 mb-8 shadow-2xl relative overflow-hidden">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-white/10 pb-6">
                        <div>
                            <span className="text-xeption-gold text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Dossier Smart Troc
                            </span>
                            <h2 className="text-2xl font-mono font-bold text-white mt-1">
                                {troc.device_brand} {troc.device_model}
                            </h2>
                            <p className="text-sm text-gray-400 font-sans mt-1">ID: #{troc.id.slice(0, 8)}...</p>
                        </div>
                        <div className="mt-4 md:mt-0 text-right">
                             <span className="text-gray-500 text-xs font-bold uppercase tracking-widest block">Date</span>
                             <span className="text-white text-sm">{new Date(troc.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="relative px-4 mb-8">
                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-800 -translate-y-1/2 hidden md:block"></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                            {/* Step 1: Soumis */}
                            <div className={`flex flex-col items-center text-center group transition-all duration-500`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 mb-4 z-20 transition-all ${
                                    getTrocStepStatus(0, troc.status) !== 'inactive' 
                                    ? 'bg-xeption-gold border-xeption-gold text-black shadow-[0_0_20px_rgba(255,215,0,0.5)]' 
                                    : 'bg-black border-gray-700 text-gray-500'
                                }`}>
                                    <Clock className="w-6 h-6" />
                                </div>
                                <h3 className={`font-bold uppercase font-tech text-lg ${getTrocStepStatus(0, troc.status) !== 'inactive' ? 'text-white' : 'text-gray-600'}`}>Estimation Validée</h3>
                                <p className="text-xs text-gray-500 mt-2">Dépôt physique de l'appareil en attente.</p>
                            </div>

                            {/* Step 2: Inspection */}
                            <div className="flex flex-col items-center text-center">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 mb-4 z-20 transition-all ${
                                     getTrocStepStatus(1, troc.status) === 'completed' ? 'bg-xeption-gold border-xeption-gold text-black' :
                                     getTrocStepStatus(1, troc.status) === 'active' ? 'bg-black border-xeption-gold text-xeption-gold animate-pulse' :
                                     'bg-black border-gray-700 text-gray-500'
                                }`}>
                                    <ShieldAlert className="w-6 h-6" />
                                </div>
                                <h3 className={`font-bold uppercase font-tech text-lg ${getTrocStepStatus(1, troc.status) !== 'inactive' ? 'text-white' : 'text-gray-600'}`}>
                                    Inspection en cours
                                </h3>
                                <p className="text-xs text-gray-500 mt-2">
                                    Vérification physique par nos experts.
                                </p>
                            </div>

                            {/* Step 3: Accepté */}
                            <div className="flex flex-col items-center text-center">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 mb-4 z-20 transition-all ${
                                     getTrocStepStatus(2, troc.status) === 'completed' || getTrocStepStatus(2, troc.status) === 'active'
                                     ? 'bg-green-500 border-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.5)]' 
                                     : 'bg-black border-gray-700 text-gray-500'
                                }`}>
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                                <h3 className={`font-bold uppercase font-tech text-lg ${getTrocStepStatus(2, troc.status) !== 'inactive' ? 'text-green-500' : 'text-gray-600'}`}>
                                    Bon d'achat Émis
                                </h3>
                                <p className="text-xs text-gray-500 mt-2">Votre remise est disponible.</p>
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </div>
        )}
    </div>
  );
};

export default OrderTracking;
