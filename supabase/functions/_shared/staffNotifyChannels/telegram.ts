/**
 * Adaptateur Telegram (Bot API, parse_mode HTML).
 * Secrets : TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID ; optionnel TELEGRAM_EVENT_TYPES.
 */
import {
  notificationLink,
  parseEventTypes,
  toNotificationView,
  type EnvReader,
  type StaffNotification,
  type StaffNotifyChannel,
  type StaffNotifyContext,
} from '../staffNotify.ts';

/** Limite Telegram d'un message texte. */
export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

/** Repère visuel devant le produit concerné (Telegram n'accepte pas de couleur). */
const SUBJECT_ICON = '📱';

export const escapeTelegramHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Corps du message ; le lien direct est porté par un bouton (telegramReplyMarkup). */
export const formatTelegramNotification = (n: StaffNotification): string => {
  const v = toNotificationView(n);
  const lines = [`${v.icon} <b>${escapeTelegramHtml(v.heading.toUpperCase())}</b>`];
  if (v.subject) lines.push('', `${SUBJECT_ICON} <b><u>${escapeTelegramHtml(v.subject)}</u></b>`);
  for (const d of v.details) lines.push(`▫️ ${escapeTelegramHtml(d)}`);
  return lines.join('\n').slice(0, TELEGRAM_MAX_MESSAGE_LENGTH);
};

const trustedMiniAppLink = (raw: string | undefined): string | null => {
  if (!raw) return null;
  try {
    const link = new URL(raw);
    if (link.protocol !== 'https:' || link.hostname !== 't.me' ||
        !/^\/[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+\/?$/.test(link.pathname)) return null;
    return link.href;
  } catch { return null; }
};

export const telegramReplyMarkup = (n: StaffNotification, ctx: StaffNotifyContext, miniAppUrl?: string) => {
  const link = notificationLink(n, ctx);
  const miniApp = trustedMiniAppLink(miniAppUrl);
  // Lien direct vers l'élément + Mini App côte à côte : le staff choisit le site ou Telegram.
  const row = [{ text: `${link.label} ↗`, url: link.url }];
  if (miniApp) row.push({ text: 'Gérer dans Telegram ↗', url: miniApp });
  return { inline_keyboard: [row] };
};

/** Renvoie null si le canal n'est pas configuré (il est alors simplement ignoré). */
export const createTelegramChannel = (
  env: EnvReader,
  fetchImpl: typeof fetch = fetch,
): StaffNotifyChannel | null => {
  const token = env('TELEGRAM_BOT_TOKEN') ?? '';
  const chatId = env('TELEGRAM_CHAT_ID') ?? '';
  if (!token || !chatId) return null;
  const miniAppUrl = env('TELEGRAM_MINIAPP_LINK');

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
          reply_markup: telegramReplyMarkup(notification, ctx, miniAppUrl),
        }),
      });
      if (res.ok) return null;
      // Le corps d'erreur Telegram ne contient pas le token : on peut le journaliser.
      return `telegram ${res.status}: ${(await res.text()).slice(0, 300)}`;
    },
  };
};
