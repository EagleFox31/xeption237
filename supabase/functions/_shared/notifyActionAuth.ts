/**
 * Authentification du relais Trigenys Notify -> Xeption (ADR-003).
 * Module pur (Web Crypto, sans Deno) : testable sous Node.
 *
 * En-têtes :
 * - x-notify-timestamp : epoch en millisecondes, accepté à ±5 min ;
 * - x-notify-signature : hex HMAC-SHA512(clé, `${timestamp}.${corps brut}`).
 * L'horodatage est signé avec le corps : un corps signé ne peut pas être rejoué avec une
 * autre date. Clé dédiée XEPTION_NOTIFY_ACTION_KEY, 32 caractères minimum.
 *
 * Empreinte de l'auteur (actor.fingerprint), calculée à l'identique par Notify et Xeption :
 * hex HMAC-SHA256(même clé, `wa-actor:v1:${numéro E.164 sans « + »}`). Le préfixe sépare cet
 * usage de la signature (SHA-512) ; la liaison par numéro compare ces empreintes.
 */

export const NOTIFY_ACTION_MIN_SECRET_LENGTH = 32;
export const NOTIFY_ACTION_MAX_SKEW_MS = 5 * 60 * 1000;
export const NOTIFY_TIMESTAMP_HEADER = 'x-notify-timestamp';
export const NOTIFY_SIGNATURE_HEADER = 'x-notify-signature';

export type NotifySignatureCheck = 'ok' | 'missing' | 'stale' | 'bad_signature';

const encoder = new TextEncoder();

async function computeHmacHex(hash: 'SHA-256' | 'SHA-512', secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash }, false, ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
  return Array.from(signature, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function computeHmacSha512Hex(secret: string, message: string): Promise<string> {
  return computeHmacHex('SHA-512', secret, message);
}

export const WHATSAPP_ACTOR_FINGERPRINT_PREFIX = 'wa-actor:v1:';
const E164_DIGITS = /^[1-9][0-9]{7,14}$/;

/** Empreinte de l'auteur WhatsApp ; null si le numéro n'est pas en E.164 sans « + ». */
export async function computeWhatsAppActorFingerprint(secret: string, e164Digits: string): Promise<string | null> {
  if (!E164_DIGITS.test(e164Digits)) return null;
  return computeHmacHex('SHA-256', secret.trim(), `${WHATSAPP_ACTOR_FINGERPRINT_PREFIX}${e164Digits}`);
}

/** Comparaison à temps constant (pour des chaînes de même longueur). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isNotifyActionSecretUsable(secret: string | undefined | null): secret is string {
  return typeof secret === 'string' && secret.trim().length >= NOTIFY_ACTION_MIN_SECRET_LENGTH;
}

export async function signNotifyAction(secret: string, timestamp: string, rawBody: string): Promise<string> {
  return computeHmacSha512Hex(secret, `${timestamp}.${rawBody}`);
}

export async function verifyNotifyActionSignature(input: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  rawBody: string;
  nowMs: number;
}): Promise<NotifySignatureCheck> {
  const timestamp = input.timestamp?.trim() ?? '';
  const signature = input.signature?.trim().toLowerCase() ?? '';
  if (!/^\d{10,16}$/.test(timestamp) || !/^[0-9a-f]{128}$/.test(signature)) return 'missing';
  if (Math.abs(input.nowMs - Number(timestamp)) > NOTIFY_ACTION_MAX_SKEW_MS) return 'stale';
  const expected = await signNotifyAction(input.secret.trim(), timestamp, input.rawBody);
  return timingSafeEqual(expected, signature) ? 'ok' : 'bad_signature';
}
