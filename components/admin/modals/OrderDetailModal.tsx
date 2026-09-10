import React, { useEffect, useState } from 'react';
import { Order } from '../../../types';
import { X, User, MapPin, CreditCard, Package, Truck, Phone, Mail, RefreshCw, Smartphone, Tag } from 'lucide-react';
import { useDueFeedbackInvites } from '../../../hooks/useDueFeedbackInvites';
import OrderFeedbackInviteButton from '../OrderFeedbackInviteButton';
import { getOrderStatusLabel } from '../../../utils/orderWorkflow';
import { optimizeImage } from '../../../utils/mediaOptimization';
import { supabase } from '../../../services/supabaseClient';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose }) => {
  const { invites, markSent } = useDueFeedbackInvites();
  const orderInvites = invites.filter((invite) => invite.order_id === order.id);

  const [trocVoucher, setTrocVoucher] = useState(order.trocVoucher || null);

  useEffect(() => {
    if (order.trocVoucher) {
      setTrocVoucher(order.trocVoucher);
      return;
    }

    // Récupération rétroactive si commande liée à un bon Smart Troc
    let cancelled = false;
    const fetchTroc = async () => {
      try {
        const { data } = await supabase.rpc('get_order_troc_voucher', {
          p_order_id: order.id,
        });
        if (!cancelled && data && (data.ref || data.device_brand || data.imei)) {
          setTrocVoucher(data);
        }
      } catch (err) {
        console.warn('Erreur récupération bon troc dans modale commande:', err);
      }
    };

    void fetchTroc();
    return () => {
      cancelled = true;
    };
  }, [order.id, order.trocVoucher]);

  const itemsSubtotal = (order.items || []).reduce(
    (acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1),
    0
  );
  const discount = Number(order.discountAmount || 0) > 0 ? Number(order.discountAmount) : 0;
  const deliveryCost = order.deliveryMode === 'pickup' ? 0 : Math.max(0, order.total + discount - itemsSubtotal);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#09090b] border-t sm:border border-white/10 w-full max-w-3xl h-[92dvh] sm:h-auto sm:max-h-[88dvh] flex flex-col rounded-t-2xl sm:rounded-lg shadow-2xl overflow-hidden relative">
        
        {/* Header fixe */}
        <div className="shrink-0 bg-[#09090b] border-b border-white/10 p-4 sm:p-6 flex justify-between items-center z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-tech text-white uppercase flex items-center gap-2">
              Commande <span className="text-xeption-gold">#{order.id}</span>
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-400 font-mono">{order.date}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                  order.status === 'delivered'
                    ? 'border-green-500/30 text-green-500 bg-green-500/10'
                    : order.status === 'cancelled'
                    ? 'border-red-500/30 text-red-500 bg-red-500/10'
                    : order.status === 'refused'
                    ? 'border-orange-500/30 text-orange-400 bg-orange-500/10'
                    : order.status === 'returned'
                    ? 'border-slate-500/30 text-slate-300 bg-slate-500/10'
                    : 'border-xeption-gold/30 text-xeption-gold bg-xeption-gold/10'
                }`}
              >
                {getOrderStatusLabel(order.status)}
              </span>
              {order.paymentStatus === 'paid' && (
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-green-500/40 text-green-400 bg-green-500/10">
                  Payé
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            title="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Corps défilable avec padding bas garanti sur mobile */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6 pb-28 sm:pb-8">
          {order.status === 'delivered' && orderInvites.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {orderInvites.map((invite) => (
                <OrderFeedbackInviteButton
                  key={invite.token}
                  invite={invite}
                  onSent={markSent}
                />
              ))}
            </div>
          ) : null}
          
          {/* Grille Infos Client, Livraison & Smart Troc */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Infos Client */}
            <div className="bg-white/5 border border-white/5 p-4 rounded-sm">
              <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-xeption-gold" /> Informations Client
              </h3>
              <div className="space-y-2">
                <p className="text-white font-bold text-base">{order.customerName}</p>
                <div className="flex items-center gap-2 text-sm text-gray-300 font-mono">
                  <Phone className="w-4 h-4 text-xeption-gold shrink-0" /> {order.customerPhone}
                </div>
                {order.customerEmail && (
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Mail className="w-4 h-4 text-gray-500 shrink-0" /> {order.customerEmail}
                  </div>
                )}
              </div>
            </div>

            {/* Livraison & Paiement */}
            <div className="bg-white/5 border border-white/5 p-4 rounded-sm">
              <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-xeption-gold" /> Livraison & Paiement
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-gray-400">Mode</span>
                  <span className="text-white font-bold uppercase flex items-center gap-1.5">
                    {order.deliveryMode === 'pickup' ? <Package className="w-3.5 h-3.5 text-amber-400" /> : <MapPin className="w-3.5 h-3.5 text-sky-400" />}
                    {order.deliveryMode === 'pickup' ? 'Retrait Boutique' : 'Livraison à domicile'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-gray-400">Destination</span>
                  <span className="text-white text-right font-medium">{order.customerCity || 'Boutique Mfoundi Mall'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Règlement</span>
                  <span className="text-xeption-gold font-bold uppercase flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> {order.paymentMethod || 'Espèces / En boutique'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bloc Reprise Smart Troc (si liée) */}
          {trocVoucher && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 p-4 rounded-md">
              <div className="flex items-center justify-between mb-3 border-b border-amber-500/20 pb-2">
                <h3 className="text-xs font-bold uppercase text-amber-400 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-400" /> Reprise Smart Troc Liée
                </h3>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Réf. {trocVoucher.ref}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase">Appareil repris</span>
                  <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                    <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    {trocVoucher.device_brand} {trocVoucher.device_model}
                    {trocVoucher.device_storage ? ` (${trocVoucher.device_storage})` : ''}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase">N° IMEI</span>
                  <span className="font-mono text-xs text-gray-200 mt-0.5 block tracking-wider">
                    {trocVoucher.imei || 'Non renseigné'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 uppercase">Valeur de reprise</span>
                  <span className="font-mono text-sm font-bold text-amber-400 mt-0.5 block">
                    -{(trocVoucher.trade_in_value || discount).toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Liste Produits */}
          <div>
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-xeption-gold" /> Articles Commandés ({(order.items || []).length})
            </h3>
            <div className="bg-black/40 border border-white/10 rounded-sm overflow-x-auto">
              <table className="w-full text-left min-w-[320px]">
                <thead className="bg-white/5 text-gray-400 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3">Produit</th>
                    <th className="px-4 py-3 text-center">Qté</th>
                    <th className="px-4 py-3 text-right">Prix Unitaire</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {item.image ? (
                            <img
                              src={optimizeImage(item.image, 100)}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white line-clamp-1">{item.name}</div>
                          <div className="text-[10px] text-gray-400 uppercase">{item.category}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-white">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-400 font-mono">
                        {(Number(item.price) || 0).toLocaleString()} FCFA
                      </td>
                      <td className="px-4 py-3 text-right text-white font-bold font-mono">
                        {((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString()} FCFA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Total avec décomposition détaillée */}
          <div className="pt-4 border-t border-white/10 flex flex-col items-end gap-2 text-sm">
            <div className="flex justify-between w-full sm:w-80 text-gray-400 text-xs">
              <span>Sous-total articles :</span>
              <span className="font-mono text-gray-200">{itemsSubtotal.toLocaleString()} FCFA</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between w-full sm:w-80 text-amber-400 text-xs font-semibold">
                <span>Remise Smart Troc :</span>
                <span className="font-mono">-{discount.toLocaleString()} FCFA</span>
              </div>
            )}

            {order.deliveryMode !== 'pickup' && deliveryCost > 0 && (
              <div className="flex justify-between w-full sm:w-80 text-gray-400 text-xs">
                <span>Frais de livraison :</span>
                <span className="font-mono text-gray-200">{deliveryCost.toLocaleString()} FCFA</span>
              </div>
            )}

            <div className="flex justify-between items-baseline w-full sm:w-80 pt-2 border-t border-white/10 mt-1">
              <span className="text-gray-300 font-bold uppercase text-xs">
                {order.paymentStatus === 'paid' ? 'Total Réglé :' : 'Net à Payer :'}
              </span>
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {order.total.toLocaleString()} <span className="text-sm text-xeption-gold">FCFA</span>
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OrderDetailModal;
