export type DashboardPeriodPreset = 'today' | 'week' | 'month' | 'custom';

export interface DashboardKpis {
  revenue: number;
  transaction_count: number;
  items_sold: number;
  average_basket: number;
  discount_total: number;
}

export interface DashboardCoverageGap {
  orders_without_line_items: number;
  revenue_without_detail: number;
}

export interface DashboardStaffRow {
  staff_id: string;
  staff_name: string;
  store_name: string | null;
  revenue: number;
  transaction_count: number;
  items_sold: number;
}

export interface DashboardStoreRow {
  store_id: string;
  store_name: string;
  revenue: number;
  transaction_count: number;
}

export interface DashboardProductRow {
  product_id: string;
  product_name: string;
  quantity: number;
  revenue: number;
}

export interface DashboardRecentSale {
  order_id: string;
  customer_name: string;
  total: number;
  status: string;
  sale_date: string;
  staff_name: string | null;
  store_name: string | null;
}

export interface DashboardAnalytics {
  period: { from: string; to: string };
  kpis: DashboardKpis;
  coverage_gap: DashboardCoverageGap;
  by_staff: DashboardStaffRow[];
  by_store: DashboardStoreRow[];
  top_products: DashboardProductRow[];
  recent_sales: DashboardRecentSale[];
}

export interface DashboardFilters {
  preset: DashboardPeriodPreset;
  from: Date;
  to: Date;
  storeId: string | null;
  staffId: string | null;
}

export const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const endOfDayExclusive = (d: Date) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
};

export const periodFromPreset = (preset: DashboardPeriodPreset, customFrom?: Date, customTo?: Date): { from: Date; to: Date } => {
  const now = new Date();
  if (preset === 'custom' && customFrom && customTo) {
    return { from: startOfDay(customFrom), to: endOfDayExclusive(customTo) };
  }
  if (preset === 'week') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to: endOfDayExclusive(now) };
  }
  if (preset === 'month') {
    const from = startOfDay(now);
    from.setDate(1);
    return { from, to: endOfDayExclusive(now) };
  }
  return { from: startOfDay(now), to: endOfDayExclusive(now) };
};

export const formatFcfa = (n: number) =>
  `${Math.round(n).toLocaleString('fr-FR')} FCFA`;

/**
 * Définition unique du CA encaissé — vue `orders_reportable` (migration 20260824_026).
 * Référence pour dashboard, export, objectifs et rapports.
 */
export const REVENUE_DEFINITION =
  'Commandes payées ou livrées, hors annulées, retournées, remboursées et essais caisse (TEST-), sur la période filtrée.';

/** Sous-titre compact pour la carte KPI. */
export const REVENUE_DEFINITION_SHORT =
  'Payées/livrées · hors annulées/retours/remboursés/TEST-';

export const formatPeriodLabel = (from: Date, to: Date) => {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const f = from.toLocaleDateString('fr-FR', opts);
  const t = new Date(to.getTime() - 1).toLocaleDateString('fr-FR', opts);
  return f === t ? f : `${f} → ${t}`;
};

/** CA de la période rattachable à order_items (hors commandes sans détail). */
export const productDetailRevenue = (data: DashboardAnalytics) =>
  Math.max(0, data.kpis.revenue - data.coverage_gap.revenue_without_detail);

/** Note sous le top produits — même logique que db:verify:step2. */
export const topProductsCoverageNote = (data: DashboardAnalytics): string | null => {
  const { orders_without_line_items, revenue_without_detail } = data.coverage_gap;
  if (orders_without_line_items <= 0) return null;
  const cmd =
    orders_without_line_items > 1 ? 'commandes anciennes' : 'commande ancienne';
  return [
    `Ventilation sur ${formatFcfa(productDetailRevenue(data))} — ${orders_without_line_items} ${cmd} sans détail article.`,
    `La somme des lignes ci-dessus ne recouvre pas tout le CA encaissé — ${formatFcfa(revenue_without_detail)} viennent de l'historique sans order_items.`,
  ].join(' ');
};
