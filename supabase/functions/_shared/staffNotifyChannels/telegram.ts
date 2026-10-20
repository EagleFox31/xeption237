/**
 * Adaptateur Telegram (Bot API, parse_mode HTML).
 * Secrets : TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID ; optionnel TELEGRAM_EVENT_TYPES.
 */
import {
  eventIcon,
  parseEventTypes,
  type EnvReader,
  type StaffNotification,
  type StaffNotifyChannel,
  type StaffNotifyContext,
} from '../staffNotify.ts';

/** Limite Telegram d'un message texte. */
export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

export const escapeTelegramHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const formatTelegramNotification = (n: StaffNotification, ctx?: StaffNotifyContext): string => {
  const lines = [`${eventIcon(n.event_type)} <b>${escapeTelegramHtml(n.title)}</b>`, escapeTelegramHtml(n.message)];
  if (ctx?.adminUrl) lines.push(`<a href="${escapeTelegramHtml(ctx.adminUrl)}">Ouvrir l'admin</a>`);
  return lines.join('\n').slice(0, TELEGRAM_MAX_MESSAGE_LENGTH);
};

/** Renvoie null si le canal n'est pas configuré (il est alors simplement ignoré). */
export const createTelegramChannel = (
  env: EnvReader,
  fetchImpl: typeof fetch = fetch,
): StaffNotifyChannel | null => {
  const token = env('TELEGRAM_BOT_TOKEN') ?? '';
  const chatId = env('TELEGRAM_CHAT_ID') ?? '';
  if (!token || !chatId) return null;

  return {
    id: 'telegram',
    eventTypes: parseEventTypes(env('TELEGRAM_EVENT_TYPES')),
    async send(notification, ctx) {
      const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: formatTelegramNotification(notification, ctx),
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
      if (res.ok) return null;
      // Le corps d'erreur Telegram ne contient pas le token : on peut le journaliser.
      return `telegram ${res.status}: ${(await res.text()).slice(0, 300)}`;
    },
  };
};
