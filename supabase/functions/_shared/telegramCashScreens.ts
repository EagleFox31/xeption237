/**
 * Telegram Bot — Écrans et actions de clôture de caisse journalière.
 *
 * Déplacement pur depuis telegram-bot-entry/index.ts : mêmes textes, mêmes boutons, mêmes callbacks cr:*.
 * Reçoit toutes ses dépendances en paramètres (client Supabase, fonction d'envoi Telegram) pour rester testable.
 */
import {
  type CashReportData,
  type InflowItem,
  type OutflowItem,
  type DebtItem,
  type StaffProgressItem,
  formatDateFr,
  formatMoney,
  parseAmount,
  parseExpensesText,
  formatDailyCashReport,
  formatDailyCashReportForWhatsApp,
  escapeHtml,
  type CrTag
} from "./telegramCashReport.ts";
import { createWahaChannel } from "./staffNotifyChannels/waha.ts";

export interface InlineButton {
  text: string;
  callback_data?: string;
  web_app?: { url: string };
  url?: string;
}

export interface Screen {
  text: string;
  reply_markup: {
    inline_keyboard?: InlineButton[][];
    force_reply?: boolean;
    input_field_placeholder?: string;
  };
}

export interface Store {
  id: string;
  name: string;
  code: string;
}

export interface StaffMember {
  telegram_user_id: string;
  auth_user_id: string;
  id: string;
  name: string;
  role: string;
  rank: number;
  store: Store | null;
  scope_store_code: string | null;
}

export interface TelegramCashDeps {
  supabase: any;
  listStores: () => Promise<Store[]>;
  sendTelegram?: (chatId: string | number, payload: { text: string; parse_mode?: string; reply_markup?: unknown }) => Promise<void>;
  staffChatId?: string;
  siteUrl?: string;
  homeRow: InlineButton[];
  getEnv?: (key: string) => string | undefined;
}

export const EXPENSE_PRESETS: Record<string, { label: string; icon: string }> = {
  transp: { label: "Transport", icon: "🚕" },
  dpboss: { label: "Dépôt Boss", icon: "👑" },
  prepay: { label: "Prépayer", icon: "⚡" },
  s_boss: { label: "Sorties Boss", icon: "💼" },
  ration: { label: "Ration", icon: "🍱" },
  credit: { label: "Crédit tél", icon: "📶" }
};

export async function screenCashReportChooseStore(staff: StaffMember, deps: TelegramCashDeps): Promise<Screen> {
  const stores = await deps.listStores();
  const rows: InlineButton[][] = [];
  for (const s of stores) {
    rows.push([{ text: `🏪 ${s.name}`, callback_data: `nav:cr_start:${s.code}` }]);
  }
  rows.push(deps.homeRow);
  return {
    text:
      `📊 <b>Clôture de Caisse — Sélection Boutique</b>\n\n` +
      `Pour quelle boutique souhaitez-vous préparer ou consulter la clôture de caisse ?`,
    reply_markup: { inline_keyboard: rows }
  };
}

