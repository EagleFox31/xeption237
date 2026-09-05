// @ts-ignore
const Deno = globalThis.Deno;

import {
  fetchWithTimeout,
  isOrderPaymentReference,
  mapCampayStatus,
  patchOrderPaymentPaid,
  patchTrocPayment,
} from '../_shared/orderPayment.ts';

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const verifyWebhookKey = (req: Request, expectedKey: string): boolean => {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
  const incoming = authHeader.replace(/^Token\s+/i, '').trim();
  return incoming === expectedKey.replace(/^Token\s+/i, '').trim();
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const webhookKey = Deno.env.get('CAMPAY_WEBHOOK_KEY')?.trim() || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (webhookKey && !verifyWebhookKey(req, webhookKey)) {
      console.warn('[payment-webhook] invalid webhook key');
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const event = JSON.parse(await req.text());
    const campayStatus: string = event?.status ?? '';
    const externalRef: string = event?.external_reference ?? '';
    const campayRef: string = event?.reference ?? '';

    if (!externalRef) {
      return new Response(JSON.stringify({ error: 'missing_reference' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const internalStatus = mapCampayStatus(campayStatus);
    if (internalStatus === 'pending') {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (isOrderPaymentReference(externalRef)) {
      if (internalStatus !== 'paid') {
        await fetchWithTimeout(
          `${supabaseUrl}/rest/v1/order_payments?reference=eq.${encodeURIComponent(externalRef)}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({ status: 'failed', campay_reference: campayRef, updated_at: new Date().toISOString() }),
          },
        );
      } else {
        const result = await patchOrderPaymentPaid(supabaseUrl, serviceKey, externalRef, campayRef);
        if (!result.ok) {
          return new Response(JSON.stringify({ error: 'db_update_error' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          });
        }
        console.info('[payment-webhook] order paid', { externalRef, orderId: result.orderId });
      }
    } else {
      const ok = await patchTrocPayment(supabaseUrl, serviceKey, externalRef, campayRef, internalStatus);
      if (!ok) {
        return new Response(JSON.stringify({ error: 'db_update_error' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      console.info('[payment-webhook] troc ok', { externalRef, internalStatus });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown';
    console.error('[payment-webhook] fatal', error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
