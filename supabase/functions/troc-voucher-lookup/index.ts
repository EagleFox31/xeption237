// @ts-ignore
const Deno = globalThis.Deno;

import {
  assertAiRateLimit,
  extractClientIp,
  rateLimitJsonResponse,
} from '../_shared/rateLimit.ts';

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TradeInRow = {
  id: string;
  voucher_reference: string | null;
  customer_name: string;
  customer_phone: string;
  device_brand: string;
  device_model: string;
  trade_in_value: number | null;
  status: string;
  created_at: string;
  voucher_expires_at: string | null;
  target_product_id: string | null;
  target_product_name: string | null;
  tier: string | null;
  imei: string | null;
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const phoneLast4 = (phone: string): string =>
  phone.replace(/\D/g, '').slice(-4);

const resteAPayer = (targetPrice: number, credit: number): number =>
  Math.max(0, Math.round(targetPrice - credit));

const EDITABLE_STATUSES = new Set(['pending', 'accepted', 'validated']);

const isTargetEditable = (row: TradeInRow): boolean => {
  if (!EDITABLE_STATUSES.has(row.status)) return false;
  if (!row.voucher_expires_at) return true;
  const graceMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() <= new Date(row.voucher_expires_at).getTime() + graceMs;
};

const genericAuthError = () =>
  new Response(
    JSON.stringify({
      error: 'Référence ou téléphone incorrect.',
      code: 'not_found',
    }),
    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );

const fetchDossier = async (
  supabaseUrl: string,
  serviceKey: string,
  voucherReference: string,
): Promise<TradeInRow | null> => {
  const ref = normalizeLookupRef(voucherReference);
  const select =
    'id,voucher_reference,customer_name,customer_phone,device_brand,device_model,trade_in_value,status,created_at,voucher_expires_at,target_product_id,target_product_name,tier,imei';

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: 'application/json',
  };

  const fetchOne = async (filter: string): Promise<TradeInRow | null> => {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/trade_in_requests?${filter}&select=${select}&limit=1`,
      { headers },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0 ? (rows[0] as TradeInRow) : null;
  };

  const byRef = await fetchOne(`voucher_reference=eq.${encodeURIComponent(ref)}`);
  if (byRef) return byRef;

  const byId = await fetchOne(`id=eq.${encodeURIComponent(ref)}`);
  if (byId) return byId;

  return null;
};

const normalizeLookupRef = (raw: string): string => {
  let ref = raw.trim().toUpperCase().replace(/\s/g, '');
  if (ref.startsWith('TR-TRC-')) ref = ref.slice(3);
  else if (ref.startsWith('TR-TRC')) ref = ref.slice(3);
  return ref;
};

const fetchProductPricing = async (
  supabaseUrl: string,
  serviceKey: string,
  productId: string,
): Promise<{ price: number; stock: number; name: string } | null> => {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&select=price,stock,name&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: 'application/json',
      },
    },
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows[0]) return null;
  const row = rows[0] as { price?: number; stock?: number; name?: string };
  return {
    price: Number(row.price ?? 0),
    stock: Number(row.stock ?? 0),
    name: str(row.name),
  };
};

const buildPublicPayload = async (
  row: TradeInRow,
  supabaseUrl: string,
  serviceKey: string,
) => {
  const credit = Number(row.trade_in_value ?? 0);
  let target: {
    productId: string;
    name: string;
    price: number;
    stock: number;
    credit: number;
    reste: number;
  } | null = null;

  const productId = row.target_product_id?.trim();
  if (productId) {
    const pricing = await fetchProductPricing(supabaseUrl, serviceKey, productId);
    if (pricing) {
      target = {
        productId,
        name: pricing.name || row.target_product_name || '',
        price: pricing.price,
        stock: pricing.stock,
        credit,
        reste: resteAPayer(pricing.price, credit),
      };
    }
  }

  return {
    id: row.id,
    voucher_reference: row.voucher_reference || row.id,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    device_brand: row.device_brand,
    device_model: row.device_model,
    trade_in_value: credit,
    status: row.status,
    created_at: row.created_at,
    voucher_expires_at: row.voucher_expires_at,
    target_product_id: row.target_product_id,
    target_product_name: row.target_product_name,
    tier: row.tier,
    imei: row.imei,
    target,
    canChangeTarget: isTargetEditable(row),
  };
};

const assertAuth = (row: TradeInRow, phoneSuffix: string): boolean => {
  const suffix = phoneSuffix.replace(/\D/g, '').slice(-4);
  if (suffix.length !== 4) return false;
  return phoneLast4(row.customer_phone) === suffix;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = str(body.action).trim() || 'lookup';
    const voucherReference = str(body.voucherReference).trim();
    const phoneSuffix = str(body.phoneSuffix).trim();

    if (!voucherReference || phoneSuffix.replace(/\D/g, '').length !== 4) {
      return new Response(
        JSON.stringify({ error: 'Référence du bon et 4 derniers chiffres du téléphone requis.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const rateSession = `${voucherReference}:${phoneSuffix}`;
    const rate = await assertAiRateLimit(req, 'troc-voucher-lookup', rateSession);
    if (!rate.allowed) return rateLimitJsonResponse(rate, corsHeaders);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: 'Service indisponible', code: 'misconfigured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const row = await fetchDossier(supabaseUrl, serviceKey, voucherReference);
    if (!row || !assertAuth(row, phoneSuffix)) {
      // Délai constant minimal pour ne pas révéler l'existence de la référence.
      await new Promise((r) => setTimeout(r, 350));
      return genericAuthError();
    }

    if (action === 'set-target') {
      const productId = str(body.productId).trim();
      const productName = str(body.productName).trim();
      if (!productId || !productName) {
        return new Response(
          JSON.stringify({ error: 'Produit cible requis.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (!isTargetEditable(row)) {
        return new Response(
          JSON.stringify({
            error: 'Ce bon ne peut plus être modifié (statut ou échéance).',
            code: 'not_editable',
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const pricing = await fetchProductPricing(supabaseUrl, serviceKey, productId);
      if (!pricing || pricing.stock <= 0) {
        return new Response(
          JSON.stringify({ error: 'Produit indisponible.', code: 'product_unavailable' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const patchRes = await fetch(
        `${supabaseUrl}/rest/v1/trade_in_requests?id=eq.${encodeURIComponent(row.id)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            target_product_id: productId,
            target_product_name: productName,
          }),
        },
      );

      if (!patchRes.ok) {
        console.error('[troc-voucher-lookup] patch_failed', patchRes.status);
        return new Response(
          JSON.stringify({ error: 'Mise à jour impossible.', code: 'update_failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const updated: TradeInRow = {
        ...row,
        target_product_id: productId,
        target_product_name: productName,
      };
      const payload = await buildPublicPayload(updated, supabaseUrl, serviceKey);
      return new Response(JSON.stringify(payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await buildPublicPayload(row, supabaseUrl, serviceKey);
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[troc-voucher-lookup]', err);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur', code: 'internal' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
