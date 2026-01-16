
import React from 'react';
import { Customer } from '../../../types';

interface ClientsTabProps {
  customers: Customer[];
}

const ClientsTab: React.FC<ClientsTabProps> = ({ customers }) => {
  return (
     <div className="animate-in fade-in">
        <h2 className="text-3xl font-tech font-bold uppercase text-white mb-6">Clients (CRM)</h2>
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-sm overflow-hidden shadow-2xl">
             <table className="w-full text-left border-collapse">
                <thead className="bg-black/40 text-gray-400 text-xs uppercase font-bold tracking-wider"><tr><th className="px-6 py-4">Nom</th><th className="px-6 py-4">Contact</th><th className="px-6 py-4">Dépenses</th></tr></thead>
                <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                    {customers.map(c => (
                        <tr key={c.id} className="hover:bg-white/5">
                            <td className="px-6 py-4 font-bold text-white">{c.name}</td>
                            <td className="px-6 py-4">{c.email}<br/><span className="text-xs text-gray-500">{c.phone}</span></td>
                            <td className="px-6 py-4 font-mono text-xeption-gold">{(c.total_spent||0).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
             </table>
        </div>
     </div>
  );
};

export default ClientsTab;
