import { useCallback, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { assertRpcSuccess } from '../../utils/rpcResult';
import {
  parseInventorySessionPayload,
  parseMovementRows,
  parseStaleTransfers,
  parseTransferRows,
  type InventoryLine,
  type InventorySession,
  type StaleTransferAlert,
  type StockMovementRow,
  type StockTransferRow,
} from '../../utils/stockOperations';

export const useStockOperations = () => {
  const [transfers, setTransfers] = useState<StockTransferRow[]>([]);
  const [staleTransfers, setStaleTransfers] = useState<StaleTransferAlert[]>([]);
  const [movements, setMovements] = useState<StockMovementRow[]>([]);
  const [inventorySession, setInventorySession] = useState<InventorySession | null>(null);
  const [inventoryLines, setInventoryLines] = useState<InventoryLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransfers = useCallback(async (storeId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, staleRes] = await Promise.all([
        supabase.rpc('list_stock_transfers', { p_store_id: storeId ?? null, p_status: null }),
        supabase.rpc('get_stale_stock_transfers', { p_days: 5 }),
      ]);
      if (listRes.error) throw listRes.error;
      if (staleRes.error) throw staleRes.error;
      setTransfers(parseTransferRows(listRes.data));
      setStaleTransfers(parseStaleTransfers(staleRes.data));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger les transferts');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMovements = useCallback(async (storeId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('list_stock_movements', {
        p_store_id: storeId ?? null,
        p_limit: 100,
      });
      if (rpcError) throw rpcError;
      setMovements(parseMovementRows(data));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de charger le journal');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInventorySession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_inventory_session', {
        p_session_id: sessionId,
      });
      if (rpcError) throw rpcError;
      const parsed = parseInventorySessionPayload(data);
      if (!parsed) throw new Error('Session introuvable');
      setInventorySession(parsed.session);
      setInventoryLines(parsed.lines);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Session introuvable');
      setInventorySession(null);
      setInventoryLines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTransfer = useCallback(
    async (fromStoreId: string, toStoreId: string, items: { product_id: string; quantity: number }[], note?: string) => {
      const { data, error: rpcError } = await supabase.rpc('create_stock_transfer', {
        p_from_store_id: fromStoreId,
        p_to_store_id: toStoreId,
        p_items: items,
        p_note: note ?? null,
      });
      if (rpcError) throw rpcError;
      assertRpcSuccess(data, 'Création du transfert refusée');
      return data as Record<string, unknown>;
    },
    [],
  );

  const sendTransfer = useCallback(async (transferId: string) => {
    const { data, error: rpcError } = await supabase.rpc('send_stock_transfer', {
      p_transfer_id: transferId,
    });
    if (rpcError) throw rpcError;
    assertRpcSuccess(data, 'Expédition refusée');
  }, []);

  const receiveTransfer = useCallback(async (transferId: string) => {
    const { data, error: rpcError } = await supabase.rpc('receive_stock_transfer', {
      p_transfer_id: transferId,
    });
    if (rpcError) throw rpcError;
    assertRpcSuccess(data, 'Réception refusée');
  }, []);

  const cancelTransfer = useCallback(async (transferId: string) => {
    const { data, error: rpcError } = await supabase.rpc('cancel_stock_transfer', {
      p_transfer_id: transferId,
    });
    if (rpcError) throw rpcError;
    assertRpcSuccess(data, 'Annulation refusée');
  }, []);

  const startInventory = useCallback(async (storeId: string, note?: string) => {
    const { data, error: rpcError } = await supabase.rpc('start_inventory_session', {
      p_store_id: storeId,
      p_note: note ?? null,
    });
    if (rpcError) throw rpcError;
    assertRpcSuccess(data, 'Ouverture inventaire refusée');
    const sessionId = String((data as Record<string, unknown>).session_id);
    await loadInventorySession(sessionId);
    return sessionId;
  }, [loadInventorySession]);

  const updateInventoryCount = useCallback(async (sessionId: string, productId: string, qty: number) => {
    const { data, error: rpcError } = await supabase.rpc('update_inventory_line', {
      p_session_id: sessionId,
      p_product_id: productId,
      p_counted_qty: qty,
    });
    if (rpcError) throw rpcError;
    assertRpcSuccess(data, 'Saisie refusée');
  }, []);

  const completeInventory = useCallback(async (sessionId: string, note?: string) => {
    const { data, error: rpcError } = await supabase.rpc('complete_inventory_session', {
      p_session_id: sessionId,
      p_note: note ?? null,
    });
    if (rpcError) throw rpcError;
    assertRpcSuccess(data, 'Validation inventaire refusée');
    await loadInventorySession(sessionId);
  }, [loadInventorySession]);

  const processReturn = useCallback(
    async (input: {
      orderId: string;
      productId: string;
      quantity: number;
      reason: string;
      disposition: 'restock' | 'sav';
      refundAmount?: number;
    }) => {
      const { data, error: rpcError } = await supabase.rpc('process_customer_return', {
        p_order_id: input.orderId,
        p_product_id: input.productId,
        p_quantity: input.quantity,
        p_reason: input.reason,
        p_disposition: input.disposition,
        p_refund_amount: input.refundAmount ?? null,
      });
      if (rpcError) throw rpcError;
      assertRpcSuccess(data, 'Retour refusé');
    },
    [],
  );

  return {
    transfers,
    staleTransfers,
    movements,
    inventorySession,
    inventoryLines,
    loading,
    error,
    fetchTransfers,
    fetchMovements,
    loadInventorySession,
    createTransfer,
    sendTransfer,
    receiveTransfer,
    cancelTransfer,
    startInventory,
    updateInventoryCount,
    completeInventory,
    processReturn,
    setInventorySession,
    setInventoryLines,
  };
};
