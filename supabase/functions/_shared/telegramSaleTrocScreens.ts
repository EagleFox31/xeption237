/**
 * Telegram Bot — Écrans et actions de vente au comptoir avec reprise (bon troc).
 * Découpé depuis telegram-bot-entry/index.ts (Règle 4 AGENTS.md : modularité).
 */

import { escapeHtml } from "./telegramHr.ts";
import { parseAmount } from "./telegramCashReport.ts";
import type { Screen, StaffMember } from "./telegramCashScreens.ts";
import {
  PAY_CODES,
  saleTrocPromptCb,
  saleTrocChoiceCb,
  saleTrocConfirmExcessCb,
  saleTrocMixedChoiceCb,
  saleTrocRefPrompt,
  saleTrocMixedCashPrompt,
  salePrompt,
  type PaymentSplitItem
} from "./telegramSale.ts";
import type { TrocVoucherCheckResult } from "./trocVoucher.ts";

export interface TelegramSaleTrocDeps {
  db: () => any;
  telegram: (method: string, payload: Record<string, unknown>) => Promise<any>;
  stockRows: (store: any, options: { productId?: string; limit?: number; ascending?: boolean }) => Promise<any[]>;
  money: (amount: number) => string;
  scopeSuffix: (store?: any) => string;
  saleRefusal: (result: { reason?: string; error?: string; order_id?: string }) => Screen;
  saleMessage: (text: string) => Screen;
}

export async function actionSaleTrocPrompt(
  staff: StaffMember,
  productId: string,
  chatId: string | number,
  deps: TelegramSaleTrocDeps
): Promise<Screen | null> {
  const { telegram, stockRows, saleRefusal } = deps;
  if (!staff.store) return saleRefusal({ reason: "no_store" });
  const [product] = await stockRows(staff.store, { productId, limit: 1, ascending: false });
  if (!product || product.stock < 1) return saleRefusal({ reason: product ? "out_of_stock" : "not_found" });
  await telegram("sendMessage", {
    chat_id: chatId,
    text: saleTrocRefPrompt(product.id, product.name, product.price),
    parse_mode: "HTML",
    reply_markup: { force_reply: true, input_field_placeholder: "ex. TRC-1792843872" }
  });
  return null;
}

