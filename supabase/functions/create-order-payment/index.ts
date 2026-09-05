// @ts-ignore
const Deno = globalThis.Deno;

import { fetchWithTimeout } from '../_shared/orderPayment.ts';

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IS_SANDBOX = (Deno.env.get('CAMPAY_BASE_URL') || '').includes('demo');
const SANDBOX_AMOUNT = 25;

const normalizePhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').replace(/^237/, '');
  return `237${digits}`;
};

const resolveAmount = (total: number): number =>
  IS_SANDBOX ? SANDBOX_AMOUNT : Math.max(Math.round(total), 1);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Session staff requise' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const body = await req.json();
    const orderId = String(body.orderId ?? '').trim();
    const phoneRaw = String(body.phone ?? '').trim();

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId requis' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const digits = phoneRaw.replace(/\D/g, '').replace(/^237/, '');
    if (!/^[62]\d{8}$/.test(digits)) {
      return new Response(JSON.stringify({ error: 'Numéro Mobile Money invalide' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const rawToken = Deno.env.get('CAMPAY_API_TOKEN')?.trim() || '';
    const campayToken = rawToken.startsWith('Token ') ? rawToken : `Token ${rawToken}`;
    const campayBase = Deno.env.get('CAMPAY_BASE_URL') || 'https://campay.net/api';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!campayToken) {
      return new Response(JSON.stringify({ error: 'Paiement temporairement indisponible' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 503,
      });
    }

    const userRes = await fetchWithTimeout(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${jwt}` },
    });
    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: 'Session invalide' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const user = await userRes.json();
    const email = (user?.email ?? '').toLowerCase();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Compte staff requis' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const staffRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/staff?email=eq.${encodeURIComponent(email)}&select=id&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/json' } },
    );
    const staffRows = staffRes.ok ? await staffRes.json() : [];
    const staffId = staffRows?.[0]?.id ?? null;
    if (!staffId) {
      return new Response(JSON.stringify({ error: 'Accès réservé à l\'équipe' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const orderRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,total,status,payment_method,payment_status,delivery_mode&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/json' } },
    );
    const orderRows = orderRes.ok ? await orderRes.json() : [];
    const order = orderRows?.[0];
    if (!order) {
      return new Response(JSON.stringify({ error: 'Commande introuvable' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    if (order.status === 'cancelled') {
      return new Response(JSON.stringify({ error: 'Commande annulée' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (order.payment_status === 'paid') {
      return new Response(JSON.stringify({ error: 'Commande déjà payée', alreadyPaid: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409,
      });
    }

    const method = String(order.payment_method ?? '').toUpperCase();
    if (method === 'CASH') {
      return new Response(JSON.stringify({ error: 'Utilisez « Espèces reçues » pour cette commande' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const allowedStatuses = ['confirmed', 'shipped', 'ready'];
    if (!allowedStatuses.includes(order.status)) {
      return new Response(JSON.stringify({
        error: 'Encaissement disponible après validation de la commande (confirmée / expédiée / prête)',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const paymentAmount = resolveAmount(Number(order.total ?? 0));
    const normalizedPhone = normalizePhone(phoneRaw);
    const reference = `ORDPAY-${orderId}-${Date.now()}`;
    const channel: 'om' | 'momo' = method.includes('MTN') || method === 'MOMO' ? 'momo' : 'om';

    const collectRes = await fetchWithTimeout(
      `${campayBase}/collect/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: campayToken },
        body: JSON.stringify({
          amount: String(paymentAmount),
          from: normalizedPhone,
          description: `Commande ${orderId} — Xeption`,
          external_reference: reference,
        }),
      },
      15_000,
    );

    if (!collectRes.ok) {
      const errText = await collectRes.text();
      console.error('[create-order-payment] campay_error', collectRes.status, errText);
      return new Response(JSON.stringify({ error: 'Paiement Mobile Money indisponible' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }

    const campayData = await collectRes.json();
    const campayReference = campayData?.reference ?? null;

    const insertRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/order_payments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          order_id: orderId,
          reference,
          amount: paymentAmount,
          currency: 'XAF',
          channel,
          phone: normalizedPhone,
          status: 'pending',
          campay_reference: campayReference,
          staff_id: staffId,
          updated_at: new Date().toISOString(),
        }),
      },
    );

    if (!insertRes.ok) {
      console.error('[create-order-payment] db_insert_error', await insertRes.text());
      return new Response(JSON.stringify({ error: 'Enregistrement paiement impossible' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.info('[create-order-payment] initiated', { orderId, reference, campayReference, amount: paymentAmount });

    return new Response(
      JSON.stringify({ reference, amount: paymentAmount, channel }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown';
    console.error('[create-order-payment] fatal', error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
