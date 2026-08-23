// Helpers partagés webhook / statut paiement CamPay

export type InternalPaymentStatus = 'paid' | 'failed' | 'pending';

export const mapCampayStatus = (raw: string): InternalPaymentStatus => {
  const s = (raw ?? '').toUpperCase();
  if (s === 'SUCCESSFUL') return 'paid';
  if (s === 'FAILED') return 'failed';
  return 'pending';
};

export const isOrderPaymentReference = (ref: string): boolean =>
  ref.startsWith('ORDPAY-');

export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10_000,
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

export async function consumeOrderStockOnPaid(
  supabaseUrl: string,
  serviceKey: string,
  orderId: string,
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
  );
  if (!res.ok) {
    const err = await res.text();
    console.error('[payment] consume_stock_failed', orderId, res.status, err);
  }
}

export async function patchOrderPaymentPaid(
  supabaseUrl: string,
  serviceKey: string,
  reference: string,
  campayRef: string,
): Promise<{ ok: boolean; orderId?: string }> {
  const lookup = await fetchWithTimeout(
    `${supabaseUrl}/rest/v1/order_payments?reference=eq.${encodeURIComponent(reference)}&select=order_id,status&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/json' } },
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
  );
  if (!patchPay.ok) return { ok: false };

  await consumeOrderStockOnPaid(supabaseUrl, serviceKey, orderId);
  return { ok: true, orderId };
}

export async function patchTrocPayment(
  supabaseUrl: string,
  serviceKey: string,
  reference: string,
  campayRef: string,
  internalStatus: 'paid' | 'failed',
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
  );
  return patchRes.ok;
}
