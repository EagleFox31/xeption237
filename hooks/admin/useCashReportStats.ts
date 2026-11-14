/**
 * Hook data de l'onglet « Bilan caisse » : charge `store_cash_reports` (jointure
 * `stores` pour le nom) puis dérive tous les agrégats via `utils/cashReportStats`
 * (pur). La RLS limite la lecture à la direction : un rôle inférieur reçoit une
 * liste vide, jamais une erreur.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { notifyError } from '../../utils/notify';
import {
  computeBossOutflowShare,
  computeMonthEndDebts,
  computeMonthlyInflow,
  computeReportCoverage,
  computeStoreTotals,
  computeWeekdayAverages,
  filterCashReports,
  normalizeCashReportRow,
  resolveCashPeriodRange,
  type CashPeriodPreset,
  type CashReportRecord,
  type RawCashReportRow,
} from '../../utils/cashReportStats';

/** Un rapport par boutique et par jour : 5 000 lignes ≈ 3 ans pour 4 boutiques. */
const MAX_REPORTS = 5000;

const SELECT_COLUMNS =
  'store_id, report_date, opening_cash, closing_cash, total_inflow, total_outflow, inflow_items, outflow_items, debts_snapshot, source, stores(name, code)';

export const useCashReportStats = () => {
  const [reports, setReports] = useState<CashReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storeId, setStoreId] = useState<string>('');
  const [period, setPeriod] = useState<CashPeriodPreset>('all');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('store_cash_reports')
      .select(SELECT_COLUMNS)
      .order('report_date', { ascending: true })
      .limit(MAX_REPORTS);
    if (error) {
      notifyError('Bilan caisse indisponible', 'Impossible de charger les rapports de caisse.');
      console.error('[useCashReportStats] load failed', error);
      setReports([]);
    } else {
      setReports(((data ?? []) as unknown as RawCashReportRow[]).map(normalizeCashReportRow));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stores = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of reports) if (!map.has(r.storeId)) map.set(r.storeId, r.storeName);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [reports]);

  const filtered = useMemo(
    () => filterCashReports(reports, { storeId: storeId || null, ...resolveCashPeriodRange(period) }),
    [reports, storeId, period],
  );

  const stats = useMemo(
    () => ({
      totals: computeStoreTotals(filtered),
      monthlyInflow: computeMonthlyInflow(filtered),
      monthEndDebts: computeMonthEndDebts(filtered),
      weekdays: computeWeekdayAverages(filtered),
      bossShare: computeBossOutflowShare(filtered),
      coverage: computeReportCoverage(filtered),
    }),
    [filtered],
  );

  return {
    isLoading,
    refresh,
    stores,
    storeId,
    setStoreId,
    period,
    setPeriod,
    reportCount: filtered.length,
    totalReportCount: reports.length,
    ...stats,
  };
};

export type CashReportStats = ReturnType<typeof useCashReportStats>;
