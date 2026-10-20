/**
 * Xeption Bot — interactive private-chat entry point with menu-driven navigation.
 *
 * Staff identity comes only from telegram_staff_links (ERP link code or shared phone via
 * telegram_staff_link_by_phone). callback_data is not signed by Telegram: every screen
 * re-resolves the sender and checks its role server-side; state changes go through RPCs.
 *
 * /configure is protected by CRON_SECRET.
 * / receives Telegram updates signed by setWebhook(secret_token).
 */
// @ts-ignore — Deno npm specifier for Supabase Edge Functions runtime
import { createClient } from "npm:@supabase/supabase-js@2";

declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response> | Response): void;
};

const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const adminSecret = Deno.env.get("CRON_SECRET") ?? "";
// Served through the main domain (vercel.json proxy): some mobile carriers reset *.workers.dev.
const miniApp = "https://www.xeptionetwork.shop/staff";
const webhookUrl = "https://tawnusmfyvugqczaydat.supabase.co/functions/v1/telegram-bot-entry";
const encoder = new TextEncoder();

type Obj = Record<string, unknown>;

interface Store {
  id: string;
  name: string;
  code: string;
}

interface StaffMember {
  telegram_user_id: string;
  auth_user_id: string;
  id: string;
  name: string;
  role: string;
  rank: number;
  store: Store | null;
}

interface InlineButton {
  text: string;
  callback_data?: string;
  web_app?: { url: string };
  url?: string;
}

interface Screen {
  text: string;
  reply_markup: {
    inline_keyboard: InlineButton[][];
  };
}

/** Same ranks as the Mini App API and the SQL RPCs. Unknown roles have no access. */
const ROLE_RANK: Record<string, number> = {
  vendeur: 0, editor: 0,
  responsable: 1, manager: 1, manager_vente: 1,
  direction: 2, admin: 2,
  super_admin: 3
};
const RANK_RESPONSABLE = 1;
const RANK_DIRECTION = 2;

function constantTimeEqual(actual: string, expected: string): boolean {
  const a = encoder.encode(actual);
  const b = encoder.encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function webhookSecret(): Promise<string> {
  const raw = encoder.encode("xeption-telegram-bot-entry:" + adminSecret);
  const hash = await crypto.subtle.digest("SHA-256", raw);
  return Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, "0")).join("");
}

function json(status: number, value: object): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

async function telegram(method: string, body?: Obj): Promise<Obj> {
  if (!token) throw new Error("Missing Telegram token");
  const res = await fetch("https://api.telegram.org/bot" + token + "/" + method, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(10000)
  });
  const result = (await res.json()) as Obj;
  if (!res.ok || result.ok !== true) throw new Error("Telegram operation failed: " + method);
  return result;
}

function db() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const money = (value: unknown) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("fr-FR").format(Number(value)) + " FCFA";

/** Telegram rejects the whole keyboard when one callback_data exceeds 64 bytes. */
const cbFits = (data: string) => encoder.encode(data).length <= 64;

const homeRow: InlineButton[] = [{ text: "🏠 Menu Principal", callback_data: "nav:main" }];

function deniedScreen(): Screen {
  return {
    text: "🔒 Cette section est réservée aux responsables et à la direction.",
    reply_markup: { inline_keyboard: [homeRow] }
  };
}

// ── Identification Staff ──────────────────────────────────────────────────────

