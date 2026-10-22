/**
 * Lien profond vers la discussion privée du bot : t.me/<bot>?start=<payload>.
 * Telegram transmet ensuite « /start <payload> » au bot, qui ouvre directement l'écran visé.
 * Module pur, sans API Deno : partagé par notify-staff et telegram-bot-entry, testé côté Vitest.
 */

/** Contraintes Telegram du paramètre start : 1 à 64 caractères [A-Za-z0-9_-]. */
const START_PAYLOAD_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const BOT_USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;

export type StartTarget = { kind: 'product' | 'troc'; id: string };

/** Onglet de notification (link_to_tab) → préfixe du payload. */
const TAB_PREFIX: Record<string, string> = { inventory: 'p', troc: 't' };
const PREFIX_KIND: Record<string, StartTarget['kind']> = { p: 'product', t: 'troc' };

/** Payload pour un élément, ou null si l'onglet n'a pas d'écran bot ou si l'id ne tient pas. */
export const buildStartPayload = (tab: string | null | undefined, id: string | null | undefined): string | null => {
  const prefix = TAB_PREFIX[tab?.trim() ?? ''];
  const cleanId = id?.trim() ?? '';
  if (!prefix || !cleanId) return null;
  const payload = `${prefix}_${cleanId}`;
  return START_PAYLOAD_PATTERN.test(payload) ? payload : null;
};

export const parseStartPayload = (payload: string | null | undefined): StartTarget | null => {
  if (!payload || !START_PAYLOAD_PATTERN.test(payload)) return null;
  const sep = payload.indexOf('_');
  const kind = PREFIX_KIND[payload.slice(0, sep)];
  const id = payload.slice(sep + 1);
  return sep > 0 && kind && id ? { kind, id } : null;
};

/**
 * Nom du bot : TELEGRAM_BOT_USERNAME, sinon déduit du lien Mini App (t.me/<bot>/<app> ou
 * t.me/<bot>?startapp) pour éviter un secret de plus.
 */
export const resolveBotUsername = (username: string | undefined, miniAppLink: string | undefined): string | null => {
  const explicit = username?.trim().replace(/^@/, '');
  if (explicit) return BOT_USERNAME_PATTERN.test(explicit) ? explicit : null;
  if (!miniAppLink) return null;
  try {
    const link = new URL(miniAppLink);
    if (link.protocol !== 'https:' || link.hostname !== 't.me') return null;
    const first = link.pathname.split('/')[1] ?? '';
    return BOT_USERNAME_PATTERN.test(first) ? first : null;
  } catch { return null; }
};

export const botChatLink = (botUsername: string, payload: string | null): string =>
  `https://t.me/${botUsername}${payload ? `?start=${payload}` : ''}`;
