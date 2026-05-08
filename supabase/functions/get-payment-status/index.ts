// @ts-ignore
const Deno = globalThis.Deno;

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const fetchWithTimeout = async (
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sessionKey, reference } = await req.json();

    if (!sessionKey || !reference) {
      return new Response(JSON.stringify({ error: 'sessionKey et reference requis' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const rawToken    = Deno.env.get('CAMPAY_API_TOKEN')?.trim() || '';
    const campayToken = rawToken.startsWith('Token ') ? rawToken : `Token ${rawToken}`;
    const campayBase  = Deno.env.get('CAMPAY_BASE_URL') || 'https://campay.net/api';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // 1. Lire le statut en DB
    const dbRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/troc_payments?session_key=eq.${encodeURIComponent(sessionKey)}&reference=eq.${encodeURIComponent(reference)}&select=status,notchpay_status&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/json' } },
    );

    const rows = dbRes.ok ? await dbRes.json() : [];
    const row  = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!row) {
      return new Response(JSON.stringify({ status: 'not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Si déjà paid/failed/expired en DB → retourner directement
    if (row.status !== 'pending') {
      return new Response(JSON.stringify({ status: row.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Toujours pending → interroger CamPay directement
    // campayReference = UUID interne CamPay stocké dans notchpay_status
    const campayRef = row.notchpay_status;
    if (!campayRef || !campayToken) {
      return new Response(JSON.stringify({ status: 'pending' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const campayRes = await fetchWithTimeout(
      `${campayBase}/transaction/${campayRef}/`,
      { headers: { Authorization: campayToken, Accept: 'application/json' } },
    );

    if (!campayRes.ok) {
      console.warn('[get-payment-status] campay_status_check_failed', campayRes.status);
      return new Response(JSON.stringify({ status: 'pending' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const campayData  = await campayRes.json();
    const campayStatus = (campayData?.status ?? '').toUpperCase();

    const internalStatus: 'paid' | 'failed' | 'pending' =
      campayStatus === 'SUCCESSFUL' ? 'paid'    :
      campayStatus === 'FAILED'     ? 'failed'  :
      'pending';

    // 3. Si le statut a changé, mettre à jour la DB
    if (internalStatus !== 'pending') {
      const updatePayload: Record<string, unknown> = {
        status:     internalStatus,
        updated_at: new Date().toISOString(),
      };
      if (internalStatus === 'paid') updatePayload.paid_at = new Date().toISOString();

      await fetchWithTimeout(
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

      console.info('[get-payment-status] status updated', { reference, internalStatus, campayStatus });
    }

    return new Response(JSON.stringify({ status: internalStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[get-payment-status] fatal', error);
    return new Response(JSON.stringify({ status: 'pending' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
