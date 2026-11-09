/**
 * Bouton « ✅ Vu » des bilans journaliers (daily_digest) dans le groupe Telegram staff.
 * Module pur (sans Deno) : construit / lit le callback_data et retire le bouton du clavier
 * une fois la notification acquittée via ack_staff_notification_from_telegram.
 *
 * Convention du bot : callback_data = nav:<action>:<args>, limite Telegram 64 octets
 * (« nav:dg_ack: » + UUID = 47 octets).
 */

export const DIGEST_ACK_ACTION = 'dg_ack';
const CALLBACK_PREFIX = `nav:${DIGEST_ACK_ACTION}:`;
export const DIGEST_ACK_BUTTON_TEXT = '✅ Vu';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TelegramInlineButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: { url: string };
}

export interface TelegramInlineKeyboard {
  inline_keyboard: TelegramInlineButton[][];
}

export const digestAckCallbackData = (notificationId: string): string => `${CALLBACK_PREFIX}${notificationId}`;

export const digestAckButton = (notificationId: string): TelegramInlineButton => ({
  text: DIGEST_ACK_BUTTON_TEXT,
  callback_data: digestAckCallbackData(notificationId),
});

/** notification_id porté par un callback « Vu », ou null si ce n'est pas un tel callback. */
export const parseDigestAckCallback = (data: string | undefined | null): string | null => {
  if (!data || !data.startsWith(CALLBACK_PREFIX)) return null;
  const id = data.slice(CALLBACK_PREFIX.length).trim();
  return UUID_PATTERN.test(id) ? id : null;
};

const isDigestAckButton = (b: TelegramInlineButton): boolean =>
  typeof b.callback_data === 'string' && b.callback_data.startsWith(CALLBACK_PREFIX);

/**
 * Clavier sans le bouton « Vu » (lignes vides supprimées). Renvoie null quand il ne reste
 * aucun bouton : editMessageReplyMarkup attend alors un clavier vide.
 */
export const stripDigestAckButtons = (markup: unknown): TelegramInlineKeyboard | null => {
  const rows = (markup as Partial<TelegramInlineKeyboard> | null | undefined)?.inline_keyboard;
  if (!Array.isArray(rows)) return null;
  const kept = rows
    .filter(Array.isArray)
    .map((row) => row.filter((b) => b && typeof b === 'object' && !isDigestAckButton(b)))
    .filter((row) => row.length > 0);
  return kept.length ? { inline_keyboard: kept } : null;
};

// ── Traitement du clic « Vu » (dépendances injectées : testable hors Deno) ────────────

export interface DigestAckResult {
  /** true : passée à lue maintenant ; false : déjà lue ou introuvable. */
  acknowledged: boolean;
  /** Code SQLSTATE de la RPC (42501 = rôle insuffisant / lien staff absent). */
  errorCode?: string | null;
}

export interface DigestAckDeps {
  ack(notificationId: string, telegramUserId: string): Promise<DigestAckResult>;
  telegram(method: string, body: Record<string, unknown>): Promise<unknown>;
}

export const DIGEST_ACK_REPLIES = {
  acknowledged: '✅ Bilan marqué comme vu.',
  alreadyRead: '👀 Ce bilan était déjà marqué comme vu.',
  forbidden: '🔒 Réservé aux responsables et à la direction (compte Telegram lié au staff).',
  unavailable: 'Acquittement indisponible pour le moment, réessayez plus tard.',
} as const;

const SQLSTATE_INSUFFICIENT_PRIVILEGE = '42501';

type Obj = Record<string, unknown>;

/**
 * Traite un callback_query « Vu ». Renvoie false si le callback n'en est pas un (le routeur
 * continue), true sinon : réponse envoyée et bouton retiré quand l'acquittement a abouti.
 */
export async function handleDigestAckCallback(cb: Obj, deps: DigestAckDeps): Promise<boolean> {
  const notificationId = parseDigestAckCallback(typeof cb.data === 'string' ? cb.data : null);
  if (!notificationId) return false;

  const callbackQueryId = String(cb.id ?? '');
  const telegramUserId = String((cb.from as Obj | undefined)?.id ?? '');
  const message = cb.message as Obj | undefined;
  const chatId = (message?.chat as Obj | undefined)?.id;
  const messageId = message?.message_id;

  const answer = (text: string, showAlert = false) =>
    deps.telegram('answerCallbackQuery', { callback_query_id: callbackQueryId, text, show_alert: showAlert }).catch(() => {});

  let result: DigestAckResult;
  try {
    result = await deps.ack(notificationId, telegramUserId);
  } catch {
    await answer(DIGEST_ACK_REPLIES.unavailable, true);
    return true;
  }
  if (result.errorCode === SQLSTATE_INSUFFICIENT_PRIVILEGE) {
    await answer(DIGEST_ACK_REPLIES.forbidden, true);
    return true;
  }
  if (result.errorCode) {
    await answer(DIGEST_ACK_REPLIES.unavailable, true);
    return true;
  }

  await answer(result.acknowledged ? DIGEST_ACK_REPLIES.acknowledged : DIGEST_ACK_REPLIES.alreadyRead);

  // Le message du groupe est connu via callback_query.message : on retire le bouton « Vu ».
  if (messageId !== undefined && chatId !== undefined) {
    await deps
      .telegram('editMessageReplyMarkup', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: stripDigestAckButtons(message?.reply_markup) ?? { inline_keyboard: [] },
      })
      .catch(() => {});
  }
  return true;
}
