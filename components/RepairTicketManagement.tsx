
import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { RepairTicket } from '../types';
import { Wrench, Check, Clock, XCircle, AlertTriangle, Search, Filter } from 'lucide-react';

const RepairTicketManagement: React.FC = () => {
    const [tickets, setTickets] = useState<RepairTicket[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'open' | 'active'>('all');

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoading(true);
        // Map DB columns to Type manually if needed or select as
        const { data, error } = await supabase
            .from('repair_tickets')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (data) {
            const mappedData: RepairTicket[] = data.map((t: any) => ({
                id: t.id,
                orderId: t.order_id,
                productId: t.product_id,
                productName: t.product_name,
                customerName: t.customer_name,
                customerPhone: t.customer_phone,
                issueDescription: t.issue_description,
                status: t.status,
                warrantyStatus: t.warranty_status,
                createdAt: t.created_at
            }));
            setTickets(mappedData);
        }
        setLoading(false);
    };

    const updateStatus = async (id: string, newStatus: RepairTicket['status']) => {
        const { error } = await supabase
            .from('repair_tickets')
            .update({ status: newStatus })
            .eq('id', id);
        
        if (!error) {
            setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
        }
    };

    const filteredTickets = tickets.filter(t => {
        if (filter === 'open') return t.status === 'open';
        if (filter === 'active') return ['received', 'in_progress'].includes(t.status);
        return true;
    });

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'open': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'received': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'in_progress': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'rejected': return 'bg-red-500/10 text-red-500 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-500';
        }
    };

    return (
        <div className="animate-in fade-in">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                 <div>
                    <h3 className="text-xl text-white font-tech font-bold uppercase flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-xeption-gold" />
                        Gestion Atelier SAV
                    </h3>
                    <p className="text-gray-400 text-xs mt-1">Suivi des réparations et garanties.</p>
                 </div>

                 <div className="flex bg-[#18181b] border border-white/10 rounded-sm p-1">
                    {['all', 'open', 'active'].map(f => (
                        <button 
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-4 py-1.5 text-xs font-bold uppercase transition-all rounded-sm ${filter === f ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
                        >
                            {f === 'all' ? 'Tout' : f === 'open' ? 'Nouveaux' : 'En Atelier'}
                        </button>
                    ))}
                 </div>
             </div>

             {loading ? (
                <div className="text-center py-20 text-gray-500">Chargement...</div>
             ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredTickets.map(ticket => (
                        <div key={ticket.id} className="bg-[#18181b] border border-white/10 p-4 rounded-sm hover:border-white/20 transition-all flex flex-col md:flex-row justify-between gap-4">
                            
                            {/* Info Client & Produit */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${getStatusColor(ticket.status)}`}>
                                        {ticket.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs font-mono text-gray-500">#{ticket.id}</span>
                                    {ticket.warrantyStatus === 'active' && (
                                        <span className="text-[10px] text-green-500 flex items-center gap-1 font-bold border border-green-500/20 px-1 rounded bg-green-900/10">
                                            <Check className="w-3 h-3"/> Garantie Active
                                        </span>
                                    )}
                                </div>
                                <h4 className="text-white font-bold">{ticket.productName}</h4>
                                <p className="text-gray-400 text-sm mt-1">{ticket.issueDescription}</p>
                                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 font-mono">
                                    <span>Client: {ticket.customerName} ({ticket.customerPhone})</span>
                                    <span>Reçu le: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap items-center gap-2 md:justify-end min-w-[200px]">
                                {ticket.status === 'open' && (
                                    <button onClick={() => updateStatus(ticket.id, 'received')} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold uppercase">
                                        Réceptionner
                                    </button>
                                )}
                                {ticket.status === 'received' && (
                                    <button onClick={() => updateStatus(ticket.id, 'in_progress')} className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded text-xs font-bold uppercase">
                                        Commencer Réparation
                                    </button>
                                )}
                                {ticket.status === 'in_progress' && (
                                    <button onClick={() => updateStatus(ticket.id, 'completed')} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold uppercase">
                                        Terminer
                                    </button>
                                )}
                                {ticket.status !== 'completed' && ticket.status !== 'rejected' && (
                                    <button onClick={() => updateStatus(ticket.id, 'rejected')} className="border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors">
                                        Rejeter
                                    </button>
                                )}
                            </div>

                        </div>
                    ))}
                    {filteredTickets.length === 0 && (
                        <div className="text-center py-12 text-gray-500 italic border border-white/5 bg-black/20 rounded">
                            Aucun ticket trouvé.
                        </div>
                    )}
                </div>
             )}
        </div>
    );
};

export default RepairTicketManagement;
