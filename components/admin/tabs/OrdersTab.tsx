
import React, { useState } from 'react';
import { Order } from '../../../types';
import { Eye } from 'lucide-react';
import OrderDetailModal from '../modals/OrderDetailModal';
import TableShell from '../shared/TableShell';

interface OrdersTabProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: Order['status']) => void;
  onCancelOrder: (order: Order) => void;
}

const OrdersTab: React.FC<OrdersTabProps> = ({ orders, onUpdateStatus, onCancelOrder }) => {
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);

  return (
    <div className="animate-in fade-in h-[calc(100vh-140px)] flex flex-col">
        <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6 shrink-0">Commandes</h2>
        
        <div className="flex-1 min-h-0 relative">
            <TableShell className="h-full overflow-y-auto border-t border-white/10">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="sticky top-0 z-20 bg-[#0c0c0e] text-gray-400 text-xs uppercase font-bold tracking-wider shadow-lg">
                        <tr>
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Client</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Montant</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                        {orders.map(o => (
                            <tr key={o.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs font-bold text-white">#{o.id}</td>
                                <td className="px-6 py-4"><div><span className="block font-bold text-white">{o.customerName}</span><span className="text-xs text-gray-500">{o.deliveryMode === 'pickup' ? 'Retrait' : 'Livraison'}</span></div></td>
                                <td className="px-6 py-4"><span className="uppercase font-bold text-[10px] px-2 py-1 rounded bg-white/5">{o.status}</span></td>
                                <td className="px-6 py-4 font-mono text-white">{o.total.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => setViewingOrder(o)} 
                                            className="p-2 bg-white/5 hover:bg-white/20 text-white rounded transition-colors mr-2"
                                            title="Voir détails"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>

                                        {o.status === 'pending' && <button onClick={() => onUpdateStatus(o.id, 'confirmed')} className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded uppercase font-bold transition-colors">Valider</button>}
                                        {o.status === 'confirmed' && <button onClick={() => onUpdateStatus(o.id, o.deliveryMode === 'delivery' ? 'shipped' : 'ready')} className="text-[10px] bg-yellow-600 hover:bg-yellow-500 text-black px-3 py-1.5 rounded uppercase font-bold transition-colors">Expédier</button>}
                                        {(o.status === 'shipped' || o.status === 'ready') && <button onClick={() => onUpdateStatus(o.id, 'delivered')} className="text-[10px] bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded uppercase font-bold transition-colors">Terminer</button>}
                                        {o.status !== 'delivered' && o.status !== 'cancelled' && <button onClick={() => onCancelOrder(o)} className="text-[10px] border border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded uppercase font-bold transition-colors">Annuler</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>
        </div>

        {viewingOrder && (
            <OrderDetailModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
        )}
    </div>
  );
};

export default OrdersTab;
