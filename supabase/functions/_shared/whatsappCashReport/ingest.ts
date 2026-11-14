/**
 * Ingestion d'un message WhatsApp (webhook WAHA) vers une ligne `store_cash_reports`.
 *
 * Module pur : extraction / filtrage de la livraison, construction de la ligne,
 * et décision d'écriture idempotente (`planUpsert`). Aucun accès réseau ni base :
 * l'Edge Function `whatsapp-cash-webhook` fournit les référentiels et exécute le plan.
 */
import { isCashReportMessage, parseCashReportText, sumAmounts, type EntryItem, type MatchSeller, type ParsedCashReport } from './parser.ts';
import { splitMessageLines } from './text.ts';
import type { DebtItem } from '../telegramCashReport.ts';

/** Valeurs de `store_cash_reports.source` écrites ou réécrites par l'ingestion WhatsApp. */
export const WHATSAPP_LIVE_SOURCE = 'whatsapp_live';
export const WHATSAPP_BACKFILL_SOURCE = 'whatsapp_backfill';
export const WHATSAPP_CASH_SOURCES: readonly string[] = [WHATSAPP_LIVE_SOURCE, WHATSAPP_BACKFILL_SOURCE];
/** Préfixe de `source_ref` : identifiant WAHA du message d'origine. */
export const SOURCE_REF_PREFIX = 'waha:';
/** Événements WAHA porteurs d'un message entrant. */
export const ACCEPTED_EVENTS: readonly string[] = ['message', 'message.any'];
const GROUP_SUFFIX = '@g.us';
const NON_DIGITS = /\D/g;
/** Fuseau de référence de `report_date` (défaut de la colonne en base). */
export const REPORT_TIMEZONE = 'Africa/Douala';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Sous-ensemble du corps d'un webhook WAHA `message` réellement utilisé. */
export interface WahaWebhookBody {
  event?: unknown;
  session?: unknown;
  payload?: {
    id?: unknown;
    timestamp?: unknown;
    from?: unknown;
    fromMe?: unknown;
    body?: unknown;
    participant?: unknown;
  } | null;
}

export interface IncomingGroupMessage {
  messageId: string;
  groupId: string;
  /** Chiffres du numéro de l'auteur (sans suffixe `@c.us`), ou null si inconnu. */
  authorDigits: string | null;
  /** Date d'envoi (secondes Unix WAHA → Date). */
  sentAt: Date | null;
  lines: string[];
}

export type MessageRejection =
  | 'unsupported_event'
  | 'missing_payload'
  | 'not_a_group'
  | 'group_not_allowed'
  | 'empty_body'
  | 'not_a_cash_report';

export type ExtractResult =
  | { ok: true; message: IncomingGroupMessage }
  | { ok: false; reason: MessageRejection };

/**
 * Extrait un message de groupe exploitable d'une livraison WAHA.
 * `allowedGroupIds` vide = tous les groupes (filtrage par le contenu seulement).
 */
export function extractGroupMessage(body: WahaWebhookBody, allowedGroupIds: readonly string[] = []): ExtractResult {
  if (typeof body.event !== 'string' || !ACCEPTED_EVENTS.includes(body.event)) return { ok: false, reason: 'unsupported_event' };
  const payload = body.payload;
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'missing_payload' };
  const from = typeof payload.from === 'string' ? payload.from : '';
  if (!from.endsWith(GROUP_SUFFIX)) return { ok: false, reason: 'not_a_group' };
  if (allowedGroupIds.length && !allowedGroupIds.includes(from)) return { ok: false, reason: 'group_not_allowed' };
  const text = typeof payload.body === 'string' ? payload.body : '';
  if (!text.trim()) return { ok: false, reason: 'empty_body' };
  const lines = splitMessageLines(text);
  if (!isCashReportMessage(lines)) return { ok: false, reason: 'not_a_cash_report' };
  const messageId = typeof payload.id === 'string' && payload.id ? payload.id : `${from}:${String(payload.timestamp ?? '')}`;
  return {
    ok: true,
    message: {
      messageId,
      groupId: from,
      authorDigits: authorDigitsOf(payload.participant),
      sentAt: toDate(payload.timestamp),
      lines,
    },
  };
}

/** `237600000000@c.us` → `237600000000` ; identifiant `@lid` (non téléphonique) → ses chiffres. */
export function authorDigitsOf(participant: unknown): string | null {
  if (typeof participant !== 'string') return null;
  const digits = participant.split('@')[0].replace(NON_DIGITS, '');
  return digits || null;
}

