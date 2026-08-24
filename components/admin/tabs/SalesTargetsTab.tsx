import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  Loader2,
  Plus,
  Save,
  Target,
  Trash2,
  Users,
  Store,
} from 'lucide-react';
import { Staff, Store as StoreType } from '../../../types';
import { normalizeStaffRole } from '../../../constants/staffRoles';
import { adminUi } from '../shared/adminUi';
import TargetProgressCard from '../targets/TargetProgressCard';
import {
  formatFcfaShort,
  TARGET_REVENUE_HINT,
  type TargetPeriodKind,
  type TargetScopeType,
} from '../../../utils/salesTargets';
import type { useSalesTargets } from '../../../hooks/admin/useSalesTargets';

type SalesTargetsMgr = ReturnType<typeof useSalesTargets>;

interface SalesTargetsTabProps {
  staffMembers: Staff[];
  stores: StoreType[];
  currentStaff: Staff | null;
  targetsMgr: SalesTargetsMgr;
}

const emptyTargetForm = () => ({
  scopeType: 'staff' as TargetScopeType,
  periodKind: 'daily' as TargetPeriodKind,
  staffId: '',
  storeId: '',
  amount: '',
});

const emptyBonusForm = () => ({
  label: '',
  minPercent: '100',
  bonusAmount: '',
  sortOrder: '0',
});

