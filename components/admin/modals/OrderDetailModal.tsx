
import React from 'react';
import { Order } from '../../../types';
import { X, User, MapPin, CreditCard, Calendar, Package, Truck, Phone, Mail } from 'lucide-react';
import { optimizeImage } from '../../../utils/mediaOptimization';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, onClose }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#09090b] border border-white/10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl relative">
        
        {/* Header */}
        <div className="sticky top-0 bg-[#09090b]/95 backdrop-blur border-b border-white/10 p-6 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold font-tech text-white uppercase flex items-center gap-2">
              Commande <span className="text-xeption-gold">#{order.id}</span>
            </h2>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400 font-mono">{order.date}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                    order.status === 'delivered' ? 'border-green-500/30 text-green-500 bg-green-500/10' : 
                    order.status === 'cancelled' ? 'border-red-500/30 text-red-500 bg-red-500/10' :
                    'border-xeption-gold/30 text-xeption-gold bg-xeption-gold/10'
                }`}>
                    {order.status}
                </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-8">
            
            {/* Infos Client & Livraison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/5 p-4 rounded-sm">
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-4 flex items-center gap-2">
                        <User className="w-4 h-4" /> Informations Client
                    </h3>
                    <div className="space-y-3">
                        <p className="text-white font-bold text-lg">{order.customerName}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                            <Phone className="w-4 h-4 text-xeption-gold" /> {order.customerPhone}
                        </div>
                        {order.customerEmail && (
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <Mail className="w-4 h-4 text-gray-500" /> {order.customerEmail}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-sm">
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-4 flex items-center gap-2">
                        <Truck className="w-4 h-4" /> Livraison & Paiement
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-gray-400 text-sm">Mode</span>
                            <span className="text-white font-bold text-sm uppercase flex items-center gap-1">
                                {order.deliveryMode === 'pickup' ? <Package className="w-3 h-3"/> : <MapPin className="w-3 h-3"/>}
                                {order.deliveryMode === 'pickup' ? 'Retrait Boutique' : 'Livraison'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-gray-400 text-sm">Lieu</span>
                            <span className="text-white text-sm text-right">{order.customerCity || 'Boutique Mfoundi Mall'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-sm">Paiement</span>
                            <span className="text-xeption-gold font-bold text-sm uppercase flex items-center gap-1">
                                <CreditCard className="w-3 h-3"/> {order.paymentMethod}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Liste Produits */}
            <div>
                <h3 className="text-xs font-bold uppercase text-gray-500 mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Articles Commandés ({order.items.length})
                </h3>
                <div className="bg-black/40 border border-white/10 rounded-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-gray-400 text-[10px] uppercase font-bold">
                            <tr>
                                <th className="px-4 py-3">Produit</th>
                                <th className="px-4 py-3 text-center">Qté</th>
                                <th className="px-4 py-3 text-right">Prix Unitaire</th>
                                <th className="px-4 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {order.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-white/5">
                                    <td className="px-4 py-3 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/10 rounded overflow-hidden flex-shrink-0">
                                            <img src={optimizeImage(item.image, 100)} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white line-clamp-1">{item.name}</div>
                                            <div className="text-[10px] text-gray-500 uppercase">{item.category}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-white">{item.quantity}</td>
                                    <td className="px-4 py-3 text-right text-gray-400 font-mono">{item.price.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-white font-bold font-mono">{(item.price * item.quantity).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Total */}
            <div className="flex justify-end pt-4 border-t border-white/10">
                <div className="text-right">
                    <span className="text-gray-400 text-xs font-bold uppercase mr-4">Total Payé</span>
                    <span className="text-3xl font-bold font-mono text-white tracking-tight">
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
