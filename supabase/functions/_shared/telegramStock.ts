/**
 * Pure helpers for stock reception / inventory correction from the Telegram bot.
 * No Deno / npm imports: shared by telegram-bot-entry and the vitest suite.
 * The tag only carries context; the SQL RPCs re-check rank, store and product.
 */

export type StockOp = "R" | "C";

export const stockReceiveCb = (productId: string, storeCode: string) => `nav:sr:${productId}:${storeCode}`;
export const stockCorrectCb = (productId: string, storeCode: string) => `nav:sk:${productId}:${storeCode}`;

const STOCK_TAG_RE = /#STK:([RC]):([A-Za-z0-9_-]{1,100}):([A-Za-z0-9_-]{1,32})\s*$/;

export const stockTag = (op: StockOp, productId: string, storeCode: string) =>
  `#STK:${op}:${productId}:${storeCode}`;

export function parseStockTag(text: string): { op: StockOp; productId: string; storeCode: string } | null {
  const match = STOCK_TAG_RE.exec(text);
  return match ? { op: match[1] as StockOp, productId: match[2], storeCode: match[3] } : null;
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

/** Bot-facing wording of the RPC refusal reasons. */
export const STOCK_REASON_TEXT: Record<string, string> = {
  not_found: "Produit ou boutique introuvable.",
  already_done: "Déjà enregistré (cette réponse a déjà été prise en compte).",
  same: "Le stock est déjà à ce chiffre : rien à corriger.",
  below_reserved: "Impossible de descendre sous les unités réservées pour des commandes en cours."
};
