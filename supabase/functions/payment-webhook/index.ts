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

// CamPay envoie la clé webhook dans le header Authorization : "Token {webhook_key}"
const verifyWebhookKey = (req: Request, expectedKey: string): boolean => {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const incoming   = authHeader.replace(/^Token\s+/i, '').trim();
  return incoming === expectedKey.replace(/^Token\s+/i, '').trim();
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookKey  = Deno.env.get('CAMPAY_WEBHOOK_KEY')?.trim() || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Vérification de la clé webhook CamPay
    if (webhookKey) {
      if (!verifyWebhookKey(req, webhookKey)) {
        console.warn('[payment-webhook] invalid webhook key');
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        });
      }
    }

    const rawBody = await req.text();
    const event   = JSON.parse(rawBody);

    // CamPay webhook payload :
    // { reference, status: "SUCCESSFUL"|"FAILED", amount, operator, phone, external_reference }
    // external_reference = notre référence interne (TROC-XXXXXXXX-timestamp)
    const campayStatus: string = (event?.status ?? '').toUpperCase();
    const externalRef: string  = event?.external_reference ?? '';
    const campayRef: string    = event?.reference ?? '';

    if (!externalRef) {
      console.warn('[payment-webhook] missing external_reference', event);
      return new Response(JSON.stringify({ error: 'missing_reference' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Mapping statut CamPay → statut interne
    const internalStatus: 'paid' | 'failed' =
      campayStatus === 'SUCCESSFUL' ? 'paid' : 'failed';

    const updatePayload: Record<string, unknown> = {
      status:          internalStatus,
      notchpay_status: campayRef,
      updated_at:      new Date().toISOString(),
    };
    if (internalStatus === 'paid') {
      updatePayload.paid_at = new Date().toISOString();
    }

    // PATCH idempotent — si le webhook arrive deux fois, le résultat est le même
    const patchRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/troc_payments?reference=eq.${encodeURIComponent(externalRef)}`,
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

    if (!patchRes.ok) {
      const err = await patchRes.text();
      console.error('[payment-webhook] db_update_error', patchRes.status, err);
      // On retourne 500 pour que CamPay retente
      return new Response(JSON.stringify({ error: 'db_update_error' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.info('[payment-webhook] ok', { externalRef, campayRef, internalStatus, campayStatus });

    // CamPay attend un 200 — sinon il retente la livraison
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[payment-webhook] fatal', error);
    return new Response(JSON.stringify({ error: error?.message ?? 'unknown' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
