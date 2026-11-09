/**
 * Parseur déterministe d'un rapport de caisse journalier rédigé en texte libre
 * (format WhatsApp du groupe staff) vers la structure `CashReportData` utilisée
 * par le bot Telegram (`store_cash_reports`).
 *
 * Réutilise `parseAmount` / `parseDebtLine` de `telegramCashReport.ts` (même
 * grammaire des montants que le bot). Aucune donnée n'est envoyée à un tiers.
 */
import { parseAmount, parseDebtLine } from '../../supabase/functions/_shared/telegramCashReport.ts';
import { normalizeLine } from './whatsappExport.mjs';

/** Nombre minimal de lignes pour qu'un message « Rapport du … » soit un rapport complet. */
export const MIN_REPORT_LINES = 6;

const REPORT_TITLE = /rapport\s+du\s+(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/i;
const REPORT_TITLE_LOOSE = /rapport\s+du/i;

/** Détection des sections : `^[^\p{L}]*` saute emojis et puces. */
const SECTION_PATTERNS = {
  store: /^[^\p{L}]*boutique\b/iu,
  operators: /^[^\p{L}]*op[ée]rateurs?\s*:?/iu,
  opening: /^[^\p{L}]*solde\s+trouv[ée]/iu,
  inflow: /^[^\p{L}]*entr[ée]es?\s+du\s+jour/iu,
  inflowTotal: /^[^\p{L}]*(?:total\s+(?:des\s+)?entr|entr[ée]es?\s+totales?\b)/iu,
  outflow: /^[^\p{L}]*sorties?\s+du\s+jour/iu,
  outflowTotal: /^[^\p{L}]*(?:total\s+(?:des\s+)?sort|sorties?\s+totales?\b)/iu,
  closing: /^[^\p{L}]*reste\s+en\s+caisse/iu,
  observations: /^[^\p{L}]*observations?\s*:?/iu,
  debts: /^[^\p{L}]*(?:dettes?|debts?\s*list|liste\s+des\s+dettes)\b/iu,
};
const SECTION_ORDER = ['store', 'operators', 'opening', 'inflow', 'inflowTotal', 'outflow', 'outflowTotal', 'closing', 'observations', 'debts'];
/** « Total journalier » / « Total : … » : total de la section en cours (entrées ou sorties). */
const CONTEXTUAL_TOTAL = /^[^\p{L}]*total(?:\s+journalier)?\s*[:=]/iu;
const TOTAL_OF_SECTION = { inflow: 'inflowTotal', outflow: 'outflowTotal' };

const BULLET = /^[•\-–·>]+\s*/;
/** Ligne « rien à déclarer » : « Pas d'entrée », « No entrée », « Entrée totale = 0 F ». */
const NO_ENTRY = /^(?:pas|aucune?|rien|no|0)\b|[:=]\s*0+\s*(?:xaf|cfa|f[a-z]{0,5})?\.?$/i;
const SIGNATURE = /^cordialement/i;
const PHONE_ONLY = /^\(?\s*(?:\+?237\s*)?[62]\d{8}\s*\)?$/;
const TRAILING_PAREN = /\s*\(([^()]*)\)\s*$/;
const SELLER_PREFIX = /^(?:vendu\s+par|par|vente\s+de|vente)\s+/i;
/**
 * Montant en fin de ligne : `11 000F`, `90.000f`, `98,000f`, `2000`, `5k`, `1.5m`, `23 000 CFA`, `40.000frs`.
 * Groupe 1 = nombre, groupe 2 = multiplicateur (k/m/mil), groupe 3 = devise (ignorée).
 */
const TRAILING_AMOUNT = /(?:^|[\s:=])((?:\d{1,3}(?:[ .,]\d{3})+|\d+)(?:[.,]\d+)?)\s*(?:(k|m|mil)|(xaf|cfa|f[a-z]{0,5}))?\.?\s*\)?\s*$/i;
/** Nombre à groupes de milliers (« 5 100 000 ») : seul cas où un groupe de tête peut être un numéro de modèle. */
const GROUPED_NUMBER = /^\d{1,3}(?:[ .,]\d{3})+$/;
/** Une passe par ligne relue : deux lignes mal lues le même jour suffisent en pratique. */
const MAX_RECONCILE_PASSES = 4;
/** Zéro explicite (« 0 FCFA », « 0f ») : un vrai montant, pas une absence. */
const EXPLICIT_ZERO = /^0+\s*(?:xaf|cfa|f[a-z]{0,5})?\.?$/i;
/** Devise collée au nombre avec variantes (« 60.000f. », « 40.000frs ») → forme `60.000f` comprise par le bot. */
const CURRENCY_VARIANTS = /(\d)\s*(?:xaf|cfa|f[a-z]{0,5})\.?(?=\s|$|\()/gi;

/** Un message est un rapport s'il commence par « Rapport du … » et a assez de lignes. */
export function isCashReportMessage(lines) {
  if (!Array.isArray(lines) || lines.length < MIN_REPORT_LINES) return false;
  return REPORT_TITLE_LOOSE.test(normalizeLine(lines[0]));
}

/** Date du titre « RAPPORT DU 26/05/2026 » → `2026-05-26`, ou null. */
export function parseReportTitleDate(line) {
  const m = normalizeLine(line).match(REPORT_TITLE);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = `20${y}`;
  if (y.length !== 4) return null;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function detectSection(line) {
  for (const key of SECTION_ORDER) if (SECTION_PATTERNS[key].test(line)) return key;
  return null;
}

/** Texte après le `:` ou `=` d'une ligne d'en-tête de section (`Opérateurs : A / B` → `A / B`). */
function afterColon(line) {
  const idx = line.search(/[:=]/);
  return idx >= 0 ? line.slice(idx + 1).trim() : '';
}

/** Sépare « A B / C D , E » → [`A B`, `C D`, `E`]. */
export function parseOperators(text) {
  return text.split(/\s*(?:\/|,|;|&|\bet\b)\s*/i).map((s) => s.trim()).filter(Boolean);
}

/**
 * Extrait le montant final d'une ligne (sommes `a + b` comprises).
 * @returns {{ label: string, amount: number } | null}
 */
export function extractTrailingAmount(text) {
  let rest = (text ?? '').trim();
  let total = 0;
  let found = false;
  let readings = [];
  for (;;) {
    const m = rest.match(TRAILING_AMOUNT);
    if (!m) break;
    const amount = parseAmount(m[1] + (m[2] ?? ''));
    if (amount <= 0) break;
    total += amount;
    found = true;
    const before = rest.slice(0, m.index).replace(/[\s:=]+$/, '').trim();
    // Relectures : « Ryzen 5 100 000 » peut être « Ryzen 5 » + 100 000. Sur un montant simple seulement.
    readings = total === amount && !m[2] ? alternativeReadings(before, m[1]) : [];
    rest = before;
    if (!/\+$/.test(rest)) break;
    rest = rest.replace(/\+$/, '').trim();
  }
  return found ? { label: rest, amount: total, readings } : null;
}

/**
 * Autres découpages d'un nombre à groupes de milliers : chaque groupe de tête peut être la fin du
 * libellé (numéro de modèle : « Ryzen 5 », « Elitebook 840 ») et non le début du montant.
 * @returns {{ label: string, amount: number }[]} du plus grand montant au plus petit
 */
function alternativeReadings(before, number) {
  if (!GROUPED_NUMBER.test(number)) return [];
  const groups = number.split(/[ .,]/);
  const out = [];
  for (let k = 1; k < groups.length; k += 1) {
    const amount = parseAmount(groups.slice(k).join(' '));
    if (amount <= 0) continue;
    out.push({ label: `${before} ${groups.slice(0, k).join(' ')}`.trim(), amount });
  }
  return out;
}

/**
 * Quand la somme des lignes ne retombe pas sur le total déclaré de la section, essaie les
 * relectures des lignes (groupe de tête rendu au libellé) jusqu'à retrouver ce total.
 * Une ligne qui dépasse à elle seule le total déclaré est relue même sans égalité exacte.
 * Muet quand aucun total n'est déclaré. Ne mute pas les entrées.
 * @returns {{ items: object[], changed: boolean }}
 */
export function reconcileItemsWithDeclaredTotal(items, declaredTotal) {
  if (declaredTotal === null || declaredTotal === undefined) return { items, changed: false };
  // `readings` est non énumérable sur l'item (hors JSON) : la copie l'emporte explicitement.
  const work = items.map((it) => ({ ...it, readings: it.readings ?? [] }));
  const sum = () => work.reduce((s, it) => s + it.amount, 0);
  let changed = false;
  for (let pass = 0; pass < MAX_RECONCILE_PASSES && sum() !== declaredTotal; pass += 1) {
    const current = sum();
    let applied = false;
    // 1. Une relecture qui redonne exactement le total déclaré.
    for (const it of work) {
      const exact = (it.readings ?? []).find((r) => current - it.amount + r.amount === declaredTotal);
      if (exact) { Object.assign(it, { label: exact.label, amount: exact.amount }); applied = true; break; }
    }
    // 2. Sinon, une ligne impossible (seule au-dessus du total) prend sa plus grande relecture plausible.
    if (!applied) {
      const impossible = work.find((it) => it.amount > declaredTotal && (it.readings ?? []).some((r) => r.amount <= declaredTotal));
      if (impossible) {
        const r = impossible.readings.find((x) => x.amount <= declaredTotal);
        Object.assign(impossible, { label: r.label, amount: r.amount });
        applied = true;
      }
    }
    if (!applied) break;
    changed = true;
  }
  return { items: work.map(({ readings, ...it }) => it), changed };
}

/**
 * Ligne d'entrée/sortie → `{ label, amount, seller_name? }`.
 * `matchSeller(text)` renvoie un nom de vendeur connu présent dans `text`, sinon null
 * (injection : la liste du staff vient de la base, pas du parseur).
 */
/** Retire les groupes `(…)` en fin de texte : vendeur connu → `seller`, sinon `notes` (ordre d'origine). */
function stripTrailingParens(text, matchSeller) {
  let seller = null;
  const notes = [];
  for (;;) {
    const m = text.match(TRAILING_PAREN);
    if (!m) break;
    const inner = m[1].trim();
    const found = matchSeller(inner);
    if (found) seller = found;
    else if (inner) notes.unshift(inner);
    text = text.slice(0, m.index).trim();
  }
  return { text, seller, notes };
}

export function parseEntryLine(rawLine, matchSeller = () => null) {
  let line = normalizeLine(rawLine).replace(BULLET, '');
  if (!line || NO_ENTRY.test(line)) return null;
  // Parenthèses après le montant, puis avant : vendeur, ou note (« (reste 12 000F) », « (25/07) »)
  // conservée dans le libellé.
  const afterAmount = stripTrailingParens(line, matchSeller);
  const parsed = extractTrailingAmount(afterAmount.text);
  if (!parsed) return null;
  const beforeAmount = stripTrailingParens(parsed.label, matchSeller);
  let sellerName = beforeAmount.seller ?? afterAmount.seller;
  const notes = [...beforeAmount.notes, ...afterAmount.notes];
  let label = beforeAmount.text.replace(/[\s:=\-–]+$/, '').trim();
  const sellerTail = label.match(/\s+(?:vendu\s+par|par)\s+(.+)$/i);
  if (sellerTail) {
    const seller = matchSeller(sellerTail[1]);
    if (seller) {
      sellerName = seller;
      label = label.slice(0, sellerTail.index).trim();
    }
  }
  label = label.replace(SELLER_PREFIX, '');
  if (notes.length) label = `${label} (${notes.join(') (')})`.trim();
  if (!label) label = 'Sans libellé';
  const item = { label, amount: parsed.amount };
  if (sellerName) item.seller_name = sellerName;
  if (parsed.readings.length) {
    const suffix = notes.length ? ` (${notes.join(') (')})` : '';
    const readings = parsed.readings.map((r) => ({ label: r.label.replace(SELLER_PREFIX, '') + suffix, amount: r.amount }));
    Object.defineProperty(item, 'readings', { value: readings, enumerable: false });
  }
  return item;
}

/**
 * Montant déclaré sur une ligne de section (« Total entrée : 200.000f »).
 * Si la ligne n'en porte pas, la ligne suivante est acceptée quand elle ne contient
 * qu'un montant (« Solde … ce matin : » ⏎ « 336.000FCFA »).
 * @returns {{ amount: number, usedNextLine: boolean } | null}
 */
function declaredAmount(line, nextLines) {
  const ownText = (afterColon(line) || line).replace(TRAILING_PAREN, '').trim();
  if (EXPLICIT_ZERO.test(ownText)) return { amount: 0, usedNextLine: false };
  const own = extractTrailingAmount(ownText);
  if (own && own.amount > 0) return { amount: own.amount, usedNextLine: false };
  const next = nextLines.map(normalizeLine).find(Boolean);
  if (next && !detectSection(next)) {
    if (EXPLICIT_ZERO.test(next)) return { amount: 0, usedNextLine: true };
    const n = extractTrailingAmount(next);
    if (n && n.amount > 0 && n.label === '') return { amount: n.amount, usedNextLine: true };
  }
  return null;
}

/**
 * Parse un rapport complet.
 * @param {string[]} lines lignes brutes du message (titre inclus)
 * @param {{ matchSeller?: (text: string) => string | null }} options
 * @returns {{ report_date: string|null, store_hint: string|null, operators: string[],
 *   opening_cash: number|null, closing_cash: number|null, declared_total_inflow: number|null,
 *   declared_total_outflow: number|null, inflow_items: Array, outflow_items: Array, debts: Array,
 *   observations: string, warnings: string[] }}
 */
export function parseCashReportText(lines, options = {}) {
  const matchSeller = options.matchSeller ?? (() => null);
  const warnings = [];
  const result = {
    report_date: parseReportTitleDate(lines[0]),
    store_hint: null,
    operators: [],
    opening_cash: null,
    closing_cash: null,
    declared_total_inflow: null,
    declared_total_outflow: null,
    inflow_items: [],
    outflow_items: [],
    debts: [],
    observations: '',
    warnings,
  };
  if (!result.report_date) warnings.push('title_date_unparsed');

  let section = null;
  let skipNext = false;
  const observationLines = [];
  const body = lines.slice(1);
  for (let i = 0; i < body.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    const line = normalizeLine(body[i]);
    if (!line) continue;
    const detected = detectSection(line) ?? (CONTEXTUAL_TOTAL.test(line) ? TOTAL_OF_SECTION[section] ?? null : null);
    if (detected) {
      section = detected;
      const rest = body.slice(i + 1);
      switch (detected) {
        case 'store':
          result.store_hint = line.replace(/^[^\p{L}]+/u, '').replace(/['"’]+$/g, '').trim();
          break;
        case 'operators':
          result.operators = parseOperators(afterColon(line));
          break;
        case 'opening':
        case 'closing': {
          const v = declaredAmount(line, rest);
          const key = detected === 'opening' ? 'opening_cash' : 'closing_cash';
          if (v) {
            result[key] = v.amount;
            skipNext = v.usedNextLine;
          } else warnings.push(`${key}_missing`);
          break;
        }
        case 'inflowTotal':
          result.declared_total_inflow = declaredAmount(line, rest)?.amount ?? 0;
          break;
        case 'outflowTotal':
          result.declared_total_outflow = declaredAmount(line, rest)?.amount ?? 0;
          break;
        case 'observations': {
          const tail = afterColon(line);
          if (tail) observationLines.push(tail);
          break;
        }
        default:
          break;
      }
      continue;
    }
    switch (section) {
      case 'inflow':
      case 'outflow': {
        const item = parseEntryLine(line, matchSeller);
        const bare = line.replace(BULLET, '');
        if (item) (section === 'inflow' ? result.inflow_items : result.outflow_items).push(item);
        else if (!NO_ENTRY.test(bare) && /\p{L}{2,}/u.test(bare)) warnings.push(`${section}_line_unparsed`);
        break;
      }
      case 'debts': {
        // Téléphone seul sur la ligne suivante → rattaché à la dette précédente.
        if (PHONE_ONLY.test(line) && result.debts.length) {
          const last = result.debts[result.debts.length - 1];
          if (!last.phone) last.phone = line.replace(/\D/g, '').slice(-9);
          break;
        }
        const debt = parseDebtLine(line.replace(CURRENCY_VARIANTS, '$1f'));
        if (debt) result.debts.push(debt);
        else warnings.push('debt_line_unparsed');
        break;
      }
      case 'observations':
        if (!SIGNATURE.test(line)) observationLines.push(line);
        break;
      default:
        break;
    }
  }
  result.observations = observationLines.join('\n').trim();

  for (const [key, declared, warning] of [
    ['inflow_items', result.declared_total_inflow, 'inflow_items_reread'],
    ['outflow_items', result.declared_total_outflow, 'outflow_items_reread'],
  ]) {
    const r = reconcileItemsWithDeclaredTotal(result[key], declared);
    result[key] = r.items;
    if (r.changed) warnings.push(warning);
  }
  const sumInflow = result.inflow_items.reduce((s, it) => s + it.amount, 0);
  const sumOutflow = result.outflow_items.reduce((s, it) => s + it.amount, 0);
  if (result.declared_total_inflow !== null && result.declared_total_inflow !== sumInflow) warnings.push('inflow_total_mismatch');
  if (result.declared_total_outflow !== null && result.declared_total_outflow !== sumOutflow) warnings.push('outflow_total_mismatch');
  if (result.opening_cash !== null && result.closing_cash !== null
    && result.opening_cash + sumInflow - sumOutflow !== result.closing_cash) warnings.push('balance_mismatch');
  return result;
}
