/**
 * "Sale mode" of the staff bot catalogue: the seller came from « Enregistrer une vente »,
 * so category lists and product sheets show only what a sale needs (no stock tools).
 * Stateless: the mode rides in the backCat token of the callbacks ("$apple.2", "$search").
 * No Deno / npm imports: shared by telegram-bot-entry and the vitest suite.
 */

// One byte: product callbacks already run close to Telegram's 64-byte callback_data limit.
const SALE_MARK = "$";

export const isSaleToken = (token: string) => token.startsWith(SALE_MARK);
export const baseToken = (token: string) => (isSaleToken(token) ? token.slice(SALE_MARK.length) : token);
export const withSaleMode = (token: string, sale: boolean) => (sale ? SALE_MARK + baseToken(token) : baseToken(token));

/** Back to the sale screen without re-sending the search prompt. */
export const SALE_BACK_FLAG = "b";
export const saleBackCb = (storeCode: string) => `nav:sell:${storeCode}:${SALE_BACK_FLAG}`;
/** Asks again for the product name (ForceReply prompt). */
export const saleSearchCb = (storeCode: string) => `nav:sellq:${storeCode}`;

// ── ForceReply : a reply to this prompt searches the catalogue in sale mode ──
const SALE_SEARCH_TAG_RE = /#SELLQ:([A-Za-z0-9_-]{1,32})\s*$/;

export const saleSearchTag = (storeCode: string) => `#SELLQ:${storeCode}`;

export function parseSaleSearchTag(text: string): { storeCode: string } | null {
  const match = SALE_SEARCH_TAG_RE.exec(text);
  return match ? { storeCode: match[1] } : null;
}

export const saleSearchPrompt = (storeName: string, storeCode: string) =>
  `🔍 Vente — ${storeName}\n` +
  `Quel produit vendez-vous ? Répondez à ce message avec son nom (ex. s24, iphone 13).\n` +
  saleSearchTag(storeCode);
