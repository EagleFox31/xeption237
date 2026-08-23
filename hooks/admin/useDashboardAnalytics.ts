import { useCallback, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import type { DashboardAnalytics, DashboardFilters } from '../../utils/dashboardAnalytics';

const parsePayload = (raw: unknown): DashboardAnalytics => {
  const d = (raw ?? {}) as Record<string, unknown>;
  const kpis = (d.kpis ?? {}) as Record<string, number>;
  const gap = (d.coverage_gap ?? {}) as Record<string, number>;
  const period = (d.period ?? {}) as Record<string, string>;
  return {
    period: { from: period.from ?? '', to: period.to ?? '' },
    kpis: {
      revenue: Number(kpis.revenue ?? 0),
      transaction_count: Number(kpis.transaction_count ?? 0),
      items_sold: Number(kpis.items_sold ?? 0),
      average_basket: Number(kpis.average_basket ?? 0),
      discount_total: Number(kpis.discount_total ?? 0),
    },
    coverage_gap: {
      orders_without_line_items: Number(gap.orders_without_line_items ?? 0),
      revenue_without_detail: Number(gap.revenue_without_detail ?? 0),
    },
    by_staff: ((d.by_staff ?? []) as Record<string, unknown>[]).map((r) => ({
      staff_id: String(r.staff_id),
      staff_name: String(r.staff_name ?? ''),
      store_name: (r.store_name as string | null) ?? null,
      revenue: Number(r.revenue ?? 0),
      transaction_count: Number(r.transaction_count ?? 0),
      items_sold: Number(r.items_sold ?? 0),
    })),
    by_store: ((d.by_store ?? []) as Record<string, unknown>[]).map((r) => ({
      store_id: String(r.store_id),
      store_name: String(r.store_name ?? ''),
      revenue: Number(r.revenue ?? 0),
      transaction_count: Number(r.transaction_count ?? 0),
    })),
    top_products: ((d.top_products ?? []) as Record<string, unknown>[]).map((r) => ({
      product_id: String(r.product_id),
      product_name: String(r.product_name ?? ''),
      quantity: Number(r.quantity ?? 0),
      revenue: Number(r.revenue ?? 0),
    })),
    recent_sales: ((d.recent_sales ?? []) as Record<string, unknown>[]).map((r) => ({
      order_id: String(r.order_id),
      customer_name: String(r.customer_name ?? ''),
      total: Number(r.total ?? 0),
      status: String(r.status ?? ''),
      sale_date: String(r.sale_date ?? ''),
      staff_name: (r.staff_name as string | null) ?? null,
      store_name: (r.store_name as string | null) ?? null,
    })),
  };
};

export const useDashboardAnalytics = () => {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (filters: DashboardFilters) => {
    setLoading(true);
    setError(null);
    try {
      const { data: raw, error: rpcError } = await supabase.rpc('get_dashboard_analytics', {
        p_from: filters.from.toISOString(),
        p_to: filters.to.toISOString(),
        p_store_id: filters.storeId,
        p_staff_id: filters.staffId,
      });
      if (rpcError) throw rpcError;
      setData(parsePayload(raw));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Impossible de charger le pilotage.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchAnalytics };
};
