
import React, { useState, useEffect } from 'react';
import { Search, Package, Truck, CheckCircle, Clock, MapPin, ShoppingBag, ArrowRight, XCircle, Store, Info } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Order } from '../types';

interface OrderTrackingProps {
  initialOrderId?: string;
}

const OrderTracking: React.FC<OrderTrackingProps> = ({ initialOrderId }) => {
  const [orderId, setOrderId] = useState(initialOrderId || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (idToTrack?: string) => {
    const id = idToTrack || orderId;
    if (!id.trim()) return;

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id.trim())
        .single();

      if (error || !data) {
        throw new Error("Numéro de commande introuvable. Vérifiez l'ID sur votre facture.");
      }

      const foundOrder: Order = {
        id: data.id,
        items: data.items,
        total: data.total,
        status: data.status,
        paymentMethod: data.payment_method,
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        customerCity: data.customer_city,
        deliveryMode: data.delivery_mode,
        date: data.date
      };

      setOrder(foundOrder);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-track if initialOrderId is provided
  useEffect(() => {
    if (initialOrderId) {
      setOrderId(initialOrderId);
      handleTrack(initialOrderId);
    }
  }, [initialOrderId]);

  const getStepStatus = (stepIndex: number, currentStatus: Order['status']) => {
    if (currentStatus === 'cancelled') return 'inactive';
    let activeIndex = 0;
    if (currentStatus === 'confirmed') activeIndex = 0;
    if (currentStatus === 'shipped' || currentStatus === 'ready') activeIndex = 1; 
    if (currentStatus === 'delivered') activeIndex = 2;
    if (stepIndex < activeIndex) return 'completed';
    if (stepIndex === activeIndex) return 'active';
    return 'inactive';
  };

  return (
    <div className="pt-24 pb-20 px-4 min-h-screen max-w-4xl mx-auto">
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-5">
            <h1 className="text-4xl md:text-5xl font-bold text-white font-tech uppercase drop-shadow-lg mb-4">
                Suivi de <span className="text-xeption-gold">Commande</span>
            </h1>
            <p className="text-gray-300 max-w-xl mx-auto">
                Entrez votre numéro de facture pour observer l'évolution de votre colis.
            </p>
        </div>

        {/* Message d'explication CRM */}
        {!order && !loading && (
            <div className="bg-xeption-gold/10 border border-xeption-gold/30 p-6 rounded-xl mb-8 flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
                <Info className="w-6 h-6 text-xeption-gold shrink-0 mt-1" />
                <div>
                    <h4 className="text-xeption-gold font-bold uppercase font-tech text-sm tracking-widest mb-2">Instructions de Suivi</h4>
                    <p className="text-gray-300 text-xs leading-relaxed">
                        Pour observer l'évolution de votre colis (Préparation, Expédition, Livraison), veuillez coller ci-dessous le <strong>Numéro de Facture</strong> (Ex: ORD-XXXXXX) reçu par email ou affiché à la fin de votre commande.
                    </p>
                </div>
            </div>
        )}

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-xl shadow-2xl mb-12 max-w-2xl mx-auto relative overflow-hidden">
            <form onSubmit={(e) => { e.preventDefault(); handleTrack(); }} className="relative z-10 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input 
                        type="text" 
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        placeholder="Numéro ORD-XXXXXX" 
                        className="w-full bg-black/50 border border-white/20 text-white pl-12 pr-4 py-4 rounded-lg focus:border-xeption-gold outline-none font-mono tracking-wider transition-all placeholder-gray-600"
                    />
                </div>
                <button 
                    type="submit"
                    disabled={loading || !orderId}
                    className="bg-xeption-gold text-black font-bold font-tech uppercase px-8 py-4 rounded-lg hover:bg-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Recherche...' : 'Rechercher'}
                </button>
            </form>
            {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm text-center font-bold uppercase text-[10px] tracking-widest">{error}</div>}
        </div>

        {order && (
            <div className="animate-in slide-in-from-bottom-10 fade-in duration-500">
                {order.status === 'cancelled' ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-center gap-4 text-red-500">
                        <XCircle className="w-8 h-8" />
                        <div><h3 className="font-bold text-lg font-tech uppercase">Commande Annulée</h3></div>
                    </div>
                ) : (
                <div className="bg-[#18181b] border border-white/10 rounded-xl p-8 shadow-2xl">
                    <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
                        <div>
                            <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Tracking Facture</span>
                            <h2 className="text-2xl font-mono font-bold text-xeption-gold mt-1">#{order.id}</h2>
                        </div>
                        <div className="text-right">
                             <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block">Client</span>
                             <span className="text-white text-sm font-bold uppercase">{order.customerName}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 mb-4 ${getStepStatus(0, order.status) !== 'inactive' ? 'bg-xeption-gold border-xeption-gold text-black shadow-[0_0_20px_rgba(255,215,0,0.4)]' : 'bg-black border-gray-700 text-gray-500'}`}><CheckCircle className="w-6 h-6" /></div>
                            <h3 className="font-bold uppercase font-tech text-sm text-white">Validée</h3>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 mb-4 ${getStepStatus(1, order.status) === 'completed' ? 'bg-xeption-gold border-xeption-gold text-black shadow-[0_0_20px_rgba(255,215,0,0.4)]' : getStepStatus(1, order.status) === 'active' ? 'bg-black border-xeption-gold text-xeption-gold animate-pulse shadow-[0_0_20px_rgba(255,215,0,0.2)]' : 'bg-black border-gray-700 text-gray-500'}`}>{order.deliveryMode === 'pickup' ? <Store className="w-6 h-6" /> : <Truck className="w-6 h-6" />}</div>
                            <h3 className="font-bold uppercase font-tech text-sm text-white">{order.deliveryMode === 'pickup' ? 'Prête' : 'En Route'}</h3>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 mb-4 ${order.status === 'delivered' ? 'bg-green-500 border-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'bg-black border-gray-700 text-gray-500'}`}><CheckCircle className="w-6 h-6" /></div>
                            <h3 className="font-bold uppercase font-tech text-sm text-white">Livrée</h3>
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
