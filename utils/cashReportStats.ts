/**
 * Agrégation pure des rapports de caisse quotidiens (`store_cash_reports`)
 * pour l'onglet admin « Bilan caisse ».
 *
 * Aucune dépendance React ni Supabase : tout est testable en isolation
 * (`tests/unit/cashReportStats.test.ts`). Les dates sont des chaînes
 * `YYYY-MM-DD` manipulées en UTC pour éviter les glissements de fuseau.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CashReportLineItem {
  label?: string | null;
  amount?: number | string | null;
}

/**
 * Entrée de `debts_snapshot`. La ligne brute contient aussi nom et téléphone
 * du client : on ne les type pas pour ne jamais les afficher dans le bilan.
 */
export interface CashReportDebtSnapshotItem {
  device_model?: string | null;
  amount_due?: number | string | null;
  remaining?: number | string | null;
}

export interface CashReportRecord {
  storeId: string;
  storeName: string;
  /** `YYYY-MM-DD` */
  reportDate: string;
  openingCash: number;
  closingCash: number;
  totalInflow: number;
  totalOutflow: number;
  inflowItems: CashReportLineItem[];
  outflowItems: CashReportLineItem[];
  debtsSnapshot: CashReportDebtSnapshotItem[];
  source: string;
}

export type CashPeriodPreset = 'all' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth';

export interface CashReportFilter {
  storeId?: string | null;
  /** Inclusif, `YYYY-MM-DD` */
  from?: string | null;
  /** Inclusif, `YYYY-MM-DD` */
  to?: string | null;
}

export interface StoreCashTotals {
  storeId: string;
  storeName: string;
  days: number;
  inflow: number;
  outflow: number;
  net: number;
  /** `closing_cash` du dernier rapport daté. */
  finalCash: number;
  avgInflowPerDay: number;
  bestDay: { date: string; amount: number } | null;
  zeroDays: number;
  firstDate: string;
  lastDate: string;
}

export interface MonthlyInflowRow {
  /** `YYYY-MM` */
  month: string;
  byStore: Record<string, number>;
  total: number;
}

export interface MonthEndDebtsCell {
  amount: number;
  count: number;
  /** Rapport utilisé comme « fin de mois » pour cette boutique. */
  reportDate: string;
}

export interface MonthEndDebtsRow {
  month: string;
  byStore: Record<string, MonthEndDebtsCell>;
  total: number;
}

export interface WeekdayAverage {
  /** 0 = lundi … 6 = dimanche */
  index: number;
  label: string;
  reports: number;
  avgInflow: number | null;
}

export interface StoreOutflowShare {
  storeId: string;
  storeName: string;
  totalOutflow: number;
  bossOutflow: number;
  share: number | null;
}

export interface BossOutflowShare {
  totalOutflow: number;
  bossOutflow: number;
  share: number | null;
  byStore: StoreOutflowShare[];
}

