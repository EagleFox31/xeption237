// @ts-ignore
const Deno = globalThis.Deno;

import {
  fetchWithTimeout,
  isOrderPaymentReference,
  mapCampayStatus,
  patchOrderPaymentPaid,
} from '../_shared/orderPayment.ts';

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const sessionKey = body.sessionKey as string | undefined;
    const reference = body.reference as string | undefined;

    if (!reference) {
      return new Response(JSON.stringify({ error: 'reference requis' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const rawToken = Deno.env.get('CAMPAY_API_TOKEN')?.trim() || '';
    const campayToken = rawToken.startsWith('Token ') ? rawToken : `Token ${rawToken}`;
    const campayBase = Deno.env.get('CAMPAY_BASE_URL') || 'https://campay.net/api';
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const isOrder = isOrderPaymentReference(reference);
    const table = isOrder ? 'order_payments' : 'troc_payments';
    const campayField = isOrder ? 'campay_reference' : 'notchpay_status';

    let query = `${supabaseUrl}/rest/v1/${table}?reference=eq.${encodeURIComponent(reference)}&select=status,${campayField}${isOrder ? ',order_id' : ''}&limit=1`;
    if (!isOrder && sessionKey) {
      query = `${supabaseUrl}/rest/v1/troc_payments?session_key=eq.${encodeURIComponent(sessionKey)}&reference=eq.${encodeURIComponent(reference)}&select=status,notchpay_status&limit=1`;
    }

    const dbRes = await fetchWithTimeout(query, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/json' },
    });

    const rows = dbRes.ok ? await dbRes.json() : [];
    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!row) {
      return new Response(JSON.stringify({ status: 'not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (row.status !== 'pending') {
      return new Response(JSON.stringify({ status: row.status, kind: isOrder ? 'order' : 'troc' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const campayRef = row[campayField];
    if (!campayRef || !campayToken) {
      return new Response(JSON.stringify({ status: 'pending' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const campayRes = await fetchWithTimeout(`${campayBase}/transaction/${campayRef}/`, {
      headers: { Authorization: campayToken, Accept: 'application/json' },
    });

    if (!campayRes.ok) {
      return new Response(JSON.stringify({ status: 'pending' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const campayData = await campayRes.json();
    const internalStatus = mapCampayStatus(campayData?.status ?? '');

    if (internalStatus === 'paid' && isOrder) {
      await patchOrderPaymentPaid(supabaseUrl, serviceKey, reference, campayRef);
    } else if (internalStatus !== 'pending' && !isOrder) {
      const updatePayload: Record<string, unknown> = {
        status: internalStatus,
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
    } else if (internalStatus === 'failed' && isOrder) {
      await fetchWithTimeout(
        `${supabaseUrl}/rest/v1/order_payments?reference=eq.${encodeURIComponent(reference)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({ status: 'failed', updated_at: new Date().toISOString() }),
        },
      );
    }

    return new Response(JSON.stringify({ status: internalStatus, kind: isOrder ? 'order' : 'troc' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: unknown) {
    console.error('[get-payment-status] fatal', error);
    return new Response(JSON.stringify({ status: 'pending' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
