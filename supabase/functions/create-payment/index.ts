// @ts-ignore
const Deno = globalThis.Deno;

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IS_SANDBOX     = (Deno.env.get('CAMPAY_BASE_URL') || '').includes('demo');
const PAYMENT_AMOUNT = IS_SANDBOX ? 25 : 150;
const IDEMPOTENCY_WINDOW_MINUTES = 15;

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

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const normalizePhone = (raw: string): string => {
  // Supprime tout sauf les chiffres, enlève le préfixe 237 s'il est déjà là, puis le rajoute
  const digits = raw.replace(/\D/g, '').replace(/^237/, '');
  return `237${digits}`;
};

const validateBody = (body: any): string | null => {
  if (!str(body.sessionKey).trim()) return 'sessionKey requis';
  if (!str(body.phone).trim())      return 'phone requis';
  const digits = str(body.phone).replace(/\D/g, '').replace(/^237/, '');
  if (!/^[62]\d{8}$/.test(digits))  return 'phone invalide (format camerounais)';
  return null;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const validationError = validateBody(body);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const rawToken    = Deno.env.get('CAMPAY_API_TOKEN')?.trim() || '';
    // Normalise : accepte "Token xxx" ou juste "xxx"
    const campayToken = rawToken.startsWith('Token ') ? rawToken : `Token ${rawToken}`;
    const campayBase  = Deno.env.get('CAMPAY_BASE_URL') || 'https://campay.net/api';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!campayToken) {
      return new Response(
        JSON.stringify({ error: 'Paiement temporairement indisponible', code: 'campay_not_configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 },
      );
    }

    const { sessionKey, phone } = body;
    const normalizedPhone = normalizePhone(str(phone));

    // ── Idempotence : réutiliser une tentative pending récente ───────────────
    const windowStart = new Date(Date.now() - IDEMPOTENCY_WINDOW_MINUTES * 60 * 1_000).toISOString();
    const existingRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/troc_payments?session_key=eq.${encodeURIComponent(sessionKey)}&status=eq.pending&created_at=gte.${encodeURIComponent(windowStart)}&order=created_at.desc&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/json' } },
    );

    if (existingRes.ok) {
      const existing = await existingRes.json();
      if (Array.isArray(existing) && existing.length > 0) {
        const row = existing[0];
        console.info('[create-payment] reusing existing pending', row.reference);
        // Retourner sans authorization_url — le client attend déjà le USSD
        return new Response(
          JSON.stringify({ reference: row.reference, paymentUrl: null, reused: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }
    }

    // ── Nouvelle tentative ───────────────────────────────────────────────────
    const reference = `TROC-${sessionKey.slice(0, 8).toUpperCase()}-${Date.now()}`;

    const collectRes = await fetchWithTimeout(
      `${campayBase}/collect/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': campayToken,
        },
        body: JSON.stringify({
          amount:             String(PAYMENT_AMOUNT),
          from:               normalizedPhone,
          description:        'Estimation Smart Troc — Xeption Network',
          external_reference: reference,
        }),
      },
    );

    if (!collectRes.ok) {
      const errText = await collectRes.text();
      console.error('[create-payment] campay_error', collectRes.status, errText);

      // Erreurs connues CamPay
      let userMessage = 'Paiement temporairement indisponible. Réessayez dans quelques instants.';
      let campayDetail: unknown = errText;
      try {
        const errJson = JSON.parse(errText);
        campayDetail = errJson;
        if (errJson?.error_code === 'ER101') userMessage = 'Numéro de téléphone invalide.';
        if (errJson?.error_code === 'ER102') userMessage = 'Ce numéro n\'est pas un numéro Mobile Money MTN ou Orange.';
      } catch { /* ignore */ }

      return new Response(
        JSON.stringify({ error: userMessage, code: 'campay_error', campay_status: collectRes.status, campay_detail: campayDetail }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 },
      );
    }

    const campayData = await collectRes.json();
    // campayData = { reference: "uuid", status: "PENDING", operator: "MTN"|"Orange" }
    const campayReference = campayData?.reference ?? null;
    const operator        = campayData?.operator ?? null;
    // channel : MTN → momo, Orange → om
    const channel: 'om' | 'momo' = operator === 'MTN' ? 'momo' : 'om';

    // Persiste en DB
    const insertRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/troc_payments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          session_key:     sessionKey,
          reference,
          amount:          PAYMENT_AMOUNT,
          currency:        'XAF',
          channel,
          phone:           normalizedPhone,
          status:          'pending',
          notchpay_status: campayReference, // stocke la référence interne CamPay
          updated_at:      new Date().toISOString(),
        }),
      },
    );

    if (!insertRes.ok) {
      console.error('[create-payment] db_insert_error', await insertRes.text());
    }

    console.info('[create-payment] initiated', { reference, campayReference, operator });

    // CamPay ne retourne pas d'URL de redirection — le client attend le USSD sur son téléphone
    return new Response(
      JSON.stringify({ reference, paymentUrl: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: any) {
    console.error('[create-payment] fatal', error);
    return new Response(
      JSON.stringify({ error: error?.message ?? 'unknown', code: 'fatal' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
