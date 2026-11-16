// @ts-ignore
const Deno = globalThis.Deno;

/**
 * Relais signé Trigenys Notify -> Xeption : gestes du groupe WhatsApp staff (ADR-003).
 * Serveur à serveur uniquement (pas de CORS, verify_jwt = false : la signature fait foi).
 * Désactivé tant que WHATSAPP_ACTIONS_ENABLED !== 'true'.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  isNotifyActionSecretUsable,
  NOTIFY_SIGNATURE_HEADER,
  NOTIFY_TIMESTAMP_HEADER,
  verifyNotifyActionSignature,
} from '../_shared/notifyActionAuth.ts';
import {
  handleNotifyStaffAction,
  NOTIFY_ACTION_MAX_BODY_BYTES,
  parseNotifyActionRelay,
} from '../_shared/whatsappOrderActions.ts';

export {};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });

  const secret = Deno.env.get('XEPTION_NOTIFY_ACTION_KEY');
  if (!isNotifyActionSecretUsable(secret)) return json(503, { ok: false, error: 'NOT_CONFIGURED' });

  const declared = Number(req.headers.get('content-length') ?? '0');
  if (declared > NOTIFY_ACTION_MAX_BODY_BYTES) return json(413, { ok: false, error: 'PAYLOAD_TOO_LARGE' });
  const raw = await req.text();
  if (new TextEncoder().encode(raw).length > NOTIFY_ACTION_MAX_BODY_BYTES) {
    return json(413, { ok: false, error: 'PAYLOAD_TOO_LARGE' });
  }

  const check = await verifyNotifyActionSignature({
    secret,
    timestamp: req.headers.get(NOTIFY_TIMESTAMP_HEADER),
    signature: req.headers.get(NOTIFY_SIGNATURE_HEADER),
    rawBody: raw,
    nowMs: Date.now(),
  });
  if (check !== 'ok') {
    console.warn('[notify-staff-action] rejected', { reason: check });
    return json(401, { ok: false, error: 'UNAUTHORIZED' });
  }

  if (Deno.env.get('WHATSAPP_ACTIONS_ENABLED') !== 'true') {
    return json(503, { ok: false, error: 'CHANNEL_DISABLED' });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: 'INVALID_JSON' });
  }
  const relay = parseNotifyActionRelay(parsed);
  if (!relay) return json(400, { ok: false, error: 'INVALID_RELAY' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return json(503, { ok: false, error: 'NOT_CONFIGURED' });
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const result = await handleNotifyStaffAction(relay, async (fn, args) => {
      const { data, error } = await supabase.rpc(fn, args);
      return { data, error: error ? { code: error.code, message: error.message } : null };
    });
    if (result.status >= 500) console.error('[notify-staff-action] rpc failed', { gesture: relay.gesture });
    return json(result.status, result.body);
  } catch (err) {
    console.error('[notify-staff-action] unexpected', { message: err instanceof Error ? err.message : 'unknown' });
    return json(500, { ok: false, error: 'INTERNAL' });
  }
});
