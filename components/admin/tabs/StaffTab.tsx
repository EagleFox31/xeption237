
import React from 'react';
import { KeyRound, Loader2, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { Staff, Store } from '../../../types';
import { getStaffRoleLabel, getStaffRoleShortLabel } from '../../../constants/staffRoles';
import { staffInitials } from '../../../hooks/admin/useCurrentStaffSession';
import { STAFF_DEFAULT_PASSWORD } from '../../../services/staffAuthProvisioning';
import TableShell from '../shared/TableShell';
import { adminUi } from '../shared/adminUi';

interface StaffTabProps {
  staffMembers: Staff[];
  stores: Store[];
  authByEmail: Record<string, boolean>;
  provisioningId: string | null;
  isBulkProvisioning: boolean;
  onEditStaff: (staff: Staff) => void;
  onAddStaff: () => void;
  onDeleteStaff: (id: string) => void;
  onProvisionAuth: (staff: Staff) => void;
  onProvisionAllMissing: () => void;
}

const StaffTab: React.FC<StaffTabProps> = ({
  staffMembers,
  stores,
  authByEmail,
  provisioningId,
  isBulkProvisioning,
  onEditStaff,
  onAddStaff,
  onDeleteStaff,
  onProvisionAuth,
  onProvisionAllMissing,
}) => {
  const storeNameById = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  if (!staffMembers.length) {
    return (
      <div className="animate-in fade-in flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
        <div className={`${adminUi.surface} max-w-md w-full p-8`}>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-xeption-gold/15 text-xeption-gold">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold font-tech text-white uppercase">Aucun membre</h3>
          <p className="mt-2 text-sm text-white/65 leading-relaxed">
            Chaque membre reçoit automatiquement un compte de connexion — mot de passe{' '}
            <strong className="text-white">{STAFF_DEFAULT_PASSWORD}</strong> pour tous.
          </p>
          <button type="button" onClick={onAddStaff} className={`${adminUi.btnPrimary} mt-6 w-full sm:w-auto`}>
            <UserPlus className="h-4 w-4" /> Nouveau membre
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in h-[calc(100vh-140px)] flex flex-col gap-4">
        <div className={`${adminUi.hintCard} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`}>
          <div>
            <p className="text-sm font-bold text-white">
              Mot de passe équipe : <span className="text-xeption-gold">{STAFF_DEFAULT_PASSWORD}</span>
            </p>
            <p className="text-xs text-white/60 mt-1">
              Synchronise les noms Supabase Auth et remet le mot de passe pour toute l’équipe.
            </p>
          </div>
          <button
            type="button"
            onClick={onProvisionAllMissing}
            disabled={isBulkProvisioning}
            className={`${adminUi.btnPrimary} shrink-0 disabled:opacity-50`}
          >
            {isBulkProvisioning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sync…
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" /> Tout synchroniser
              </>
            )}
          </button>
        </div>

        <div className="flex-1 min-h-0 relative">
            <TableShell className="h-full overflow-y-auto border-t border-white/10">
                <table className="w-full text-left border-collapse">
                    <thead className={adminUi.tableHead}>
                        <tr>
                            <th className="px-6 py-4">Membre</th>
                            <th className="px-6 py-4">Profil</th>
                            <th className="px-6 py-4">Boutique</th>
                            <th className="px-6 py-4">Connexion</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className={adminUi.tableBody}>
                        {staffMembers.map((s) => {
                          const hasAuth = s.email ? authByEmail[s.email.toLowerCase()] === true : false;
                          const isProvisioning = provisioningId === s.id;

                          return (
                            <tr
                              key={s.id}
                              className="hover:bg-white/5 cursor-pointer group"
                              onClick={() => onEditStaff(s)}
                            >
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-xeption-gold/20 text-xeption-gold text-xs font-bold">
                                      {staffInitials(s.name)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-white truncate">{s.name}</p>
                                      {s.email && (
                                        <p className="text-xs text-white/50 truncate">{s.email}</p>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2.5 py-1 rounded-md bg-white/8 text-xs font-bold text-white">
                                    {getStaffRoleLabel(s.role)}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-xs text-white/75">
                                    {s.store_id ? storeNameById[s.store_id] ?? '—' : '—'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  {hasAuth ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase text-emerald-300">
                                      Prêt
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-1 text-[10px] font-bold uppercase text-amber-300">
                                      À sync
                                    </span>
                                  )}
                                  <p className="text-[10px] text-white/45 mt-1">{STAFF_DEFAULT_PASSWORD}</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onProvisionAuth(s); }}
                                        disabled={isProvisioning || isBulkProvisioning}
                                        className="text-xeption-gold hover:bg-xeption-gold/10 p-2 rounded disabled:opacity-40"
                                        aria-label={`Synchroniser ${s.name}`}
                                        title={`Nom + mot de passe ${STAFF_DEFAULT_PASSWORD}`}
                                      >
                                        {isProvisioning ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <KeyRound className="w-4 h-4" />
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onEditStaff(s); }}
                                        className="text-white/60 hover:text-xeption-gold hover:bg-white/10 p-2 rounded"
                                        aria-label={`Modifier ${s.name}`}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onDeleteStaff(s.id); }}
                                        className="text-red-400 hover:bg-red-500/10 p-2 rounded"
                                        aria-label={`Supprimer ${s.name}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                </td>
                            </tr>
                          );
                        })}
                    </tbody>
                </table>
            </TableShell>
        </div>
    </div>
  );
};

export default StaffTab;
