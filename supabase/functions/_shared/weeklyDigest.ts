/**
 * Bilan hebdomadaire (notify_weekly_digest, pg_cron du lundi) : mise en forme par canal.
 * Module pur, sans API Deno : testé côté Vitest.
 *
 * Le message SQL est déjà rédigé au format validé par la direction : sections séparées par une
 * ligne vide, titres de section entre astérisques (*Titre*), une donnée par ligne, aucun emoji.
 * Les adaptateurs ne font que traduire ce balisage (gras) et ne réécrivent pas le contenu.
 */

export const WEEKLY_DIGEST_EVENT_TYPE = 'weekly_digest';

export interface WeeklyDigestNotification {
  event_type: string;
  title: string;
  message: string;
}

/** Ligne entièrement en gras : « *Titre* » (balisage WhatsApp, repris tel quel en texte brut). */
const SECTION_TITLE = /^\*([^*\n]+)\*$/;

/** Plus de deux sauts de ligne consécutifs = une seule ligne vide. */
const EXTRA_BLANK_LINES = /\n{3,}/g;

export const isWeeklyDigest = (n: Pick<WeeklyDigestNotification, 'event_type'>): boolean =>
  n.event_type === WEEKLY_DIGEST_EVENT_TYPE;

/** Lignes du message, espaces de bord retirés ; les lignes vides (séparateurs de section) sont gardées. */
const normalizedLines = (message: string): string[] =>
  message.replace(/\r\n?/g, '\n').replace(EXTRA_BLANK_LINES, '\n\n').trim().split('\n').map((l) => l.trim());

/** Texte brut (WhatsApp, SMS) : le balisage *gras* est déjà celui de WhatsApp. */
export const formatPlainWeeklyDigest = (n: WeeklyDigestNotification, link?: string): string =>
  [`*${n.title.trim()}*`, '', ...normalizedLines(n.message), ...(link ? ['', link] : [])].join('\n');

/** Telegram (parse_mode HTML) : titres de section en <b>, reste échappé. */
export const formatTelegramWeeklyDigest = (
  n: WeeklyDigestNotification,
  escapeHtml: (text: string) => string,
): string => {
  const body = normalizedLines(n.message).map((line) => {
    const title = SECTION_TITLE.exec(line);
    return title ? `<b>${escapeHtml(title[1].trim())}</b>` : escapeHtml(line);
  });
  return [`<b>${escapeHtml(n.title.trim())}</b>`, '', ...body].join('\n');
};
