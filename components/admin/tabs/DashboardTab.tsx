
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Receipt,
  Store,
  Users,
  Download,
  FileText,
  Loader2,
  AlertTriangle,
  CalendarRange,
} from 'lucide-react';
import { Product, Staff, Store as StoreType } from '../../../types';
import { normalizeStaffRole } from '../../../constants/staffRoles';
import StatCard from '../shared/StatCard';
import DashboardRankingBars from '../dashboard/DashboardRankingBars';
import { adminUi } from '../shared/adminUi';
import { useDashboardAnalytics } from '../../../hooks/admin/useDashboardAnalytics';
import { useCatalogHealth } from '../../../hooks/admin/useCatalogHealth';
import CatalogHealthCard from '../dashboard/CatalogHealthCard';
import {
  type DashboardPeriodPreset,
  formatFcfa,
  formatPeriodLabel,
  periodFromPreset,
  REVENUE_DEFINITION_SHORT,
  topProductsCoverageNote,
} from '../../../utils/dashboardAnalytics';
import { exportDashboardCsv, printEndOfDayReport } from '../../../utils/dashboardExport';
import { getOrderStatusLabel } from '../../../utils/orderWorkflow';
import { notifyInfo } from '../../../utils/notify';
import type { Order } from '../../../types';

interface DashboardTabProps {
  staffMembers: Staff[];
  products: Product[];
  stores: StoreType[];
  currentStaff: Staff | null;
  onEditProduct?: (product: Product) => void;
}

const PRESETS: { id: DashboardPeriodPreset; label: string }[] = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'week', label: '7 jours' },
  { id: 'month', label: 'Ce mois' },
  { id: 'custom', label: 'Personnalisé' },
];

