export type StockTransferStatus = 'draft' | 'sent' | 'received' | 'cancelled';

export interface StockTransferItem {
  product_id: string;
  product_name: string;
  quantity: number;
}

export interface StockTransferRow {
  id: string;
  from_store_id: string;
  from_store_name: string;
  to_store_id: string;
  to_store_name: string;
  status: StockTransferStatus;
  note: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
  items: StockTransferItem[];
  days_in_transit: number | null;
}

export interface StaleTransferAlert {
  id: string;
  from_store_name: string;
  to_store_name: string;
  sent_at: string;
  days_in_transit: number;
  item_count: number;
}

export interface InventoryLine {
  product_id: string;
  product_name: string;
  expected_qty: number;
  counted_qty: number | null;
  variance: number | null;
}

export interface InventorySession {
  id: string;
  store_id: string;
  status: 'open' | 'completed' | 'cancelled';
  note: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface StockMovementRow {
  id: string;
  store_id: string;
  store_name: string | null;
  product_id: string;
  product_name: string;
  delta: number;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  note: string | null;
  created_at: string;
}

export const STOCK_MOVEMENT_REASON_LABELS: Record<string, string> = {
  sale: 'Vente boutique',
  online_sale: 'Vente en ligne',
  return: 'Retour client',
  transfer_out: 'Transfert — envoi',
  transfer_in: 'Transfert — réception',
  inventory_adjust: 'Inventaire',
  troc_intake: 'Reprise troc',
  reservation_release: 'Libération réservation',
  initial_backfill: 'Initialisation',
  redistribution: 'Répartition',
  loss: 'Perte',
};

export const TRANSFER_STATUS_LABELS: Record<StockTransferStatus, string> = {
  draft: 'Brouillon',
  sent: 'En transit',
  received: 'Reçu',
  cancelled: 'Annulé',
};

const num = (v: unknown, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

export const parseTransferRows = (data: unknown): StockTransferRow[] =>
  ((data ?? []) as Record<string, unknown>[]).map((t) => ({
    id: String(t.id),
    from_store_id: String(t.from_store_id),
    from_store_name: String(t.from_store_name ?? ''),
    to_store_id: String(t.to_store_id),
    to_store_name: String(t.to_store_name ?? ''),
    status: String(t.status) as StockTransferStatus,
    note: (t.note as string | null) ?? null,
    sent_at: (t.sent_at as string | null) ?? null,
    received_at: (t.received_at as string | null) ?? null,
    created_at: String(t.created_at ?? ''),
    days_in_transit: t.days_in_transit != null ? num(t.days_in_transit) : null,
    items: ((t.items ?? []) as Record<string, unknown>[]).map((i) => ({
      product_id: String(i.product_id),
      product_name: String(i.product_name ?? ''),
      quantity: num(i.quantity),
    })),
  }));

export const parseStaleTransfers = (data: unknown): StaleTransferAlert[] =>
  ((data ?? []) as Record<string, unknown>[]).map((t) => ({
    id: String(t.id),
    from_store_name: String(t.from_store_name ?? ''),
    to_store_name: String(t.to_store_name ?? ''),
    sent_at: String(t.sent_at ?? ''),
    days_in_transit: num(t.days_in_transit),
    item_count: num(t.item_count),
  }));

export const parseMovementRows = (data: unknown): StockMovementRow[] =>
  ((data ?? []) as Record<string, unknown>[]).map((m) => ({
    id: String(m.id),
    store_id: String(m.store_id),
    store_name: (m.store_name as string | null) ?? null,
    product_id: String(m.product_id),
    product_name: String(m.product_name ?? ''),
    delta: num(m.delta),
    reason: String(m.reason ?? ''),
    ref_type: (m.ref_type as string | null) ?? null,
    ref_id: (m.ref_id as string | null) ?? null,
    note: (m.note as string | null) ?? null,
    created_at: String(m.created_at ?? ''),
  }));

export const parseInventorySessionPayload = (data: unknown) => {
  const d = (data ?? {}) as Record<string, unknown>;
  if (d.success === false) return null;
  const s = (d.session ?? {}) as Record<string, unknown>;
  const session: InventorySession = {
    id: String(s.id),
    store_id: String(s.store_id),
    status: String(s.status) as InventorySession['status'],
    note: (s.note as string | null) ?? null,
    created_at: String(s.created_at ?? ''),
    completed_at: (s.completed_at as string | null) ?? null,
  };
  const lines: InventoryLine[] = ((d.lines ?? []) as Record<string, unknown>[]).map((l) => ({
    product_id: String(l.product_id),
    product_name: String(l.product_name ?? ''),
    expected_qty: num(l.expected_qty),
    counted_qty: l.counted_qty != null ? num(l.counted_qty) : null,
    variance: l.variance != null ? num(l.variance) : null,
  }));
  return { session, lines };
};
