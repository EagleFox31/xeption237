/**
 * Adaptateur Telegram (Bot API, parse_mode HTML).
 * Secrets : TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID ; optionnel TELEGRAM_EVENT_TYPES.
 */
import {
  parseEventTypes,
  toNotificationView,
  type EnvReader,
  type StaffNotification,
  type StaffNotifyChannel,
  type StaffNotifyContext,
} from '../staffNotify.ts';

/** Limite Telegram d'un message texte. */
export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

export const escapeTelegramHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Corps du message ; le lien admin est porté par un bouton (telegramReplyMarkup). */
export const formatTelegramNotification = (n: StaffNotification): string => {
  const v = toNotificationView(n);
  const lines = [`${v.icon} <b>${escapeTelegramHtml(v.heading.toUpperCase())}</b>`];
  if (v.subject) lines.push('', `<b>${escapeTelegramHtml(v.subject)}</b>`);
  for (const d of v.details) lines.push(`▫️ ${escapeTelegramHtml(d)}`);
  return lines.join('\n').slice(0, TELEGRAM_MAX_MESSAGE_LENGTH);
};

export const telegramReplyMarkup = (ctx?: StaffNotifyContext) =>
  ctx?.adminUrl ? { inline_keyboard: [[{ text: "Ouvrir l'admin ↗", url: ctx.adminUrl }]] } : undefined;

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
          text: formatTelegramNotification(notification),
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: telegramReplyMarkup(ctx),
        }),
      });
      if (res.ok) return null;
      // Le corps d'erreur Telegram ne contient pas le token : on peut le journaliser.
      return `telegram ${res.status}: ${(await res.text()).slice(0, 300)}`;
    },
  };
};
