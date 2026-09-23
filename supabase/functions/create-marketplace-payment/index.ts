// @ts-ignore
const Deno = globalThis.Deno;

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IS_SANDBOX = (Deno.env.get('CAMPAY_BASE_URL') || '').includes('demo');

// Barème progressif basé sur le prix max de l'annonce.
// Sandbox Campay plafonne à 25 XAF quel que soit le tier.
const computeFee = (priceMax: number): number => {
  if (IS_SANDBOX) return 25;
  if (priceMax < 100_000) return 100;
  if (priceMax < 200_000) return 200;
  if (priceMax < 500_000) return 500;
  return 1000;
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

const normalizePhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').replace(/^237/, '');
  return `237${digits}`;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const rawPhone = String(body.phone ?? '').trim();
    const priceMax = Number(body.priceMax ?? 0);

    if (!rawPhone) {
      return new Response(JSON.stringify({ error: 'phone requis' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!Number.isFinite(priceMax) || priceMax <= 0) {
      return new Response(JSON.stringify({ error: 'priceMax requis (> 0)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const digits = rawPhone.replace(/\D/g, '').replace(/^237/, '');
    if (!/^[62]\d{8}$/.test(digits)) {
      return new Response(JSON.stringify({ error: 'Numéro invalide (format camerounais)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const amount = computeFee(priceMax);

    const rawToken   = Deno.env.get('CAMPAY_API_TOKEN')?.trim() || '';
    const campayToken = rawToken.startsWith('Token ') ? rawToken : `Token ${rawToken}`;
    const campayBase  = Deno.env.get('CAMPAY_BASE_URL') || 'https://campay.net/api';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!campayToken || campayToken === 'Token ') {
      return new Response(
        JSON.stringify({ error: 'Paiement temporairement indisponible', code: 'campay_not_configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 },
      );
    }

    const phone = normalizePhone(rawPhone);
    const reference = `MKT-${Math.random().toString(36).slice(2, 10).toUpperCase()}-${Date.now()}`;

    const collectRes = await fetchWithTimeout(
      `${campayBase}/collect/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: campayToken },
        body: JSON.stringify({
          amount:             String(amount),
          from:               phone,
          description:        'Frais de publication — Marketplace Xeption',
          external_reference: reference,
        }),
      },
    );

    if (!collectRes.ok) {
      const errText = await collectRes.text();
      console.error('[create-marketplace-payment] campay_error', collectRes.status, errText);
      let userMessage = 'Paiement temporairement indisponible. Réessayez dans quelques instants.';
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.error_code === 'ER101') userMessage = 'Numéro de téléphone invalide.';
        if (errJson?.error_code === 'ER102') userMessage = 'Ce numéro n\'est pas un numéro Mobile Money MTN ou Orange.';
      } catch { /* ignore */ }
      return new Response(
        JSON.stringify({ error: userMessage, code: 'campay_error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 },
      );
    }

    const campayData   = await collectRes.json();
    const campayRef    = campayData?.reference ?? null;
    const operator     = campayData?.operator ?? null;
    const channel: 'om' | 'momo' = operator === 'MTN' ? 'momo' : 'om';

    await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/marketplace_payments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          reference,
          campay_ref:  campayRef,
          phone,
          channel,
          amount:      amount,
          status:      'pending',
          updated_at:  new Date().toISOString(),
        }),
      },
    );

    console.info('[create-marketplace-payment] initiated', { reference, campayRef, operator });

    return new Response(
      JSON.stringify({ reference, amount: amount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err: any) {
    console.error('[create-marketplace-payment] fatal', err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'unknown', code: 'fatal' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