const SHARE_PHONE_TEXT = "📱 Partager mon numéro";
const shareKeyboard = {
  keyboard: [[{ text: SHARE_PHONE_TEXT, request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true
};
const linkHint = "🔐 Associez d'abord votre compte : touchez « " + SHARE_PHONE_TEXT +
  " » (vendeurs) ou ERP Xeption → « Lier mon Telegram » (direction).";

async function staffByAuthUser(authUserId: string): Promise<Omit<StaffMember, "telegram_user_id"> | null> {
  const supabase = db();
  if (!supabase) return null;
  const { data: auth, error: authError } = await supabase.auth.admin.getUserById(authUserId);
  const user = auth?.user;
  if (authError || !user?.email) return null;
  if (user.banned_until && Date.parse(user.banned_until) > Date.now()) return null;

  const email = String(user.email).trim().toLowerCase();
  const { data } = await supabase
    .from("staff")
    .select("id, name, email, role, stores(id, name, code)")
    .ilike("email", email)
    .limit(50);
  const row = (data ?? []).find((item: Obj) =>
    typeof item.email === "string" && item.email.trim().toLowerCase() === email) as Obj | undefined;
  if (!row) return null;
  const role = String(row.role ?? "").toLowerCase();
  const rank = ROLE_RANK[role];
  if (rank === undefined) return null;
  return {
    auth_user_id: authUserId,
    id: String(row.id),
    name: String(row.name ?? ""),
    role,
    rank,
    store: (row.stores as Store | null) ?? null
  };
}

async function getStaff(telegramUserId: string): Promise<StaffMember | null> {
  const supabase = db();
  if (!supabase || !/^\d{1,20}$/.test(telegramUserId)) return null;
  const { data: links } = await supabase
    .from("telegram_staff_links")
    .select("auth_user_id")
    .eq("telegram_user_id", telegramUserId)
    .is("revoked_at", null)
    .limit(1);
  const authUserId = links?.[0]?.auth_user_id;
  if (typeof authUserId !== "string") return null;
  const staff = await staffByAuthUser(authUserId);
  return staff ? { telegram_user_id: telegramUserId, ...staff } : null;
}

/** Telegram ids of linked responsables / direction, sender excluded. */
async function managerTelegramIds(exclude: string): Promise<string[]> {
  const supabase = db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("telegram_staff_links")
    .select("telegram_user_id, auth_user_id")
    .is("revoked_at", null)
    .limit(100);
  const ids: string[] = [];
  for (const link of (data ?? []) as { telegram_user_id: string; auth_user_id: string }[]) {
    if (link.telegram_user_id === exclude) continue;
    const staff = await staffByAuthUser(link.auth_user_id);
    if (staff && staff.rank >= RANK_RESPONSABLE) ids.push(link.telegram_user_id);
  }
  return ids;
}

async function listStores(): Promise<Store[]> {
  const supabase = db();
  if (!supabase) return [];
  const { data } = await supabase.from("stores").select("id, name, code").order("name");
  return (data ?? []) as Store[];
}

/**
 * Store whose stock/sales a screen shows. Below direction the sender's own store always
 * wins, whatever the callback_data says; direction may pick one (or none = all stores).
 */
async function scopedStore(staff: StaffMember, storeCode?: string): Promise<Store | null> {
  if (staff.rank < RANK_DIRECTION) return staff.store;
  if (!storeCode) return null;
  return (await listStores()).find(s => s.code === storeCode) ?? null;
}

const scopeSuffix = (store: Store | null) => (store ? ":" + store.code : "");
const scopeLabel = (store: Store | null) => (store ? store.name : "Toutes boutiques");

const LINK_REFUSALS: Record<string, string> = {
  phone_not_found: "Ce numéro n'est enregistré pour aucun membre du staff. Demandez à la direction de l'ajouter dans l'ERP (écran Équipe).",
  phone_ambiguous: "Ce numéro est enregistré sur plusieurs fiches staff. La direction doit corriger l'ERP.",
  use_erp_code: "Les comptes direction s'associent depuis l'ERP Xeption → « Lier mon Telegram ».",
  no_account: "Votre compte Xeption n'est pas encore activé et aucun membre de la direction n'est joignable sur Telegram. Demandez-lui de l'activer dans l'ERP (🔑, écran Équipe).",
  telegram_already_linked: "Ce compte Telegram est déjà associé à un autre membre du staff.",
  staff_already_linked: "Ce membre du staff est déjà associé à un autre compte Telegram. Contactez la direction."
};

/** Contact shared via request_contact. Only the sender's own number is accepted. */
async function handleContact(message: Obj, chatId: number | string): Promise<void> {
  const contact = message.contact as Obj;
  const fromId = (message.from as Obj | undefined)?.id;
  if (typeof fromId !== "number" || contact.user_id !== fromId || typeof contact.phone_number !== "string") {
    await telegram("sendMessage", {
      chat_id: chatId, reply_markup: shareKeyboard,
      text: "Pour des raisons de sécurité, seul votre propre numéro est accepté : utilisez le bouton « " + SHARE_PHONE_TEXT + " »."
    });
    return;
  }
  const supabase = db();
  if (!supabase) {
    await telegram("sendMessage", { chat_id: chatId, text: "Association indisponible pour le moment." });
    return;
  }
  const { data, error } = await supabase.rpc("telegram_staff_link_by_phone", {
    p_telegram_user_id: String(fromId), p_phone: contact.phone_number.slice(0, 32)
  });
  if (error || !data) {
    console.error("telegram-bot-entry: phone link failed", { code: error?.code });
    await telegram("sendMessage", { chat_id: chatId, text: "Association indisponible pour le moment." });
    return;
  }
  const result = data as LinkResult;
  if (!result.linked && result.reason === "no_account" && result.request_id) {
    await requestActivation(chatId, result);
    return;
  }
  if (!result.linked) {
    await telegram("sendMessage", {
      chat_id: chatId, reply_markup: { remove_keyboard: true },
      text: LINK_REFUSALS[result.reason ?? ""] ?? "Association refusée."
    });
    return;
  }
  await announceLink(chatId, String(fromId), result);
}

interface LinkResult {
  linked: boolean; changed?: boolean; reason?: string; name?: string;
  store?: string | null; notify_telegram_ids?: string[];
  request_id?: string; throttled?: boolean;
}

const staffLabel = (result: { name?: string; store?: string | null }) =>
  "<b>" + escapeHtml(result.name ?? "") + "</b>" + (result.store ? " · " + escapeHtml(result.store) : "");

/** Welcome the newly linked member, open their menu and alert the direction. */
async function announceLink(chatId: number | string, telegramUserId: string, result: LinkResult, skipAlertFor = ""): Promise<void> {
  await telegram("sendMessage", {
    chat_id: chatId, parse_mode: "HTML", reply_markup: { remove_keyboard: true },
    text: "✅ Compte associé : " + staffLabel(result) +
      "\n\nTapez <code>/stock iPhone 13</code> devant un client ou utilisez le menu ci-dessous."
  });
  const staff = await getStaff(telegramUserId);
  if (staff) await renderScreen(chatId, undefined, await screenMain(staff));
  if (!result.changed) return;
  for (const id of result.notify_telegram_ids ?? []) {
    if (id === skipAlertFor) continue;
    // A failed alert to one manager must not undo the link nor block the others.
    await telegram("sendMessage", {
      chat_id: id, parse_mode: "HTML",
      text: "🔗 " + staffLabel(result) + " a associé son Telegram à l'espace staff Xeption."
    }).catch(() => console.error("telegram-bot-entry: manager alert failed"));
  }
}

/** No Auth account yet: ask the linked direction to approve (✅ / ❌) from Telegram. */
async function requestActivation(chatId: number | string, result: LinkResult): Promise<void> {
  const removeKeyboard = { remove_keyboard: true };
  const keyboard = [[
    { text: "✅ Activer", callback_data: "nav:act:ok:" + result.request_id },
    { text: "❌ Refuser", callback_data: "nav:act:no:" + result.request_id }
  ]];
  let delivered = 0;
  for (const id of result.notify_telegram_ids ?? []) {
    await telegram("sendMessage", {
      chat_id: id, parse_mode: "HTML", reply_markup: { inline_keyboard: keyboard },
      text: "🆕 " + staffLabel(result) + " demande l'accès à l'espace staff Xeption " +
        "(numéro vérifié par Telegram).\n\nActiver crée son compte et l'associe à ce Telegram."
    }).then(() => delivered++)
      .catch(() => console.error("telegram-bot-entry: activation request alert failed"));
  }
  const text = delivered > 0 || result.throttled
    ? "⏳ Votre compte n'est pas encore activé. La direction a reçu votre demande : vous serez prévenu ici dès sa validation."
    : LINK_REFUSALS.no_account;
  await telegram("sendMessage", { chat_id: chatId, reply_markup: removeKeyboard, text });
}

/** A random password nobody sees: Telegram needs the account, not a login. */
function unusablePassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, x => x.toString(16).padStart(2, "0")).join("");
}

/** Direction decision on an activation request. Rank and single decision live in SQL. */
async function actionActivation(staff: StaffMember, decision: string, requestId: string): Promise<Screen> {
  const done: InlineButton[][] = [homeRow];
  if (staff.rank < RANK_DIRECTION) {
    return { text: "🔒 Activation réservée à la direction.", reply_markup: { inline_keyboard: done } };
  }
  const supabase = db();
  if (!supabase || (decision !== "ok" && decision !== "no") || !/^[0-9a-f-]{36}$/.test(requestId)) {
    return { text: "Action invalide.", reply_markup: { inline_keyboard: done } };
  }
  const { data, error } = await supabase.rpc("telegram_staff_activation_decide", {
    p_request_id: requestId, p_telegram_user_id: staff.telegram_user_id,
    p_decision: decision === "ok" ? "approve" : "reject"
  });
  if (error || !data) {
    if (error?.code !== "42501") console.error("telegram-bot-entry: activation decision failed", { code: error?.code });
    const text = error?.code === "42501" ? "🔒 Activation réservée à la direction." : "Activation indisponible pour le moment.";
    return { text, reply_markup: { inline_keyboard: done } };
  }
  const result = data as {
    changed: boolean; status?: string; reason?: string; telegram_user_id?: string;
    phone_digits?: string; email?: string; name?: string; store?: string | null;
  };
  const who = staffLabel(result);
  if (result.reason === "not_found") return { text: "❌ Demande introuvable.", reply_markup: { inline_keyboard: done } };
  if (result.reason === "stale") {
    return { text: "⚠️ Le numéro de " + who + " a changé dans l'ERP depuis la demande : demande annulée. Il doit repartager son numéro.", reply_markup: { inline_keyboard: done } };
  }
  if (!result.changed) {
    const state = result.status === "approved" ? "déjà activée" : "déjà refusée";
    return { text: "ℹ️ Demande de " + who + " " + state + ".", reply_markup: { inline_keyboard: done } };
  }
  const requester = result.telegram_user_id ?? "";

  if (result.status === "rejected") {
    await telegram("sendMessage", {
      chat_id: requester, text: "❌ Votre demande d'accès à l'espace staff a été refusée. Rapprochez-vous de la direction."
    }).catch(() => console.error("telegram-bot-entry: rejection notice failed"));
    return { text: "❌ Demande de " + who + " refusée par <b>" + escapeHtml(staff.name) + "</b>.", reply_markup: { inline_keyboard: done } };
  }

  // Approved: create the Auth account (already existing = fine), then link with the verified number.
  const displayName = (result.name ?? "").trim() || (result.email ?? "").split("@")[0];
  const { error: createError } = await supabase.auth.admin.createUser({
    email: result.email ?? "", password: unusablePassword(), email_confirm: true,
    user_metadata: { full_name: displayName, name: displayName, display_name: displayName, staff_name: displayName }
  });
  if (createError && !/already|exists|registered/i.test(createError.message ?? "")) {
    console.error("telegram-bot-entry: auth account creation failed", { status: createError.status });
    return { text: "⚠️ Compte de " + who + " non créé (email invalide ?). Vérifiez sa fiche dans l'ERP ; il pourra repartager son numéro.", reply_markup: { inline_keyboard: done } };
  }
  const { error: syncError } = await supabase.rpc("sync_staff_auth_display_name", { p_email: result.email, p_name: displayName });
  if (syncError) console.error("telegram-bot-entry: display name sync failed", { code: syncError.code });

  const { data: linkData, error: linkError } = await supabase.rpc("telegram_staff_link_by_phone", {
    p_telegram_user_id: requester, p_phone: result.phone_digits ?? ""
  });
  const link = linkData as LinkResult | null;
  if (linkError || !link?.linked) {
    console.error("telegram-bot-entry: link after activation failed", { code: linkError?.code, reason: link?.reason });
    return { text: "⚠️ Compte de " + who + " créé, mais l'association a échoué (" + escapeHtml(link?.reason ?? "erreur") + "). Il peut repartager son numéro.", reply_markup: { inline_keyboard: done } };
  }
  await announceLink(requester, requester, link, staff.telegram_user_id)
    .catch(() => console.error("telegram-bot-entry: welcome after activation failed"));
  return {
    text: "✅ " + who + " activé et associé par <b>" + escapeHtml(staff.name) + "</b>." +
      "\n\n<i>Pour l'ERP web, générez-lui un mot de passe (🔑, écran Équipe).</i>",
    reply_markup: { inline_keyboard: done }
  };
}

async function productLookupReply(query: string, telegramUserId: string): Promise<string> {
  if (!query) return "Précisez un produit, par exemple : <code>/stock iPhone 13</code>";
  if (!/^\d{1,20}$/.test(telegramUserId)) return "Commande indisponible.";
  const supabase = db();
  if (!supabase) return "Recherche indisponible pour le moment.";
  const { data, error } = await supabase.rpc("telegram_staff_product_lookup", {
    p_query: query.slice(0, 80), p_telegram_user_id: telegramUserId
  });
  if (error) {
    return error.code === "42501"
      ? linkHint
      : "Recherche indisponible pour le moment.";
  }
  const rows = (data ?? []) as { name: string; stock: number; price: number | string | null }[];
  if (!rows.length) return "Aucun produit trouvé pour « " + escapeHtml(query) + " ».";
  return "🔎 <b>" + escapeHtml(query) + "</b>\n\n" + rows.map(row =>
    (row.stock > 0 ? "✅" : "❌") + " <b>" + escapeHtml(row.name) + "</b>\n" +
    "    Stock : " + row.stock + " · Prix : " + money(row.price)
  ).join("\n");
}

// ── Rendu des Écrans (Menu au pouce avec Avancer / Reculer) ───────────────────

async function screenMain(staff: StaffMember): Promise<Screen> {
  const greeting = `Bonjour <b>${escapeHtml(staff.name)}</b> 👋\n`;
  if (staff.rank >= RANK_DIRECTION) {
    const stores = await listStores();
    const storeRows: InlineButton[][] = [];
    for (let i = 0; i < stores.length; i += 2) {
      storeRows.push(stores.slice(i, i + 2)
        .filter(s => cbFits("nav:sales:" + s.code))
        .map(s => ({ text: "🏪 " + s.name, callback_data: "nav:store:" + s.code })));
    }
    return {
      text:
        `⚡ <b>XEPTION | Console Direction</b>\n\n` + greeting +
        `Sélectionnez une boutique ou une section :`,
      reply_markup: {
        inline_keyboard: [
          ...storeRows,
          [
            { text: "📦 Stocks & Prix", callback_data: "nav:stocks" },
            { text: "🔄 Dossiers Trocs", callback_data: "nav:troc" }
          ],
          [
            { text: "📊 Ventes du Jour", callback_data: "nav:sales" },
            { text: "⚠️ Stocks Faibles", callback_data: "nav:stock_low" }
          ],
          [{ text: "📲 Ouvrir Xeption App", web_app: { url: miniApp } }]
        ]
      }
    };
  }

  const rows: InlineButton[][] = [[
    { text: "📦 Stocks & Prix", callback_data: "nav:stocks" },
    { text: "⚠️ Stocks Faibles", callback_data: "nav:stock_low" }
  ]];
  if (staff.rank >= RANK_RESPONSABLE) {
    rows.push([
      { text: "🔄 Smart Troc", callback_data: "nav:troc" },
      { text: "📊 Ventes du Jour", callback_data: "nav:sales" }
    ]);
  }
  rows.push([{ text: "📲 Ouvrir Xeption App", web_app: { url: miniApp } }]);
  return {
    text:
      `🏪 <b>${escapeHtml(staff.store?.name ?? "Xeption")}</b>\n\n` + greeting +
      `Que souhaitez-vous faire ?\n<i>Astuce : /stock iPhone 13 ou /prix S24</i>`,
    reply_markup: { inline_keyboard: rows }
  };
}

async function screenStore(staff: StaffMember, storeCode: string): Promise<Screen> {
  const store = await scopedStore(staff, storeCode);
  if (staff.rank < RANK_DIRECTION || !store) return screenMain(staff);
  return {
    text:
      `🏪 <b>Espace ${escapeHtml(store.name)}</b>\n\n` +
      `Que souhaitez-vous consulter pour cette boutique ?`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📦 Stocks", callback_data: "nav:stocks:" + store.code },
          { text: "📊 Ventes", callback_data: "nav:sales:" + store.code }
        ],
        [{ text: "⬅️ Retour Vue Direction", callback_data: "nav:main" }]
      ]
    }
  };
}