export async function actionSaleTrocRefReply(
  staff: StaffMember,
  productId: string,
  rawText: string,
  deps: TelegramSaleTrocDeps
): Promise<Screen> {
  const { db, stockRows, saleRefusal, saleMessage, money, scopeSuffix } = deps;
  if (!staff.store) return saleRefusal({ reason: "no_store" });
  const [product] = await stockRows(staff.store, { productId, limit: 1, ascending: false });
  if (!product || product.stock < 1) return saleRefusal({ reason: product ? "out_of_stock" : "not_found" });

  const supabase = db();
  if (!supabase) return saleMessage("Service indisponible.");

  const { data, error } = await supabase.rpc("telegram_staff_troc_voucher_check", {
    p_telegram_user_id: staff.telegram_user_id,
    p_voucher_ref: rawText.trim()
  });

  if (error || !data) {
    console.error("telegram-bot-entry: voucher check failed", error);
    return saleMessage("Erreur lors de la vérification du bon. Réessayez.");
  }

  const check = data as TrocVoucherCheckResult;
  if (!check.valid) {
    let msg = "❌ <b>Bon de reprise non valide</b>\n\n";
    if (check.reason === "not_found") {
      msg += `Aucun dossier ne correspond à la référence <code>${escapeHtml(rawText.trim())}</code>.`;
    } else if (check.reason === "already_used") {
      msg += `Ce bon a déjà été utilisé pour la commande <b>${escapeHtml(check.order_id ?? "")}</b>.`;
    } else if (check.reason === "not_validated") {
      msg += `Ce dossier est en statut <b>${escapeHtml(check.status ?? "")}</b>. Il doit être validé en atelier avant son utilisation en caisse.`;
    } else if (check.reason === "expired") {
      msg += `Ce bon a expiré et ne peut plus être déduit directement.`;
    } else if (check.reason === "zero_value") {
      msg += `La valeur de reprise de ce dossier est de 0 FCFA.`;
    } else {
      msg += `Vérification refusée (${escapeHtml(check.reason ?? "inconnu")}).`;
    }
    return {
      text: msg,
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔁 Réessayer avec une autre référence", callback_data: saleTrocPromptCb(productId) }],
          [{ text: "⬅️ Retour choix paiement", callback_data: `nav:sv:${productId}:all` }]
        ]
      }
    };
  }

  const credit = Number(check.trade_in_value ?? 0);
  const price = Number(product.price);
  const targetNotice = check.target_product_name
    ? `\n🎯 <i>Appareil cible initial : ${escapeHtml(check.target_product_name)}</i>\n`
    : "";

  // Cas 1 : Crédit supérieur au prix du produit (perte crédit avec confirmation explicite)
  if (credit > price) {
    const loss = credit - price;
    return {
      text:
        `⚠️ <b>Attention : Valeur du bon supérieure au prix !</b>\n\n` +
        `Appareil repris : <b>${escapeHtml(check.device_name ?? "")}</b>\n` +
        `Valeur du bon : <b>${money(credit)}</b>\n` +
        `Prix de l'article : <b>${money(price)}</b>\n` +
        targetNotice +
        `\n⚠️ <b>Le client renonce aux ${money(loss)} de crédit restant</b> (aucun rendu de monnaie en espèces).\n\n` +
        `Confirmez-vous l'utilisation de ce bon pour cette vente ?`,
      reply_markup: {
        inline_keyboard: [
          [{ text: `✅ Confirmer la reprise (${money(price)} déduits)`, callback_data: saleTrocConfirmExcessCb("TROC", product.id, check.trade_in_id!) }],
          [{ text: "❌ Annuler", callback_data: `nav:p:${product.id}:all${scopeSuffix(staff.store)}` }]
        ]
      }
    };
  }

  // Cas 2 : Crédit égal au prix du produit (100% couvert)
  if (credit === price) {
    return {
      text:
        `🔁 <b>Bon de reprise validé : 100% couvert !</b>\n\n` +
        `Appareil repris : <b>${escapeHtml(check.device_name ?? "")}</b>\n` +
        `Valeur reprise déduite : <b>${money(credit)}</b>\n` +
        `💰 Total à payer : <b>0 FCFA</b>\n` +
        targetNotice +
        `\nPrêt à finaliser la vente par bon troc :`,
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ Continuer vers la vente (0 FCFA)", callback_data: saleTrocChoiceCb("TROC", product.id, check.trade_in_id!) }],
          [{ text: "❌ Annuler", callback_data: `nav:p:${product.id}:all${scopeSuffix(staff.store)}` }]
        ]
      }
    };
  }

  // Cas 3 : Crédit inférieur au prix du produit (reliquat à payer)
  const remaining = price - credit;
  return {
    text:
      `🔁 <b>Bon de reprise validé</b>\n\n` +
      `Appareil repris : <b>${escapeHtml(check.device_name ?? "")}</b>\n` +
      `Total produit : ${money(price)}\n` +
      `Crédit déduit : <b>−${money(credit)}</b>\n` +
      targetNotice +
      `\n💰 <b>Reste à encaisser : ${money(remaining)}</b>\n\n` +
      `Comment le client règle-t-il le reste ?`,
    reply_markup: {
      inline_keyboard: [
        [{ text: `💵 Espèces (${money(remaining)})`, callback_data: saleTrocChoiceCb("C", product.id, check.trade_in_id!) }],
        [{ text: `🟠 Orange Money (${money(remaining)})`, callback_data: saleTrocChoiceCb("O", product.id, check.trade_in_id!) }],
        [{ text: `🟡 MTN MoMo (${money(remaining)})`, callback_data: saleTrocChoiceCb("M", product.id, check.trade_in_id!) }],
        [{ text: `🔀 Mixte (Espèces + Mobile)`, callback_data: saleTrocChoiceCb("X", product.id, check.trade_in_id!) }],
        [{ text: "❌ Annuler", callback_data: `nav:p:${product.id}:all${scopeSuffix(staff.store)}` }]
      ]
    }
  };
}

