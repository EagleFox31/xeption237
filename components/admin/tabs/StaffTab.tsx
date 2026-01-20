
import React from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { Staff } from '../../../types';
import TableShell from '../shared/TableShell';

interface StaffTabProps {
  staffMembers: Staff[];
  onAddStaff: () => void;
  onDeleteStaff: (id: string) => void;
}

const StaffTab: React.FC<StaffTabProps> = ({ staffMembers, onAddStaff, onDeleteStaff }) => {
  return (
    <div className="animate-in fade-in h-[calc(100vh-140px)] flex flex-col">
        <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-3xl font-tech font-bold uppercase text-white">Équipe</h2>
            <button onClick={onAddStaff} className="bg-white/10 text-white px-4 py-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white hover:text-black rounded-sm">
                <UserPlus className="w-4 h-4" /> Ajouter
            </button>
        </div>
        
        <div className="flex-1 min-h-0 relative">
            <TableShell className="h-full overflow-y-auto border-t border-white/10">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20 bg-[#0c0c0e] text-gray-400 text-xs uppercase font-bold tracking-wider shadow-lg">
                        <tr>
                            <th className="px-6 py-4">Nom</th>
                            <th className="px-6 py-4">Rôle</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
                        {staffMembers.map(s => (
                            <tr key={s.id} className="hover:bg-white/5">
                                <td className="px-6 py-4 font-bold text-white">{s.name}</td>
                                <td className="px-6 py-4"><span className="px-2 py-1 rounded bg-white/5 text-xs font-bold uppercase">{s.role}</span></td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => onDeleteStaff(s.id)} className="text-red-500 hover:bg-white/10 p-2 rounded"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableShell>
        </div>
    </div>
  );
};

export default StaffTab;