export async function screenCashReportHub(
  staff: StaffMember,
  storeCodeOrId: string | undefined,
  deps: TelegramCashDeps
): Promise<Screen> {
  const { supabase, homeRow } = deps;
  if (!supabase) {
    return {
      text: "❌ Service de caisse temporairement indisponible.",
      reply_markup: { inline_keyboard: [homeRow] }
    };
  }

  let targetCode = storeCodeOrId;
  const RANK_DIRECTION = 2;
  if (!targetCode && staff.rank >= RANK_DIRECTION && !staff.scope_store_code) {
    return screenCashReportChooseStore(staff, deps);
  }
  if (!targetCode && staff.store) {
    targetCode = staff.store.code;
  }

  const { data: initRes, error: initErr } = await supabase.rpc("telegram_staff_cash_report_init", {
    p_telegram_user_id: staff.telegram_user_id,
    p_store_code: targetCode ?? null
  });

  if (initErr || !initRes || initRes.success !== true) {
    console.error("cash report init failed", initErr, initRes);
    return {
      text: `❌ Impossible d'initialiser le rapport de caisse (${initRes?.reason ?? initErr?.message ?? "erreur"}).`,
      reply_markup: { inline_keyboard: [homeRow] }
    };
  }

  const storeId = initRes.store_id as string;
  const storeName = initRes.store_name as string;
  const reportDate = initRes.report_date as string;

  let draft = initRes.draft;
  if (!draft) {
    const initialInflows: InflowItem[] = (initRes.today_pos_sales || [])
      .map((s: any) => {
        const cashAmount = Number(
          s.cash_amount !== undefined
            ? s.cash_amount
            : (s.payment_method === "CASH" || !s.payment_method ? s.amount : 0)
        ) || 0;
        const productName = s.product_name || s.label || "Vente comptoir";
        const isMixed = s.payment_method === "MIXED" || (Number(s.mobile_amount || 0) > 0 && cashAmount > 0);
        const label = isMixed ? `${productName} (espèces)` : productName;
        const sellerName = s.seller_name || s.salesperson_name;
        return {
          label,
          amount: cashAmount,
          seller_name: sellerName
        };
      })
      .filter((item: InflowItem) => item.amount > 0);

    const storeOperatorNames: string[] = Array.isArray(initRes.operators)
      ? initRes.operators.map((o: any) => typeof o === "string" ? o : o?.name).filter(Boolean)
      : [];
    const sellersToday: string[] = Array.isArray(initRes.today_pos_sales)
      ? initRes.today_pos_sales.map((s: any) => s.seller_name || s.salesperson_name).filter(Boolean)
      : [];
    const defaultOperators = Array.from(new Set([staff.name, ...storeOperatorNames, ...sellersToday]));

    const { data: newDraft, error: draftErr } = await supabase
      .from("store_cash_drafts")
      .upsert(
        {
          telegram_user_id: staff.telegram_user_id,
          store_id: storeId,
          report_date: reportDate,
          opening_cash: Number(initRes.suggested_opening_cash) || 0,
          inflow_items: initialInflows,
          outflow_items: [],
          operators: defaultOperators,
          observations: null,
          updated_at: new Date().toISOString()
        },
        { onConflict: "telegram_user_id,store_id" }
      )
      .select("id, opening_cash, inflow_items, outflow_items, operators, observations")
      .single();

    if (!draftErr && newDraft) {
      draft = newDraft;
    }
  }

  const openingCash = Number(draft?.opening_cash) || 0;
  const inflowItems = (draft?.inflow_items as InflowItem[]) || [];
  const outflowItems = (draft?.outflow_items as OutflowItem[]) || [];
  const rawOps = (draft?.operators as any[]) || [];
  const operators = rawOps.map((o: any) => typeof o === "string" ? o : o?.name).filter(Boolean);
  const observations = draft?.observations as string | null;

  const totalInflow = inflowItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const totalOutflow = outflowItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const closingCash = openingCash + totalInflow - totalOutflow;

  const activeDebts = (initRes.active_debts || []) as DebtItem[];
  const totalDebts = activeDebts.reduce((acc, d) => acc + (Number(d.remaining ?? d.amount_due) || 0), 0);

  const rows: InlineButton[][] = [
    [
      { text: `💰 Solde Matin (${formatMoney(openingCash)})`, callback_data: `nav:cr_open:${storeId}` },
      { text: `👥 Opérateurs (${operators.length})`, callback_data: `nav:cr_ops:${storeId}` }
    ],
    [
      { text: `📥 Entrées (${inflowItems.length}) : +${formatMoney(totalInflow)}`, callback_data: `nav:cr_in:${storeId}` },
      { text: `📤 Dépenses (${outflowItems.length}) : -${formatMoney(totalOutflow)}`, callback_data: `nav:cr_out:${storeId}` }
    ],
    [
      { text: `📋 Dettes (${activeDebts.length}) : ${formatMoney(totalDebts)}`, callback_data: `nav:cr_debts:${storeId}` },
      { text: `📝 Observations`, callback_data: `nav:cr_obs:${storeId}` }
    ],
    [
      { text: "👁️ Aperçu du Rapport", callback_data: `nav:cr_prev:${storeId}` },
      { text: "🔒 Clôturer son rapport", callback_data: `nav:cr_send:${storeId}` }
    ],
    homeRow
  ];

  const operatorsStr = operators.length ? escapeHtml(operators.join(" / ")) : "<i>Non renseigné</i>";

  const text =
    `📊 <b>Rapport de Caisse & Clôture</b> — <b>${escapeHtml(storeName)}</b>\n` +
    `📅 Date : <b>${formatDateFr(reportDate)}</b>\n\n` +
    `💰 <b>Solde trouvé ce matin :</b> ${formatMoney(openingCash)}\n` +
    `📥 <b>Total entrées (${inflowItems.length}) :</b> <b>${formatMoney(totalInflow)}</b>\n` +
    `📤 <b>Total dépenses (${outflowItems.length}) :</b> <b>${formatMoney(totalOutflow)}</b>\n` +
    `💵 <b>Reste en caisse ce soir :</b> <b>${formatMoney(closingCash)}</b>\n\n` +
    `📋 <b>Dettes actives :</b> ${activeDebts.length} client(s) (${formatMoney(totalDebts)})\n` +
    `👥 <b>Opérateurs :</b> ${operatorsStr}\n` +
    (observations ? `📝 <b>Observations :</b> <i>${escapeHtml(observations)}</i>\n` : "") +
    `\n<i>💡 Touchez les boutons ci-dessous pour ajuster les montants ou les dépenses avant l'envoi au groupe.</i>`;

  return { text, reply_markup: { inline_keyboard: rows } };
}

