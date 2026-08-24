import { supabase } from './supabaseClient';
import {
  isOfflinePosAlreadySynced,
  isOfflinePosStockConflict,
  isOfflinePosTransientError,
  removeOfflinePosSale,
  updateOfflinePosSale,
  type OfflinePosSaleRecord,
} from '../utils/offlinePosQueue';
import { assertRpcSuccess } from '../utils/rpcResult';

export type OfflineSyncItemResult =
  | 'synced'
  | 'stock_conflict'
  | 'failed'
  | 'interrupted'
  | 'skipped';

export interface OfflineSyncSummary {
  synced: number;
  stockConflicts: number;
  failed: number;
  skipped: number;
}

export async function syncOfflinePosSale(record: OfflinePosSaleRecord): Promise<OfflineSyncItemResult> {
  if (record.payload.paymentMethod === 'TROC') {
    return 'failed';
  }

  const syncing: OfflinePosSaleRecord = {
    ...record,
    status: 'syncing',
    lastSyncAttempt: new Date().toISOString(),
  };
  await updateOfflinePosSale(syncing);

  const rpcPayment = record.payload.paymentMethod === 'CARD' ? 'CARD' : record.payload.paymentMethod;
  const { data, error } = await supabase.rpc('complete_pos_sale_atomic', {
    p_order_id: record.payload.orderId,
    p_customer_name: record.payload.customerName,
    p_customer_email: record.payload.customerEmail,
    p_customer_phone: record.payload.customerPhone,
    p_customer_city: 'Retrait Boutique (POS)',
    p_delivery_mode: 'pickup',
    p_payment_method: rpcPayment,
    p_total: record.payload.total,
    p_items: record.payload.cart,
    p_date: record.payload.orderDate,
    p_status: 'delivered',
    p_store_id: record.payload.storeId,
    p_staff_id: record.payload.staffId,
    p_discount_amount: record.payload.discountAmount,
  });

  if (error) {
    const message = error.message || 'Synchronisation impossible.';
    if (isOfflinePosAlreadySynced(message)) {
      await removeOfflinePosSale(record.localId);
      return 'synced';
    }
    if (isOfflinePosStockConflict(message)) {
      await updateOfflinePosSale({
        ...record,
        status: 'stock_conflict',
        lastError: message,
        lastSyncAttempt: new Date().toISOString(),
      });
      return 'stock_conflict';
    }
    if (isOfflinePosTransientError(message)) {
      await updateOfflinePosSale({
        ...record,
        status: 'pending',
        lastError: undefined,
        lastSyncAttempt: new Date().toISOString(),
      });
      return 'interrupted';
    }
    await updateOfflinePosSale({
      ...record,
      status: 'failed',
      lastError: message,
      lastSyncAttempt: new Date().toISOString(),
    });
    return 'failed';
  }

  try {
    assertRpcSuccess(data, 'Stock insuffisant ou article invalide.');
    await removeOfflinePosSale(record.localId);
    return 'synced';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Synchronisation refusée.';
    if (isOfflinePosAlreadySynced(message)) {
      await removeOfflinePosSale(record.localId);
      return 'synced';
    }
    if (isOfflinePosStockConflict(message)) {
      await updateOfflinePosSale({
        ...record,
        status: 'stock_conflict',
        lastError: message,
        lastSyncAttempt: new Date().toISOString(),
      });
      return 'stock_conflict';
    }
    await updateOfflinePosSale({
      ...record,
      status: 'failed',
      lastError: message,
      lastSyncAttempt: new Date().toISOString(),
    });
    return 'failed';
  }
}

export async function syncAllOfflinePosSales(
  records: OfflinePosSaleRecord[],
): Promise<OfflineSyncSummary> {
  const summary: OfflineSyncSummary = {
    synced: 0,
    stockConflicts: 0,
    failed: 0,
    skipped: 0,
  };

  for (const record of records) {
    if (record.status === 'syncing') {
      summary.skipped += 1;
      continue;
    }
    if (record.status === 'stock_conflict') {
      summary.skipped += 1;
      continue;
    }

    const result = await syncOfflinePosSale(record);
    if (result === 'synced') summary.synced += 1;
    else if (result === 'stock_conflict') summary.stockConflicts += 1;
    else if (result === 'failed') summary.failed += 1;
    else summary.skipped += 1;
  }

  return summary;
}
