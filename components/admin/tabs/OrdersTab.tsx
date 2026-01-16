
import React from 'react';
import { Order } from '../../../types';

interface OrdersTabProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: Order['status']) => void;
  onCancelOrder: (order: Order) => void;
}

const OrdersTab: React.FC<OrdersTabProps> = ({ orders, onUpdateStatus, onCancelOrder }) => {
  return (
    <div className="animate-in fade-in">
        <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6">Commandes</h2>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden shadow-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold tracking-wider">
                    <tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Client</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Montant</th><th className="px-6 py-4 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                    {orders.map(o => (
                        <tr key={o.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-bold text-white">#{o.id}</td>
                            <td className="px-6 py-4"><div><span className="block font-bold text-white">{o.customerName}</span><span className="text-xs text-gray-500">{o.deliveryMode === 'pickup' ? 'Retrait' : 'Livraison'}</span></div></td>
                            <td className="px-6 py-4"><span className="uppercase font-bold text-[10px] px-2 py-1 rounded bg-white/5">{o.status}</span></td>
                            <td className="px-6 py-4 font-mono text-white">{o.total.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right space-x-2">
                                {o.status === 'pending' && <button onClick={() => onUpdateStatus(o.id, 'confirmed')} className="text-[10px] bg-purple-600 text-white px-2 py-1 rounded uppercase font-bold">Valider</button>}
                                {o.status === 'confirmed' && <button onClick={() => onUpdateStatus(o.id, o.deliveryMode === 'delivery' ? 'shipped' : 'ready')} className="text-[10px] bg-yellow-600 text-black px-2 py-1 rounded uppercase font-bold">Expédier</button>}
                                {(o.status === 'shipped' || o.status === 'ready') && <button onClick={() => onUpdateStatus(o.id, 'delivered')} className="text-[10px] bg-green-600 text-white px-2 py-1 rounded uppercase font-bold">Terminer</button>}
                                {o.status !== 'delivered' && o.status !== 'cancelled' && <button onClick={() => onCancelOrder(o)} className="text-[10px] border border-red-500 text-red-500 px-2 py-1 rounded uppercase font-bold">Annuler</button>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default OrdersTab;
