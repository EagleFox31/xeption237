/**
 * Adaptateur Telegram (Bot API, parse_mode HTML).
 * Secrets : TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID ; optionnels TELEGRAM_EVENT_TYPES,
 * TELEGRAM_MINIAPP_LINK, TELEGRAM_BOT_USERNAME (sinon déduit du lien Mini App).
 */
import {
  cleanHeading,
  dailyDigestLines,
  eventIcon,
  isDailyDigest,
  notificationLink,
  parseEventTypes,
  toNotificationView,
  type EnvReader,
  type StaffNotification,
  type StaffNotifyChannel,
  type StaffNotifyContext,
} from '../staffNotify.ts';
import { botChatLink, buildStartPayload, resolveBotUsername } from '../telegramStartPayload.ts';
import { digestAckButton, type TelegramInlineButton } from '../telegramDigestAck.ts';
import { formatTelegramWeeklyDigest, isWeeklyDigest } from '../weeklyDigest.ts';

/** Limite Telegram d'un message texte. */
export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

/** Marque de troncature quand un message dépasse la limite Telegram. */
const TRUNCATION_MARK = '…';

/** Repère visuel devant le produit concerné (Telegram n'accepte pas de couleur). */
const SUBJECT_ICON = '📱';

/** Puce des lignes d'un bilan journalier. */
const DIGEST_LINE_ICON = '▫️';

export const escapeTelegramHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Tronque proprement : coupe à la dernière fin de ligne complète avant la limite, pour ne pas
 * laisser une balise HTML ouverte ou un montant coupé en deux (sendMessage refuserait le HTML).
 */
export const truncateTelegramText = (text: string, max = TELEGRAM_MAX_MESSAGE_LENGTH): string => {
  if (text.length <= max) return text;
  const budget = max - TRUNCATION_MARK.length;
  const cut = text.lastIndexOf('\n', budget);
  return `${text.slice(0, cut > 0 ? cut : budget)}${TRUNCATION_MARK}`;
};

/** Bilan journalier : titre (boutique) puis une ligne par bloc, sans « sujet » souligné. */
const formatTelegramDailyDigest = (n: StaffNotification): string => {
  const lines = [`${eventIcon(n.event_type)} <b>${escapeTelegramHtml(cleanHeading(n.title))}</b>`, ''];
  for (const line of dailyDigestLines(n)) lines.push(`${DIGEST_LINE_ICON} ${escapeTelegramHtml(line)}`);
  return lines.join('\n');
};

/** Corps du message ; le lien direct est porté par un bouton (telegramReplyMarkup). */
export const formatTelegramNotification = (n: StaffNotification): string => {
  if (isDailyDigest(n)) return truncateTelegramText(formatTelegramDailyDigest(n));
  if (isWeeklyDigest(n)) return truncateTelegramText(formatTelegramWeeklyDigest(n, escapeTelegramHtml));
  const v = toNotificationView(n);
  const lines = [`${v.icon} <b>${escapeTelegramHtml(v.heading.toUpperCase())}</b>`];
  if (v.subject) lines.push('', `${SUBJECT_ICON} <b><u>${escapeTelegramHtml(v.subject)}</u></b>`);
  for (const d of v.details) lines.push(`▫️ ${escapeTelegramHtml(d)}`);
  return truncateTelegramText(lines.join('\n'));
};

const trustedMiniAppLink = (raw: string | undefined): string | null => {
  if (!raw) return null;
  try {
    const link = new URL(raw);
    if (link.protocol !== 'https:' || link.hostname !== 't.me' ||
        // t.me/<bot>/<app> (named Mini App) or t.me/<bot>?startapp (bot's main Mini App)
        !/^\/[a-zA-Z0-9_]+(\/[a-zA-Z0-9_]+)?\/?$/.test(link.pathname)) return null;
    return link.href;
  } catch { return null; }
};

export const telegramReplyMarkup = (
  n: StaffNotification,
  ctx: StaffNotifyContext,
  miniAppUrl?: string,
  botUsername?: string | null,
) => {
  const link = notificationLink(n, ctx);
  const miniApp = trustedMiniAppLink(miniAppUrl);
  // Lien direct vers l'élément + Mini App côte à côte : le staff choisit le site ou Telegram.
  const row: TelegramInlineButton[] = [{ text: `${link.label} ↗`, url: link.url }];
  if (miniApp) row.push({ text: 'Gérer dans Telegram ↗', url: miniApp });
  const keyboard: TelegramInlineButton[][] = [row];
  // Discussion privée du bot, ouverte directement sur l'élément quand il a un écran bot.
  if (botUsername) {
    keyboard.push([{ text: '💬 Gérer avec le bot', url: botChatLink(botUsername, buildStartPayload(n.link_to_tab, n.link_to_id)) }]);
  }
  // Bilan journalier : acquittement en un clic depuis le groupe (ack_staff_notification_from_telegram).
  if (isDailyDigest(n)) keyboard.push([digestAckButton(n.notification_id)]);
  return { inline_keyboard: keyboard };
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
  const botUsername = resolveBotUsername(env('TELEGRAM_BOT_USERNAME'), miniAppUrl);

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
          reply_markup: telegramReplyMarkup(notification, ctx, miniAppUrl, botUsername),
        }),
      });
      if (res.ok) return null;
      // Le corps d'erreur Telegram ne contient pas le token : on peut le journaliser.
      return `telegram ${res.status}: ${(await res.text()).slice(0, 300)}`;
    },
  };
};