const SalesTargetsTab: React.FC<SalesTargetsTabProps> = ({
  staffMembers,
  stores,
  currentStaff,
  targetsMgr,
}) => {
  const role = normalizeStaffRole(currentStaff?.role);
  const canConfigure = role === 'direction' || role === 'super_admin';

  const [targetForm, setTargetForm] = useState(emptyTargetForm);
  const [bonusForm, setBonusForm] = useState(emptyBonusForm);
  const [editingBonusId, setEditingBonusId] = useState<string | null>(null);

  const load = useCallback(() => {
    void targetsMgr.fetchProgress();
  }, [targetsMgr.fetchProgress]);

  useEffect(() => {
    load();
  }, [load]);

  const activeStores = useMemo(() => stores.filter((s) => s.active), [stores]);

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(targetForm.amount.replace(/\s/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) return;

    await targetsMgr.saveTarget({
      scopeType: targetForm.scopeType,
      periodKind: targetForm.periodKind,
      targetAmount: amount,
      staffId: targetForm.scopeType === 'staff' ? targetForm.staffId || null : null,
      storeId: targetForm.scopeType === 'store' ? targetForm.storeId || null : null,
    });
    setTargetForm(emptyTargetForm());
    load();
  };

  const handleSaveBonus = async (e: React.FormEvent) => {
    e.preventDefault();
    const minPercent = Number(bonusForm.minPercent);
    const bonusAmount = Number(bonusForm.bonusAmount.replace(/\s/g, ''));
    if (!bonusForm.label.trim() || !Number.isFinite(minPercent) || !Number.isFinite(bonusAmount)) {
      return;
    }

    await targetsMgr.saveBonusRule({
      id: editingBonusId,
      label: bonusForm.label.trim(),
      minAchievementPercent: minPercent,
      bonusAmount,
      sortOrder: Number(bonusForm.sortOrder) || 0,
    });
    setBonusForm(emptyBonusForm());
    setEditingBonusId(null);
    load();
  };

  const startEditBonus = (rule: {
    id: string;
    label: string;
    min_achievement_percent: number;
    bonus_amount: number;
    sort_order: number;
  }) => {
    setEditingBonusId(rule.id);
    setBonusForm({
      label: rule.label,
      minPercent: String(rule.min_achievement_percent),
      bonusAmount: String(rule.bonus_amount),
      sortOrder: String(rule.sort_order),
    });
  };

  const { data, loading, error, saving } = targetsMgr;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className={adminUi.hintCard}>
        <p className={`${adminUi.body} leading-snug`}>
          Objectifs basés sur le CA encaissé — {TARGET_REVENUE_HINT.toLowerCase()}.
          Les primes mensuelles se débloquent quand le vendeur atteint le seuil sur son objectif
          du mois.
        </p>
      </div>

      {error && (
        <div className={`${adminUi.hintCard} border-red-500/40 text-red-300 text-sm`}>{error}</div>
      )}

      {canConfigure && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <section className={adminUi.card}>
            <h3 className={`${adminUi.cardTitle} mb-4`}>
              <Target className="h-4 w-4 text-xeption-gold" />
              Fixer un objectif
            </h3>
            <form onSubmit={handleSaveTarget} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-white/70">
                  Périmètre
                  <select
                    value={targetForm.scopeType}
                    onChange={(e) =>
                      setTargetForm((f) => ({
                        ...f,
                        scopeType: e.target.value as TargetScopeType,
                      }))
                    }
                    className={`${adminUi.input} mt-1`}
                  >
                    <option value="staff">Vendeur</option>
                    <option value="store">Boutique</option>
                  </select>
                </label>
                <label className="text-xs text-white/70">
                  Période
                  <select
                    value={targetForm.periodKind}
                    onChange={(e) =>
                      setTargetForm((f) => ({
                        ...f,
                        periodKind: e.target.value as TargetPeriodKind,
                      }))
                    }
                    className={`${adminUi.input} mt-1`}
                  >
                    <option value="daily">Journalier</option>
                    <option value="monthly">Mensuel</option>
                  </select>
                </label>
              </div>

              {targetForm.scopeType === 'staff' ? (
                <label className="text-xs text-white/70 block">
                  Vendeur
                  <select
                    required
                    value={targetForm.staffId}
                    onChange={(e) => setTargetForm((f) => ({ ...f, staffId: e.target.value }))}
                    className={`${adminUi.input} mt-1`}
                  >
                    <option value="">Choisir…</option>
                    {staffMembers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="text-xs text-white/70 block">
                  Boutique
                  <select
                    required
                    value={targetForm.storeId}
                    onChange={(e) => setTargetForm((f) => ({ ...f, storeId: e.target.value }))}
                    className={`${adminUi.input} mt-1`}
                  >
                    <option value="">Choisir…</option>
                    {activeStores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="text-xs text-white/70 block">
                Montant objectif (FCFA)
                <input
                  required
                  type="number"
                  min={1}
                  step={1000}
                  value={targetForm.amount}
                  onChange={(e) => setTargetForm((f) => ({ ...f, amount: e.target.value }))}
                  className={`${adminUi.input} mt-1 font-mono`}
                  placeholder="500000"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className={`${adminUi.btnPrimary} w-full sm:w-auto`}
              >
                <Save className="h-3.5 w-3.5" />
                Enregistrer l&apos;objectif
              </button>
            </form>
          </section>

          <section className={adminUi.card}>
            <h3 className={`${adminUi.cardTitle} mb-4`}>
              <Award className="h-4 w-4 text-cyan-400" />
              Seuils de prime
            </h3>
            <form onSubmit={handleSaveBonus} className="space-y-3 mb-4">
              <label className="text-xs text-white/70 block">
                Libellé
                <input
                  required
                  value={bonusForm.label}
                  onChange={(e) => setBonusForm((f) => ({ ...f, label: e.target.value }))}
                  className={`${adminUi.input} mt-1`}
                  placeholder="Prime 100 %"
                />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="text-xs text-white/70">
                  Seuil (%)
                  <input
                    required
                    type="number"
                    min={1}
                    value={bonusForm.minPercent}
                    onChange={(e) => setBonusForm((f) => ({ ...f, minPercent: e.target.value }))}
                    className={`${adminUi.input} mt-1 font-mono`}
                  />
                </label>
                <label className="text-xs text-white/70">
                  Prime (FCFA)
                  <input
                    required
                    type="number"
                    min={0}
                    value={bonusForm.bonusAmount}
                    onChange={(e) => setBonusForm((f) => ({ ...f, bonusAmount: e.target.value }))}
                    className={`${adminUi.input} mt-1 font-mono`}
                  />
                </label>
                <label className="text-xs text-white/70">
                  Ordre
                  <input
                    type="number"
                    value={bonusForm.sortOrder}
                    onChange={(e) => setBonusForm((f) => ({ ...f, sortOrder: e.target.value }))}
                    className={`${adminUi.input} mt-1 font-mono`}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saving} className={adminUi.btnPrimary}>
                  <Plus className="h-3.5 w-3.5" />
                  {editingBonusId ? 'Mettre à jour' : 'Ajouter'}
                </button>
                {editingBonusId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBonusId(null);
                      setBonusForm(emptyBonusForm());
                    }}
                    className={adminUi.btnGhost}
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>

            <ul className="space-y-2">
              {(data?.bonus_rules ?? []).length === 0 ? (
                <li className={adminUi.muted}>Aucun seuil configuré.</li>
              ) : (
                data!.bonus_rules.map((rule) => (
                  <li
                    key={rule.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-md border border-white/10 bg-black/20"
                  >
                    <div>
                      <p className="text-sm text-white font-medium">{rule.label}</p>
                      <p className="text-[10px] text-white/55">
                        ≥ {rule.min_achievement_percent} % → {formatFcfaShort(rule.bonus_amount)}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditBonus(rule)}
                        className={`${adminUi.btnGhost} text-[10px] py-1.5 px-2`}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('Supprimer ce seuil de prime ?')) return;
                          await targetsMgr.removeBonusRule(rule.id);
                          load();
                        }}
                        className={`${adminUi.btnGhost} text-[10px] py-1.5 px-2 text-red-300`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-16 text-white/50">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : data ? (
        <>
          <section className={adminUi.card}>
            <h3 className={`${adminUi.cardTitle} mb-4`}>
              <Users className="h-4 w-4 text-cyan-400" />
              Progression vendeurs
            </h3>
            {data.staff.length === 0 ? (
              <p className={adminUi.muted}>Aucun vendeur visible sur cette période.</p>
            ) : (
              <div className="space-y-4">
                {data.staff.map((row) => (
                  <div
                    key={row.staff_id}
                    className="rounded-lg border border-white/10 bg-black/15 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="text-white font-medium">{row.staff_name}</p>
                        {row.store_name && (
                          <p className="text-[10px] text-white/50">{row.store_name}</p>
                        )}
                      </div>
                      {row.monthly_bonuses.some((b) => b.earned) && (
                        <span className="text-[10px] uppercase font-bold text-emerald-400">
                          Prime débloquée
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative">
                        <TargetProgressCard title="Aujourd'hui" slice={row.daily} />
                        {canConfigure && row.daily?.target_id && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm('Retirer l\'objectif du jour pour ce vendeur ?')) return;
                              await targetsMgr.removeTarget(row.daily!.target_id!);
                              load();
                            }}
                            className="absolute top-2 right-2 text-[10px] text-red-300/80 hover:text-red-200"
                          >
                            Retirer
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <TargetProgressCard title="Ce mois" slice={row.monthly} />
                        {canConfigure && row.monthly?.target_id && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!confirm('Retirer l\'objectif du mois pour ce vendeur ?')) return;
                              await targetsMgr.removeTarget(row.monthly!.target_id!);
                              load();
                            }}
                            className="absolute top-2 right-2 text-[10px] text-red-300/80 hover:text-red-200"
                          >
                            Retirer
                          </button>
                        )}
                      </div>
                    </div>
                    {row.monthly?.target_amount && row.monthly_bonuses.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {row.monthly_bonuses.map((b) => (
                          <span
                            key={b.rule_id}
                            className={`text-[10px] px-2 py-1 rounded-full border ${
                              b.earned
                                ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10'
                                : 'border-white/15 text-white/55'
                            }`}
                          >
                            {b.label} · {formatFcfaShort(b.bonus_amount)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {(canConfigure || role === 'responsable') && data.stores.length > 0 && (
            <section className={adminUi.card}>
              <h3 className={`${adminUi.cardTitle} mb-4`}>
                <Store className="h-4 w-4 text-xeption-gold" />
                Progression boutiques
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.stores.map((row) => (
                  <div key={row.store_id} className="space-y-3">
                    <p className="text-sm text-white font-medium">{row.store_name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TargetProgressCard title="Jour" slice={row.daily} />
                      <TargetProgressCard title="Mois" slice={row.monthly} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
};

export default SalesTargetsTab;
