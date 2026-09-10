import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Truck, CheckCircle, XCircle, Store, ArrowLeft, Phone, MapPin, Package, Download, Printer, Loader2, ArrowDown, Clock, Sparkles, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Order } from '../types';
import { ChameleoMascot } from './troc/ChameleoMascot';
import CameroonDeliveryMap from './tracking/CameroonDeliveryMap';
import { matchDeliveryCity } from './tracking/cameroonMapData';
import { generateInvoiceHTMLAsync, downloadInvoicePDF, printInvoiceHTML } from '../utils/invoiceGenerator';

const ORDER_STATUS_CONFIG: Record<
  Order['status'],
  { label: string; className: string; dotClass: string }
> = {
  pending: {
    label: 'En cours de traitement',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-400',
  },
  confirmed: {
    label: 'Confirmée',
    className: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    dotClass: 'bg-blue-400',
  },
  ready: {
    label: 'Prête en boutique',
    className: 'bg-xeption-gold/15 text-xeption-gold border-xeption-gold/30 animate-pulse',
    dotClass: 'bg-xeption-gold',
  },
  shipped: {
    label: 'En livraison',
    className: 'bg-xeption-gold/15 text-xeption-gold border-xeption-gold/30 animate-pulse',
    dotClass: 'bg-xeption-gold',
  },
  delivered: {
    label: 'Livrée',
    className: 'bg-green-500/15 text-green-400 border-green-500/30',
    dotClass: 'bg-green-400',
  },
  cancelled: {
    label: 'Annulée',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
    dotClass: 'bg-red-400',
  },
  refused: {
    label: 'Refusée',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
    dotClass: 'bg-red-400',
  },
  returned: {
    label: 'Retournée',
    className: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    dotClass: 'bg-orange-400',
  },
};

const bentoShell =
  'relative overflow-hidden rounded-2xl border border-white/15 bg-[#0a0a0c]/70 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.45)]';

const bentoLaser =
  'pointer-events-none absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent';