function toDate(timestamp: unknown): Date | null {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return null;
  // WAHA : secondes Unix ; tolère des millisecondes.
  const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date civile (`AAAA-MM-JJ`) d'un instant dans le fuseau de référence. */
export function toReportDate(at: Date, timeZone: string = REPORT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Carte « chiffres du numéro auteur → code boutique », depuis la variable
 * `WHATSAPP_CASH_AUTHOR_STORES` (JSON `{"237600000000":"MFOUNDI"}`). Les clés sont
 * réduites à leurs chiffres pour tolérer `+237 6 00 00 00 00` ou `…@c.us`.
 */
export function parseAuthorStores(raw: string | null | undefined): Record<string, string> {
  if (!raw?.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('WHATSAPP_CASH_AUTHOR_STORES must be a JSON object');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('WHATSAPP_CASH_AUTHOR_STORES must be a JSON object');
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    const digits = authorDigitsOf(key);
    if (digits && typeof value === 'string' && value.trim()) out[digits] = value.trim();
  }
  return out;
}

/** Liste d'identifiants de groupe depuis `WHATSAPP_CASH_GROUP_IDS` (séparés par virgule / espace). */
export function parseGroupIds(raw: string | null | undefined): string[] {
  return (raw ?? '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
}

/** Colonnes de contenu d'une ligne `store_cash_reports` écrites par l'ingestion. */
export interface CashReportContent {
  opening_cash: number;
  closing_cash: number;
  total_inflow: number;
  total_outflow: number;
  inflow_items: EntryItem[];
  outflow_items: EntryItem[];
  debts_snapshot: DebtItem[];
  operators: string[];
  observations: string | null;
}

export interface CashReportRow extends CashReportContent {
  store_id: string;
  report_date: string;
  source: string;
  source_ref: string;
}

export interface BuildRowInput {
  parsed: ParsedCashReport;
  storeId: string;
  message: IncomingGroupMessage;
  /** Horloge injectable (repli de date quand le titre et l'horodatage manquent). */
  now?: Date;
}

export interface BuiltRow {
  row: CashReportRow;
  /** `title` : date lue dans le titre ; `message` : date d'envoi ; `now` : horloge. */
  dateOrigin: 'title' | 'message' | 'now';
  warnings: string[];
}

/** Construit la ligne à écrire. La date du titre prime ; sinon la date d'envoi du message. */
export function buildCashReportRow({ parsed, storeId, message, now = new Date() }: BuildRowInput): BuiltRow {
  const warnings = [...parsed.warnings];
  let dateOrigin: BuiltRow['dateOrigin'] = 'title';
  let reportDate = parsed.report_date;
  if (!reportDate || !ISO_DATE.test(reportDate)) {
    reportDate = toReportDate(message.sentAt ?? now);
    dateOrigin = message.sentAt ? 'message' : 'now';
    warnings.push('date_from_message');
  } else if (message.sentAt && toReportDate(message.sentAt) !== reportDate) {
    warnings.push('date_differs_from_message');
  }
  const totalInflow = sumAmounts(parsed.inflow_items);
  const totalOutflow = sumAmounts(parsed.outflow_items);
  const row: CashReportRow = {
    store_id: storeId,
    report_date: reportDate,
    source: WHATSAPP_LIVE_SOURCE,
    source_ref: `${SOURCE_REF_PREFIX}${message.messageId}`,
    opening_cash: parsed.opening_cash ?? 0,
    closing_cash: parsed.closing_cash ?? 0,
    total_inflow: totalInflow,
    total_outflow: totalOutflow,
    inflow_items: parsed.inflow_items,
    outflow_items: parsed.outflow_items,
    debts_snapshot: parsed.debts,
    operators: parsed.operators,
    observations: parsed.observations || null,
  };
  return { row, dateOrigin, warnings };
}

/** Ligne existante telle que relue en base pour la décision d'écriture. */
export interface ExistingCashReport extends CashReportContent {
  id: string;
  source: string;
}

export type UpsertAction = 'insert' | 'update' | 'unchanged' | 'protected';

export interface UpsertPlan {
  action: UpsertAction;
  /** Identifiant de la ligne existante (update / unchanged / protected). */
  existingId: string | null;
}

const CONTENT_KEYS: readonly (keyof CashReportContent)[] = [
  'opening_cash', 'closing_cash', 'total_inflow', 'total_outflow',
  'inflow_items', 'outflow_items', 'debts_snapshot', 'operators', 'observations',
];

/** Égalité de contenu (équivalent de `IS DISTINCT FROM` sur les colonnes écrites). */
export function sameContent(a: CashReportContent, b: CashReportContent): boolean {
  return CONTENT_KEYS.every((key) => JSON.stringify(normalizeValue(a[key])) === JSON.stringify(normalizeValue(b[key])));
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'number') return Number(value);
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)) && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value ?? null;
}

/**
 * Décide l'écriture pour (store_id, report_date) :
 * - aucune ligne → `insert` ;
 * - ligne d'une source WhatsApp au contenu différent → `update` ; identique → `unchanged` ;
 * - ligne d'une autre source (`bot` : saisie du staff dans Telegram) → `protected`, jamais réécrite.
 */
export function planUpsert(existing: ExistingCashReport | null, candidate: CashReportContent): UpsertPlan {
  if (!existing) return { action: 'insert', existingId: null };
  if (!WHATSAPP_CASH_SOURCES.includes(existing.source)) return { action: 'protected', existingId: existing.id };
  return { action: sameContent(existing, candidate) ? 'unchanged' : 'update', existingId: existing.id };
}

export interface ParseForIngestInput {
  lines: string[];
  matchSeller: MatchSeller;
}

/** Parse un message déjà qualifié rapport (raccourci pour l'Edge Function et les tests). */
export function parseIncomingReport({ lines, matchSeller }: ParseForIngestInput): ParsedCashReport {
  return parseCashReportText(lines, { matchSeller });
}