const CATEGORIES: Record<string, { label: string; names: string[] }> = {
  apple: { label: "Apple / iPhone", names: ["iPhone"] },
  android: { label: "Samsung & Android", names: ["Samsung", "Redmi", "Pixel", "Infinix"] },
  pc: { label: "PC & Tablettes", names: ["Surface", "MacBook", "Dell", "HP"] }
};

async function screenStocksCategories(staff: StaffMember, storeCode?: string): Promise<Screen> {
  const store = await scopedStore(staff, storeCode);
  const suffix = scopeSuffix(store);
  return {
    text:
      `📦 <b>Gestion des Stocks & Prix</b> — ${escapeHtml(scopeLabel(store))}\n\n` +
      `Touchez une catégorie pour voir les modèles disponibles :`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🍏 Apple / iPhone", callback_data: "nav:cat:apple" + suffix },
          { text: "🤖 Samsung & Android", callback_data: "nav:cat:android" + suffix }
        ],
        [
          { text: "💻 PC & Tablettes", callback_data: "nav:cat:pc" + suffix },
          { text: "⚠️ Stocks Faibles", callback_data: "nav:stock_low" + suffix }
        ],
        [{ text: "🏠 Menu Principal", callback_data: "nav:main" }]
      ]
    }
  };
}

interface StockRow { id: string; name: string; price: number | string | null; stock: number }