const OrderTracking: React.FC = () => {
  const [trackingId, setTrackingId] = useState('');
  const [trackingPhone, setTrackingPhone] = useState('');
  const [trackingType, setTrackingType] = useState<'order' | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Défilement automatique fluide vers les résultats dès que la commande est chargée (notamment sur mobile)
  useEffect(() => {
    if (order && resultsRef.current) {
      const timer = setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [order]);

  const handleDownloadInvoice = async () => {
    if (!order) return;
    setIsPdfDownloading(true);
    try {
      const html = await generateInvoiceHTMLAsync(order);
      const safeName = (order.customerName || 'client').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      await downloadInvoicePDF(html, `Facture_Xeption_${order.id}_${safeName}.pdf`);
    } catch (e) {
      console.error('Erreur téléchargement facture:', e);
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const handlePrintInvoice = async () => {
    if (!order) return;
    const html = await generateInvoiceHTMLAsync(order);
    printInvoiceHTML(html);
  };

  const handleIdChange = (value: string) => {
    setTrackingId(value);
    try {
      if (value.trim()) sessionStorage.setItem('xeption_tracking_order_id', value.trim());
      else sessionStorage.removeItem('xeption_tracking_order_id');
    } catch {}
  };

  const handlePhoneChange = (value: string) => {
    setTrackingPhone(value);
    try {
      if (value.trim()) sessionStorage.setItem('xeption_tracking_order_phone', value.trim());
      else sessionStorage.removeItem('xeption_tracking_order_phone');
    } catch {}
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromUrl = params.get('id');
    const phoneFromUrl = params.get('phone');

    let savedId = '';
    let savedPhone = '';
    try {
      savedId = sessionStorage.getItem('xeption_tracking_order_id') || '';
      savedPhone = sessionStorage.getItem('xeption_tracking_order_phone') || '';
    } catch {}

    const effectiveId = idFromUrl || savedId;
    const effectivePhone = phoneFromUrl || savedPhone;

    if (effectiveId) {
      setTrackingId(effectiveId);
    }
    if (effectivePhone) {
      setTrackingPhone(effectivePhone);
    }

    // Si on dispose de l'identifiant et du téléphone (par exemple après rafraîchissement de page),
    // on relance automatiquement la recherche pour restaurer l'affichage du dossier
    if (effectiveId && effectivePhone) {
      void fetchTrackingInfo(effectiveId, effectivePhone);
    }
  }, []);

  const fetchTrackingInfo = async (id: string, phone: string, isSilent = false) => {
    if (!id.trim() || !phone.trim()) return;
    if (!isSilent) {
      setLoading(true);
      setError('');
      setOrder(null);
      setTrackingType(null);
    }

    const trimmed = id.trim();
    if (/^TROC-/i.test(trimmed)) {
      if (!isSilent) {
        setError('Cette référence est un bon Smart Troc — utilise la page dédiée.');
        setLoading(false);
      }
      return;
    }

    try {
      // Reference ET telephone. La table `orders` n'est plus lisible
      // publiquement : la reference vient de l'heure de commande, elle se
      // devine. Le telephone est le second element que seul le client a.
      const { data: orderData } = await supabase.rpc('track_order', {
        p_reference: id.trim(),
        p_phone: phone.trim(),
      });

      if (orderData) {
        setTrackingType('order');
        const items = orderData.items || [];
        const subtotal = items.reduce(
          (sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
          0
        );
        const calculatedDiscount = Math.max(0, subtotal - Number(orderData.total || 0));
        const finalDiscount = Number(orderData.discount_amount || 0) > 0
          ? Number(orderData.discount_amount)
          : calculatedDiscount;

        setOrder({
          id: orderData.id,
          items: orderData.items,
          total: orderData.total,
          discountAmount: finalDiscount,
          discountReason: finalDiscount > 0
            ? (orderData.troc_voucher?.ref ? `Bon Smart Troc ${orderData.troc_voucher.ref}` : 'Bon Smart Troc')
            : undefined,
          status: orderData.status,
          paymentMethod: orderData.payment_method,
          customerName: orderData.customer_name,
          // La RPC ne renvoie pas le telephone — c'est voulu, il n'a rien a
          // faire dans une reponse publique. On reprend celui que le client
          // vient de saisir : c'est le sien.
          customerPhone: phone.trim(),
          customerCity: orderData.customer_city,
          deliveryMode: orderData.delivery_mode,
          date: orderData.date,
          trocVoucher: orderData.troc_voucher || undefined,
        });

        try {
          sessionStorage.setItem('xeption_tracking_order_id', id.trim());
          sessionStorage.setItem('xeption_tracking_order_phone', phone.trim());
          const url = new URL(window.location.href);
          url.searchParams.set('id', id.trim());
          window.history.replaceState({}, '', url.toString());
        } catch {}

        return;
      }

      if (!isSilent) {
        throw new Error('Aucune commande ne correspond. Vérifie la référence et le numéro de téléphone utilisé lors de la commande.');
      }
    } catch (err: unknown) {
      if (!isSilent) {
        setError(err instanceof Error ? err.message : 'Recherche impossible.');
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  // Synchronisation en direct : dès que l'ERP valide la commande ou change son statut,
  // l'écran du client bascule automatiquement sans avoir besoin de rafraîchir manuellement
  useEffect(() => {
    if (!order || order.status === 'delivered' || order.status === 'cancelled' || order.status === 'refused') {
      return;
    }

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && trackingId.trim() && trackingPhone.trim()) {
        void fetchTrackingInfo(trackingId, trackingPhone, true);
      }
    }, 6000);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && trackingId.trim() && trackingPhone.trim()) {
        void fetchTrackingInfo(trackingId, trackingPhone, true);
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [order?.status, trackingId, trackingPhone]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    await fetchTrackingInfo(trackingId, trackingPhone);
  };

  const getOrderStepStatus = (stepIndex: number, currentStatus: Order['status']): 'completed' | 'active' | 'inactive' => {
    if (currentStatus === 'cancelled' || currentStatus === 'returned') return 'inactive';
    if (currentStatus === 'refused') return stepIndex <= 3 ? 'completed' : 'inactive';

    // Étape 0 : Enregistrée (dès que la commande est enregistrée dans le système)
    if (stepIndex === 0) return 'completed';

    // Étape 1 : Confirmée (validée par l'ERP & stock réservé)
    if (stepIndex === 1) {
      if (currentStatus === 'pending') return 'active';
      return 'completed';
    }

    // Étape 2 : En préparation (emballage / mise de côté magasin)
    if (stepIndex === 2) {
      if (currentStatus === 'pending') return 'inactive';
      if (currentStatus === 'confirmed') return 'active';
      return 'completed';
    }

    // Étape 3 : En route (coursier) OU Prête en boutique (comptoir)
    if (stepIndex === 3) {
      if (currentStatus === 'pending' || currentStatus === 'confirmed') return 'inactive';
      if (currentStatus === 'shipped' || currentStatus === 'ready') return 'active';
      if (currentStatus === 'delivered') return 'completed';
      return 'inactive';
    }

    // Étape 4 : Livrée / Récupérée
    if (stepIndex === 4) {
      if (currentStatus === 'delivered') return 'completed';
      return 'inactive';
    }

    return 'inactive';
  };

  const deliveryMsg = loading
    ? 'Recherche de ton colis dans le réseau...'
    : error
      ? 'Numéro introuvable, vérifie ton ID de commande.'
      : order
        ? order.status === 'delivered'
          ? (order.deliveryMode === 'pickup' ? 'Colis retiré en boutique avec succès ! Merci de ta confiance.' : 'Colis livré avec succès ! Merci de ta confiance.')
          : order.status === 'refused'
            ? 'Livraison refusée — le colis revient en boutique.'
            : order.status === 'returned'
              ? 'Retour reçu en boutique — stock remis en rayon.'
              : order.status === 'ready'
                ? 'Ton colis est prêt au comptoir en boutique pour retrait !'
                : order.status === 'shipped'
                  ? 'Colis en route avec notre coursier express !'
                  : order.status === 'confirmed'
                    ? (order.deliveryMode === 'pickup' ? 'Commande validée ! Mise de côté en boutique en cours.' : 'Commande confirmée ! Préparation de ton colis en cours.')
                    : order.status === 'pending'
                      ? 'Commande bien reçue ! Nous traitons votre commande avec soin.'
                      : 'Dossier trouvé ! Détails de ton colis ci-dessous 👇'
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

              <form onSubmit={handleTrack} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    value={trackingId}
                    onChange={(e) => handleIdChange(e.target.value)}
                    placeholder="Référence (ORD-...)"
                    className="w-full bg-black/50 border border-white/20 text-white pl-12 pr-4 py-3.5 sm:py-4 rounded-xl focus:border-xeption-gold outline-none font-mono tracking-wider transition-all placeholder-gray-600"
                  />
                </div>
                <div className="relative flex-1">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="tel"
                    inputMode="tel"
                    value={trackingPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="Téléphone de la commande"
                    className="w-full bg-black/50 border border-white/20 text-white pl-12 pr-4 py-3.5 sm:py-4 rounded-xl focus:border-xeption-gold outline-none font-mono tracking-wider transition-all placeholder-gray-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !trackingId || !trackingPhone}
                  className="bg-xeption-gold text-black font-bold font-tech uppercase px-8 py-3.5 sm:py-4 rounded-xl hover:bg-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {loading ? 'Recherche...' : 'Tracer'}
                </button>
              </form>

              {/* Bouton d'accès rapide mobile si la commande est chargée */}
              {trackingType === 'order' && order && (
                <div className="mt-3 flex justify-center sm:hidden animate-in fade-in duration-300">
                  <button
                    type="button"
                    onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-xeption-gold/15 border border-xeption-gold/40 text-xeption-gold text-xs font-tech font-bold uppercase tracking-wider hover:bg-xeption-gold/25 transition-all shadow-[0_0_12px_rgba(255,215,0,0.15)] animate-bounce"
                  >
                    <span>Dossier trouvé · Voir ci-dessous</span>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

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

              {/* Évolution de la commande directement sous le formulaire */}
              {trackingType === 'order' && order && (
                <div
                  ref={resultsRef}
                  className="mt-6 pt-6 border-t border-white/10 animate-in slide-in-from-bottom-4 fade-in duration-500 scroll-mt-4 sm:scroll-mt-6"
                >
                  {order.status === 'cancelled' ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-4 text-red-500">
                      <XCircle className="w-8 h-8 shrink-0" />
                      <div>
                        <h3 className="font-bold text-base font-tech uppercase">Commande Annulée</h3>
                        <p className="text-xs text-red-400/80">Cette commande a été annulée et remboursée/restockée.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* En-tête commande & date & actions facture */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-black/40 border border-white/10 p-4 rounded-xl">
                        <div>
                          <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Dossier Commande</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-mono font-bold text-white tracking-wide">#{order.id}</span>
                            {(() => {
                              const statusCfg = ORDER_STATUS_CONFIG[order.status] ?? {
                                label: 'En cours de traitement',
                                className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                                dotClass: 'bg-amber-400',
                              };
                              return (
                                <span
                                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-tech uppercase font-bold tracking-wider border inline-flex items-center gap-1.5 ${statusCfg.className}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusCfg.dotClass} ${order.status === 'pending' || order.status === 'shipped' || order.status === 'ready' ? 'animate-pulse' : ''}`} />
                                  {statusCfg.label}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                          <div className="sm:text-right">
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Date d'enregistrement</span>
                            <span className="text-white text-xs font-mono bg-white/5 px-2.5 py-1 rounded border border-white/10">
                              {new Date(order.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <button
                              type="button"
                              onClick={handleDownloadInvoice}
                              disabled={isPdfDownloading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-xeption-gold text-black hover:bg-white text-[11px] font-tech font-bold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(255,215,0,0.25)] disabled:opacity-50"
                              title="Télécharger la facture officielle avec QR Code de suivi"
                            >
                              {isPdfDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                              Facture PDF
                            </button>
                            <button
                              type="button"
                              onClick={handlePrintInvoice}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 hover:text-white text-[11px] font-tech font-bold uppercase tracking-wider transition-all"
                              title="Imprimer la facture"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Imprimer
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Bloc Récapitulatif Reprise Smart Troc si présent */}
                      {order.trocVoucher && (
                        <div className="bg-gradient-to-r from-xeption-gold/10 via-black/50 to-black/50 border border-xeption-gold/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(255,215,0,0.06)]">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-xeption-gold/15 text-xeption-gold shrink-0 border border-xeption-gold/30">
                              <Sparkles className="w-4 h-4 text-xeption-gold" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-tech uppercase tracking-widest text-xeption-gold font-bold">
                                  Reprise Smart Troc liée
                                </span>
                                <span className="text-xs font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded border border-white/10">
                                  {order.trocVoucher.ref}
                                </span>
                              </div>
                              <p className="text-xs text-white/90 mt-0.5 font-medium">
                                {order.trocVoucher.device_brand ? `${order.trocVoucher.device_brand} ` : ''}{order.trocVoucher.device_model}
                                {order.trocVoucher.device_storage ? ` (${order.trocVoucher.device_storage})` : ''}
                                {order.trocVoucher.imei && (
                                  <span className="text-gray-400 font-mono text-[11px] ml-2">
                                    IMEI : <strong className="text-gray-300 font-bold">{order.trocVoucher.imei}</strong>
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="sm:text-right shrink-0">
                            <span className="text-[10px] uppercase font-tech text-gray-400 block">Déduction appliquée</span>
                            <span className="text-sm font-bold font-mono text-xeption-gold">
                              −{(order.trocVoucher.trade_in_value || order.discountAmount || 0).toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Timeline des 5 étapes du cycle de vie */}
                      <div className="bg-black/30 border border-white/5 p-5 rounded-xl">
                        <div className="relative">
                          {/* Ligne de progression horizontale sur écran large */}
                          <div className="hidden sm:block absolute top-5 left-[8%] right-[8%] h-0.5 bg-gray-800 z-0" />

                          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-1.5 relative z-10">
                            {/* Étape 1 : Enregistrée */}
                            <div className="flex sm:flex-col items-center sm:text-center gap-3.5 sm:gap-2">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 transition-all bg-xeption-gold border-xeption-gold text-black shadow-[0_0_16px_rgba(255,215,0,0.45)]"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold uppercase font-tech text-sm text-white">
                                  Enregistrée
                                </h4>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  Commande reçue
                                </p>
                              </div>
                            </div>

                            {/* Étape 2 : Confirmée */}
                            <div className="flex sm:flex-col items-center sm:text-center gap-3.5 sm:gap-2">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 transition-all ${
                                  getOrderStepStatus(1, order.status) === 'completed'
                                    ? 'bg-xeption-gold border-xeption-gold text-black shadow-[0_0_16px_rgba(255,215,0,0.45)]'
                                    : getOrderStepStatus(1, order.status) === 'active'
                                      ? 'bg-black border-amber-400 text-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.35)] animate-pulse'
                                      : 'bg-black border-gray-700 text-gray-500'
                                }`}
                              >
                                {order.status === 'pending' ? <Clock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                              </div>
                              <div className="min-w-0">
                                <h4
                                  className={`font-bold uppercase font-tech text-sm ${
                                    getOrderStepStatus(1, order.status) !== 'inactive' ? 'text-white' : 'text-gray-500'
                                  }`}
                                >
                                  Confirmée
                                </h4>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {order.status === 'pending'
                                    ? (order.deliveryMode === 'pickup' ? 'Attente validation boutique' : 'Attente validation')
                                    : (order.deliveryMode === 'pickup' ? 'Validée · Stock réservé' : 'Validée & Stock réservé')}
                                </p>
                              </div>
                            </div>

                            {/* Étape 3 : En préparation */}
                            <div className="flex sm:flex-col items-center sm:text-center gap-3.5 sm:gap-2">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 transition-all ${
                                  getOrderStepStatus(2, order.status) === 'completed'
                                    ? 'bg-xeption-gold border-xeption-gold text-black shadow-[0_0_16px_rgba(255,215,0,0.45)]'
                                    : getOrderStepStatus(2, order.status) === 'active'
                                      ? 'bg-black border-xeption-gold text-xeption-gold shadow-[0_0_16px_rgba(255,215,0,0.35)] animate-pulse'
                                      : 'bg-black border-gray-700 text-gray-500'
                                }`}
                              >
                                {order.deliveryMode === 'pickup' ? <Store className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                              </div>
                              <div className="min-w-0">
                                <h4
                                  className={`font-bold uppercase font-tech text-sm ${
                                    getOrderStepStatus(2, order.status) !== 'inactive' ? 'text-white' : 'text-gray-500'
                                  }`}
                                >
                                  En préparation
                                </h4>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {order.status === 'confirmed'
                                    ? (order.deliveryMode === 'pickup' ? 'Mise de côté en boutique' : 'Emballage & colisage')
                                    : order.status === 'pending'
                                      ? 'Attente validation'
                                      : 'Colis préparé'}
                                </p>
                              </div>
                            </div>

                            {/* Étape 4 : En route (livraison) OU Prête en boutique (retrait) */}
                            <div className="flex sm:flex-col items-center sm:text-center gap-3.5 sm:gap-2">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 transition-all ${
                                  getOrderStepStatus(3, order.status) === 'completed'
                                    ? 'bg-xeption-gold border-xeption-gold text-black shadow-[0_0_16px_rgba(255,215,0,0.45)]'
                                    : getOrderStepStatus(3, order.status) === 'active'
                                      ? 'bg-black border-xeption-gold text-xeption-gold shadow-[0_0_16px_rgba(255,215,0,0.35)] animate-pulse'
                                      : 'bg-black border-gray-700 text-gray-500'
                                }`}
                              >
                                {order.deliveryMode === 'pickup' ? <Store className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                              </div>
                              <div className="min-w-0">
                                <h4
                                  className={`font-bold uppercase font-tech text-sm ${
                                    getOrderStepStatus(3, order.status) !== 'inactive' ? 'text-white' : 'text-gray-500'
                                  }`}
                                >
                                  {order.deliveryMode === 'pickup' ? 'Prête en boutique' : 'En route'}
                                </h4>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {order.deliveryMode === 'pickup'
                                    ? (order.status === 'ready'
                                        ? 'Disponible au comptoir'
                                        : order.status === 'delivered'
                                          ? 'Retrait effectué'
                                          : 'Attente disponibilité')
                                    : (order.status === 'shipped'
                                        ? 'Remis au coursier express'
                                        : order.status === 'delivered'
                                          ? 'Acheminement terminé'
                                          : 'Attente coursier')}
                                </p>
                              </div>
                            </div>

                            {/* Étape 5 : Livrée (livraison) OU Récupérée (retrait) */}
                            <div className="flex sm:flex-col items-center sm:text-center gap-3.5 sm:gap-2">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 transition-all ${
                                  order.status === 'delivered'
                                    ? 'bg-green-500 border-green-500 text-black shadow-[0_0_16px_rgba(34,197,94,0.45)]'
                                    : 'bg-black border-gray-700 text-gray-500'
                                }`}
                              >
                                <CheckCircle className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4
                                  className={`font-bold uppercase font-tech text-sm ${
                                    order.status === 'delivered' ? 'text-green-400' : 'text-gray-500'
                                  }`}
                                >
                                  {order.deliveryMode === 'pickup' ? 'Récupérée' : 'Livrée'}
                                </h4>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {order.deliveryMode === 'pickup'
                                    ? (order.status === 'delivered' ? 'Retirée en magasin' : 'Retrait par le client')
                                    : (order.status === 'delivered' ? 'Remise au destinataire' : 'Remise en mains propres')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Informations complémentaires Destination & Mode */}
                      <div className="bg-black/40 border border-white/5 px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-400 font-tech uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-xeption-gold shrink-0" />
                          <span>Destination : <strong className="text-white font-sans font-bold">{order.customerCity || 'Cameroun'}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-xeption-gold shrink-0" />
                          <span>Mode : <strong className="text-white font-sans font-bold">{order.deliveryMode === 'pickup' ? 'Retrait boutique' : 'Livraison express'}</strong></span>
                        </div>
                      </div>
                    </div>
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
      </div>
    </div>
  );
};

export default OrderTracking;