export async function screenCashReportExpenses(
  staff: StaffMember,
  storeId: string,
  deps: TelegramCashDeps
): Promise<Screen> {
  const { supabase, homeRow } = deps;
  if (!supabase) return { text: "Service indisponible.", reply_markup: { inline_keyboard: [homeRow] } };

  const { data: draft } = await supabase
    .from("store_cash_drafts")
    .select("outflow_items, store_id, stores(name)")
    .eq("telegram_user_id", staff.telegram_user_id)
    .eq("store_id", storeId)
    .maybeSingle();

  const outflows = (draft?.outflow_items as OutflowItem[]) || [];
  const totalOutflow = outflows.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const storeName = (draft?.stores as any)?.name ?? "Boutique";

  let listText = "";
  if (outflows.length === 0) {
    listText = "<i>Aucune dépense enregistrée pour le moment.</i>\n";
  } else {
    listText = outflows.map((it, idx) => {
      return `${idx + 1}. • <b>${escapeHtml(it.label)}</b> : <b>${formatMoney(it.amount)}</b>`;
    }).join("\n") + `\n\n<b>Total dépenses : ${formatMoney(totalOutflow)}</b>\n`;
  }

  const buttons: InlineButton[][] = [
    [
      { text: "🚕 Transport", callback_data: `nav:cr_oq:transp:${storeId}` },
      { text: "👑 Dépôt Boss", callback_data: `nav:cr_oq:dpboss:${storeId}` }
    ],
    [
      { text: "⚡ Prépayer", callback_data: `nav:cr_oq:prepay:${storeId}` },
      { text: "💼 Sorties Boss", callback_data: `nav:cr_oq:s_boss:${storeId}` }
    ],
    [
      { text: "🍱 Ration", callback_data: `nav:cr_oq:ration:${storeId}` },
      { text: "📶 Crédit tél", callback_data: `nav:cr_oq:credit:${storeId}` }
    ],
    [
      { text: "➕ Autre dépense (ou coller texte)", callback_data: `nav:cr_ofree:${storeId}` }
    ]
  ];

  if (outflows.length > 0) {
    buttons.push([
      { text: "🗑️ Réinitialiser dépenses", callback_data: `nav:cr_oclr:${storeId}` }
    ]);
  }

  buttons.push([
    { text: "⬅️ Retour au Rapport", callback_data: `nav:cr_hub:${storeId}` },
    { text: "🏠 Accueil", callback_data: "nav:main" }
  ]);

  return {
    text:
      `📤 <b>Gestion des Dépenses du Jour</b> — <b>${escapeHtml(storeName)}</b>\n\n` +
      listText + `\n` +
      `<i>💡 Touchez une action récurrente ci-dessous pour entrer son montant, ou « ➕ Autre dépense » pour un libellé personnalisé :</i>`,
    reply_markup: { inline_keyboard: buttons }
  };
}