export interface StoreReportCoverage {
  storeId: string;
  storeName: string;
  firstDate: string;
  lastDate: string;
  calendarDays: number;
  reportedDays: number;
  missingDays: number;
  coverage: number;
  bySource: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Libellés de sortie qui désignent un retrait du dirigeant (« sortie de boss », « Boss »…). */
export const BOSS_OUTFLOW_PATTERN = /boss/i;

const WEEKDAY_LABELS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;
const DAYS_IN_WEEK = WEEKDAY_LABELS_FR.length;
const MS_PER_DAY = 86_400_000;
const LAST_30_DAYS = 30;
const LAST_90_DAYS = 90;
const DEFAULT_SOURCE = 'bot';

// ---------------------------------------------------------------------------
// Helpers dates / nombres
// ---------------------------------------------------------------------------

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const pad2 = (n: number): string => String(n).padStart(2, '0');

const formatIsoDate = (d: Date): string =>
  `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;

const parseIsoDate = (iso: string): Date => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const monthKey = (iso: string): string => iso.slice(0, 7);

/** 0 = lundi … 6 = dimanche (JS renvoie 0 = dimanche). */
const weekdayIndexMondayFirst = (iso: string): number =>
  (parseIsoDate(iso).getUTCDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK;

const daysBetweenInclusive = (fromIso: string, toIso: string): number =>
  Math.round((parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()) / MS_PER_DAY) + 1;

const addDays = (d: Date, days: number): Date => new Date(d.getTime() + days * MS_PER_DAY);

const lastDayOfMonth = (year: number, monthIndex: number): Date =>
  new Date(Date.UTC(year, monthIndex + 1, 0));

const byDateAsc = (a: CashReportRecord, b: CashReportRecord): number =>
  a.reportDate.localeCompare(b.reportDate);

const byStoreName = <T extends { storeName: string }>(a: T, b: T): number =>
  a.storeName.localeCompare(b.storeName, 'fr');

const groupByStore = (rows: CashReportRecord[]): Map<string, CashReportRecord[]> => {
  const map = new Map<string, CashReportRecord[]>();
  for (const row of rows) {
    const list = map.get(row.storeId);
    if (list) list.push(row);
    else map.set(row.storeId, [row]);
  }
  return map;
};

const sumItems = (items: CashReportLineItem[], predicate?: (item: CashReportLineItem) => boolean): number =>
  items.reduce((sum, item) => (predicate && !predicate(item) ? sum : sum + toNumber(item.amount)), 0);

const debtRemaining = (debt: CashReportDebtSnapshotItem): number =>
  debt.remaining === undefined || debt.remaining === null ? toNumber(debt.amount_due) : toNumber(debt.remaining);

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

export interface RawCashReportRow {
  store_id: string;
  report_date: string;
  opening_cash?: unknown;
  closing_cash?: unknown;
  total_inflow?: unknown;
  total_outflow?: unknown;
  inflow_items?: unknown;
  outflow_items?: unknown;
  debts_snapshot?: unknown;
  source?: unknown;
  stores?: { name?: string | null; code?: string | null } | { name?: string | null; code?: string | null }[] | null;
}

/** Ligne PostgREST (jointure `stores(name, code)`) → enregistrement typé. */
export const normalizeCashReportRow = (row: RawCashReportRow): CashReportRecord => {
  const store = Array.isArray(row.stores) ? row.stores[0] : row.stores;
  return {
    storeId: row.store_id,
    storeName: store?.name?.trim() || store?.code?.trim() || row.store_id,
    reportDate: String(row.report_date).slice(0, 10),
    openingCash: toNumber(row.opening_cash),
    closingCash: toNumber(row.closing_cash),
    totalInflow: toNumber(row.total_inflow),
    totalOutflow: toNumber(row.total_outflow),
    inflowItems: toArray<CashReportLineItem>(row.inflow_items),
    outflowItems: toArray<CashReportLineItem>(row.outflow_items),
    debtsSnapshot: toArray<CashReportDebtSnapshotItem>(row.debts_snapshot),
    source: typeof row.source === 'string' && row.source ? row.source : DEFAULT_SOURCE,
  };
};

// ---------------------------------------------------------------------------
// Filtres
// ---------------------------------------------------------------------------

export const resolveCashPeriodRange = (
  preset: CashPeriodPreset,
  today: Date = new Date(),
): { from?: string; to?: string } => {
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const year = todayUtc.getUTCFullYear();
  const month = todayUtc.getUTCMonth();
  switch (preset) {
    case 'last30':
      return { from: formatIsoDate(addDays(todayUtc, -(LAST_30_DAYS - 1))), to: formatIsoDate(todayUtc) };
    case 'last90':
      return { from: formatIsoDate(addDays(todayUtc, -(LAST_90_DAYS - 1))), to: formatIsoDate(todayUtc) };
    case 'thisMonth':
      return { from: formatIsoDate(new Date(Date.UTC(year, month, 1))), to: formatIsoDate(lastDayOfMonth(year, month)) };
    case 'lastMonth':
      return {
        from: formatIsoDate(new Date(Date.UTC(year, month - 1, 1))),
        to: formatIsoDate(lastDayOfMonth(year, month - 1)),
      };
    case 'all':
    default:
      return {};
  }
};

export const filterCashReports = (rows: CashReportRecord[], filter: CashReportFilter): CashReportRecord[] =>
  rows.filter((row) => {
    if (filter.storeId && row.storeId !== filter.storeId) return false;
    if (filter.from && row.reportDate < filter.from) return false;
    if (filter.to && row.reportDate > filter.to) return false;
    return true;
  });

// ---------------------------------------------------------------------------
// Agrégats
// ---------------------------------------------------------------------------

export const computeStoreTotals = (rows: CashReportRecord[]): StoreCashTotals[] => {
  const result: StoreCashTotals[] = [];
  for (const [storeId, list] of groupByStore(rows)) {
    const sorted = [...list].sort(byDateAsc);
    let inflow = 0;
    let outflow = 0;
    let zeroDays = 0;
    let bestDay: StoreCashTotals['bestDay'] = null;
    for (const row of sorted) {
      inflow += row.totalInflow;
      outflow += row.totalOutflow;
      if (row.totalInflow === 0) zeroDays += 1;
      // Égalité → le plus ancien gagne (ordre croissant + comparaison stricte).
      if (row.totalInflow > 0 && (!bestDay || row.totalInflow > bestDay.amount)) {
        bestDay = { date: row.reportDate, amount: row.totalInflow };
      }
    }
    const last = sorted[sorted.length - 1];
    result.push({
      storeId,
      storeName: last.storeName,
      days: sorted.length,
      inflow,
      outflow,
      net: inflow - outflow,
      finalCash: last.closingCash,
      avgInflowPerDay: inflow / sorted.length,
      bestDay,
      zeroDays,
      firstDate: sorted[0].reportDate,
      lastDate: last.reportDate,
    });
  }
  return result.sort(byStoreName);
};

export const computeMonthlyInflow = (rows: CashReportRecord[]): MonthlyInflowRow[] => {
  const months = new Map<string, MonthlyInflowRow>();
  for (const row of rows) {
    const key = monthKey(row.reportDate);
    const entry = months.get(key) ?? { month: key, byStore: {}, total: 0 };
    entry.byStore[row.storeId] = (entry.byStore[row.storeId] ?? 0) + row.totalInflow;
    entry.total += row.totalInflow;
    months.set(key, entry);
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
};

export const computeMonthEndDebts = (rows: CashReportRecord[]): MonthEndDebtsRow[] => {
  // Dernier rapport (mois, boutique) : c'est lui qui porte le restant dû de fin de mois.
  const lastByMonthStore = new Map<string, CashReportRecord>();
  for (const row of rows) {
    const key = `${monthKey(row.reportDate)}|${row.storeId}`;
    const current = lastByMonthStore.get(key);
    if (!current || row.reportDate > current.reportDate) lastByMonthStore.set(key, row);
  }
  const months = new Map<string, MonthEndDebtsRow>();
  for (const row of lastByMonthStore.values()) {
    const key = monthKey(row.reportDate);
    const entry = months.get(key) ?? { month: key, byStore: {}, total: 0 };
    const open = row.debtsSnapshot.filter((d) => debtRemaining(d) > 0);
    const amount = open.reduce((sum, d) => sum + debtRemaining(d), 0);
    entry.byStore[row.storeId] = { amount, count: open.length, reportDate: row.reportDate };
    entry.total += amount;
    months.set(key, entry);
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
};

export const computeWeekdayAverages = (rows: CashReportRecord[]): WeekdayAverage[] => {
  const sums = new Array<number>(DAYS_IN_WEEK).fill(0);
  const counts = new Array<number>(DAYS_IN_WEEK).fill(0);
  for (const row of rows) {
    const idx = weekdayIndexMondayFirst(row.reportDate);
    sums[idx] += row.totalInflow;
    counts[idx] += 1;
  }
  return WEEKDAY_LABELS_FR.map((label, index) => ({
    index,
    label,
    reports: counts[index],
    avgInflow: counts[index] > 0 ? sums[index] / counts[index] : null,
  }));
};

const isBossItem = (item: CashReportLineItem): boolean => BOSS_OUTFLOW_PATTERN.test(item.label ?? '');

/**
 * Part des sorties libellées « boss ». Le total est la somme des lignes de
 * sortie (pas la colonne `total_outflow`) pour que la part reste bornée à 100 %.
 */
export const computeBossOutflowShare = (rows: CashReportRecord[]): BossOutflowShare => {
  const byStore: StoreOutflowShare[] = [];
  let totalOutflow = 0;
  let bossOutflow = 0;
  for (const [storeId, list] of groupByStore(rows)) {
    const storeTotal = list.reduce((sum, row) => sum + sumItems(row.outflowItems), 0);
    const storeBoss = list.reduce((sum, row) => sum + sumItems(row.outflowItems, isBossItem), 0);
    totalOutflow += storeTotal;
    bossOutflow += storeBoss;
    byStore.push({
      storeId,
      storeName: list[0].storeName,
      totalOutflow: storeTotal,
      bossOutflow: storeBoss,
      share: storeTotal > 0 ? storeBoss / storeTotal : null,
    });
  }
  return {
    totalOutflow,
    bossOutflow,
    share: totalOutflow > 0 ? bossOutflow / totalOutflow : null,
    byStore: byStore.sort(byStoreName),
  };
};

/**
 * Couverture : jours calendaires entre le premier rapport d'une boutique et
 * `until` (par défaut le dernier rapport, toutes boutiques confondues), rapportés
 * aux jours effectivement renseignés. Passer « aujourd'hui » mesure le retard de saisie.
 */
export const computeReportCoverage = (rows: CashReportRecord[], until?: string): StoreReportCoverage[] => {
  if (rows.length === 0) return [];
  const globalLast = rows.reduce((max, row) => (row.reportDate > max ? row.reportDate : max), rows[0].reportDate);
  const end = until && until > globalLast ? until : until ?? globalLast;
  const result: StoreReportCoverage[] = [];
  for (const [storeId, list] of groupByStore(rows)) {
    const sorted = [...list].sort(byDateAsc);
    const firstDate = sorted[0].reportDate;
    const lastDate = sorted[sorted.length - 1].reportDate;
    const reportedDays = new Set(sorted.map((r) => r.reportDate)).size;
    const calendarDays = Math.max(daysBetweenInclusive(firstDate, end), reportedDays);
    const bySource: Record<string, number> = {};
    for (const row of sorted) bySource[row.source] = (bySource[row.source] ?? 0) + 1;
    result.push({
      storeId,
      storeName: sorted[0].storeName,
      firstDate,
      lastDate,
      calendarDays,
      reportedDays,
      missingDays: calendarDays - reportedDays,
      coverage: reportedDays / calendarDays,
      bySource,
    });
  }
  return result.sort(byStoreName);
};
