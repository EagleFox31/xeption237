import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Truck, CheckCircle, XCircle, Store, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Order } from '../types';
import { ChameleoMascot } from './troc/ChameleoMascot';
import CameroonDeliveryMap from './tracking/CameroonDeliveryMap';
import { matchDeliveryCity } from './tracking/cameroonMapData';

const bentoShell =
  'relative overflow-hidden rounded-2xl border border-white/15 bg-[#0a0a0c]/70 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.45)]';

const bentoLaser =
  'pointer-events-none absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent';

const OrderTracking: React.FC = () => {
  const [trackingId, setTrackingId] = useState('');
  const [trackingType, setTrackingType] = useState<'order' | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setTrackingType(null);

    const trimmed = id.trim();
    if (/^TROC-/i.test(trimmed)) {
      setError('Cette référence est un bon Smart Troc — utilise la page dédiée.');
      setLoading(false);
      return;
    }

    try {
      const { data: orderData } = await supabase
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
          date: orderData.date,
        });
        return;
      }

      throw new Error('Numéro introuvable. Vérifiez votre ID de commande.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Recherche impossible.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchTrackingInfo(trackingId);
  };

  const getOrderStepStatus = (stepIndex: number, currentStatus: Order['status']) => {
    if (currentStatus === 'cancelled' || currentStatus === 'returned') return 'inactive';
    if (currentStatus === 'refused') return stepIndex <= 1 ? 'completed' : 'inactive';

    let activeIndex = 0;
    if (currentStatus === 'confirmed') activeIndex = 0;
    if (currentStatus === 'shipped' || currentStatus === 'ready') activeIndex = 1;
    if (currentStatus === 'delivered') activeIndex = 2;

    if (stepIndex < activeIndex) return 'completed';
    if (stepIndex === activeIndex) return 'active';
    return 'inactive';
  };

  const deliveryMsg = loading
    ? 'Recherche de ton colis dans le réseau...'
    : error
      ? 'Numéro introuvable, vérifie ton ID de commande.'
      : order
        ? order.status === 'delivered'
          ? 'Colis livré avec succès ! Merci de ta confiance.'
          : order.status === 'refused'
            ? 'Livraison refusée — le colis revient en boutique.'
            : order.status === 'returned'
              ? 'Retour reçu en boutique — stock remis en rayon.'
              : order.status === 'shipped' || order.status === 'ready'
                ? 'Colis en route avec notre coursier express !'
                : order.status === 'confirmed'
                  ? 'Commande confirmée ! Préparation du colis en cours.'
                  : 'Suivi de commande actif !'
        : 'Entre ton identifiant de commande pour localiser ton colis.';

  return (
    <div className="w-full min-h-[calc(100dvh-132px)] px-4 sm:px-6 lg:px-8 xl:px-10 pt-3 sm:pt-4 pb-20">
      <div className="w-full max-w-[1440px] mx-auto">
        <Link
          to="/tracking"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-xeption-gold text-black text-xs font-tech font-bold uppercase tracking-widest hover:bg-white transition-colors shadow-[0_0_16px_rgba(255,215,0,0.25)] mb-4 sm:mb-5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour au Suivi Xeption
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 mb-8 sm:mb-10">
          {/* Saisie commande + mascotte */}
          <div className={`${bentoShell} order-1 lg:col-span-7 p-5 sm:p-6 lg:p-7`}>
            <div className={bentoLaser} />
            <div className="absolute top-0 right-0 w-40 h-40 bg-xeption-gold/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-5 sm:mb-6">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-tech uppercase tracking-[0.2em] text-xeption-gold mb-2">
                    Suivi colis · Xeption
                  </p>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white font-tech uppercase leading-tight mb-2">
                    Dossier &amp; <span className="text-xeption-gold">Colis</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-white/65 max-w-lg">
                    Saisissez votre numéro de commande pour voir où en est votre colis.
                  </p>
                </div>

                <div className="shrink-0 self-end sm:self-auto sm:pt-1">
                  <ChameleoMascot
                    size="sm"
                    layout="horizontal"
                    pose="delivery"
                    state={loading ? 'scanning' : order?.status === 'delivered' ? 'happy' : 'idle'}
                    message={deliveryMsg}
                  />
                </div>
              </div>

              <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="ID de commande..."
                    className="w-full bg-black/50 border border-white/20 text-white pl-12 pr-4 py-3.5 sm:py-4 rounded-xl focus:border-xeption-gold outline-none font-mono tracking-wider transition-all placeholder-gray-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !trackingId}
                  className="bg-xeption-gold text-black font-bold font-tech uppercase px-8 py-3.5 sm:py-4 rounded-xl hover:bg-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {loading ? 'Recherche...' : 'Tracer'}
                </button>
              </form>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm space-y-2">
                  <p>{error}</p>
                  {/^TROC-/i.test(trackingId.trim()) && (
                    <Link
                      to={`/bon?ref=${encodeURIComponent(trackingId.trim())}`}
                      className="inline-flex items-center gap-1 text-xeption-gold hover:underline font-tech uppercase text-xs"
                    >
                      Ouvrir mon bon Smart Troc
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Carte Cameroun — colonne droite */}
          <div
            className={`${bentoShell} order-2 lg:col-span-5 lg:col-start-8 flex flex-col items-center justify-center p-2 sm:p-3`}
          >
            <div className={bentoLaser} />
            <CameroonDeliveryMap
              compact
              activeCityId={order ? matchDeliveryCity(order.customerCity) : null}
              className="w-full border-0 bg-transparent rounded-none shadow-none"
            />
          </div>
        </div>

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
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-800 -translate-y-1/2 hidden md:block" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                  <div className="flex flex-col items-center text-center group transition-all duration-500">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-4 mb-4 z-20 transition-all ${
                        getOrderStepStatus(0, order.status) !== 'inactive'
                          ? 'bg-xeption-gold border-xeption-gold text-black shadow-[0_0_20px_rgba(255,215,0,0.5)]'
                          : 'bg-black border-gray-700 text-gray-500'
                      }`}
                    >
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <h3
                      className={`font-bold uppercase font-tech text-lg ${
                        getOrderStepStatus(0, order.status) !== 'inactive' ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      Confirmée
                    </h3>
                    <p className="text-xs text-gray-500 mt-2">Commande validée.</p>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-4 mb-4 z-20 transition-all ${
                        getOrderStepStatus(1, order.status) === 'completed'
                          ? 'bg-xeption-gold border-xeption-gold text-black'
                          : getOrderStepStatus(1, order.status) === 'active'
                            ? 'bg-black border-xeption-gold text-xeption-gold animate-pulse'
                            : 'bg-black border-gray-700 text-gray-500'
                      }`}
                    >
                      {order.deliveryMode === 'pickup' ? <Store className="w-6 h-6" /> : <Truck className="w-6 h-6" />}
                    </div>
                    <h3
                      className={`font-bold uppercase font-tech text-lg ${
                        getOrderStepStatus(1, order.status) !== 'inactive' ? 'text-white' : 'text-gray-600'
                      }`}
                    >
                      {order.deliveryMode === 'pickup' ? 'Dispo Boutique' : 'En Route'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-2">
                      {order.deliveryMode === 'pickup' ? 'Colis prêt au comptoir.' : 'Remis au livreur.'}
                    </p>
                  </div>

                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-4 mb-4 z-20 transition-all ${
                        order.status === 'delivered'
                          ? 'bg-green-500 border-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.5)]'
                          : 'bg-black border-gray-700 text-gray-500'
                      }`}
                    >
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <h3
                      className={`font-bold uppercase font-tech text-lg ${
                        order.status === 'delivered' ? 'text-green-500' : 'text-gray-600'
                      }`}
                    >
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
      </div>
    </div>
  );
};

export default OrderTracking;