/** Products with the stock of the scoped store (store_stock) or the global stock. */
async function stockRows(store: Store | null, opts: { names?: string[]; max?: number; productId?: string; limit: number; ascending: boolean }): Promise<StockRow[]> {
  const supabase = db();
  if (!supabase) return [];
  const nameFilter = opts.names?.map(n => `name.ilike.%${n}%`).join(",");
  if (store) {
    let query = supabase.from("store_stock")
      .select("quantity, products!inner(id, name, price)")
      .eq("store_id", store.id);
    if (nameFilter) query = query.or(nameFilter, { referencedTable: "products" });
    if (opts.productId) query = query.eq("product_id", opts.productId);
    if (opts.max !== undefined) query = query.lte("quantity", opts.max);
    const { data } = await query.order("quantity", { ascending: opts.ascending }).limit(opts.limit);
    return ((data ?? []) as { quantity: number; products: { id: string; name: string; price: number | string | null } }[])
      .map(r => ({ id: r.products.id, name: r.products.name, price: r.products.price, stock: r.quantity }));
  }
  let query = supabase.from("products").select("id, name, price, stock");
  if (nameFilter) query = query.or(nameFilter);
  if (opts.productId) query = query.eq("id", opts.productId);
  if (opts.max !== undefined) query = query.lte("stock", opts.max);
  const { data } = await query.order("stock", { ascending: opts.ascending }).limit(opts.limit);
  return (data ?? []) as StockRow[];
}