const DashboardTab: React.FC<DashboardTabProps> = ({
  staffMembers,
  products,
  stores,
  currentStaff,
  onEditProduct,
}) => {
  const role = normalizeStaffRole(currentStaff?.role);
  const canFilterAll = role === 'direction' || role === 'super_admin';
  const canFilterStore = canFilterAll || role === 'responsable';

  const [preset, setPreset] = useState<DashboardPeriodPreset>('today');
  const [customFrom, setCustomFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [storeId, setStoreId] = useState<string | null>(
    canFilterAll ? null : currentStaff?.store_id ?? null,
  );
  const [staffId, setStaffId] = useState<string | null>(
    canFilterAll || canFilterStore ? null : currentStaff?.id ?? null,
  );

  const { data, loading, error, fetchAnalytics } = useDashboardAnalytics();
  const catalogHealth = useCatalogHealth();

  const period = useMemo(() => {
    const custom =
      preset === 'custom'
        ? { from: new Date(customFrom), to: new Date(customTo) }
        : undefined;
    return periodFromPreset(preset, custom?.from, custom?.to);
  }, [preset, customFrom, customTo]);

  const load = useCallback(() => {
    void fetchAnalytics({
      preset,
      from: period.from,
      to: period.to,
      storeId,
      staffId,
    });
  }, [fetchAnalytics, preset, period.from, period.to, storeId, staffId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void catalogHealth.refresh();
  }, [catalogHealth.refresh]);

  const lowStock = useMemo(
    () => products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 5).slice(0, 6),
    [products],
  );

  const exportLabel = preset === 'today' ? 'aujourdhui' : preset;

  const staffRows = useMemo(
    () =>
      (data?.by_staff ?? []).slice(0, 8).map((s) => ({
        id: s.staff_id,
        label: s.staff_name,
        sublabel: s.store_name ?? undefined,
        value: s.revenue,
        displayValue: `${formatFcfa(s.revenue)} · ${s.transaction_count} vente${s.transaction_count > 1 ? 's' : ''}`,
      })),
    [data?.by_staff],
  );

  const storeRows = useMemo(
    () =>
      (data?.by_store ?? []).map((s) => ({
        id: s.store_id,
        label: s.store_name,
        value: s.revenue,
        displayValue: formatFcfa(s.revenue),
      })),
    [data?.by_store],
  );

  const coverageNote = useMemo(
    () => (data ? topProductsCoverageNote(data) : null),
    [data],
  );

  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toolbar filtres + actions */}
      <div className={`${adminUi.card} flex flex-col gap-4 p-4 sm:p-5`}>
        
        {/* LIGNE 1 : Date & Heure (Grand format) + Filtres Boutique & Vendeurs + Boutons d'action */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* Gauche : Date & Heure + Filtres */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            
            {/* Bloc Date & Heure agrandi */}
            <div className="flex items-center gap-2.5 bg-black/40 border border-white/10 px-3.5 py-1.5 rounded-md shadow-inner">
              <CalendarRange className="h-4 sm:h-5 w-4 sm:w-5 text-xeption-gold shrink-0" />
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-tech font-bold uppercase tracking-wider text-white">
                  {data ? formatPeriodLabel(new Date(data.period.from), new Date(data.period.to)) : '…'}
                </span>
                <span className="text-xs font-mono font-bold text-xeption-gold bg-xeption-gold/15 px-2 py-0.5 rounded border border-xeption-gold/30">
                  {currentTime}
                </span>
              </div>
            </div>

            {/* Filtres Boutique & Vendeurs alignés sur la ligne de la date */}
            <div className="flex flex-wrap items-center gap-2">
              {canFilterStore && (
                <select
                  value={storeId ?? ''}
                  onChange={(e) => setStoreId(e.target.value || null)}
                  className={`${adminUi.input} w-auto min-w-[160px] text-xs py-2 bg-black/60 border-white/15 focus:border-xeption-gold`}
                >
                  <option value="">Toutes les boutiques</option>
                  {stores.filter((s) => s.active).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}

              {(canFilterAll || canFilterStore) && (
                <select
                  value={staffId ?? ''}
                  onChange={(e) => setStaffId(e.target.value || null)}
                  className={`${adminUi.input} w-auto min-w-[160px] text-xs py-2 bg-black/60 border-white/15 focus:border-xeption-gold`}
                >
                  <option value="">Tous les vendeurs</option>
                  {staffMembers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Droite : Boutons Exports & Rapports */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!data || loading}
              onClick={() => data && exportDashboardCsv(data, exportLabel)}
              className={`${adminUi.btnGhost} text-xs py-2 px-3.5 flex items-center gap-1.5`}
            >
              <Download className="h-3.5 w-3.5" />
              Export Excel
            </button>
            <button
              type="button"
              disabled={!data || loading}
              onClick={() => data && printEndOfDayReport(data)}
              className={`${adminUi.btnPrimary} text-xs py-2 px-3.5 flex items-center gap-1.5`}
            >
              <FileText className="h-3.5 w-3.5" />
              Rapport du soir
            </button>
          </div>
        </div>

        {/* LIGNE 2 : Périodes pré-définies (Aujourd'hui, 7 jours, Ce mois, Personnalisé) */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={adminUi.segmentGroup}>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={adminUi.segmentBtn(preset === p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === 'custom' && (
            <div className="flex flex-wrap gap-3 items-center">
              <label className="text-xs text-white/70 flex items-center gap-1.5">
                Du
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className={`${adminUi.input} py-1 text-xs`}
                />
              </label>
              <label className="text-xs text-white/70 flex items-center gap-1.5">
                Au
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className={`${adminUi.input} py-1 text-xs`}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      <CatalogHealthCard
        summary={catalogHealth.summary}
        loading={catalogHealth.loading}
        scanning={catalogHealth.scanning}
        error={catalogHealth.error}
        onRescan={() => void catalogHealth.rescan()}
        onSnooze={(id) => void catalogHealth.snooze(id)}
        onOpenProduct={
          onEditProduct
            ? (productId) => {
                const product = products.find((p) => p.id === productId);
                if (product) {
                  onEditProduct(product);
                  return;
                }
                notifyInfo('Fiche introuvable dans l’inventaire chargé', 'Recharge la page puis réessaie.');
              }
            : undefined
        }
      />

      {error && (
        <div className={`${adminUi.hintCard} border-red-500/40 text-red-300 text-sm`}>{error}</div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-20 text-white/50">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              label="CA encaissé"
              value={Math.round(data.kpis.revenue).toLocaleString('fr-FR')}
              sub={REVENUE_DEFINITION_SHORT}
              icon={TrendingUp}
              tone="gold"
            />
            <StatCard
              label="Transactions"
              value={String(data.kpis.transaction_count)}
              sub="Ventes sur la période"
              icon={ShoppingBag}
              tone="white"
            />
            <StatCard
              label="Articles vendus"
              value={String(data.kpis.items_sold)}
              sub="Unités"
              icon={Package}
              tone="cyan"
            />
            <StatCard
              label="Panier moyen"
              value={Math.round(data.kpis.average_basket).toLocaleString('fr-FR')}
              sub={
                data.kpis.discount_total > 0
                  ? `Remises ${formatFcfa(data.kpis.discount_total)}`
                  : 'FCFA'
              }
              icon={Receipt}
              tone="white"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DashboardRankingBars
              title="Classement vendeurs"
              icon={<Users className="h-4 w-4 text-cyan-400" />}
              rows={staffRows}
              emptyMessage="Aucune vente rattachée à un vendeur sur cette période."
              accentClass="bg-gradient-to-r from-cyan-500 to-cyan-300"
            />
            <DashboardRankingBars
              title="Performance boutiques"
              icon={<Store className="h-4 w-4 text-xeption-gold" />}
              rows={storeRows}
              emptyMessage="Aucune vente par boutique sur cette période."
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className={`${adminUi.card} lg:col-span-2`}>
              <h3 className={`${adminUi.cardTitle} mb-4`}>
                <Package className="h-4 w-4 text-xeption-gold" />
                Top produits
              </h3>
              {data.top_products.length === 0 ? (
                <p className={adminUi.muted}>Pas de détail produit sur cette période.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className={adminUi.tableHead}>
                      <tr>
                        <th className="px-3 py-2">Produit</th>
                        <th className="px-3 py-2 text-right">Qté</th>
                        <th className="px-3 py-2 text-right">CA</th>
                      </tr>
                    </thead>
                    <tbody className={adminUi.tableBody}>
                      {data.top_products.map((p, i) => (
                        <tr key={p.product_id} className="hover:bg-white/5">
                          <td className="px-3 py-2.5">
                            <span className="text-[10px] text-xeption-gold font-mono mr-2">#{i + 1}</span>
                            <span className="text-white">{p.product_name}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-white/80">{p.quantity}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-xeption-gold">
                            {Math.round(p.revenue).toLocaleString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {coverageNote && (
                <p className="mt-3 text-xs text-white/60 leading-relaxed border-t border-white/10 pt-3">
                  {coverageNote}
                </p>
              )}
            </section>

            <section className={adminUi.card}>
              <h3 className={`${adminUi.cardTitle} mb-4`}>
                <AlertTriangle className="h-4 w-4 text-red-400" />
                Stock bas
              </h3>
              <ul className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {lowStock.length === 0 ? (
                  <li className={adminUi.muted}>Stock confortable.</li>
                ) : (
                  lowStock.map((p) => (
                    <li
                      key={p.id}
                      className="flex justify-between gap-2 p-2.5 rounded-md border border-white/10 bg-black/20 text-sm"
                    >
                      <span className="text-white truncate">{p.name}</span>
                      <span className="text-red-400 font-bold text-xs shrink-0">{p.stock} u.</span>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </div>

          <section className={adminUi.card}>
            <h3 className={`${adminUi.cardTitle} mb-4`}>
              <ShoppingBag className="h-4 w-4 text-emerald-400" />
              Dernières ventes
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[520px]">
                <thead className={adminUi.tableHead}>
                  <tr>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Vendeur</th>
                    <th className="px-3 py-2">Montant</th>
                  </tr>
                </thead>
                <tbody className={adminUi.tableBody}>
                  {data.recent_sales.map((s) => (
                    <tr key={s.order_id} className="hover:bg-white/5">
                      <td className="px-3 py-2.5">
                        <span className="block text-white font-medium">{s.customer_name}</span>
                        <span className="text-[10px] text-white/50">
                          {getOrderStatusLabel(s.status as Order['status'])} · #{s.order_id}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/70">
                        {s.staff_name ?? '—'}
                        {s.store_name && (
                          <span className="block text-[10px] text-white/45">{s.store_name}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-white tabular-nums">
                        {Math.round(s.total).toLocaleString('fr-FR')} F
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.recent_sales.length === 0 && (
                <p className={`${adminUi.muted} py-6 text-center`}>Aucune vente sur la période.</p>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
};

export default DashboardTab;
