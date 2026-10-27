/**
 * Telegram Bot — Écrans et flux de gestion des dettes et crédits clients.
 *
 * Déplacement pur depuis telegram-bot-entry/index.ts : mêmes textes, mêmes boutons, mêmes callbacks cr:*.
 * Reçoit toutes ses dépendances en paramètres (client Supabase, renderHub) pour rester 100% testable.
 */
import {
  formatMoney,
  parseAmount,
  parseDebtsText,
  parseCustomerNameAndPhone,
  isLikelyAmount,
  escapeHtml,
  type InflowItem,
  type CrTag
} from "./telegramCashReport.ts";
import type { InlineButton, Screen, StaffMember } from "./telegramCashScreens.ts";

export interface TelegramDebtDeps {
  supabase: any;
  homeRow: InlineButton[];
  renderHub: (staff: StaffMember, storeCodeOrId?: string) => Promise<Screen>;
}

export async function screenCashReportDebts(
  staff: StaffMember,
  storeId: string,
  deps: TelegramDebtDeps
): Promise<Screen> {
  const { supabase, homeRow } = deps;
  if (!supabase) return { text: "Service indisponible.", reply_markup: { inline_keyboard: [homeRow] } };

  const { data: debts } = await supabase
    .from("store_debts")
    .select("id, customer_name, device_model, amount_due, amount_paid, phone, status")
    .eq("store_id", storeId)
    .neq("status", "settled")
    .order("created_at", { ascending: false });

  const debtRows = (debts || []) as {
    id: string;
    customer_name: string;
    device_model: string | null;
    amount_due: number;
    amount_paid: number;
    phone: string | null;
    status: string;
  }[];

  const buttons: InlineButton[][] = [];
  let listText = "";

  if (debtRows.length === 0) {
    listText = "<i>Aucune dette active pour cette boutique. Tout est en ordre !</i>\n";
  } else {
    listText = debtRows.map((d, idx) => {
      const rem = d.amount_due - (d.amount_paid || 0);
      const phoneStr = d.phone ? ` · <code>${escapeHtml(d.phone)}</code>` : "";
      const devStr = d.device_model ? ` (${escapeHtml(d.device_model)})` : "";
      return `${idx + 1}. <b>${escapeHtml(d.customer_name)}</b>${devStr} : <b>${formatMoney(rem)}</b>${phoneStr}`;
    }).join("\n");

    for (const d of debtRows.slice(0, 6)) {
      const rem = d.amount_due - (d.amount_paid || 0);
      const shortName = d.customer_name.length > 14 ? d.customer_name.slice(0, 13) + "…" : d.customer_name;
      buttons.push([{
        text: `💰 Encaisser : ${shortName} (${formatMoney(rem)})`,
        callback_data: `nav:cr_pd:${d.id}`
      }]);
    }
  }

  buttons.push([
    { text: "➕ Nouvelle dette client", callback_data: `nav:cr_dnew:${storeId}` }
  ]);
  buttons.push([
    { text: "📋 Coller une liste brute", callback_data: `nav:cr_adddebt:${storeId}` }
  ]);
  buttons.push([
    { text: "⬅️ Retour au Rapport", callback_data: `nav:cr_hub:${storeId}` },
    { text: "🏠 Accueil", callback_data: "nav:main" }
  ]);

  return {
    text:
      `📋 <b>Gestion des Dettes & Crédits Clients</b>\n\n` +
      listText + `\n` +
      `<i>💡 Touchez « Encaisser » lorsqu'un client règle sa dette : le montant sera déduit et automatiquement ajouté aux entrées de la journée !</i>`,
    reply_markup: { inline_keyboard: buttons }
  };
}

/**
 * Traite les réponses textuelles spécifiques aux dettes (ADDDEBT, DEBT_STEP1, DEBT_STEP2, DEBT_STEP3, PAYDEBT).
 * Renvoie null si l'action relève d'un autre module (ex: caisse pure).
 */