async function screenCategory(staff: StaffMember, cat: string, storeCode?: string): Promise<Screen> {
  const category = CATEGORIES[cat] ?? CATEGORIES.apple;
  const catKey = CATEGORIES[cat] ? cat : "apple";
  const store = await scopedStore(staff, storeCode);
  const suffix = scopeSuffix(store);
  const products = await stockRows(store, { names: category.names, limit: 6, ascending: false });

  const buttons: InlineButton[][] = [];
  for (const p of products) {
    if (!cbFits(`nav:trans:${p.id}:${catKey}${suffix}`)) continue;
    const shortName = p.name.length > 28 ? p.name.slice(0, 26) + "…" : p.name;
    buttons.push([{ text: `${shortName} (${p.stock} dispo)`, callback_data: `nav:p:${p.id}:${catKey}${suffix}` }]);
  }
  buttons.push([
    { text: "⬅️ Précédent (Catégories)", callback_data: "nav:stocks" + suffix },
    { text: "🏠 Accueil", callback_data: "nav:main" }
  ]);

  return {
    text:
      `📂 <b>${escapeHtml(category.label)}</b> — ${escapeHtml(scopeLabel(store))}\n\n` +
      (buttons.length === 1
        ? "Aucun produit trouvé dans cette catégorie."
        : "Sélectionnez un modèle pour voir son détail :"),
    reply_markup: { inline_keyboard: buttons }
  };
}

async function screenProductDetail(staff: StaffMember, productId: string, backCat: string, storeCode?: string): Promise<Screen> {
  const store = await scopedStore(staff, storeCode);
  const suffix = scopeSuffix(store);
  const [product] = await stockRows(store, { productId, limit: 1, ascending: false });
  const back = `nav:cat:${backCat}${suffix}`;

  if (!product) {
    return {
      text: "❌ Produit introuvable" + (store ? " dans " + escapeHtml(store.name) : "") + ".",
      reply_markup: { inline_keyboard: [[{ text: "⬅️ Retour Catégories", callback_data: back }]] }
    };
  }

  const rows: InlineButton[][] = [];
  // A transfer request only makes sense for someone attached to a store.
  if (staff.store) rows.push([{ text: "🚚 Demander transfert", callback_data: `nav:trans:${product.id}:${backCat}${suffix}` }]);
  rows.push([
    { text: "⬅️ Précédent", callback_data: back },
    { text: "🏠 Accueil", callback_data: "nav:main" }
  ]);
  return {
    text:
      `📱 <b>${escapeHtml(product.name)}</b>\n\n` +
      `• Prix boutique : <b>${money(product.price)}</b>\n` +
      `• Stock ${escapeHtml(scopeLabel(store))} : <b>${product.stock} unité(s)</b>`,
    reply_markup: { inline_keyboard: rows }
  };
}

async function screenStockLow(staff: StaffMember, storeCode?: string): Promise<Screen> {
  const store = await scopedStore(staff, storeCode);
  const products = await stockRows(store, { max: 2, limit: 8, ascending: true });

  let text = `⚠️ <b>Alertes Stocks Faibles & Ruptures</b> — ${escapeHtml(scopeLabel(store))}\n\n`;
  if (products.length === 0) {
    text += `✅ Tous les stocks sont au-dessus du seuil critique d'alerte.`;
  } else {
    for (const p of products) {
      const badge = p.stock === 0 ? "🚨 RUPTURE" : `⚠️ ${p.stock} restant(s)`;
      text += `• <b>${escapeHtml(p.name)}</b>\n  └ ${badge} — ${money(p.price)}\n`;
    }
  }

  return {
    text,
    reply_markup: {
      inline_keyboard: [[
        { text: "⬅️ Précédent (Stocks)", callback_data: "nav:stocks" + scopeSuffix(store) },
        { text: "🏠 Accueil", callback_data: "nav:main" }
      ]]
    }
  };
}

const TROC_OPEN_STATUSES = ["pending", "accepted", "contacted", "appointment"];
const TROC_REFUSAL_REASONS = [
  "Appareil non conforme au diagnostic",
  "Estimation refusée par le client",
  "Client injoignable",
  "Appareil non éligible au troc"
];

async function screenTrocList(staff: StaffMember): Promise<Screen> {
  if (staff.rank < RANK_RESPONSABLE) return deniedScreen();
  const supabase = db();
  const { data } = await supabase
    ?.from("trade_in_requests")
    .select("id, device_brand, device_model, trade_in_value_cash, trade_in_value, status")
    .in("status", TROC_OPEN_STATUSES)
    .order("created_at", { ascending: false })
    .limit(6) ?? { data: [] };

  const trocs = (data ?? []) as {
    id: string;
    device_brand: string | null;
    device_model: string | null;
    trade_in_value_cash: number | null;
    trade_in_value: number | null;
    status: string;
  }[];

  const buttons: InlineButton[][] = [];
  for (const t of trocs) {
    if (!cbFits(`nav:t_act:ref:${t.id}:0`)) continue;
    const model = `${t.device_brand || ""} ${t.device_model || ""}`.trim() || "Appareil";
    const val = money(t.trade_in_value_cash || t.trade_in_value);
    buttons.push([{ text: `TRC · ${model} (${val})`, callback_data: `nav:t_v:${t.id}` }]);
  }
  buttons.push(homeRow);

  return {
    text:
      `🔄 <b>Dossiers Smart Troc en attente</b>\n\n` +
      (buttons.length === 1
        ? "✅ Aucun dossier troc en attente pour le moment."
        : "Sélectionnez un dossier pour l'examiner :"),
    reply_markup: { inline_keyboard: buttons }
  };
}

