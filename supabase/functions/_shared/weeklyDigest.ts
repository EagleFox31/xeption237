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

/**
 * Faits WhatsApp (Trigenys Notify, type report.weekly_digest) : période + sections déjà rédigées.
 * Mêmes bornes que le contrat Notify (src/core/message-facts.ts, DIGEST_LIMITS) : au-delà, Notify
 * refuserait tout l'événement ; on tronque donc ici, de façon déterministe.
 */
export const WEEKLY_DIGEST_LIMITS = { sections: 12, linesPerSection: 15, title: 80, line: 120 } as const;

export interface WeeklyDigestSection { title: string; lines: string[] }
export interface WeeklyDigestFacts { digestPeriod?: string; digestSections: WeeklyDigestSection[] }

const PERIOD = /(du \d{2}\/\d{2} au \d{2}\/\d{2})\s*$/;
/** Caractères refusés par Notify (contrôle, bidi, balisage) : remplacés par une espace. */
const UNSAFE = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069*_~`]/g;
/**
 * Données de contact explicites. Pas le motif « 6xx xxx xxx » : il confondrait les montants
 * groupés par milliers ; la requête SQL ne lit de toute façon aucune donnée client.
 */
const CONTACT = /@|https?:\/\/|www\.|\+\s*\d(?:[\s().-]*\d){7,}|\b\d{9,15}\b/i;

const cleanLine = (raw: string, max: number): string | undefined => {
  const value = raw.normalize('NFC').replace(UNSAFE, ' ').replace(/\s+/g, ' ').trim();
  if (!value || CONTACT.test(value)) return undefined;
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
};

export const weeklyDigestFacts = (n: WeeklyDigestNotification): WeeklyDigestFacts | undefined => {
  const sections: WeeklyDigestSection[] = [];
  for (const block of normalizedLines(n.message).join('\n').split(/\n{2,}/)) {
    const [head, ...rest] = block.split('\n');
    const heading = SECTION_TITLE.exec(head ?? '');
    const title = heading ? cleanLine(heading[1], WEEKLY_DIGEST_LIMITS.title) : undefined;
    const lines = rest
      .map((line) => cleanLine(line, WEEKLY_DIGEST_LIMITS.line))
      .filter((line): line is string => Boolean(line))
      .slice(0, WEEKLY_DIGEST_LIMITS.linesPerSection);
    if (title && lines.length) sections.push({ title, lines });
    if (sections.length === WEEKLY_DIGEST_LIMITS.sections) break;
  }
  if (!sections.length) return undefined;
  const period = PERIOD.exec(n.title.trim())?.[1];
  return { ...(period ? { digestPeriod: period } : {}), digestSections: sections };
};

/**
 * Réduit l'événement sous `maxBytes` : retire la dernière ligne de la section la plus longue
 * (le total et « À noter », courts, restent), puis les sections vidées. Mute `facts`.
 */
export const trimWeeklyDigest = (facts: WeeklyDigestFacts, size: () => number, maxBytes: number): void => {
  const sections = facts.digestSections;
  while (sections.length && size() > maxBytes) {
    const longest = sections.reduce((a, b) => (b.lines.length > a.lines.length ? b : a));
    longest.lines.pop();
    if (!longest.lines.length) sections.splice(sections.indexOf(longest), 1);
  }
};