export async function actionSaleTrocOpen(
  staff: StaffMember,
  payCode: string,
  productId: string,
  tradeInId: string,
  chatId: string | number,
  deps: TelegramSaleTrocDeps
): Promise<Screen | null> {
  const { db, telegram, stockRows, saleRefusal, saleMessage } = deps;
  const supabase = db();
  if (!supabase || !productId || !tradeInId) return saleMessage("Action invalide.");
  if (!staff.store) return saleRefusal({ reason: "no_store" });
  const [product] = await stockRows(staff.store, { productId, limit: 1, ascending: false });
  if (!product || product.stock < 1) return saleRefusal({ reason: product ? "out_of_stock" : "not_found" });

  if (payCode === "X") {
    const { data: vData } = await supabase.from("trade_in_requests").select("trade_in_value").eq("id", tradeInId).maybeSingle();
    const credit = Number(vData?.trade_in_value ?? 0);
    const remaining = Math.max(0, product.price - credit);
    await telegram("sendMessage", {
      chat_id: chatId,
      text: saleTrocMixedCashPrompt(product.id, tradeInId, product.name, remaining),
      parse_mode: "HTML",
      reply_markup: { force_reply: true, input_field_placeholder: "ex. 25000 ou 25k" }
    });
    return null;
  }

  const payMethod = payCode === "TROC" ? "TROC" : (PAY_CODES as any)[payCode];
  if (!payMethod) return saleMessage("Mode de paiement invalide.");

  const { data, error } = await supabase.rpc("telegram_staff_sale_draft_open", {
    p_telegram_user_id: staff.telegram_user_id,
    p_product_id: productId,
    p_payment_method: payMethod,
    p_payment_split: null,
    p_trade_in_request_id: tradeInId
  });

  if (error || !data) {
    console.error("telegram-bot-entry: troc sale draft open failed", { code: error?.code });
    return saleMessage("Vente non démarrée, réessayez.");
  }
  const result = data as {
    changed: boolean; reason?: string; draft_id?: string; product_name?: string;
    price?: number; discount_amount?: number; customer_name?: string; customer_phone?: string;
  };
  if (!result.changed || !result.draft_id) return saleRefusal(result);

  const prefilled = (result.customer_name && result.customer_phone)
    ? { name: result.customer_name, phone: result.customer_phone }
    : null;

  await telegram("sendMessage", {
    chat_id: chatId,
    text: salePrompt(
      result.draft_id,
      result.product_name ?? product.name,
      Number(result.price ?? product.price),
      payMethod,
      null,
      Number(result.discount_amount ?? 0),
      prefilled
    ),
    parse_mode: "HTML",
    reply_markup: { force_reply: true, input_field_placeholder: prefilled ? `${prefilled.name} ${prefilled.phone}` : "Paul 699123456" }
  });
  return null;
}