async function screenTrocDetail(staff: StaffMember, trocId: string): Promise<Screen> {
  if (staff.rank < RANK_RESPONSABLE) return deniedScreen();
  const supabase = db();
  const { data } = await supabase
    ?.from("trade_in_requests")
    .select("id, customer_name, customer_phone, device_brand, device_model, device_storage, screen_condition, battery_health, trade_in_value_cash, trade_in_value, status")
    .eq("id", trocId)
    .maybeSingle() ?? { data: null };

  if (!data) {
    return {
      text: "❌ Dossier troc introuvable.",
      reply_markup: { inline_keyboard: [[{ text: "⬅️ Retour Liste", callback_data: "nav:troc" }]] }
    };
  }

  const model = `${data.device_brand || ""} ${data.device_model || ""} ${data.device_storage || ""}`.trim();
  const cond = [
    data.screen_condition ? "Écran " + data.screen_condition : null,
    data.battery_health ? "Batterie " + data.battery_health + "%" : null
  ].filter(Boolean).join(" · ") || "Non renseigné";

  const actions: InlineButton[][] = [];
  if (TROC_OPEN_STATUSES.includes(data.status)) {
    const row: InlineButton[] = [
      { text: "✅ Valider l'offre", callback_data: `nav:t_act:val:${data.id}` },
      { text: "❌ Refuser", callback_data: `nav:t_ref:${data.id}` }
    ];
    actions.push(row);
    if (data.status === "accepted") {
      actions.push([{ text: "📞 Marquer contacté", callback_data: `nav:t_act:ctc:${data.id}` }]);
    }
  }
  actions.push([
    { text: "⬅️ Précédent (Liste Trocs)", callback_data: "nav:troc" },
    { text: "🏠 Accueil", callback_data: "nav:main" }
  ]);

  return {
    text:
      `🔄 <b>Dossier Smart Troc #${escapeHtml(String(data.id).slice(0, 8))}</b>\n\n` +
      `• Client : <b>${escapeHtml(data.customer_name || "Client")}</b> (${escapeHtml(data.customer_phone || "—")})\n` +
      `• Appareil : <b>${escapeHtml(model)}</b>\n` +
      `• Diagnostic : ${escapeHtml(cond)}\n` +
      `• Estimation Cash : <b>${money(data.trade_in_value_cash)}</b>\n` +
      `• Bon d'achat boutique : <b>${money(data.trade_in_value)}</b>\n` +
      `• Statut : <i>${escapeHtml(data.status)}</i>`,
    reply_markup: { inline_keyboard: actions }
  };
}

function screenTrocRefuse(staff: StaffMember, trocId: string): Screen {
  if (staff.rank < RANK_RESPONSABLE) return deniedScreen();
  return {
    text: "❌ <b>Refuser le dossier</b>\n\nChoisissez le motif (il est enregistré dans l'ERP) :",
    reply_markup: {
      inline_keyboard: [
        ...TROC_REFUSAL_REASONS.map((reason, i) => [{ text: reason, callback_data: `nav:t_act:ref:${trocId}:${i}` }]),
        [{ text: "⬅️ Annuler", callback_data: `nav:t_v:${trocId}` }]
      ]
    }
  };
}

const TROC_ACTIONS: Record<string, string> = { val: "validated", ref: "refused", ctc: "contacted" };
const TROC_DONE: Record<string, string> = {
  validated: "✅ <b>Dossier troc validé.</b>",
  refused: "❌ <b>Dossier troc refusé.</b>",
  contacted: "📞 <b>Dossier marqué « client contacté ».</b>"
};

/** All checks (role, state machine, reason, audit) live in telegram_staff_troc_action. */
async function actionTroc(staff: StaffMember, action: string, trocId: string, reasonIndex?: string): Promise<Screen> {
  if (staff.rank < RANK_RESPONSABLE) return deniedScreen();
  const back: InlineButton[][] = [[
    { text: "⬅️ Retour aux Trocs", callback_data: "nav:troc" },
    { text: "🏠 Menu Principal", callback_data: "nav:main" }
  ]];
  const target = TROC_ACTIONS[action];
  const reason = action === "ref" ? TROC_REFUSAL_REASONS[Number(reasonIndex)] : undefined;
  const supabase = db();
  if (!target || !trocId || (action === "ref" && !reason) || !supabase) {
    return { text: "Action invalide.", reply_markup: { inline_keyboard: back } };
  }

  const { data, error } = await supabase.rpc("telegram_staff_troc_action", {
    p_request_id: trocId, p_action: target, p_reason: reason ?? null,
    p_telegram_user_id: staff.telegram_user_id
  });
  if (error) {
    const text = error.code === "42501"
      ? "🔒 Action réservée aux responsables et à la direction."
      : "⚠️ Action impossible : le dossier a changé d'état entre-temps. Rouvrez-le pour voir son statut.";
    return { text, reply_markup: { inline_keyboard: back } };
  }
  const result = data as { changed: boolean; status?: string; reason?: string };
  if (result.reason === "not_found") {
    return { text: "❌ Dossier troc introuvable.", reply_markup: { inline_keyboard: back } };
  }
  return {
    text:
      (TROC_DONE[result.status ?? target] ?? "Opération enregistrée.") +
      (result.changed ? "" : "\n\n<i>Déjà dans cet état : aucune modification.</i>") +
      (reason ? `\nMotif : ${escapeHtml(reason)}` : "") +
      `\n\nOpération par <b>${escapeHtml(staff.name)}</b>.`,
    reply_markup: { inline_keyboard: back }
  };
}

/** Midnight in Douala (UTC+1, no DST). */
function todayStartDouala(): string {
  return new Date(Date.now() + 3600_000).toISOString().slice(0, 10) + "T00:00:00+01:00";
}

async function screenSalesToday(staff: StaffMember, storeCode?: string): Promise<Screen> {
  if (staff.rank < RANK_RESPONSABLE) return deniedScreen();
  const store = await scopedStore(staff, storeCode);
  if (staff.rank < RANK_DIRECTION && !store) return deniedScreen();
  const supabase = db();
  let query = supabase?.from("orders").select("id, total_amount").gte("created_at", todayStartDouala());
  if (store) query = query?.eq("store_id", store.id);
  const { data } = await query ?? { data: [] };

  const orders = (data ?? []) as { id: string; total_amount: number | null }[];
  const total = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  return {
    text:
      `📊 <b>Bilan des Ventes du Jour</b>\n` +
      `Point de vente : <b>${escapeHtml(scopeLabel(store))}</b>\n\n` +
      `• Commandes enregistrées : <b>${orders.length}</b>\n` +
      `• Total estimé : <b>${money(total)}</b>\n\n` +
      `<i>Pour les détails complets par vendeur et les clôtures de caisse, ouvrez la console Xeption App.</i>`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📲 Ouvrir Xeption App", web_app: { url: miniApp } }],
        homeRow
      ]
    }
  };
}

