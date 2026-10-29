import { escapeHtml } from "./telegramHr.ts";

export const PAY_CODES = { C: "CASH", O: "OM", M: "MOMO" } as const;
export type PayCode = keyof typeof PAY_CODES;
export type PayMethod = (typeof PAY_CODES)[PayCode];

export const MIXED_PAY_CODE = "X" as const;
export const MIXED_PAY_METHOD = "MIXED" as const;

export interface PaymentSplitItem {
  channel: "cash" | "om" | "momo";
  amount: number;
}

export const PAY_LABEL: Record<string, string> = {
  CASH: "💵 Espèces",
  OM: "🟠 Orange Money",
  MOMO: "🟡 MTN MoMo",
  MIXED: "🔀 Mixte (Espèces + Mobile)",
  TROC: "🔁 Bon troc (100%)"
};

export const isPayCode = (value: string): value is PayCode =>
  Object.prototype.hasOwnProperty.call(PAY_CODES, value);

const formatMoneySimple = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n)).replace(/[\u202f\u00a0]/g, " ") + " FCFA";

export const formatSplitDetail = (split: PaymentSplitItem[]): string => {
  const parts = split.map(p => {
    const ch = p.channel === "cash" ? "Espèces" : p.channel === "om" ? "OM" : "MoMo";
    return `${ch} ${formatMoneySimple(p.amount)}`;
  });
  return parts.join(" + ");
};

export const payLabel = (method: string, split?: PaymentSplitItem[] | null): string => {
  if (method === "MIXED" && Array.isArray(split) && split.length > 0) {
    return `🔀 Mixte (${formatSplitDetail(split)})`;
  }
  return PAY_LABEL[method] ?? method;
};

/** backCat lets "⬅️ Précédent" return to the product the seller came from. */
export const saleStartCb = (productId: string, backCat: string) => `nav:sv:${productId}:${backCat}`;
export const salePayCb = (code: PayCode, productId: string) => `nav:sp:${code}:${productId}`;
export const saleMixedPromptCb = (productId: string) => `nav:smx:${productId}`;
export const saleMixedChoiceCb = (mobileCode: "O" | "M", productId: string, cashAmount: number) =>
  `nav:spx:${mobileCode}:${productId}:${cashAmount}`;
export const saleTrocPromptCb = (productId: string) => `nav:str:${productId}`;
export const saleTrocChoiceCb = (payCode: string, productId: string, tradeInId: string) =>
  `nav:stc:${payCode}:${productId}:${tradeInId}`;
export const saleTrocConfirmExcessCb = (payCode: string, productId: string, tradeInId: string) =>
  `nav:stcx:${payCode}:${productId}:${tradeInId}`;
export const saleTrocMixedChoiceCb = (mobileCode: "O" | "M", productId: string, tradeInId: string, cashAmount: number) =>
  `nav:stpx:${mobileCode}:${productId}:${tradeInId}:${cashAmount}`;
export const saleConfirmCb = (draftId: string) => `nav:sc:${draftId}`;
export const saleCancelCb = (draftId: string) => `nav:sx:${draftId}`;

export const parseSaleMixedChoiceCb = (cb: string): { mobileCode: "O" | "M"; productId: string; cashAmount: number } | null => {
  const parts = cb.split(":");
  if (parts.length === 5 && parts[0] === "nav" && parts[1] === "spx" && (parts[2] === "O" || parts[2] === "M")) {
    const cash = parseInt(parts[4], 10);
    if (!isNaN(cash) && cash > 0) {
      return { mobileCode: parts[2] as "O" | "M", productId: parts[3], cashAmount: cash };
    }
  }
  return null;
};

export const parseSaleTrocChoiceCb = (cb: string): { payCode: string; productId: string; tradeInId: string; confirmExcess?: boolean } | null => {
  const parts = cb.split(":");
  if (parts[0] === "nav" && (parts[1] === "stc" || parts[1] === "stcx") && parts.length === 5) {
    return {
      payCode: parts[2],
      productId: parts[3],
      tradeInId: parts[4],
      confirmExcess: parts[1] === "stcx"
    };
  }
  return null;
};

export const parseSaleTrocMixedChoiceCb = (cb: string): { mobileCode: "O" | "M"; productId: string; tradeInId: string; cashAmount: number } | null => {
  const parts = cb.split(":");
  if (parts.length === 6 && parts[0] === "nav" && parts[1] === "stpx" && (parts[2] === "O" || parts[2] === "M")) {
    const cash = parseInt(parts[5], 10);
    if (!isNaN(cash) && cash > 0) {
      return { mobileCode: parts[2] as "O" | "M", productId: parts[3], tradeInId: parts[4], cashAmount: cash };
    }
  }
  return null;
};

export const CUSTOMER_NAME_MAX = 60;

const SALE_TAG_RE = /#VTE:([0-9a-f-]{36})\s*$/;
const MIXED_CASH_TAG_RE = /#SMX:([0-9a-f-]{36})\s*$/;
const TROC_REF_TAG_RE = /#STR:([0-9a-f-]{36})\s*$/;
const TROC_MIXED_CASH_TAG_RE = /#STMX:([0-9a-f-]{36}):([^:\s]+)\s*$/;

