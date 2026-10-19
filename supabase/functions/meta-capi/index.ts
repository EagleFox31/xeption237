/**
 * meta-capi — envoie l'événement Purchase à l'API Conversions Meta, côté serveur.
 *
 * Pourquoi : le pixel navigateur est bloqué par les bloqueurs de pubs et la
 * protection contre le suivi (fbevents.js en ERR_BLOCKED_BY_CLIENT). Ici l'appel
 * part de Supabase, donc arrive à Meta quoi qu'il arrive côté client.
 *
 * Entrée : POST { orderId, fbp?, fbc?, eventSourceUrl?, testEventCode? }
 * La commande est relue en base (service role) : montant et client ne viennent
 * jamais du navigateur. Déduplication avec le pixel via event_id purchase_<id>.
 *
 * Secrets : META_CAPI_TOKEN (obligatoire), META_PIXEL_ID (défaut Xeption 237),
 * META_TEST_EVENT_CODE (optionnel, force le mode test).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildPurchaseEvent, clientIpFrom, META_GRAPH_VERSION } from '../_shared/metaCapi.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Pixel dédié Xeption 237 — jamais celui d'Atelier Maître (2270650607049039).
const DEFAULT_PIXEL_ID = '1085399414289859';
const ORDER_ID_RE = /^ORD-[A-Z0-9-]{4,20}$/;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const str = (v: unknown, max = 500): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const token = Deno.env.get('META_CAPI_TOKEN');
  if (!token) {
    console.warn('[meta-capi] META_CAPI_TOKEN absent — événement ignoré');
    return json(503, { error: 'capi_not_configured' });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const orderId = str(body.orderId, 40);
  if (!orderId || !ORDER_ID_RE.test(orderId)) return json(400, { error: 'invalid_order_id' });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, customer_email, customer_phone, customer_city, total, items, date')
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    console.error('[meta-capi] lecture commande', error.message);
    return json(500, { error: 'order_lookup_failed' });
  }
  if (!order) return json(404, { error: 'order_not_found' });

  // Anti-rejeu grossier : une commande ne se déclare que dans l'heure qui suit.
  const orderTime = Date.parse(order.date ?? '');
  if (Number.isFinite(orderTime) && Date.now() - orderTime > 60 * 60 * 1000) {
    return json(409, { error: 'order_too_old' });
  }

  const event = await buildPurchaseEvent(order, {
    clientIp: clientIpFrom(req.headers),
    userAgent: req.headers.get('user-agent'),
    fbp: str(body.fbp, 200),
    fbc: str(body.fbc, 500),
    eventSourceUrl: str(body.eventSourceUrl, 1000),
    eventTime: Number.isFinite(orderTime) ? Math.floor(orderTime / 1000) : undefined,
  });

  const pixelId = Deno.env.get('META_PIXEL_ID') ?? DEFAULT_PIXEL_ID;
  const testEventCode = Deno.env.get('META_TEST_EVENT_CODE') ?? str(body.testEventCode, 40);
  const payload: Record<string, unknown> = { data: [event] };
  if (testEventCode) payload.test_event_code = testEventCode;

  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
  );
  const result = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Le token n'est jamais journalisé : seule la réponse d'erreur Graph l'est.
    console.error('[meta-capi] Graph API', res.status, JSON.stringify(result?.error ?? result));
    return json(502, { error: 'meta_rejected', status: res.status });
  }

  console.log('[meta-capi] Purchase envoyé', orderId, JSON.stringify(result));
  return json(200, { ok: true, events_received: result?.events_received ?? null });
});
