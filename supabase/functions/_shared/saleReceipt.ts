/**
 * Pure helpers for building pre-filled WhatsApp customer sale receipts (wa.me).
 * No Deno or npm dependencies: runnable in Vitest and Edge Functions.
 */

import { payLabel, type SaleLine, type PaymentSplitItem } from "./telegramSale.ts";

export const MAX_RECEIPT_TEXT_LENGTH = 1600;

export interface SaleReceiptData {
  order_id: string;
  lines: SaleLine[];
  total: number;
  discount_amount?: number;
  payment_method: string;
  payment_split?: PaymentSplitItem[] | null;
  trade_in_ref?: string;
  store_name?: string;
  customer_name?: string;
  customer_phone?: string;
  created_at?: string | Date;
}

/** Formate un montant en FCFA avec séparateurs d'espaces simples. */
export function formatReceiptMoney(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(amount)).replace(/[\u202f\u00a0]/g, " ") + " FCFA";
}

/** Formate une date en heure locale d'Afrique/Douala (UTC+1). */
export function formatReceiptDate(dateInput?: string | Date): string {
  const d = dateInput instanceof Date ? dateInput : (dateInput ? new Date(dateInput) : new Date());
  if (isNaN(d.getTime())) return "";
  try {
    const formatter = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Africa/Douala",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(d);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? "";
    return `${get("day")}/${get("month")}/${get("year")} à ${get("hour")}h${get("minute")}`;
  } catch {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} à ${pad(d.getHours())}h${pad(d.getMinutes())}`;
  }
}

/**
 * Normalise un numéro camerounais vers le format international sans « + » (ex: 237699123456).
 * Valide les numéros mobiles (6XXXXXXXX) et fixes (2XXXXXXXX) à 9 chiffres.
 * Renvoie null si le numéro est absent ou invalide.
 */
export function normalizeCameroonPhone(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("237") && digits.length === 12) {
    digits = digits.slice(3);
  }
  if (!/^[26]\d{8}$/.test(digits)) return null;
  return `237${digits}`;
}

/**
 * Construit le lien wa.me pré-rempli pour envoyer le reçu au client.
 * Renvoie null si le numéro est invalide ou absent (aucun bouton ne sera affiché).
 */
export function buildWhatsAppReceiptLink(phone: string | null | undefined, text: string): string | null {
  const normalized = normalizeCameroonPhone(phone);
  if (!normalized || !text.trim()) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text.trim())}`;
}

/**
 * Génère le corps texte lisible du reçu client pour WhatsApp.
 * Si le texte dépasse MAX_RECEIPT_TEXT_LENGTH, la liste des articles est tronquée proprement
 * tout en préservant la référence, le total payé et les informations légales.
 */
export function formatSaleReceiptText(sale: SaleReceiptData): string {
  const store = sale.store_name?.trim() || "Xeption";
  const ref = sale.order_id?.trim() || "N/A";
  const dateStr = formatReceiptDate(sale.created_at);
  const client = sale.customer_name?.trim();

  let header = `🧾 *REÇU DE VENTE — XEPTION*\n\n`;
  header += `Réf : *${ref}*\n`;
  if (dateStr) header += `Date : ${dateStr}\n`;
  header += `Boutique : ${store}\n`;
  if (client) header += `Client : ${client}\n`;
  header += `\n*Articles :*\n`;

  const discount = Number(sale.discount_amount ?? 0);
  let paymentClean = payLabel(sale.payment_method).replace(/^[^\w\s\u00C0-\u00FF]+\s*/, "");
  if (sale.payment_method === "MIXED" && Array.isArray(sale.payment_split) && sale.payment_split.length > 0) {
    const parts = sale.payment_split.map(p => {
      const ch = p.channel === "cash" ? "Espèces" : p.channel === "om" ? "OM" : p.channel === "momo" ? "MoMo" : p.channel;
      return `${ch} ${formatReceiptMoney(p.amount)}`;
    });
    paymentClean = `Mixte (${parts.join(" + ")})`;
  } else if (sale.payment_method === "TROC") {
    paymentClean = "Bon de reprise Smart Troc (100%)";
  }

  let footer = `\n`;
  if (discount > 0) {
    if (sale.trade_in_ref) {
      footer += `• Reprise (${sale.trade_in_ref}) : −${formatReceiptMoney(discount)}\n`;
    } else {
      footer += `• Remise : −${formatReceiptMoney(discount)}\n`;
    }
  }
  footer += `\n*Total payé : ${formatReceiptMoney(sale.total)}*\n`;
  footer += `Moyen de paiement : ${paymentClean}\n\n`;
  footer += `Merci pour votre achat chez Xeption ! ✨\n`;
  footer += `Appareils garantis · Assistance & SAV disponible`;

  const lines = sale.lines || [];
  const lineStrings: string[] = [];

  for (const line of lines) {
    const qtyStr = line.quantity > 1 ? ` ×${line.quantity}` : "";
    const totalLinePrice = (line.unit_price || 0) * (line.quantity || 1);
    lineStrings.push(`• ${line.name.trim()}${qtyStr} — ${formatReceiptMoney(totalLinePrice)}`);
  }

  // Assemblage avec contrôle de longueur maximale
  const TRUNCATION_NOTICE = "• ... [autres articles tronqués]";
  let body = "";
  let truncated = false;

  for (let i = 0; i < lineStrings.length; i++) {
    const candidate = body ? `${body}\n${lineStrings[i]}` : lineStrings[i];
    const testCandidate = i < lineStrings.length - 1 ? `${candidate}\n${TRUNCATION_NOTICE}` : candidate;
    const testTotal = `${header}${testCandidate}${footer}`;
    if (testTotal.length > MAX_RECEIPT_TEXT_LENGTH) {
      truncated = true;
      break;
    }
    body = candidate;
  }

  if (truncated) {
    body += (body ? "\n" : "") + TRUNCATION_NOTICE;
  } else if (!body && lineStrings.length === 0) {
    body = "• Vente comptoir";
  }

  return `${header}${body}${footer}`;
}

/**
 * Construit le bouton Telegram en ligne pour envoyer le reçu sur WhatsApp,
 * ou renvoie null si le numéro est invalide ou absent.
 */
export function buildSaleReceiptButton(
  phone: string | null | undefined,
  sale: SaleReceiptData
): { text: string; url: string } | null {
  const text = formatSaleReceiptText(sale);
  const url = buildWhatsAppReceiptLink(phone, text);
  return url ? { text: "📲 Envoyer le reçu au client", url } : null;
}
