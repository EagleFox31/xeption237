import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Brand, Category, Product } from '../types';
import { syncOfflinePosSale } from '../../services/offlinePosSync';
import {
  isBrowserOnline,
  listOfflinePosSales,
  loadPosCatalogSnapshot,
  recoverInterruptedOfflinePosSales,
  removeOfflinePosSale,
  savePosCatalogSnapshot,
  updateOfflinePosSale,
  type OfflinePosSaleRecord,
  type PosCatalogSnapshot,
} from '../../utils/offlinePosQueue';

export interface OfflinePosSyncFeedback {
  synced: number;
  stockConflicts: number;
  failed: number;
}

interface UseOfflinePosOptions {
  onSyncComplete?: (result: OfflinePosSyncFeedback) => void;
  onStockConflict?: (record: OfflinePosSaleRecord) => void;
}

export function useOfflinePos(options: UseOfflinePosOptions = {}) {
  const [isOnline, setIsOnline] = useState(isBrowserOnline);
  const [queue, setQueue] = useState<OfflinePosSaleRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [catalogSnapshot, setCatalogSnapshot] = useState<PosCatalogSnapshot | null>(null);
  const syncingRef = useRef(false);
  const onSyncCompleteRef = useRef(options.onSyncComplete);
  const onStockConflictRef = useRef(options.onStockConflict);

  useEffect(() => {
    onSyncCompleteRef.current = options.onSyncComplete;
    onStockConflictRef.current = options.onStockConflict;
  }, [options.onSyncComplete, options.onStockConflict]);

  const refreshQueue = useCallback(async () => {
    const rows = await listOfflinePosSales();
    setQueue(rows);
    return rows;
  }, []);

  useEffect(() => {
    void recoverInterruptedOfflinePosSales()
      .then(() => refreshQueue())
      .catch(() => refreshQueue());
    void loadPosCatalogSnapshot().then(setCatalogSnapshot);
  }, [refreshQueue]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const cacheCatalog = useCallback(
    async (payload: { products: Product[]; categories: Category[]; brands: Brand[] }) => {
      if (payload.products.length === 0) return;
      await savePosCatalogSnapshot(payload);
      setCatalogSnapshot({
        ...payload,
        updatedAt: new Date().toISOString(),
      });
    },
    [],
  );

  const syncQueue = useCallback(async () => {
    if (!isBrowserOnline() || syncingRef.current) return null;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const rows = await refreshQueue();
      const actionable = rows.filter(
        (row) => row.status === 'pending' || row.status === 'failed' || row.status === 'syncing',
      );
      if (actionable.length === 0) return { synced: 0, stockConflicts: 0, failed: 0 };

      const summary = { synced: 0, stockConflicts: 0, failed: 0 };
      for (const record of actionable) {
        const result = await syncOfflinePosSale(record);
        if (result === 'synced') summary.synced += 1;
        else if (result === 'stock_conflict') {
          summary.stockConflicts += 1;
          const updated = (await listOfflinePosSales()).find((row) => row.localId === record.localId);
          if (updated) onStockConflictRef.current?.(updated);
        } else if (result === 'failed') summary.failed += 1;
      }

      await refreshQueue();

      const feedback = {
        synced: summary.synced,
        stockConflicts: summary.stockConflicts,
        failed: summary.failed,
      };
      if (summary.synced > 0 || summary.stockConflicts > 0 || summary.failed > 0) {
        onSyncCompleteRef.current?.(feedback);
      }
      return feedback;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refreshQueue]);

  useEffect(() => {
    if (!isOnline) return;
    void syncQueue();
  }, [isOnline, syncQueue]);

  const retrySale = useCallback(
    async (localId: string) => {
      const rows = await refreshQueue();
      const record = rows.find((row) => row.localId === localId);
      if (!record || !isBrowserOnline()) return null;

      setSyncing(true);
      try {
        const reset: OfflinePosSaleRecord = { ...record, status: 'pending', lastError: undefined };
        await updateOfflinePosSale(reset);
        const result = await syncOfflinePosSale(reset);
        await refreshQueue();
        if (result === 'stock_conflict') {
          const updated = (await listOfflinePosSales()).find((row) => row.localId === localId);
          if (updated) onStockConflictRef.current?.(updated);
        }
        return result;
      } finally {
        setSyncing(false);
      }
    },
    [refreshQueue],
  );

  const dismissSale = useCallback(
    async (localId: string) => {
      await removeOfflinePosSale(localId);
      await refreshQueue();
    },
    [refreshQueue],
  );

  const pendingCount = useMemo(
    () =>
      queue.filter(
        (row) =>
          row.status === 'pending' || row.status === 'failed' || row.status === 'syncing',
      ).length,
    [queue],
  );

  const conflictCount = useMemo(
    () => queue.filter((row) => row.status === 'stock_conflict').length,
    [queue],
  );

  return {
    isOnline,
    queue,
    pendingCount,
    conflictCount,
    syncing,
    catalogSnapshot,
    cacheCatalog,
    refreshQueue,
    syncQueue,
    retrySale,
    dismissSale,
  };
}