export async function actionSaleTrocMixedCashReply(
  staff: StaffMember,
  productId: string,
  tradeInId: string,
  rawText: string,
  deps: TelegramSaleTrocDeps
): Promise<Screen> {
  const { db, stockRows, saleRefusal, saleMessage, money, scopeSuffix } = deps;
  if (!staff.store) return saleRefusal({ reason: "no_store" });
  const [product] = await stockRows(staff.store, { productId, limit: 1, ascending: false });
  if (!product || product.stock < 1) return saleRefusal({ reason: product ? "out_of_stock" : "not_found" });

  const supabase = db();
  if (!supabase) return saleMessage("Service indisponible.");
  const { data: vData } = await supabase.from("trade_in_requests").select("trade_in_value").eq("id", tradeInId).maybeSingle();
  const credit = Number(vData?.trade_in_value ?? 0);
  const remainingTotal = Math.max(0, product.price - credit);

  const cash = parseAmount(rawText);
  if (cash <= 0 || cash >= remainingTotal) {
    return {
      text:
        `❌ <b>Montant espèces invalide</b>\n\n` +
        `Le montant en espèces doit être supérieur à 0 et inférieur au solde restant (${money(remainingTotal)}).\n` +
        `Vous avez saisi : <code>${escapeHtml(rawText)}</code>\n\n` +
        `Réessayez :`,
      reply_markup: {
        force_reply: true,
        input_field_placeholder: "ex. 25000 ou 25k"
      }
    };
  }

  const remainingMobile = remainingTotal - cash;
  return {
    text:
      `🔀 <b>Paiement mixte du reliquat — ${escapeHtml(product.name)}</b>\n\n` +
      `Solde total : ${money(remainingTotal)}\n` +
      `💵 Espèces reçues : <b>${money(cash)}</b>\n` +
      `💰 Reste à régler : <b>${money(remainingMobile)}</b>\n\n` +
      `Comment le client règle-t-il le reste du solde ?`,
    reply_markup: {
      inline_keyboard: [
        [{ text: `🟠 Orange Money (${money(remainingMobile)})`, callback_data: saleTrocMixedChoiceCb("O", product.id, tradeInId, cash) }],
        [{ text: `🟡 MTN MoMo (${money(remainingMobile)})`, callback_data: saleTrocMixedChoiceCb("M", product.id, tradeInId, cash) }],
        [{ text: "❌ Annuler", callback_data: `nav:p:${product.id}:all${scopeSuffix(staff.store)}` }]
      ]
    }
  };
}

export async function actionSaleTrocMixedOpen(
  staff: StaffMember,
  mobileCode: "O" | "M",
  productId: string,
  tradeInId: string,
  cashAmount: number,
  chatId: string | number,
  deps: TelegramSaleTrocDeps
): Promise<Screen | null> {
  const { db, telegram, stockRows, saleRefusal, saleMessage } = deps;
  const supabase = db();
  if (!supabase || (mobileCode !== "O" && mobileCode !== "M") || !productId || !tradeInId || cashAmount <= 0) {
    return saleMessage("Action invalide.");
  }
  if (!staff.store) return saleRefusal({ reason: "no_store" });
  const [product] = await stockRows(staff.store, { productId, limit: 1, ascending: false });
  if (!product || product.stock < 1) return saleRefusal({ reason: product ? "out_of_stock" : "not_found" });

  const { data: vData } = await supabase.from("trade_in_requests").select("trade_in_value").eq("id", tradeInId).maybeSingle();
  const credit = Number(vData?.trade_in_value ?? 0);
  const remainingTotal = Math.max(0, product.price - credit);
  const remainingMobile = remainingTotal - cashAmount;
  if (remainingMobile <= 0) return saleMessage("Montant restant invalide.");

  const mobileChannel = mobileCode === "O" ? "om" : "momo";
  const split: PaymentSplitItem[] = [
    { channel: "cash", amount: cashAmount },
    { channel: mobileChannel, amount: remainingMobile }
  ];

  const { data, error } = await supabase.rpc("telegram_staff_sale_draft_open", {
    p_telegram_user_id: staff.telegram_user_id,
    p_product_id: productId,
    p_payment_method: "MIXED",
    p_payment_split: split,
    p_trade_in_request_id: tradeInId
  });
  if (error || !data) {
    console.error("telegram-bot-entry: troc mixed sale draft open failed", { code: error?.code });
    return saleMessage("Vente non démarrée, réessayez.");
  }
  const result = data as {
    changed: boolean; reason?: string; draft_id?: string; product_name?: string;
    price?: number; discount_amount?: number; customer_name?: string; customer_phone?: string;
  };
  if (!result.changed || !result.draft_id) return saleRefusal(result);

  const prefilled = (result.customer_name && result.customer_phone)
    ? { name: result.customer_name, phone: result.customer_phone }
    : null;

  await telegram("sendMessage", {
    chat_id: chatId,
    text: salePrompt(
      result.draft_id,
      result.product_name ?? product.name,
      Number(result.price ?? product.price),
      "MIXED",
      split,
      Number(result.discount_amount ?? 0),
      prefilled
    ),
    parse_mode: "HTML",
    reply_markup: { force_reply: true, input_field_placeholder: prefilled ? `${prefilled.name} ${prefilled.phone}` : "Paul 699123456" }
  });
  return null;
}

