
import React from 'react';
import { Customer } from '../../../types';
import TableShell from '../shared/TableShell';
import { adminUi } from '../shared/adminUi';

interface ClientsTabProps {
  customers: Customer[];
}

const ClientsTab: React.FC<ClientsTabProps> = ({ customers }) => {
  return (
     <div className={`animate-in fade-in ${adminUi.tabViewportH} flex flex-col`}>
        <div className="flex-1 min-h-0 relative">
            <TableShell className="h-full overflow-y-auto border-t border-white/10">
                 {/*
                   TELEPHONE (< 768 px) : cartes. Trois colonnes seulement, mais
                   l'adresse e-mail est longue : en tableau elle ecrase le nom et
                   le montant sur un ecran etroit.
                 */}
                 <div className="divide-y divide-white/5 md:hidden">
                    {customers.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-white/50">
                        Aucun client enregistré.
                      </p>
                    ) : (
                      customers.map((c) => (
                        <div key={c.id} className="flex items-start justify-between gap-3 p-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">{c.name}</p>
                            {c.email && (
                              <p className="truncate text-[11px] text-white/70">{c.email}</p>
                            )}
                            {c.phone && (
                              <p className="text-[11px] text-white/55">{c.phone}</p>
                            )}
                          </div>
                          <span className="shrink-0 font-mono text-sm font-bold text-xeption-gold">
                            {(c.total_spent || 0).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                 </div>

                 <table className="hidden w-full text-left border-collapse md:table">
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