export async function screenCashReportPreview(
  staff: StaffMember,
  storeId: string,
  deps: TelegramCashDeps
): Promise<Screen> {
  const { supabase, homeRow } = deps;
  if (!supabase) return { text: "Service indisponible.", reply_markup: { inline_keyboard: [homeRow] } };

  const { data: initRes } = await supabase.rpc("telegram_staff_cash_report_init", {
    p_telegram_user_id: staff.telegram_user_id,
    p_store_code: null
  });

  const { data: draft } = await supabase
    .from("store_cash_drafts")
    .select("opening_cash, inflow_items, outflow_items, operators, observations")
    .eq("telegram_user_id", staff.telegram_user_id)
    .eq("store_id", storeId)
    .maybeSingle();

  const activeDebts = ((initRes?.active_debts || []) as any[]).map((d: any) => ({
    customer_name: d.customer_name,
    device_model: d.device_model || undefined,
    amount_due: Number(d.amount_due) || 0,
    remaining: Number(d.remaining ?? d.amount_due) || 0,
    phone: d.phone || undefined
  }));

  const reportData: CashReportData = {
    store_name: initRes?.store_name ?? "Boutique Xeption",
    report_date: initRes?.report_date ?? new Date().toISOString(),
    operators: (draft?.operators as string[]) || initRes?.operators || [],
    opening_cash: Number(draft?.opening_cash) || 0,
    inflow_items: (draft?.inflow_items as InflowItem[]) || [],
    outflow_items: (draft?.outflow_items as OutflowItem[]) || [],
    debts: activeDebts,
    observations: draft?.observations || undefined,
    staff_progress: (initRes?.staff_progress || []) as StaffProgressItem[]
  };

  const previewText = formatDailyCashReport(reportData);

  return {
    text:
      `👁️ <b>Aperçu du Rapport de Caisse</b>\n\n` +
      `<i>À la clôture, le rapport est automatiquement envoyé dans le groupe Telegram Staff et diffusé au groupe WhatsApp via Trigenys Notify :</i>\n\n` +
      previewText,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔒 Clôturer son rapport", callback_data: `nav:cr_send:${storeId}` }
        ],
        [
          { text: "⬅️ Modifier", callback_data: `nav:cr_hub:${storeId}` },
          { text: "🏠 Accueil", callback_data: "nav:main" }
        ]
      ]
    }
  };
}

