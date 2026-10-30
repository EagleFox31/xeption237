// Helpers partagés webhook / statut paiement CamPay

export type InternalPaymentStatus = 'paid' | 'failed' | 'pending';

export const ORDER_PAID_EVENT_TYPE = 'order_paid' as const;
export const ORDER_PAID_TITLE = 'Commande payée en ligne';
export const ORDER_PAID_STATUS_LABEL = 'Paiement en ligne confirmé';

export const mapCampayStatus = (raw: string): InternalPaymentStatus => {
  const s = (raw ?? '').toUpperCase();
  if (s === 'SUCCESSFUL') return 'paid';
  if (s === 'FAILED') return 'failed';
  return 'pending';
};

export const isOrderPaymentReference = (ref: string): boolean =>
  ref.startsWith('ORDPAY-');

export const orderPaidDedupKey = (orderId: string): string =>
  `order_paid.${orderId.trim()}`;

export const formatOrderPaidChannel = (channel?: string | null): string => {
  const ch = (channel ?? '').trim().toLowerCase();
  if (ch === 'om') return 'Orange Money';
  if (ch === 'momo') return 'MTN MoMo';
  return 'Mobile Money';
};

const formatXafAmount = (amount?: number | null): string => {
  const n = Math.max(0, Math.round(Number(amount ?? 0)));
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
};

/**
 * Libellé fixe sans aucune donnée personnelle client (conforme WhatsApp / Trigenys Notify).
 * Exemple : "150 000 FCFA — Orange Money — Paiement en ligne confirmé"
 */
export const formatOrderPaidMessage = (
  amount?: number | null,
  channel?: string | null,
): string => {
  return [
    formatXafAmount(amount),
    formatOrderPaidChannel(channel),
    ORDER_PAID_STATUS_LABEL,
  ].join(' — ');
};

export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10_000,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

export async function consumeOrderStockOnPaid(
  supabaseUrl: string,
  serviceKey: string,
  orderId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchWithTimeout(
    `${supabaseUrl}/rest/v1/rpc/confirm_order_payment_and_consume_stock`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ p_order_id: orderId }),
    },
    10_000,
    fetchImpl,
  );
  if (!res.ok) {
    const err = await res.text();
    console.error('[payment] consume_stock_failed', orderId, res.status, err);
  }
}

/**
 * Émet la notification staff `order_paid` dans `admin_notifications` avec `dedup_key = order_paid.<order_id>`.
 * Idempotent côté base (`on_conflict=dedup_key`, `resolution=ignore-duplicates`) et non bloquant :
 * un échec de notification ne casse jamais la confirmation du paiement.
 */
export async function emitOrderPaidNotification(
  supabaseUrl: string,
  serviceKey: string,
  params: { orderId: string; amount?: number | null; channel?: string | null },
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const orderId = params.orderId?.trim();
  if (!orderId) return false;

  try {
    const res = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/admin_notifications?on_conflict=dedup_key`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify({
          dedup_key: orderPaidDedupKey(orderId),
          event_type: ORDER_PAID_EVENT_TYPE,
          title: ORDER_PAID_TITLE,
          message: formatOrderPaidMessage(params.amount, params.channel),
          link_to_tab: 'orders',
          link_to_id: orderId,
          target_role: null,
          created_by: 'webhook',
        }),
      },
      10_000,
      fetchImpl,
    );
    if (!res.ok) {
      console.warn('[payment] order_paid_notification_failed', orderId, res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[payment] order_paid_notification_error', orderId, err);
    return false;
  }
}

export async function patchOrderPaymentPaid(
  supabaseUrl: string,
  serviceKey: string,
  reference: string,
  campayRef: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; orderId?: string }> {
  const lookup = await fetchWithTimeout(
    `${supabaseUrl}/rest/v1/order_payments?reference=eq.${encodeURIComponent(reference)}&select=order_id,status,amount,channel&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/json' } },
    10_000,
    fetchImpl,
  );
  if (!lookup.ok) return { ok: false };

  const rows = await lookup.json();
  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  if (!row?.order_id) return { ok: false };

  const orderId = row.order_id as string;
  if (row.status === 'paid') return { ok: true, orderId };

  const now = new Date().toISOString();
  const patchPay = await fetchWithTimeout(
    `${supabaseUrl}/rest/v1/order_payments?reference=eq.${encodeURIComponent(reference)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        status: 'paid',
        campay_reference: campayRef,
        paid_at: now,
        updated_at: now,
      }),
    },
    10_000,
    fetchImpl,
  );
  if (!patchPay.ok) return { ok: false };

  await consumeOrderStockOnPaid(supabaseUrl, serviceKey, orderId, fetchImpl);
  await emitOrderPaidNotification(
    supabaseUrl,
    serviceKey,
    {
      orderId,
      amount: typeof row.amount === 'number' ? row.amount : Number(row.amount ?? 0),
      channel: typeof row.channel === 'string' ? row.channel : null,
    },
    fetchImpl,
  );
  return { ok: true, orderId };
}

export async function patchTrocPayment(
  supabaseUrl: string,
  serviceKey: string,
  reference: string,
  campayRef: string,
  internalStatus: 'paid' | 'failed',
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const updatePayload: Record<string, unknown> = {
    status: internalStatus,
    notchpay_status: campayRef,
    updated_at: new Date().toISOString(),
  };
  if (internalStatus === 'paid') updatePayload.paid_at = new Date().toISOString();

  const patchRes = await fetchWithTimeout(
    `${supabaseUrl}/rest/v1/troc_payments?reference=eq.${encodeURIComponent(reference)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(updatePayload),
    },
    10_000,
    fetchImpl,
  );
  return patchRes.ok;
}
