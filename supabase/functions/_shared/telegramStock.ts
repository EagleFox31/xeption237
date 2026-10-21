/**
 * Pure helpers for stock operations (reception, correction, redistribution)
 * from the Telegram staff bot.
 * No Deno / npm imports: shared by telegram-bot-entry and the vitest suite.
 * All SQL RPCs re-check actor rank (rank >= 2 for direction redistribution).
 */

export type StockOp = "R" | "C";

export const stockReceiveCb = (productId: string, storeCode: string) => `nav:sr:${productId}:${storeCode}`;
export const stockCorrectCb = (productId: string, storeCode: string) => `nav:sk:${productId}:${storeCode}`;

// ── Redistribution callbacks ──────────────────────────────────────────────────
export const stockSplitScreenCb = (productId: string, backCat: string) =>
  `nav:sps:${productId}:${backCat}`;

export const stockSplitPresetCb = (preset: "5050" | "100m" | "100o" | "100s", productId: string, backCat: string) =>
  `nav:spp:${preset}:${productId}:${backCat}`;

export const stockSplitManualCb = (productId: string, backCat: string) =>
  `nav:spm:${productId}:${backCat}`;

// ── Bulk redistribution callbacks ─────────────────────────────────────────────
export const stockBulkMenuCb = () => "nav:sbm";
export const stockBulkCatListCb = () => "nav:sbc_list";
export const stockBulkBrandListCb = () => "nav:sbb_list";

export const stockBulkPreviewCb = (type: "c" | "b" | "a", val: string, preset: "5050" | "100m" | "100o" | "7030") =>
  `nav:sbp:${type}:${val}:${preset}`;

export const stockBulkExecCb = (type: "c" | "b" | "a", val: string, preset: "5050" | "100m" | "100o" | "7030") =>
  `nav:sbe:${type}:${val}:${preset}`;

// ── Tags ForceReply ──────────────────────────────────────────────────────────
const STOCK_TAG_RE = /#STK:([RC]):([A-Za-z0-9_-]{1,100}):([A-Za-z0-9_-]{1,32})\s*$/;
const SPLIT_TAG_RE = /#SPLIT:([A-Za-z0-9_-]{1,100})\s*$/;

export const stockTag = (op: StockOp, productId: string, storeCode: string) =>
  `#STK:${op}:${productId}:${storeCode}`;

export const splitTag = (productId: string) => `#SPLIT:${productId}`;

export function parseStockTag(text: string): { op: StockOp; productId: string; storeCode: string } | null {
  const match = STOCK_TAG_RE.exec(text);
  return match ? { op: match[1] as StockOp, productId: match[2], storeCode: match[3] } : null;
}

export function parseSplitTag(text: string): { productId: string } | null {
  const match = SPLIT_TAG_RE.exec(text);
  return match ? { productId: match[1] } : null;
}

export const RECEIVE_MAX = 500;
export const COUNTED_MAX = 10000;

/** "5", "+5" → 5 (1..RECEIVE_MAX). */
export function parseReceiveReply(text: string): number | null {
  const match = /^\+?\s*(\d{1,4})$/.exec(text.trim());
  if (!match) return null;
  const quantity = Number(match[1]);
  return quantity >= 1 && quantity <= RECEIVE_MAX ? quantity : null;
}

/** "8 casse", "8, écran fissuré" → { counted: 8, reason } ; motif 3..80 caractères obligatoire. */
export function parseCorrectionReply(text: string): { counted: number; reason: string } | null {
  const match = /^(\d{1,5})\s*[,;:-]?\s+(.+)$/s.exec(text.trim());
  if (!match) return null;
  const counted = Number(match[1]);
  const reason = match[2].replace(/\s+/g, " ").trim();
  if (counted > COUNTED_MAX || reason.length < 3 || reason.length > 80) return null;
  return { counted, reason };
}

/**
 * Parses user input for manual redistribution.
 * Accepts:
 * "M O S" -> e.g. "3 2 0" (Mfoundi=3, Olembe=2, Siege=0)
 * "M O"   -> e.g. "3 2" (Mfoundi=3, Olembe=2, Siege=total - 5)
 */
export function parseManualSplitReply(
  text: string,
  totalStock: number
): { mfoundi: number; olembe: number; siege: number } | null {
  const clean = text.trim();
  const match = /^(\d+)\s+(\d+)(?:\s+(\d+))?$/.exec(clean);
  if (!match) return null;
  const m = Number(match[1]);
  const o = Number(match[2]);
  const s = match[3] !== undefined ? Number(match[3]) : totalStock - m - o;
  if (m < 0 || o < 0 || s < 0) return null;
  if (m + o + s !== totalStock) return null;
  return { mfoundi: m, olembe: o, siege: s };
}

export function presetRatios(preset: string): { m: number; o: number; s: number } {
  switch (preset) {
    case "5050": return { m: 50, o: 50, s: 0 };
    case "100m": return { m: 100, o: 0, s: 0 };
    case "100o": return { m: 0, o: 100, s: 0 };
    case "100s": return { m: 0, o: 0, s: 100 };
    case "7030": return { m: 70, o: 30, s: 0 };
    default: return { m: 50, o: 50, s: 0 };
  }
}

export function calculateProductPreset(
  totalStock: number,
  preset: "5050" | "100m" | "100o" | "100s"
): { mfoundi: number; olembe: number; siege: number } {
  if (totalStock <= 0) return { mfoundi: 0, olembe: 0, siege: 0 };
  if (preset === "100m") return { mfoundi: totalStock, olembe: 0, siege: 0 };
  if (preset === "100o") return { mfoundi: 0, olembe: totalStock, siege: 0 };
  if (preset === "100s") return { mfoundi: 0, olembe: 0, siege: totalStock };
  const half = Math.floor(totalStock / 2);
  return { mfoundi: half, olembe: half, siege: totalStock - (half * 2) };
}

/** Bot-facing wording of the RPC refusal reasons. */
export const STOCK_REASON_TEXT: Record<string, string> = {
  not_found: "Produit ou boutique introuvable.",
  product_not_found: "Produit introuvable.",
  already_done: "Déjà enregistré (cette réponse a déjà été prise en compte).",
  same: "Le stock est déjà à ce chiffre : rien à corriger.",
  below_reserved: "Impossible de descendre sous les unités réservées pour des commandes en cours.",
  sum_mismatch: "La somme des quantités ne correspond pas au stock total du catalogue.",
  negative_quantity: "Les quantités ne peuvent pas être négatives.",
  stores_not_configured: "Configuration des boutiques incomplète en base de données.",
  invalid_percentages: "La somme des pourcentages doit être égale à 100%."
};
