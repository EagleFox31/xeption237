
import React from 'react';
import { Customer } from '../../../types';
import TableShell from '../shared/TableShell';
import { adminUi } from '../shared/adminUi';

interface ClientsTabProps {
  customers: Customer[];
}

const ClientsTab: React.FC<ClientsTabProps> = ({ customers }) => {
  return (
     <div className="animate-in fade-in h-[calc(100vh-140px)] flex flex-col">
        <div className="flex-1 min-h-0 relative">
            <TableShell className="h-full overflow-y-auto border-t border-white/10">
                 <table className="w-full text-left border-collapse">
                    <thead className={adminUi.tableHead}>
                        <tr>
                            <th className="px-6 py-4">Nom</th>
                            <th className="px-6 py-4">Contact</th>
                            <th className="px-6 py-4">Dépenses</th>
                        </tr>
                    </thead>
                    <tbody className={adminUi.tableBody}>
                        {customers.map(c => (
                            <tr key={c.id} className="hover:bg-white/5">
                                <td className="px-6 py-4 font-bold text-white">{c.name}</td>
                                <td className="px-6 py-4">{c.email}<br/><span className="text-xs text-white/55">{c.phone}</span></td>
                                <td className="px-6 py-4 font-mono text-xeption-gold">{(c.total_spent||0).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </TableShell>
        </div>
     </div>
  );
};

export default ClientsTab;
