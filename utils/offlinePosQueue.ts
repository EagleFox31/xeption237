import type { Brand, CartItem, Category, Product } from '../types';
import type { PosPaymentMethod } from './paymentMethods';

const DB_NAME = 'xeption-offline-pos';
const DB_VERSION = 1;
const SALES_STORE = 'pendingSales';
const CATALOG_STORE = 'catalogSnapshot';
const CATALOG_KEY = 'latest';

export type OfflineSaleStatus = 'pending' | 'syncing' | 'stock_conflict' | 'failed';

export interface OfflinePosSalePayload {
  orderId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  cart: CartItem[];
  paymentMethod: PosPaymentMethod;
  total: number;
  subtotal: number;
  discountAmount: number;
  storeId: string;
  staffId: string;
  orderDate: string;
}

export interface OfflinePosSaleRecord {
  localId: string;
  createdAt: string;
  status: OfflineSaleStatus;
  lastError?: string;
  lastSyncAttempt?: string;
  payload: OfflinePosSalePayload;
}

export interface PosCatalogSnapshot {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  updatedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponible'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('Ouverture IndexedDB impossible'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SALES_STORE)) {
        db.createObjectStore(SALES_STORE, { keyPath: 'localId' });
      }
      if (!db.objectStoreNames.contains(CATALOG_STORE)) {
        db.createObjectStore(CATALOG_STORE);
      }
    };
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    Promise.resolve(run(store))
      .then((result) => {
        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result as T);
          result.onerror = () => reject(result.error ?? new Error('Requête IndexedDB échouée'));
        } else {
          resolve(result);
        }
      })
      .catch(reject);
    tx.onerror = () => reject(tx.error ?? new Error('Transaction IndexedDB échouée'));
  });
}

export const isBrowserOnline = (): boolean =>
  typeof navigator !== 'undefined' ? navigator.onLine : true;

export function isOfflinePosStockConflict(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('stock') ||
    normalized.includes('insuffisant') ||
    normalized.includes('rupture')
  );
}

export function isOfflinePosAlreadySynced(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('commande déjà enregistrée') ||
    normalized.includes('deja enregistree')
  );
}

/** Coupure réseau ou timeout pendant l'appel RPC — la vente peut déjà être passée côté serveur. */
export function isOfflinePosTransientError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('load failed') ||
    normalized.includes('fetch failed') ||
    normalized.includes('timeout') ||
    normalized.includes('aborted') ||
    normalized.includes('connection') ||
    normalized.includes('offline')
  );
}

/** Au redémarrage navigateur, une vente peut être restée en `syncing` si l'onglet a été fermé mid-flight. */
export async function recoverInterruptedOfflinePosSales(): Promise<number> {
  const rows = await listOfflinePosSales();
  let recovered = 0;
  for (const row of rows) {
    if (row.status !== 'syncing') continue;
    await updateOfflinePosSale({
      ...row,
      status: 'pending',
      lastError: undefined,
    });
    recovered += 1;
  }
  return recovered;
}

export async function listOfflinePosSales(): Promise<OfflinePosSaleRecord[]> {
  try {
    const rows = await withStore<OfflinePosSaleRecord[]>(SALES_STORE, 'readonly', (store) => store.getAll());
    return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function enqueueOfflinePosSale(payload: OfflinePosSalePayload): Promise<OfflinePosSaleRecord> {
  const record: OfflinePosSaleRecord = {
    localId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    payload,
  };
  await withStore(SALES_STORE, 'readwrite', (store) => store.put(record));
  return record;
}

export async function updateOfflinePosSale(record: OfflinePosSaleRecord): Promise<void> {
  await withStore(SALES_STORE, 'readwrite', (store) => store.put(record));
}

export async function removeOfflinePosSale(localId: string): Promise<void> {
  await withStore(SALES_STORE, 'readwrite', (store) => store.delete(localId));
}

export async function savePosCatalogSnapshot(snapshot: Omit<PosCatalogSnapshot, 'updatedAt'>): Promise<void> {
  const payload: PosCatalogSnapshot = {
    ...snapshot,
    updatedAt: new Date().toISOString(),
  };
  await withStore(CATALOG_STORE, 'readwrite', (store) => store.put(payload, CATALOG_KEY));
}

export async function loadPosCatalogSnapshot(): Promise<PosCatalogSnapshot | null> {
  try {
    return await withStore<PosCatalogSnapshot | undefined>(CATALOG_STORE, 'readonly', (store) =>
      store.get(CATALOG_KEY),
    ).then((value) => value ?? null);
  } catch {
    return null;
  }
}
