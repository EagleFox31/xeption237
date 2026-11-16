/**
 * Gestes du groupe WhatsApp staff relayés par Trigenys Notify (ADR-003).
 * Module pur (sans Deno) : validation du relais v1, geste -> intention, appel RPC injecté,
 * réponse sans aucune donnée client (Notify en tire la ligne de suivi order.action_recorded).
 *
 * Gestes :
 * - réaction ✅ livrée (payée), 💵 encaissée à la livraison, 📵 injoignable,
 *   ❌ demande d'annulation (responsable et plus) ;
 * - réponse citée « 1 » à « 5 » dans les 10 min après ❌ : motif ORDER_CANCEL_REASONS[n-1] ;
 * - code « XL-XXXX-XXXX » (gesture 'link') : lie le numéro de l'auteur à son compte staff.
 * Tout le reste est ignoré. Les droits sont vérifiés par la RPC, jamais ici.
 */
import { TELEGRAM_CANCEL_REASONS } from './telegramOrderActions.ts';

/** Même liste fermée que Telegram et ORDER_CANCEL_REASONS (utils/orderWorkflow.ts). */
export const WHATSAPP_CANCEL_REASONS = TELEGRAM_CANCEL_REASONS;

export const NOTIFY_ACTION_MAX_BODY_BYTES = 4096;

export type WhatsAppGesture = 'reaction' | 'reply' | 'link';

export interface NotifyActionRelayV1 {
  version: 1;
  id: string;
  eventId: string;
  groupKey: string;
  actor: { fingerprint: string };
  gesture: WhatsAppGesture;
  value: string;
}

export type WhatsAppOrderAction = 'delivered' | 'cash_delivered' | 'unreachable' | 'cancel_requested' | 'cancelled';

export type WhatsAppIntent =
  | { kind: 'order'; action: Exclude<WhatsAppOrderAction, 'cancelled'> }
  | { kind: 'order'; action: 'cancelled'; reason: string }
  | { kind: 'link'; code: string }
  | { kind: 'ignore' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FINGERPRINT = /^[0-9a-f]{64}$/;
const LINK_CODE = /^XL-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

/** Réaction (sans sélecteur de variante U+FE0F) -> action. */
const REACTIONS: ReadonlyMap<string, Exclude<WhatsAppOrderAction, 'cancelled'>> = new Map([
  ['✅', 'delivered'],
  ['\u{1F4B5}', 'cash_delivered'],
  ['\u{1F4F5}', 'unreachable'],
  ['❌', 'cancel_requested'],
]);

const isString = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length >= 1 && v.length <= max;

export function parseNotifyActionRelay(raw: unknown): NotifyActionRelayV1 | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const actor = r.actor as Record<string, unknown> | undefined;
  if (r.version !== 1) return null;
  // eventId peut être vide pour 'link' (le code est un message libre, pas une réponse à une alerte).
  if (!isString(r.id, 128) || typeof r.eventId !== 'string' || r.eventId.length > 64 || !isString(r.groupKey, 128)) return null;
  if (!actor || typeof actor !== 'object' || typeof actor.fingerprint !== 'string') return null;
  if (!FINGERPRINT.test(actor.fingerprint)) return null;
  if (r.gesture !== 'reaction' && r.gesture !== 'reply' && r.gesture !== 'link') return null;
  if (typeof r.value !== 'string' || r.value.length > 64) return null;
  if (r.gesture !== 'link' && !UUID.test(r.eventId)) return null;
  return {
    version: 1,
    id: r.id,
    eventId: r.eventId,
    groupKey: r.groupKey,
    actor: { fingerprint: actor.fingerprint },
    gesture: r.gesture,
    value: r.value,
  };
}

export function whatsappIntent(relay: Pick<NotifyActionRelayV1, 'gesture' | 'value'>): WhatsAppIntent {
  const value = relay.value.trim();
  if (relay.gesture === 'reaction') {
    const action = REACTIONS.get(value.replace(/️/g, ''));
    return action ? { kind: 'order', action } : { kind: 'ignore' };
  }
  if (relay.gesture === 'reply') {
    if (!/^[1-5]$/.test(value)) return { kind: 'ignore' };
    return { kind: 'order', action: 'cancelled', reason: WHATSAPP_CANCEL_REASONS[Number(value) - 1] };
  }
  const code = value.toUpperCase();
  return LINK_CODE.test(code) ? { kind: 'link', code } : { kind: 'ignore' };
}

export interface RpcError { code?: string; message?: string }
export type RpcCall = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: RpcError | null }>;

export interface NotifyActionResponse {
  status: number;
  body: Record<string, unknown>;
}

const firstName = (name: unknown): string | undefined =>
  typeof name === 'string' && name.trim() ? name.trim().split(/\s+/)[0] : undefined;

/** Erreurs RPC attendues -> issue lisible ; le message brut n'est jamais renvoyé. */
function outcomeForError(error: RpcError, action: string): NotifyActionResponse {
  if (error.code === '42501') {
    const forbidden = action === 'cancel_requested' || action === 'cancelled'
      ? /Cancellation requires/.test(error.message ?? '')
      : false;
    return { status: 200, body: { ok: true, changed: false, outcome: forbidden ? 'cancel_forbidden' : 'not_linked', action } };
  }
  if (error.code === '22023') return { status: 200, body: { ok: true, changed: false, outcome: 'invalid', action } };
  if (error.code === 'P0001') return { status: 200, body: { ok: true, changed: false, outcome: 'refused', action } };
  return { status: 502, body: { ok: false, error: 'RPC_FAILED' } };
}

/**
 * Traite un relais déjà authentifié. Réponse 200 pour toute issue métier (Notify ne réessaie
 * pas), 502 seulement si la base est indisponible (Notify peut réessayer : idempotent par id).
 */
export async function handleNotifyStaffAction(
  relay: NotifyActionRelayV1,
  rpc: RpcCall,
  now: Date = new Date(),
): Promise<NotifyActionResponse> {
  const intent = whatsappIntent(relay);
  const at = now.toISOString();

  if (intent.kind === 'ignore') {
    return { status: 200, body: { ok: true, changed: false, outcome: 'ignored', at } };
  }

  if (intent.kind === 'link') {
    const { data, error } = await rpc('link_whatsapp_staff', {
      p_code: intent.code,
      p_fingerprint: relay.actor.fingerprint,
    });
    if (error) return outcomeForError(error, 'link');
    const res = (data ?? {}) as Record<string, unknown>;
    return {
      status: 200,
      body: { ok: true, changed: res.linked === true, outcome: String(res.outcome ?? 'invalid_code'), action: 'link', actor: firstName(res.actor), at },
    };
  }

  const { data, error } = await rpc('whatsapp_staff_order_action', {
    p_notification_id: relay.eventId,
    p_action: intent.action,
    p_fingerprint: relay.actor.fingerprint,
    p_reason: intent.action === 'cancelled' ? intent.reason : null,
    p_external_id: relay.id,
  });
  if (error) return outcomeForError(error, intent.action);

  const res = (data ?? {}) as Record<string, unknown>;
  const body: Record<string, unknown> = {
    ok: true,
    changed: res.changed === true,
    outcome: String(res.outcome ?? 'unknown'),
    action: intent.action,
    at,
  };
  if (intent.action === 'cancelled') body.reason = intent.reason;
  if (typeof res.count === 'number' && intent.action === 'unreachable') body.attempt = res.count;
  const actor = firstName(res.actor);
  if (actor) body.actor = actor;
  return { status: 200, body };
}