const TRANSFER_COOLDOWN_MS = 10 * 60 * 1000;

/** Alerts linked responsables / direction; one request per product and sender every 10 min. */
async function screenTransferConfirm(staff: StaffMember, productId: string, backCat: string, storeCode?: string): Promise<Screen> {
  const store = await scopedStore(staff, storeCode);
  const nav: InlineButton[][] = [[
    { text: "⬅️ Précédent", callback_data: `nav:p:${productId}:${backCat}${scopeSuffix(store)}` },
    { text: "🏠 Accueil", callback_data: "nav:main" }
  ]];
  const supabase = db();
  const [product] = await stockRows(null, { productId, limit: 1, ascending: false });
  if (!staff.store || !supabase || !product) {
    return { text: "❌ Transfert indisponible pour ce produit.", reply_markup: { inline_keyboard: nav } };
  }

  const { data: recent } = await supabase.from("telegram_staff_action_audit").select("id")
    .eq("telegram_user_id", staff.telegram_user_id).eq("action", "transfer.request")
    .eq("resource_id", product.id)
    .gte("created_at", new Date(Date.now() - TRANSFER_COOLDOWN_MS).toISOString()).limit(1);
  if (recent?.length) {
    return {
      text: "🚚 Demande déjà envoyée pour ce produit il y a moins de 10 minutes.",
      reply_markup: { inline_keyboard: nav }
    };
  }

  const { error } = await supabase.from("telegram_staff_action_audit").insert({
    telegram_user_id: staff.telegram_user_id, auth_user_id: staff.auth_user_id,
    action: "transfer.request", resource_id: product.id
  });
  if (error) {
    return { text: "⚠️ Demande non enregistrée, réessayez.", reply_markup: { inline_keyboard: nav } };
  }

  const alert = `🚚 <b>Demande de transfert</b>\n\n` +
    `<b>${escapeHtml(product.name)}</b>\n` +
    `Pour : <b>${escapeHtml(staff.store.name)}</b>\n` +
    `Demandé par : <b>${escapeHtml(staff.name)}</b>`;
  let sent = 0;
  for (const id of await managerTelegramIds(staff.telegram_user_id)) {
    await telegram("sendMessage", { chat_id: id, parse_mode: "HTML", text: alert })
      .then(() => { sent++; })
      .catch(() => console.error("telegram-bot-entry: transfer alert failed"));
  }

  return {
    text: sent > 0
      ? `🚚 <b>Demande de transfert envoyée</b> à ${sent} responsable(s).\n\n<b>${escapeHtml(product.name)}</b> → ${escapeHtml(staff.store.name)}`
      : "⚠️ Demande enregistrée, mais aucun responsable n'a encore associé son Telegram. Prévenez-les directement.",
    reply_markup: { inline_keyboard: nav }
  };
}

// ── Envoi & Remplacement d'écran ─────────────────────────────────────────────

async function renderScreen(chatId: number | string, messageId: number | undefined, screen: Screen): Promise<void> {
  if (messageId) {
    try {
      await telegram("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: screen.text,
        parse_mode: "HTML",
        reply_markup: screen.reply_markup
      });
      return;
    } catch {
      // Si l'édition échoue (ex: message identique ou trop ancien), on envoie un nouveau message
    }
  }

  await telegram("sendMessage", {
    chat_id: chatId,
    text: screen.text,
    parse_mode: "HTML",
    reply_markup: screen.reply_markup
  });
}

// ── Routeur des Boutiques & Callbacks ─────────────────────────────────────────

async function handleCallbackQuery(cb: Obj): Promise<void> {
  const cbId = String(cb.id ?? "");
  const data = String(cb.data ?? "");
  const from = cb.from as Obj | undefined;
  const fromId = String(from?.id ?? "");
  const msg = cb.message as Obj | undefined;
  const chat = msg?.chat as Obj | undefined;
  const rawChatId = chat?.id;
  if (chat?.type !== "private" || (typeof rawChatId !== "number" && typeof rawChatId !== "string")) return;
  const chatId: string | number = rawChatId;
  const messageId = typeof msg?.message_id === "number" ? msg.message_id : undefined;

  // Accuser réception immédiatement pour stopper le spinner Telegram
  await telegram("answerCallbackQuery", { callback_query_id: cbId }).catch(() => {});

  const staff = await getStaff(fromId);
  if (!staff) {
    await telegram("sendMessage", { chat_id: chatId, text: linkHint, reply_markup: shareKeyboard });
    return;
  }

  const parts = data.split(":");
  const action = parts[1];

  let screen: Screen;
  if (action === "store") {
    screen = await screenStore(staff, parts[2] ?? "");
  } else if (action === "stocks") {
    screen = await screenStocksCategories(staff, parts[2]);
  } else if (action === "cat") {
    screen = await screenCategory(staff, parts[2] || "apple", parts[3]);
  } else if (action === "p") {
    screen = await screenProductDetail(staff, parts[2] ?? "", parts[3] || "apple", parts[4]);
  } else if (action === "stock_low") {
    screen = await screenStockLow(staff, parts[2]);
  } else if (action === "trans") {
    screen = await screenTransferConfirm(staff, parts[2] ?? "", parts[3] || "apple", parts[4]);
  } else if (action === "troc") {
    screen = await screenTrocList(staff);
  } else if (action === "t_v") {
    screen = await screenTrocDetail(staff, parts[2] ?? "");
  } else if (action === "t_ref") {
    screen = screenTrocRefuse(staff, parts[2] ?? "");
  } else if (action === "t_act") {
    screen = await actionTroc(staff, parts[2] ?? "", parts[3] ?? "", parts[4]);
  } else if (action === "sales") {
    screen = await screenSalesToday(staff, parts[2]);
  } else if (action === "act") {
    screen = await actionActivation(staff, parts[2] ?? "", parts[3] ?? "");
  } else {
    screen = await screenMain(staff);
  }
  await renderScreen(chatId, messageId, screen);
}

