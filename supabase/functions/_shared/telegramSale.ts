/**
 * Pure helpers for the Telegram bot counter sale ("🛒 Vendre ce produit").
 * No Deno / npm imports: shared by telegram-bot-entry and the vitest suite.
 * Prices, store and seller never come from here — the SQL RPCs resolve them server side.
 */

import { escapeHtml } from "./telegramHr.ts";

/** One-letter codes keep callback_data short; values match utils/paymentMethods.ts. */
export const PAY_CODES = { C: "CASH", O: "OM", M: "MOMO" } as const;
export type PayCode = keyof typeof PAY_CODES;
export type PayMethod = (typeof PAY_CODES)[PayCode];

export const PAY_LABEL: Record<PayMethod, string> = {
  CASH: "💵 Espèces",
  OM: "🟠 Orange Money",
  MOMO: "🟡 MTN MoMo"
};

export const isPayCode = (value: string): value is PayCode =>
  Object.prototype.hasOwnProperty.call(PAY_CODES, value);

export const payLabel = (method: string): string =>
  PAY_LABEL[method as PayMethod] ?? method;

/** backCat lets "⬅️ Précédent" return to the product the seller came from. */
export const saleStartCb = (productId: string, backCat: string) => `nav:sv:${productId}:${backCat}`;
export const salePayCb = (code: PayCode, productId: string) => `nav:sp:${code}:${productId}`;
export const saleConfirmCb = (draftId: string) => `nav:sc:${draftId}`;
export const saleCancelCb = (draftId: string) => `nav:sx:${draftId}`;

export const CUSTOMER_NAME_MAX = 60;

const SALE_TAG_RE = /#VTE:([0-9a-f-]{36})\s*$/;

/** ForceReply prompt; the trailing tag carries the draft id so the bot stays stateless. */
export function salePrompt(draftId: string, productName: string, price: number, method: string): string {
  return "🛒 Vente : " + productName + " — " + new Intl.NumberFormat("fr-FR").format(price) + " FCFA (" +
    payLabel(method) + ")\n" +
    "Répondez à ce message avec le prénom et le numéro WhatsApp du client (ex. Paul 699123456).\n" +
    "#VTE:" + draftId;
}

export function parseSaleTag(text: string): { draftId: string } | null {
  const match = SALE_TAG_RE.exec(text);
  return match ? { draftId: match[1] } : null;
}

/**
 * "Paul 699123456", "Paul Biya, +237 6 99 12 34 56" → { name, phone: "699123456" }.
 * Phone = the trailing digits (Cameroon mobile, 9 digits, optional 237 prefix), stored
 * in the same local format as existing orders.
 */
export function parseCustomerReply(text: string): { name: string; phone: string } | null {
  const match = /^(.*?)[\s,;:-]*((?:\+|00)?[\d\s.]{9,})$/.exec(text.trim());
  if (!match) return null;
  let digits = match[2].replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith("237")) digits = digits.slice(3);
  if (!/^6\d{8}$/.test(digits)) return null;
  const name = match[1].replace(/[\s,;:-]+$/, "").trim();
  if (!name || name.length > CUSTOMER_NAME_MAX || /\d/.test(name)) return null;
  return { name, phone: digits };
}

export interface SaleLine { name: string; quantity: number; unit_price: number }

export function saleRecap(d: {
  lines: SaleLine[]; payment_method: string; discount_amount?: number;
  customer_name: string; customer_phone: string;
}): string {
  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
  const subtotal = d.lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const discount = d.discount_amount ?? 0;
  return "🧾 <b>Récapitulatif de la vente</b>\n\n" +
    d.lines.map(l => "• " + escapeHtml(l.name) + (l.quantity > 1 ? " ×" + l.quantity : "") + " — " +
      fmt(l.unit_price * l.quantity)).join("\n") + "\n" +
    (discount > 0 ? "• Remise : −" + fmt(discount) + "\n" : "") +
    "\n💰 Total à encaisser : <b>" + fmt(subtotal - discount) + "</b>\n" +
    "Paiement : " + payLabel(d.payment_method) + "\n" +
    "Client : <b>" + escapeHtml(d.customer_name) + "</b> · " + escapeHtml(d.customer_phone) + "\n\n" +
    "Confirmez une fois l'argent reçu.";
}

/** Bot-facing wording of the RPC refusal reasons. */
export const SALE_REASON_TEXT: Record<string, string> = {
  no_store: "Votre compte n'est rattaché à aucune boutique : vente impossible depuis le bot.",
  not_found: "Vente introuvable ou produit indisponible.",
  out_of_stock: "Stock insuffisant dans votre boutique.",
  expired: "Cette vente a expiré (30 min). Recommencez depuis la fiche produit.",
  cancelled: "Cette vente a été annulée.",
  no_customer: "Renseignez d'abord le client (répondez au message de vente).",
  price_changed: "Le prix a changé depuis le début de la vente. Recommencez depuis la fiche produit.",
  sale_failed: "Vente refusée"
};
