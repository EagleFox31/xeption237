import { useCallback, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  ProductStockMismatch,
  Store,
  StoreStockRow,
  StockReservationOverview,
  PendingOrderReservation,
  ShipmentReservationAlert,
} from '../../types';
import { DB_SCHEMA, DB_TABLES } from '../../constants/dbSchema';
import { assertRpcSuccess } from '../../utils/rpcResult';

export const useStoreStockManager = () => {
  const [mismatches, setMismatches] = useState<ProductStockMismatch[]>([]);
  const [reservations, setReservations] = useState<StockReservationOverview[]>([]);
  const [pendingWithReservations, setPendingWithReservations] = useState<PendingOrderReservation[]>([]);
  const [shipmentAlerts, setShipmentAlerts] = useState<ShipmentReservationAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [reservationsLoading, setReservationsLoading] = useState(false);

  const fetchReservationsOverview = useCallback(async () => {
    setReservationsLoading(true);
    try {
      const [overviewRes, pendingRes, alertsRes] = await Promise.all([
        supabase.rpc('get_stock_reservations_overview'),
        supabase.rpc('get_pending_orders_with_reservations'),
        supabase.rpc('get_shipment_reservation_alerts'),
      ]);
      if (overviewRes.error) throw overviewRes.error;
      if (pendingRes.error) throw pendingRes.error;
      if (alertsRes.error) throw alertsRes.error;
      setReservations((overviewRes.data ?? []) as StockReservationOverview[]);
      setPendingWithReservations((pendingRes.data ?? []) as PendingOrderReservation[]);
      setShipmentAlerts((alertsRes.data ?? []) as ShipmentReservationAlert[]);
    } finally {
      setReservationsLoading(false);
    }
  }, []);

  const fetchMismatches = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_product_stock_mismatches');
    if (error) {
      setLoading(false);
      throw error;
    }
    setMismatches((data ?? []) as ProductStockMismatch[]);
    setLoading(false);
  }, []);

  const fetchAllocations = useCallback(async (productId: string, stores: Store[]) => {
    const { data, error } = await supabase
      .from(DB_TABLES.STORE_STOCK)
      .select(`${DB_SCHEMA.STORE_STOCK.STORE_ID}, ${DB_SCHEMA.STORE_STOCK.QUANTITY}`)
      .eq(DB_SCHEMA.STORE_STOCK.PRODUCT_ID, productId);

    if (error) throw error;

    const byStore = new Map((data ?? []).map((r) => [r.store_id as string, r.quantity as number]));
    return stores.filter((s) => s.active).map((s) => ({
      store_id: s.id,
      quantity: byStore.get(s.id) ?? 0,
    }));
  }, []);

  const saveAllocations = async (productId: string, allocations: { store_id: string; quantity: number }[]) => {
    const { data, error } = await supabase.rpc('redistribute_product_stock', {
      p_product_id: productId,
      p_allocations: allocations,
    });
    if (error) throw error;
    assertRpcSuccess(data, 'Répartition refusée');
    return data as Record<string, unknown>;
  };

  const fetchStoreStockSummary = useCallback(async (storeId: string) => {
    const { data, error } = await supabase
      .from(DB_TABLES.STORE_STOCK)
      .select(`${DB_SCHEMA.STORE_STOCK.PRODUCT_ID}, ${DB_SCHEMA.STORE_STOCK.QUANTITY}`)
      .eq(DB_SCHEMA.STORE_STOCK.STORE_ID, storeId)
      .gt(DB_SCHEMA.STORE_STOCK.QUANTITY, 0);
    if (error) throw error;
    return (data ?? []) as StoreStockRow[];
  }, []);

  return {
    mismatches,
    reservations,
    pendingWithReservations,
    shipmentAlerts,
    loading,
    reservationsLoading,
    fetchMismatches,
    fetchReservationsOverview,
    fetchAllocations,
    saveAllocations,
    fetchStoreStockSummary,
  };
};