// ── Messages Entrants & Partage de Contact ────────────────────────────────────

async function handleMessage(message: Obj, chatId: number | string): Promise<void> {
  const from = message.from as Obj | undefined;
  const fromId = String(from?.id ?? "");

  if (message.contact && typeof message.contact === "object") {
    await handleContact(message, chatId);
    return;
  }

  const rawText = typeof message.text === "string" ? message.text.trim() : "";
  const [first = "", ...rest] = rawText.split(/\s+/);
  const cmd = first.split("@")[0].toLowerCase();

  if (cmd === "/stock" || cmd === "/prix") {
    await telegram("sendMessage", {
      chat_id: chatId, parse_mode: "HTML",
      text: await productLookupReply(rest.join(" "), fromId)
    });
    return;
  }

  const staff = await getStaff(fromId);
  if (staff) {
    await renderScreen(chatId, undefined, await screenMain(staff));
    return;
  }

  // Si pas encore associé : inviter à partager son numéro en 1 clic
  await telegram("sendMessage", {
    chat_id: chatId,
    parse_mode: "HTML",
    text:
      `👋 <b>Espace Staff Xeption</b>\n\n` +
      `📱 <b>Vendeurs :</b> touchez « ${SHARE_PHONE_TEXT} » ci-dessous pour vous identifier.\n` +
      `🏢 <b>Direction :</b> ERP Xeption → « Lier mon Telegram ».`,
    reply_markup: shareKeyboard
  });
}

// ── Webhook Handler Principal ────────────────────────────────────────────────

async function handleUpdate(request: Request): Promise<Response> {
  const supplied = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!supplied || !constantTimeEqual(supplied, await webhookSecret())) {
    return json(401, { error: "UNAUTHORIZED" });
  }

  const raw = await request.text();
  if (raw.length > 32768) return json(413, { error: "TOO_LARGE" });

  let update: Obj;
  try {
    update = JSON.parse(raw) as Obj;
  } catch {
    return json(400, { error: "INVALID_JSON" });
  }

  if (update.callback_query && typeof update.callback_query === "object") {
    await handleCallbackQuery(update.callback_query as Obj);
    return json(200, { ok: true });
  }

  const message = update.message as Obj | undefined;
  if (!message) return json(200, { ok: true });

  const chat = message.chat as Obj | undefined;
  const chatId = chat?.id;
  if (chat?.type !== "private" || (typeof chatId !== "number" && typeof chatId !== "string")) {
    return json(200, { ok: true });
  }

  await handleMessage(message, chatId);
  return json(200, { ok: true });
}

// ── Configuration du Webhook & Commandes ─────────────────────────────────────

const COMMANDS = [
  { command: "start", description: "Ouvrir le menu principal tactile" },
  { command: "menu", description: "Accéder au tableau de bord staff" },
  { command: "stock", description: "Stock d'un produit, ex. /stock iPhone 13" },
  { command: "prix", description: "Prix boutique, ex. /prix S24" },
  { command: "aide", description: "Associer son compte et utiliser le bot" }
];

async function configure(): Promise<Response> {
  const current = await telegram("getWebhookInfo");
  const details = (current.result ?? {}) as Obj;
  const existing = typeof details.url === "string" ? details.url : "";
  if (existing && existing !== webhookUrl) {
    // A bot may already be processed by another app. Do not steal its updates.
    return json(409, { status: "WEBHOOK_OWNED_BY_ANOTHER_SERVICE", changed: false });
  }

  await telegram("setChatMenuButton", {
    menu_button: { type: "web_app", text: "Ouvrir Xeption", web_app: { url: miniApp } }
  });

  await telegram("setMyCommands", { commands: COMMANDS, scope: { type: "all_private_chats" } });

  await telegram("setMyShortDescription", {
    short_description: "Console staff Xeption : gestion des stocks, trocs et opérations boutique."
  });

  await telegram("setMyDescription", {
    description:
      "Console mobile pour l'équipe Xeption. Stocks, suivi des trocs et ventes au pouce. L'accès aux données requiert un compte staff Xeption."
  });

  // allowed_updates must include callback_query for the inline menu; same call is a no-op.
  const allowed = ["message", "callback_query"];
  const currentAllowed = Array.isArray(details.allowed_updates) ? details.allowed_updates.map(String) : [];
  const webhookChanged = !existing || allowed.some(u => !currentAllowed.includes(u));
  if (webhookChanged) {
    await telegram("setWebhook", {
      url: webhookUrl,
      secret_token: await webhookSecret(),
      allowed_updates: allowed,
      drop_pending_updates: false
    });
  }

  return json(200, {
    status: "CONFIGURED",
    webhook: webhookUrl,
    menu_button: true,
    commands: COMMANDS.map(c => c.command),
    allowed_updates: allowed,
    webhook_changed: webhookChanged
  });
}

// ── Serveur Deno ─────────────────────────────────────────────────────────────

Deno.serve(async (request: Request) => {
  if (!token || !adminSecret) return json(503, { error: "UNCONFIGURED" });
  const pathname = new URL(request.url).pathname;
  if (request.method !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    if (pathname.endsWith("/configure")) {
      const provided = request.headers.get("x-cron-secret") ?? "";
      if (!provided || !constantTimeEqual(provided, adminSecret)) {
        return json(401, { error: "UNAUTHORIZED" });
      }
      return await configure();
    }
    return await handleUpdate(request);
  } catch (err) {
    console.error("telegram-bot-entry error:", err);
    return json(502, { error: "BOT_API_UNAVAILABLE" });
  }
});