export function saleMixedCashPrompt(productId: string, productName: string, price: number): string {
  return (
    `🔀 <b>Paiement mixte — ${escapeHtml(productName)} (${formatMoneySimple(price)})</b>\n\n` +
    `Répondez à ce message avec le montant payé en <b>espèces</b> (ex. 25000 ou 25k).\n` +
    `Le reste sera réglé par Orange Money ou MTN MoMo.\n` +
    `#SMX:${productId}`
  );
}

export function parseMixedCashTag(text: string): { productId: string } | null {
  const match = MIXED_CASH_TAG_RE.exec(text);
  return match ? { productId: match[1] } : null;
}

export function saleTrocRefPrompt(productId: string, productName: string, price: number): string {
  return (
    `🔁 <b>Vente avec reprise — ${escapeHtml(productName)} (${formatMoneySimple(price)})</b>\n\n` +
    `Répondez à ce message avec la référence du bon de reprise (ex. <code>TRC-1792843872</code>).\n` +
    `Le crédit sera déduit du montant à encaisser.\n` +
    `#STR:${productId}`
  );
}

export function parseTrocTag(text: string): { productId: string } | null {
  const match = TROC_REF_TAG_RE.exec(text);
  return match ? { productId: match[1] } : null;
}

export function saleTrocMixedCashPrompt(productId: string, tradeInId: string, productName: string, remainingPrice: number): string {
  return (
    `🔀 <b>Paiement mixte du reliquat — ${escapeHtml(productName)} (Reste : ${formatMoneySimple(remainingPrice)})</b>\n\n` +
    `Répondez à ce message avec le montant payé en <b>espèces</b> (ex. 25000 ou 25k).\n` +
    `Le reste sera réglé par Orange Money ou MTN MoMo.\n` +
    `#STMX:${productId}:${tradeInId}`
  );
}

export function parseTrocMixedCashTag(text: string): { productId: string; tradeInId: string } | null {
  const match = TROC_MIXED_CASH_TAG_RE.exec(text);
  return match ? { productId: match[1], tradeInId: match[2] } : null;
}

/** ForceReply prompt; the trailing tag carries the draft id so the bot stays stateless. */
export function salePrompt(
  draftId: string,
  productName: string,
  price: number,
  method: string,
  split?: PaymentSplitItem[] | null,
  trocDiscount?: number,
  prefilledCustomer?: { name?: string; phone?: string } | null
): string {
  const totalNet = Math.max(0, price - (trocDiscount ?? 0));
  let msg = "🛒 Vente : " + productName + " — " + formatMoneySimple(totalNet) + " (" +
    payLabel(method, split) + ")\n";
  if (trocDiscount && trocDiscount > 0) {
    msg += `(Crédit reprise déduit : −${formatMoneySimple(trocDiscount)})\n`;
  }
  if (prefilledCustomer?.name && prefilledCustomer?.phone) {
    msg += `Client détecté : <b>${escapeHtml(prefilledCustomer.name)}</b> (${escapeHtml(prefilledCustomer.phone)})\n` +
      `Répondez pour confirmer ce client, ou saisissez un autre contact (ex. Paul 699123456) :\n`;
  } else {
    msg += "Répondez à ce message avec le prénom et le numéro WhatsApp du client (ex. Paul 699123456).\n";
  }
  return msg + "#VTE:" + draftId;
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
  lines: SaleLine[]; payment_method: string; payment_split?: PaymentSplitItem[] | null;
  discount_amount?: number; customer_name: string; customer_phone: string;
  trade_in_ref?: string; trade_in_device?: string;
}): string {
  const subtotal = d.lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const discount = d.discount_amount ?? 0;
  return "🧾 <b>Récapitulatif de la vente</b>\n\n" +
    d.lines.map(l => "• " + escapeHtml(l.name) + (l.quantity > 1 ? " ×" + l.quantity : "") + " — " +
      formatMoneySimple(l.unit_price * l.quantity)).join("\n") + "\n" +
    (discount > 0 ? (d.trade_in_ref ? `• Reprise (${escapeHtml(d.trade_in_ref)}) : −${formatMoneySimple(discount)}\n` : "• Remise : −" + formatMoneySimple(discount) + "\n") : "") +
    "\n💰 Total à encaisser : <b>" + formatMoneySimple(Math.max(0, subtotal - discount)) + "</b>\n" +
    "Paiement : " + payLabel(d.payment_method, d.payment_split) + "\n" +
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
  sale_failed: "Vente refusée",
  invalid_payment_split: "Paiement mixte invalide (vérifiez les montants et canaux).",
  voucher_invalid: "Bon de reprise introuvable, déjà utilisé ou non validé.",
  voucher_expired: "Ce bon de reprise a expiré.",
  already_used: "Ce bon de reprise a déjà été utilisé."
};