export async function actionCashReportSubmit(
  staff: StaffMember,
  storeId: string,
  deps: TelegramCashDeps
): Promise<Screen> {
  const { supabase, homeRow, sendTelegram, staffChatId, siteUrl, getEnv } = deps;
  if (!supabase) return { text: "Service indisponible.", reply_markup: { inline_keyboard: [homeRow] } };

  const { data: initRes } = await supabase.rpc("telegram_staff_cash_report_init", {
    p_telegram_user_id: staff.telegram_user_id,
    p_store_code: null
  });

  const { data: draft } = await supabase
    .from("store_cash_drafts")
    .select("opening_cash, inflow_items, outflow_items, operators, observations")
    .eq("telegram_user_id", staff.telegram_user_id)
    .eq("store_id", storeId)
    .maybeSingle();

  const openingCash = Number(draft?.opening_cash) || 0;
  const inflowItems = (draft?.inflow_items as InflowItem[]) || [];
  const outflowItems = (draft?.outflow_items as OutflowItem[]) || [];
  const operators = (draft?.operators as string[]) || initRes?.operators || [];
  const observations = draft?.observations || null;

  const totalInflow = inflowItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const totalOutflow = outflowItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const closingCash = openingCash + totalInflow - totalOutflow;

  const activeDebts = ((initRes?.active_debts || []) as any[]).map((d: any) => ({
    customer_name: d.customer_name,
    device_model: d.device_model || undefined,
    amount_due: Number(d.amount_due) || 0,
    remaining: Number(d.remaining ?? d.amount_due) || 0,
    phone: d.phone || undefined
  }));

  const payload = {
    store_id: storeId,
    report_date: initRes?.report_date,
    opening_cash: openingCash,
    total_inflow: totalInflow,
    total_outflow: totalOutflow,
    inflow_items: inflowItems,
    outflow_items: outflowItems,
    debts_snapshot: activeDebts,
    operators: operators,
    observations: observations,
    staff_progress: initRes?.staff_progress || []
  };

  const { data: submitRes, error: submitErr } = await supabase.rpc("telegram_staff_cash_report_submit", {
    p_telegram_user_id: staff.telegram_user_id,
    p_payload: payload
  });

  if (submitErr || !submitRes || submitRes.success !== true) {
    console.error("submit cash report failed", submitErr, submitRes);
    return {
      text: `❌ Échec de l'enregistrement de la clôture (${submitRes?.reason ?? submitErr?.message ?? "erreur"}).`,
      reply_markup: { inline_keyboard: [[{ text: "⬅️ Retour", callback_data: `nav:cr_hub:${storeId}` }]] }
    };
  }

  const reportData: CashReportData = {
    store_name: initRes?.store_name ?? "Boutique Xeption",
    report_date: initRes?.report_date ?? new Date().toISOString(),
    operators,
    opening_cash: openingCash,
    inflow_items: inflowItems,
    outflow_items: outflowItems,
    debts: activeDebts,
    observations: observations || undefined,
    staff_progress: (initRes?.staff_progress || []) as StaffProgressItem[]
  };

  const formattedReport = formatDailyCashReport(reportData);

  let sentToTelegram = false;
  if (staffChatId && sendTelegram) {
    try {
      await sendTelegram(staffChatId, {
        parse_mode: "HTML",
        text: formattedReport
      });
      sentToTelegram = true;
    } catch (e) {
      console.error("Failed to send cash report to staff Telegram group", e);
    }
  }

  const dedupKey = `cash_report.${initRes?.store_code ?? storeId}.${initRes?.report_date ?? new Date().toISOString().slice(0, 10)}`;
  const notifPayload = {
    dedup_key: dedupKey,
    event_type: "store_cash_report",
    title: `📊 Clôture de caisse — ${initRes?.store_name ?? "Boutique"}`,
    message: `Solde soir : ${formatMoney(closingCash)} — Entrées : ${formatMoney(totalInflow)} — Dépenses : ${formatMoney(totalOutflow)} — Par : ${staff.name}`,
    link_to_tab: "analytics",
    link_to_id: submitRes.report_id,
    created_by: staff.name
  };

  let notifRow: { id: string; created_at: string } | null = null;
  try {
    const { data: inserted, error: insertErr } = await supabase
      .from("admin_notifications")
      .insert(notifPayload)
      .select("id, created_at")
      .maybeSingle();
    if (!insertErr && inserted) {
      notifRow = inserted;
    } else {
      const { data: existing } = await supabase
        .from("admin_notifications")
        .select("id, created_at")
        .eq("dedup_key", dedupKey)
        .maybeSingle();
      notifRow = existing;
    }
  } catch (notifErr) {
    console.warn("admin_notifications insert failed for cash report", notifErr);
  }

  // Émission d'événement automatique vers Trigenys Notify pour relais vers le groupe WhatsApp
  let sentToTrigenysNotify = false;
  const envReader = getEnv ?? ((k: string) => (typeof Deno !== "undefined" ? Deno.env.get(k) : undefined));
  const wahaChannel = createWahaChannel(envReader);
  if (wahaChannel && notifRow?.id && notifRow?.created_at) {
    try {
      const effectiveSiteUrl = (siteUrl || envReader("SITE_URL") || "https://www.xeptionetwork.shop").replace(/\/+$/, "");
      const sendErr = await wahaChannel.send({
        notification_id: notifRow.id,
        event_type: "store_cash_report",
        title: notifPayload.title,
        message: notifPayload.message,
        link_to_tab: notifPayload.link_to_tab,
        link_to_id: notifPayload.link_to_id,
        created_at: notifRow.created_at
      }, { siteUrl: effectiveSiteUrl });

      if (!sendErr) {
        sentToTrigenysNotify = true;
        await supabase.from("notification_deliveries").upsert({
          notification_id: notifRow.id,
          channel: "whatsapp_waha",
          sent_at: new Date().toISOString(),
          last_error: null
        });
      } else {
        console.warn("Trigenys notify waha direct dispatch returned:", sendErr);
      }
    } catch (wahaErr) {
      console.warn("Direct dispatch to Trigenys Notify failed", wahaErr);
    }
  }

  return {
    text:
      `🎉 <b>Clôture de caisse validée et diffusée !</b>\n\n` +
      `🏪 Boutique : <b>${escapeHtml(initRes?.store_name ?? "")}</b>\n` +
      `💵 Reste en caisse ce soir : <b>${formatMoney(closingCash)}</b>\n\n` +
      `📡 <b>Diffusion automatique des événements :</b>\n` +
      `• Telegram : ${sentToTelegram ? "✅ <i>Publié dans le groupe Staff</i>" : "⚠️ <i>Erreur d'envoi Telegram</i>"}\n` +
      `• WhatsApp : ${sentToTrigenysNotify ? "✅ <i>Transmis à Trigenys Notify pour le groupe WhatsApp</i>" : "⏳ <i>En file d'attente (relais Trigenys Notify)</i>"}\n\n` +
      `<i>Le rapport complet est archivé en base de données et consultable sur le tableau de bord ERP.</i>`,
    reply_markup: {
      inline_keyboard: [
        homeRow
      ]
    }
  };
}