export async function handleDebtReply(
  staff: StaffMember,
  tag: CrTag,
  text: string,
  deps: TelegramDebtDeps
): Promise<Screen | null> {
  const { supabase } = deps;
  if (!supabase) return null;

  if (tag.action === "ADDDEBT") {
    const debtItems = parseDebtsText(text);
    for (const item of debtItems) {
      await supabase.rpc("telegram_staff_debt_add", {
        p_telegram_user_id: staff.telegram_user_id,
        p_store_id: tag.targetId,
        p_customer_name: item.customer_name,
        p_device_model: item.device_model || "",
        p_amount: item.amount_due,
        p_phone: item.phone || ""
      });
    }
    return screenCashReportDebts(staff, tag.targetId, deps);
  }

  if (tag.action === "DEBT_STEP1") {
    let storeId = tag.targetId;
    try {
      const parsed = JSON.parse(tag.targetId);
      if (parsed?.storeId) storeId = parsed.storeId;
    } catch {
      // plain storeId
    }

    const { customerName, phone, isValid } = parseCustomerNameAndPhone(text);
    if (!isValid || !customerName) {
      await supabase.from("store_cash_drafts")
        .update({
          pending_action: "DEBT_STEP1",
          pending_target_id: JSON.stringify({ storeId }),
          updated_at: new Date().toISOString()
        })
        .eq("telegram_user_id", staff.telegram_user_id)
        .eq("store_id", storeId);

      const errorHint = isLikelyAmount(text)
        ? `⚠️ Vous avez saisi un montant (<b>${escapeHtml(text.trim())}</b>) au lieu du nom du client !\n\n`
        : `⚠️ Nom du client invalide (au moins 2 lettres requises).\n\n`;

      return {
        text:
          errorHint +
          `👤 <b>Nouvelle dette client (Étape 1/3)</b>\n\n` +
          `Entrez le <b>nom du client</b> et son <b>numéro de téléphone</b> :\n\n` +
          `<i>Exemples :</i>\n` +
          `• <code>Alain Kamga 699123456</code>\n` +
          `• <code>Mme Brigitte 677889900</code>\n` +
          `• <code>Raoul Kamba</code>`,
        reply_markup: { force_reply: true, input_field_placeholder: "Nom et téléphone (ex: Alain Kamga 699123456)" }
      };
    }

    const payload = JSON.stringify({ storeId, customerName, phone });

    await supabase.from("store_cash_drafts")
      .update({
        pending_action: "DEBT_STEP2",
        pending_target_id: payload,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_user_id", staff.telegram_user_id)
      .eq("store_id", storeId);

    const phoneSuffix = phone ? ` (${phone})` : "";
    return {
      text:
        `📱 <b>Nouvelle dette : ${escapeHtml(customerName)}${escapeHtml(phoneSuffix)} (Étape 2/3)</b>\n\n` +
        `Quel est le <b>produit ou modèle</b> de l'appareil ?\n\n` +
        `<i>Exemples :</i>\n` +
        `• <code>Dell Latitude 5510</code>\n` +
        `• <code>iPhone 13 128Go</code>\n` +
        `• <code>Samsung S24 Ultra</code>\n` +
        `• <code>Accessoires / Divers</code>`,
      reply_markup: { force_reply: true, input_field_placeholder: "Modèle (ex: iPhone 11)" }
    };
  }

  if (tag.action === "DEBT_STEP2") {
    let storeId = "";
    let customerName = "Client";
    let phone = "";
    try {
      const parsed = JSON.parse(tag.targetId);
      storeId = parsed?.storeId ?? "";
      customerName = parsed?.customerName ?? "Client";
      phone = parsed?.phone ?? "";
    } catch {
      // fallback
    }

    const cleanInput = text.replace(/^[*\s,;:-]+|[*\s,;:-]+$/g, "").trim();

    // 1. Validation : Check if the user entered an amount instead of a product
    if (!cleanInput || isLikelyAmount(cleanInput) || cleanInput.length < 2) {
      await supabase.from("store_cash_drafts")
        .update({
          pending_action: "DEBT_STEP2",
          pending_target_id: tag.targetId,
          updated_at: new Date().toISOString()
        })
        .eq("telegram_user_id", staff.telegram_user_id)
        .eq("store_id", storeId);

      const phoneSuffix = phone ? ` (${phone})` : "";
      return {
        text:
          `⚠️ <b>Saisie incorrecte : produit attendu</b>\n\n` +
          (isLikelyAmount(cleanInput)
            ? `Vous avez entré un montant (<b>${escapeHtml(cleanInput)}</b>) au lieu du modèle de l'appareil !\n\n`
            : `Veuillez spécifier un modèle ou produit valide (au moins 2 lettres).\n\n`) +
          `📱 Quel est l'appareil pour <b>${escapeHtml(customerName)}${escapeHtml(phoneSuffix)}</b> ?\n\n` +
          `<i>Exemples :</i>\n` +
          `• <code>iPhone 11</code>\n` +
          `• <code>Dell Latitude 5510</code>\n` +
          `• <code>Samsung S24 Ultra</code>\n` +
          `• <code>Chargeur 65W</code>`,
        reply_markup: { force_reply: true, input_field_placeholder: "Modèle (ex: iPhone 11)" }
      };
    }

    // 2. Catalogue check via fuzzy search
    let finalDeviceModel = cleanInput;
    let catalogStatusMsg = "";

    const { data: searchResults } = await supabase.rpc("telegram_search_products_fuzzy", {
      p_query: cleanInput.slice(0, 80),
      p_store_code: null,
      p_telegram_user_id: staff.telegram_user_id,
      p_limit: 3
    });

    const matches = (searchResults || []) as { id: string; name: string; price: number }[];
    if (matches.length > 0) {
      const topMatch = matches[0];
      finalDeviceModel = topMatch.name;
      catalogStatusMsg = `\n✅ <i>Produit reconnu au catalogue : <b>${escapeHtml(finalDeviceModel)}</b></i>\n`;
    } else {
      finalDeviceModel = `${cleanInput} (Hors catalogue)`;
      catalogStatusMsg = `\n⚠️ <i>Produit non trouvé au catalogue : enregistré comme <b>Hors catalogue</b>.</i>\n`;
    }

    const payload = JSON.stringify({ storeId, customerName, phone, deviceModel: finalDeviceModel });

    await supabase.from("store_cash_drafts")
      .update({
        pending_action: "DEBT_STEP3",
        pending_target_id: payload,
        updated_at: new Date().toISOString()
      })
      .eq("telegram_user_id", staff.telegram_user_id)
      .eq("store_id", storeId);

    return {
      text:
        `💵 <b>Nouvelle dette : ${escapeHtml(customerName)} — ${escapeHtml(finalDeviceModel)} (Étape 3/3)</b>\n` +
        catalogStatusMsg + `\n` +
        `Entrez le <b>montant restant dû</b> par le client en FCFA :\n\n` +
        `<i>Exemples : <code>250k</code>, <code>250000</code>, <code>1M</code>, <code>25.000f</code></i>`,
      reply_markup: { force_reply: true, input_field_placeholder: "Montant dû en FCFA (ex: 250k)" }
    };
  }

  if (tag.action === "DEBT_STEP3") {
    let storeId = "";
    let customerName = "Client";
    let phone = "";
    let deviceModel = "";
    try {
      const parsed = JSON.parse(tag.targetId);
      storeId = parsed?.storeId ?? "";
      customerName = parsed?.customerName ?? "Client";
      phone = parsed?.phone ?? "";
      deviceModel = parsed?.deviceModel ?? "";
    } catch {
      // fallback
    }

    const amountDue = parseAmount(text);
    if (amountDue <= 0 || !/\d/.test(text)) {
      await supabase.from("store_cash_drafts")
        .update({
          pending_action: "DEBT_STEP3",
          pending_target_id: tag.targetId,
          updated_at: new Date().toISOString()
        })
        .eq("telegram_user_id", staff.telegram_user_id)
        .eq("store_id", storeId);

      return {
        text:
          `⚠️ <b>Montant non reconnu</b>\n\n` +
          `Veuillez entrer un montant numérique valide en FCFA pour <b>${escapeHtml(customerName)}</b> :\n\n` +
          `<i>Exemples : <code>250k</code>, <code>250000</code>, <code>1M</code>, <code>25.000f</code></i>`,
        reply_markup: { force_reply: true, input_field_placeholder: "Ex: 250k ou 250000" }
      };
    }

    if (storeId) {
      await supabase.rpc("telegram_staff_debt_add", {
        p_telegram_user_id: staff.telegram_user_id,
        p_store_id: storeId,
        p_customer_name: customerName,
        p_device_model: deviceModel,
        p_amount: amountDue,
        p_phone: phone
      });
    }

    return screenCashReportDebts(staff, storeId, deps);
  }

  if (tag.action === "PAYDEBT") {
    const amountPaid = parseAmount(text);
    if (amountPaid > 0) {
      const { data: settleRes, error } = await supabase.rpc("telegram_staff_debt_settle", {
        p_telegram_user_id: staff.telegram_user_id,
        p_debt_id: tag.targetId,
        p_amount_paid: amountPaid
      });

      if (!error && settleRes?.success) {
        const { data: debt } = await supabase.from("store_debts").select("store_id").eq("id", tag.targetId).maybeSingle();
        const storeId = debt?.store_id;
        if (storeId) {
          const { data: draft } = await supabase.from("store_cash_drafts")
            .select("inflow_items")
            .eq("telegram_user_id", staff.telegram_user_id)
            .eq("store_id", storeId)
            .maybeSingle();
          const currentInflows = (draft?.inflow_items as InflowItem[]) || [];
          const updated = [
            ...currentInflows,
            {
              label: `Règlement dette ${settleRes.customer_name}`,
              amount: amountPaid,
              salesperson_name: staff.name
            }
          ];
          await supabase.from("store_cash_drafts")
            .update({ inflow_items: updated, updated_at: new Date().toISOString() })
            .eq("telegram_user_id", staff.telegram_user_id)
            .eq("store_id", storeId);

          return deps.renderHub(staff, storeId);
        }
      }
    }
    return deps.renderHub(staff);
  }

  return null;
}
