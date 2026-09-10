import { useCallback, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import type { CartItem } from '../../types';
import type { PaymentMethod } from '../../utils/paymentMethods';

export interface StaffSaleRow {
  orderId: string;
  customerName: string;
  customerPhone: string | null;
  paymentMethod: PaymentMethod | string;
  total: number;
  discountAmount: number;
  status: string;
  saleDate: string;
  storeId: string | null;
  items: CartItem[];
  itemCount: number;
}

export interface StaffSalesSummary {
  saleCount: number;
  totalAmount: number;
  discountTotal: number;
  subtotalAmount: number;
}

const startOfDayIso = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const endOfDayIso = (date: Date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return new Date(d.getTime() + 1).toISOString();
};

export const useMySales = (staffId: string | undefined) => {
  const [sales, setSales] = useState<StaffSaleRow[]>([]);
  const [summary, setSummary] = useState<StaffSalesSummary>({
    saleCount: 0,
    totalAmount: 0,
    discountTotal: 0,
    subtotalAmount: 0,
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [loading, setLoading] = useState(false);

  const fetchSales = useCallback(async (date?: Date) => {
    const targetDate = date ?? selectedDate;
    if (!staffId) {
      setSales([]);
      setSummary({ saleCount: 0, totalAmount: 0, discountTotal: 0, subtotalAmount: 0 });
      return;
    }

    setLoading(true);
    try {
      const pFrom = startOfDayIso(targetDate);
      const pTo = endOfDayIso(targetDate);

      const [summaryRes, listRes] = await Promise.all([
        supabase.rpc('get_staff_sales_summary', {
          p_staff_id: staffId,
          p_from: pFrom,
          p_to: pTo,
        }),
        supabase.rpc('list_staff_sales', {
          p_staff_id: staffId,
          p_from: pFrom,
          p_to: pTo,
        }),
      ]);

      if (summaryRes.error) throw summaryRes.error;
      if (listRes.error) throw listRes.error;

      const raw = (summaryRes.data ?? {}) as Record<string, number>;
      setSummary({
        saleCount: Number(raw.sale_count ?? 0),
        totalAmount: Number(raw.total_amount ?? 0),
        discountTotal: Number(raw.discount_total ?? 0),
        subtotalAmount: Number(raw.subtotal_amount ?? 0),
      });

      setSales(
        ((listRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
          orderId: String(row.order_id),
          customerName: String(row.customer_name ?? ''),
          customerPhone: (row.customer_phone as string | null) ?? null,
          paymentMethod: String(row.payment_method ?? 'CASH'),
          total: Number(row.total ?? 0),
          discountAmount: Number(row.discount_amount ?? 0),
          status: String(row.status ?? ''),
          saleDate: String(row.sale_date ?? ''),
          storeId: (row.store_id as string | null) ?? null,
          items: Array.isArray(row.items) ? (row.items as CartItem[]) : [],
          itemCount: Number(row.item_count ?? 0),
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [staffId, selectedDate]);

  return {
    sales,
    summary,
    selectedDate,
    setSelectedDate,
    loading,
    fetchSales,
  };
};