/**
 * Traite les réponses textuelles spécifiques à la caisse (OPEN, OPS, IN, OUT_PRESET, OUT, OBS).
 * Renvoie null si l'action relève d'un autre module (ex: dettes).
 */
export async function handleCashReportActionReply(
  staff: StaffMember,
  tag: CrTag,
  text: string,
  deps: TelegramCashDeps
): Promise<Screen | null> {
  const { supabase } = deps;
  if (!supabase) return null;

  if (tag.action === "OPEN") {
    const amount = parseAmount(text);
    await supabase.from("store_cash_drafts")
      .update({ opening_cash: amount, updated_at: new Date().toISOString() })
      .eq("telegram_user_id", staff.telegram_user_id)
      .eq("store_id", tag.targetId);
    return screenCashReportHub(staff, tag.targetId, deps);
  }

  if (tag.action === "OPS") {
    const rawOps = text.split(/[/,;\n]+/).map(s => s.trim()).filter(Boolean);
    await supabase.from("store_cash_drafts")
      .update({ operators: rawOps, updated_at: new Date().toISOString() })
      .eq("telegram_user_id", staff.telegram_user_id)
      .eq("store_id", tag.targetId);
    return screenCashReportHub(staff, tag.targetId, deps);
  }

  if (tag.action === "IN") {
    const newItems = parseExpensesText(text).map(it => ({
      label: it.label,
      amount: it.amount,
      seller_name: staff.name
    }));
    if (newItems.length > 0) {
      const { data: draft } = await supabase.from("store_cash_drafts")
        .select("inflow_items")
        .eq("telegram_user_id", staff.telegram_user_id)
        .eq("store_id", tag.targetId)
        .maybeSingle();
      const currentInflows = (draft?.inflow_items as InflowItem[]) || [];
      const updated = [...currentInflows, ...newItems];
      await supabase.from("store_cash_drafts")
        .update({ inflow_items: updated, updated_at: new Date().toISOString() })
        .eq("telegram_user_id", staff.telegram_user_id)
        .eq("store_id", tag.targetId);
    }
    return screenCashReportHub(staff, tag.targetId, deps);
  }

  if (tag.action === "OUT_PRESET") {
    const colonIdx = tag.targetId.indexOf(":");
    const presetLabel = colonIdx >= 0 ? tag.targetId.slice(0, colonIdx) : tag.targetId;
    const storeId = colonIdx >= 0 ? tag.targetId.slice(colonIdx + 1) : "";
    const amount = parseAmount(text);
    if (amount > 0 && storeId) {
      const { data: draft } = await supabase.from("store_cash_drafts")
        .select("outflow_items")
        .eq("telegram_user_id", staff.telegram_user_id)
        .eq("store_id", storeId)
        .maybeSingle();
      const currentOutflows = (draft?.outflow_items as OutflowItem[]) || [];
      const updated = [...currentOutflows, { label: presetLabel, amount }];
      await supabase.from("store_cash_drafts")
        .update({ outflow_items: updated, updated_at: new Date().toISOString() })
        .eq("telegram_user_id", staff.telegram_user_id)
        .eq("store_id", storeId);
      return screenCashReportExpenses(staff, storeId, deps);
    }
    return screenCashReportExpenses(staff, storeId || tag.targetId, deps);
  }

  if (tag.action === "OUT") {
    const newOutflows = parseExpensesText(text);
    if (newOutflows.length > 0) {
      const { data: draft } = await supabase.from("store_cash_drafts")
        .select("outflow_items")
        .eq("telegram_user_id", staff.telegram_user_id)
        .eq("store_id", tag.targetId)
        .maybeSingle();
      const currentOutflows = (draft?.outflow_items as OutflowItem[]) || [];
      const updated = [...currentOutflows, ...newOutflows];
      await supabase.from("store_cash_drafts")
        .update({ outflow_items: updated, updated_at: new Date().toISOString() })
        .eq("telegram_user_id", staff.telegram_user_id)
        .eq("store_id", tag.targetId);
    }
    return screenCashReportExpenses(staff, tag.targetId, deps);
  }

  if (tag.action === "OBS") {
    await supabase.from("store_cash_drafts")
      .update({ observations: text.trim(), updated_at: new Date().toISOString() })
      .eq("telegram_user_id", staff.telegram_user_id)
      .eq("store_id", tag.targetId);
    return screenCashReportHub(staff, tag.targetId, deps);
  }

  return null;
}
