/**
 * Authentification d'un webhook WAHA (WhatsApp HTTP API) côté réception.
 *
 * WAHA signe chaque livraison quand `webhooks[].hmac.key` est configuré sur la session :
 * `X-Webhook-Hmac` = HMAC-SHA512 hexadécimal du corps brut, `X-Webhook-Hmac-Algorithm` = `sha512`.
 * Sans HMAC, un en-tête personnalisé (`webhooks[].customHeaders`) porte un secret partagé.
 * Au moins l'un des deux doit être configuré : un webhook sans secret est refusé (503 côté appelant).
 *
 * Module pur (WebCrypto uniquement) : Deno, Node ≥ 20 et Vitest.
 */

export const HMAC_HEADER = 'x-webhook-hmac';
export const HMAC_ALGORITHM_HEADER = 'x-webhook-hmac-algorithm';
export const SHARED_SECRET_HEADER = 'x-webhook-secret';
const HMAC_ALGORITHM = 'SHA-512';
const EXPECTED_ALGORITHM_LABEL = 'sha512';
/** Longueur minimale d'un secret partagé (même règle que `XEPTION_NOTIFY_INGEST_KEY`). */
export const MIN_SECRET_LENGTH = 32;

export interface WebhookAuthConfig {
  /** Clé HMAC posée dans la config WAHA (`hmac.key`). */
  hmacKey?: string | null;
  /** Secret partagé attendu dans `X-Webhook-Secret` (`customHeaders`). */
  sharedSecret?: string | null;
}

export type WebhookAuthResult =
  | { ok: true; method: 'hmac' | 'shared_secret' }
  | { ok: false; reason: 'not_configured' | 'missing_signature' | 'bad_signature' | 'bad_secret' | 'unsupported_algorithm' };

export interface HeaderReader {
  get(name: string): string | null;
}

/** Vrai si au moins un mécanisme d'authentification exploitable est configuré. */
export function isWebhookAuthConfigured(config: WebhookAuthConfig): boolean {
  return isUsableSecret(config.hmacKey) || isUsableSecret(config.sharedSecret);
}

function isUsableSecret(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length >= MIN_SECRET_LENGTH;
}

const encoder = new TextEncoder();

/** HMAC-SHA512 hexadécimal (minuscules) du corps brut. */
export async function computeHmacSha512Hex(key: string, rawBody: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: HMAC_ALGORITHM },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(rawBody));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Comparaison en temps constant de deux chaînes (longueur comprise). */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);
  let diff = bufA.length ^ bufB.length;
  const len = Math.max(bufA.length, bufB.length);
  for (let i = 0; i < len; i += 1) diff |= (bufA[i] ?? 0) ^ (bufB[i] ?? 0);
  return diff === 0;
}

/**
 * Vérifie une livraison : HMAC en priorité quand la clé est configurée, sinon secret partagé.
 * Un HMAC configuré mais absent de la requête est un refus (pas de repli silencieux).
 */
export async function verifyWebhookRequest(
  rawBody: string,
  headers: HeaderReader,
  config: WebhookAuthConfig,
): Promise<WebhookAuthResult> {
  if (!isWebhookAuthConfigured(config)) return { ok: false, reason: 'not_configured' };

  if (isUsableSecret(config.hmacKey)) {
    const provided = headers.get(HMAC_HEADER)?.trim().toLowerCase();
    if (!provided) return { ok: false, reason: 'missing_signature' };
    const algorithm = headers.get(HMAC_ALGORITHM_HEADER)?.trim().toLowerCase();
    if (algorithm && algorithm !== EXPECTED_ALGORITHM_LABEL) return { ok: false, reason: 'unsupported_algorithm' };
    const expected = await computeHmacSha512Hex(config.hmacKey, rawBody);
    return timingSafeEqual(provided, expected) ? { ok: true, method: 'hmac' } : { ok: false, reason: 'bad_signature' };
  }

  const provided = headers.get(SHARED_SECRET_HEADER) ?? '';
  return isUsableSecret(config.sharedSecret) && timingSafeEqual(provided, config.sharedSecret)
    ? { ok: true, method: 'shared_secret' }
    : { ok: false, reason: 'bad_secret' };
}
