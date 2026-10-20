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
import {
  HR_PERIODS, HR_TARGET_PRESETS_K, NO_STORE, ROLE_LABEL, UUID_RE,
  isHrPeriod, memberLine, objectivePrompt, parseObjectiveTag, parseTargetAmount,
  type HrMember, type HrPending, type HrPeriodKey
} from "../_shared/telegramHr.ts";
import {
  PAY_CODES, SALE_REASON_TEXT, isPayCode, parseCustomerReply, parseSaleTag, payLabel,
  saleCancelCb, saleConfirmCb, salePayCb, salePrompt, saleRecap, saleStartCb, type SaleLine
} from "../_shared/telegramSale.ts";

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
const linkHint = "🔐 Associez d'abord votre compte : touchez « " + SHARE_PHONE_TEXT + " » (tapez /start s'il n'apparaît pas).";

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
  use_erp_code: "Votre rôle dans l'ERP ne donne pas accès à l'espace staff Telegram. Contactez la direction.",
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

// ── Gestion RH (direction) ────────────────────────────────────────────────────
// Reads and writes go through telegram_staff_hr_* RPCs, which re-check the sender's rank.

const HR_MAX_MEMBER_BUTTONS = 30;
const HR_MAX_TEXT = 3500;
const hrBack: InlineButton[] = [{ text: "⬅️ Retour RH", callback_data: "nav:rh" }];

function hrDenied(): Screen {
  return { text: "🔒 Gestion RH réservée à la direction.", reply_markup: { inline_keyboard: [homeRow] } };
}

function hrMessage(text: string, back: InlineButton[] = hrBack): Screen {
  return { text, reply_markup: { inline_keyboard: [back, homeRow] } };
}

async function hrOverview(staff: StaffMember): Promise<{ members: HrMember[]; pending: HrPending[] } | Screen> {
  const supabase = db();
  if (!supabase) return hrMessage("Gestion RH indisponible pour le moment.", homeRow);
  const { data, error } = await supabase.rpc("telegram_staff_hr_overview", { p_telegram_user_id: staff.telegram_user_id });
  if (error || !data) {
    if (error?.code === "42501") return hrDenied();
    console.error("telegram-bot-entry: hr overview failed", { code: error?.code });
    return hrMessage("Gestion RH indisponible pour le moment.", homeRow);
  }
  return data as { members: HrMember[]; pending: HrPending[] };
}

const hrStoreKey = (m: HrMember) => m.store_code ?? NO_STORE;

async function screenHr(staff: StaffMember): Promise<Screen> {
  if (staff.rank < RANK_DIRECTION) return hrDenied();
  const hr = await hrOverview(staff);
  if ("text" in hr) return hr;

  const groups = new Map<string, { name: string; count: number }>();
  for (const m of hr.members) {
    const key = hrStoreKey(m);
    const group = groups.get(key) ?? { name: m.store_name ?? "Sans boutique", count: 0 };
    group.count++;
    groups.set(key, group);
  }
  const noAccount = hr.members.filter(m => !m.has_account).length;
  const rows: InlineButton[][] = [...groups]
    .filter(([key]) => cbFits("nav:rh_s:" + key))
    .map(([key, g]) => [{ text: `🏪 ${g.name} (${g.count})`, callback_data: "nav:rh_s:" + key }]);
  rows.push([
    { text: `⏳ Demandes (${hr.pending.length})`, callback_data: "nav:rh_p" },
    { text: `👻 Sans compte (${noAccount})`, callback_data: "nav:rh_na" }
  ]);
  rows.push(homeRow);
  return {
    text:
      `👥 <b>Gestion RH</b>\n\n` +
      `• Membres : <b>${hr.members.length}</b>\n` +
      `• Demandes d'activation : <b>${hr.pending.length}</b>\n` +
      `• Sans compte : <b>${noAccount}</b>\n\n` +
      `Choisissez une boutique :`,
    reply_markup: { inline_keyboard: rows }
  };
}

/** Lines joined under the Telegram message limit, with "… +N" for the rest. */
function hrLines(lines: string[]): string {
  let text = "";
  for (let i = 0; i < lines.length; i++) {
    if (text.length + lines[i].length > HR_MAX_TEXT) return text + `… +${lines.length - i}`;
    text += lines[i] + "\n";
  }
  return text;
}

async function screenHrStore(staff: StaffMember, storeKey: string): Promise<Screen> {
  if (staff.rank < RANK_DIRECTION) return hrDenied();
  const hr = await hrOverview(staff);
  if ("text" in hr) return hr;
  const members = hr.members.filter(m => hrStoreKey(m) === storeKey);
  if (!members.length) return hrMessage("Aucun membre dans cette boutique.");

  const buttons = members.slice(0, HR_MAX_MEMBER_BUTTONS).map(m => ({
    text: (m.has_account && !m.active ? "⛔ " : "") + m.name, callback_data: "nav:rh_m:" + m.id
  }));
  const rows: InlineButton[][] = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  rows.push(hrBack, homeRow);
  return {
    text:
      `🏪 <b>${escapeHtml(members[0].store_name ?? "Sans boutique")}</b> — ${members.length} membre(s)\n\n` +
      hrLines(members.map(memberLine)),
    reply_markup: { inline_keyboard: rows }
  };
}

async function screenHrPending(staff: StaffMember): Promise<Screen> {
  if (staff.rank < RANK_DIRECTION) return hrDenied();
  const hr = await hrOverview(staff);
  if ("text" in hr) return hr;
  if (!hr.pending.length) return hrMessage("✅ Aucune demande d'activation en attente.");
  const rows: InlineButton[][] = hr.pending.map(r => [
    { text: "✅ " + r.name, callback_data: "nav:act:ok:" + r.request_id },
    { text: "❌ Refuser", callback_data: "nav:act:no:" + r.request_id }
  ]);
  rows.push(hrBack, homeRow);
  return {
    text: `⏳ <b>Demandes d'activation</b>\n\n` + hrLines(hr.pending.map(r =>
      `• <b>${escapeHtml(r.name)}</b>${r.store_name ? " — " + escapeHtml(r.store_name) : ""}`)),
    reply_markup: { inline_keyboard: rows }
  };
}

async function screenHrNoAccount(staff: StaffMember): Promise<Screen> {
  if (staff.rank < RANK_DIRECTION) return hrDenied();
  const hr = await hrOverview(staff);
  if ("text" in hr) return hr;
  const members = hr.members.filter(m => !m.has_account);
  if (!members.length) return hrMessage("✅ Tous les membres ont un compte.");
  return hrMessage(
    `👻 <b>Membres sans compte</b>\n\n` + hrLines(members.map(m =>
      `• <b>${escapeHtml(m.name)}</b>${m.store_name ? " — " + escapeHtml(m.store_name) : ""}`)) +
    `\n<i>Le membre tape /start puis « ${SHARE_PHONE_TEXT} » : sa demande apparaît dans ⏳ Demandes. ` +
    `Son numéro doit être renseigné dans sa fiche ERP.</i>`
  );
}

async function hrMember(staff: StaffMember, staffId: string): Promise<HrMember | Screen> {
  if (staff.rank < RANK_DIRECTION) return hrDenied();
  if (!UUID_RE.test(staffId)) return hrMessage("Action invalide.");
  const hr = await hrOverview(staff);
  if ("text" in hr) return hr;
  return hr.members.find(m => m.id === staffId) ?? hrMessage("❌ Membre introuvable.");
}

const hrMemberBack = (staffId: string): InlineButton[] => [{ text: "⬅️ Retour fiche", callback_data: "nav:rh_m:" + staffId }];

async function screenHrMember(staff: StaffMember, staffId: string): Promise<Screen> {
  const m = await hrMember(staff, staffId);
  if ("text" in m) return m;
  const account = !m.has_account ? "👻 aucun" : m.active ? "✅ actif" : "⛔ désactivé";
  const targets = (Object.keys(HR_PERIODS) as HrPeriodKey[])
    .map(p => `   ${HR_PERIODS[p].label} : ${money(m.targets?.[HR_PERIODS[p].kind])}`).join("\n");
  const rows: InlineButton[][] = [];
  if ((ROLE_RANK[m.role] ?? 99) <= RANK_RESPONSABLE) rows.push([{ text: "🎯 Objectifs", callback_data: "nav:rh_o:" + m.id }]);
  if (m.has_account && m.id !== staff.id) {
    rows.push([m.active
      ? { text: "⛔ Désactiver", callback_data: "nav:rh_xc:" + m.id }
      : { text: "✅ Réactiver", callback_data: "nav:rh_x:1:" + m.id }]);
  }
  rows.push([{ text: "⬅️ Retour boutique", callback_data: "nav:rh_s:" + hrStoreKey(m) }], homeRow);
  return {
    text:
      `👤 <b>${escapeHtml(m.name)}</b>\n\n` +
      `• Rôle : ${escapeHtml(ROLE_LABEL[m.role] ?? m.role)}\n` +
      `• Boutique : ${escapeHtml(m.store_name ?? "—")}\n` +
      `• Téléphone : ${escapeHtml(m.phone ?? "—")}\n` +
      `• Compte : ${account}\n` +
      `• Telegram : ${m.telegram_linked ? "✅ relié" : "❌ non relié"}\n` +
      `• Objectifs :\n${targets}`,
    reply_markup: { inline_keyboard: rows }
  };
}

async function screenHrDeactivateConfirm(staff: StaffMember, staffId: string): Promise<Screen> {
  const m = await hrMember(staff, staffId);
  if ("text" in m) return m;
  return {
    text: `⛔ Désactiver <b>${escapeHtml(m.name)}</b> ?\n\nCela coupe son accès à l'ERP, au bot Telegram et à la Mini App.`,
    reply_markup: {
      inline_keyboard: [[
        { text: "⛔ Confirmer", callback_data: "nav:rh_x:0:" + m.id },
        { text: "Annuler", callback_data: "nav:rh_m:" + m.id }
      ]]
    }
  };
}

const HR_ACTIVE_REFUSALS: Record<string, string> = {
  not_found: "❌ Membre introuvable.",
  self: "🔒 Vous ne pouvez pas modifier votre propre accès.",
  rank: "🔒 Réservé à un rang supérieur.",
  no_account: "👻 Ce membre n'a pas encore de compte."
};

async function actionHrActive(staff: StaffMember, flag: string, staffId: string): Promise<Screen> {
  if (staff.rank < RANK_DIRECTION) return hrDenied();
  const supabase = db();
  if (!supabase || (flag !== "0" && flag !== "1") || !UUID_RE.test(staffId)) return hrMessage("Action invalide.");
  const { data, error } = await supabase.rpc("telegram_staff_set_member_active", {
    p_telegram_user_id: staff.telegram_user_id, p_staff_id: staffId, p_active: flag === "1"
  });
  if (error || !data) {
    if (error?.code === "42501") return hrDenied();
    console.error("telegram-bot-entry: hr member active failed", { code: error?.code });
    return hrMessage("Action indisponible pour le moment.", hrMemberBack(staffId));
  }
  const result = data as { changed: boolean; active?: boolean; reason?: string; name?: string };
  const back = hrMemberBack(staffId);
  if (result.reason) return hrMessage(HR_ACTIVE_REFUSALS[result.reason] ?? "Action refusée.", back);
  const who = "<b>" + escapeHtml(result.name ?? "") + "</b>";
  if (!result.changed) return hrMessage(`ℹ️ ${who} est déjà ${result.active ? "actif" : "désactivé"}.`, back);
  return hrMessage(
    (result.active
      ? `✅ ${who} réactivé. Il devra repartager son numéro pour retrouver le bot Telegram.`
      : `⛔ ${who} désactivé : accès ERP, Telegram et Mini App coupés.`) +
    `\n\nOpération par <b>${escapeHtml(staff.name)}</b>.`,
    back
  );
}

async function screenHrTargetPeriod(staff: StaffMember, staffId: string): Promise<Screen> {
  const m = await hrMember(staff, staffId);
  if ("text" in m) return m;
  return {
    text: `🎯 Objectif de <b>${escapeHtml(m.name)}</b> : choisissez la période.`,
    reply_markup: {
      inline_keyboard: [
        (Object.keys(HR_PERIODS) as HrPeriodKey[]).map(p => ({
          text: HR_PERIODS[p].label, callback_data: `nav:rh_op:${p}:${m.id}`
        })),
        hrMemberBack(m.id)
      ]
    }
  };
}

async function screenHrTargetAmount(staff: StaffMember, period: string, staffId: string): Promise<Screen> {
  if (!isHrPeriod(period)) return hrMessage("Action invalide.");
  const m = await hrMember(staff, staffId);
  if ("text" in m) return m;
  const presets = HR_TARGET_PRESETS_K[period].map(k => ({
    text: money(k * 1000), callback_data: `nav:rh_ov:${period}:${k}:${m.id}`
  }));
  const rows: InlineButton[][] = [];
  for (let i = 0; i < presets.length; i += 2) rows.push(presets.slice(i, i + 2));
  rows.push([
    { text: "✏️ Autre montant", callback_data: `nav:rh_oc:${period}:${m.id}` },
    { text: "🗑 Retirer", callback_data: `nav:rh_ov:${period}:0:${m.id}` }
  ]);
  rows.push(hrMemberBack(m.id));
  return {
    text:
      `🎯 Objectif ${HR_PERIODS[period].label.toLowerCase()} de <b>${escapeHtml(m.name)}</b>\n` +
      `Actuel : <b>${money(m.targets?.[HR_PERIODS[period].kind])}</b>`,
    reply_markup: { inline_keyboard: rows }
  };
}

async function actionHrTarget(staff: StaffMember, period: string, amountXaf: number, staffId: string): Promise<Screen> {
  if (staff.rank < RANK_DIRECTION) return hrDenied();
  const supabase = db();
  if (!supabase || !isHrPeriod(period) || !Number.isInteger(amountXaf) || amountXaf < 0 || !UUID_RE.test(staffId)) {
    return hrMessage("Action invalide.");
  }
  const back = hrMemberBack(staffId);
  const { data, error } = await supabase.rpc("telegram_staff_set_sales_target", {
    p_telegram_user_id: staff.telegram_user_id, p_staff_id: staffId,
    p_period_kind: HR_PERIODS[period].kind, p_target_amount: amountXaf
  });
  if (error || !data) {
    if (error?.code === "42501") return hrDenied();
    if (error?.code === "22023") return hrMessage("Montant invalide.", back);
    console.error("telegram-bot-entry: hr target failed", { code: error?.code });
    return hrMessage("Objectif non enregistré, réessayez.", back);
  }
  const result = data as { changed: boolean; reason?: string; name?: string };
  const who = "<b>" + escapeHtml(result.name ?? "") + "</b>";
  const label = HR_PERIODS[period].label.toLowerCase();
  if (result.reason === "not_found") return hrMessage("❌ Membre introuvable.");
  if (result.reason === "not_seller") return hrMessage("🔒 Objectifs réservés aux vendeurs et responsables.", back);
  if (result.reason === "none") return hrMessage(`ℹ️ ${who} n'a pas d'objectif ${label}.`, back);
  const done = amountXaf === 0
    ? `🗑 Objectif ${label} de ${who} retiré.`
    : `🎯 Objectif ${label} de ${who} : <b>${money(amountXaf)}</b>.`;
  return hrMessage(
    done + (result.changed ? "" : "\n\n<i>Déjà dans cet état : aucune modification.</i>") +
    `\n\nOpération par <b>${escapeHtml(staff.name)}</b>.`,
    back
  );
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
          [{ text: "👥 Gestion RH", callback_data: "nav:rh" }],
          [{ text: "📲 Ouvrir Xeption App", web_app: { url: miniApp } }]
        ]
      }
    };
  }

  const rows: InlineButton[][] = [[
    { text: "📦 Stocks & Prix", callback_data: "nav:stocks" },
    { text: "⚠️ Stocks Faibles", callback_data: "nav:stock_low" }
  ]];
  // A sale starts from a product sheet: the entry point is the store catalogue.
  if (staff.store) rows.push([{ text: "🛒 Enregistrer une vente", callback_data: "nav:stocks" }]);
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
async function stockRows(store: Store | null, opts: { names?: string[]; max?: number; productId?: string; limit: number; offset?: number; ascending: boolean }): Promise<StockRow[]> {
  const supabase = db();
  if (!supabase) return [];
  const nameFilter = opts.names?.map(n => `name.ilike.%${n}%`).join(",");
  const from = opts.offset ?? 0;
  const to = from + opts.limit - 1;
  if (store) {
    let query = supabase.from("store_stock")
      .select("quantity, products!inner(id, name, price)")
      .eq("store_id", store.id);
    if (nameFilter) query = query.or(nameFilter, { referencedTable: "products" });
    if (opts.productId) query = query.eq("product_id", opts.productId);
    if (opts.max !== undefined) query = query.lte("quantity", opts.max);
    // Tie-break on the product id so pages never overlap or skip a product.
    const { data } = await query.order("quantity", { ascending: opts.ascending }).order("product_id").range(from, to);
    return ((data ?? []) as { quantity: number; products: { id: string; name: string; price: number | string | null } }[])
      .map(r => ({ id: r.products.id, name: r.products.name, price: r.products.price, stock: r.quantity }));
  }
  let query = supabase.from("products").select("id, name, price, stock");
  if (nameFilter) query = query.or(nameFilter);
  if (opts.productId) query = query.eq("id", opts.productId);
  if (opts.max !== undefined) query = query.lte("stock", opts.max);
  const { data } = await query.order("stock", { ascending: opts.ascending }).order("id").range(from, to);
  return (data ?? []) as StockRow[];
}

const CATEGORY_PAGE_SIZE = 6;

/** "android.3" → page 3 of android; the page rides in backCat so "Précédent" from a product keeps it. */
function parseCategoryToken(token: string): { cat: string; page: number } {
  const [name, rawPage] = token.split(".");
  const cat = CATEGORIES[name] ? name : "apple";
  const page = Math.max(1, Math.min(Number.parseInt(rawPage ?? "1", 10) || 1, 99));
  return { cat, page };
}

const categoryToken = (cat: string, page: number) => page > 1 ? `${cat}.${page}` : cat;

async function screenCategory(staff: StaffMember, token: string, storeCode?: string): Promise<Screen> {
  const { cat, page } = parseCategoryToken(token);
  const category = CATEGORIES[cat];
  const catKey = categoryToken(cat, page);
  const store = await scopedStore(staff, storeCode);
  const suffix = scopeSuffix(store);
  // One extra row tells whether a next page exists.
  const rows = await stockRows(store, {
    names: category.names, limit: CATEGORY_PAGE_SIZE + 1, offset: (page - 1) * CATEGORY_PAGE_SIZE, ascending: false
  });
  const hasNext = rows.length > CATEGORY_PAGE_SIZE;
  const products = rows.slice(0, CATEGORY_PAGE_SIZE);

  const buttons: InlineButton[][] = [];
  for (const p of products) {
    if (!cbFits(`nav:trans:${p.id}:${catKey}${suffix}`)) continue;
    const shortName = p.name.length > 28 ? p.name.slice(0, 26) + "…" : p.name;
    buttons.push([{ text: `${shortName} (${p.stock} dispo)`, callback_data: `nav:p:${p.id}:${catKey}${suffix}` }]);
  }
  const pager: InlineButton[] = [];
  if (page > 1) pager.push({ text: "◀️ Page précédente", callback_data: `nav:cat:${categoryToken(cat, page - 1)}${suffix}` });
  if (hasNext) pager.push({ text: "Page suivante ▶️", callback_data: `nav:cat:${categoryToken(cat, page + 1)}${suffix}` });
  if (pager.length) buttons.push(pager);
  buttons.push([
    { text: "⬅️ Précédent (Catégories)", callback_data: "nav:stocks" + suffix },
    { text: "🏠 Accueil", callback_data: "nav:main" }
  ]);

  return {
    text:
      `📂 <b>${escapeHtml(category.label)}</b> — ${escapeHtml(scopeLabel(store))}` +
      (page > 1 || hasNext ? ` · page ${page}` : "") + `\n\n` +
      (products.length === 0
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
  // Selling only from one's own store; the RPC re-checks store and stock.
  if (staff.store && store?.id === staff.store.id && product.stock > 0 && cbFits(salePayCb("C", product.id)) &&
    cbFits(saleStartCb(product.id, backCat))) {
    rows.push([{ text: "🛒 Vendre ce produit", callback_data: saleStartCb(product.id, backCat) }]);
  }
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

// ── Vente comptoir (scénario 1 : 1 article, paiement unique) ──────────────────
// Produit → moyen de paiement → client (ForceReply #VTE:) → récapitulatif → encaissement.
// État dans telegram_sale_drafts ; boutique, vendeur et prix résolus par les RPC.

const saleHome: InlineButton[] = [{ text: "🏠 Accueil", callback_data: "nav:main" }];

function saleMessage(text: string): Screen {
  return { text, reply_markup: { inline_keyboard: [saleHome] } };
}

function saleRefusal(result: { reason?: string; error?: string; order_id?: string }): Screen {
  if (result.reason === "completed") {
    return saleMessage(`ℹ️ Vente déjà enregistrée (commande <b>${escapeHtml(result.order_id ?? "")}</b>).`);
  }
  const base = SALE_REASON_TEXT[result.reason ?? ""] ?? "Vente non enregistrée, réessayez.";
  return saleMessage("❌ " + base + (result.error ? " : " + escapeHtml(result.error) : "") + ".");
}

async function screenSalePayment(staff: StaffMember, productId: string, backCat: string): Promise<Screen> {
  if (!staff.store) return saleRefusal({ reason: "no_store" });
  const [product] = await stockRows(staff.store, { productId, limit: 1, ascending: false });
  if (!product || product.stock < 1) return saleRefusal({ reason: product ? "out_of_stock" : "not_found" });
  const codes = Object.keys(PAY_CODES) as (keyof typeof PAY_CODES)[];
  return {
    text:
      `🛒 <b>${escapeHtml(product.name)}</b> — ${money(product.price)}\n\n` +
      `Comment le client paie-t-il ?`,
    reply_markup: {
      inline_keyboard: [
        ...codes.map(c => [{ text: payLabel(PAY_CODES[c]), callback_data: salePayCb(c, product.id) }]),
        [{ text: "⬅️ Précédent", callback_data: `nav:p:${product.id}:${backCat}${scopeSuffix(staff.store)}` }, ...saleHome]
      ]
    }
  };
}

/** Opens the draft and asks for the customer; returns a Screen only on refusal. */
async function actionSaleOpen(staff: StaffMember, code: string, productId: string, chatId: string | number): Promise<Screen | null> {
  const supabase = db();
  if (!supabase || !isPayCode(code) || !productId) return saleMessage("Action invalide.");
  const { data, error } = await supabase.rpc("telegram_staff_sale_draft_open", {
    p_telegram_user_id: staff.telegram_user_id, p_product_id: productId, p_payment_method: PAY_CODES[code]
  });
  if (error || !data) {
    console.error("telegram-bot-entry: sale draft open failed", { code: error?.code });
    return saleMessage("Vente non démarrée, réessayez.");
  }
  const result = data as { changed: boolean; reason?: string; draft_id?: string; product_name?: string; price?: number };
  if (!result.changed || !result.draft_id) return saleRefusal(result);
  await telegram("sendMessage", {
    chat_id: chatId,
    text: salePrompt(result.draft_id, result.product_name ?? "", Number(result.price ?? 0), PAY_CODES[code]),
    reply_markup: { force_reply: true, input_field_placeholder: "Paul 699123456" }
  });
  return null;
}

async function actionSaleCustomer(staff: StaffMember, draftId: string, rawText: string): Promise<Screen> {
  const supabase = db();
  const customer = parseCustomerReply(rawText);
  if (!customer) {
    return {
      text: "Format non reconnu. Exemple : <b>Paul 699123456</b> (prénom puis numéro WhatsApp à 9 chiffres).",
      reply_markup: { inline_keyboard: [[{ text: "❌ Annuler la vente", callback_data: saleCancelCb(draftId) }]] }
    };
  }
  if (!supabase || !UUID_RE.test(draftId)) return saleMessage("Action invalide.");
  const { data, error } = await supabase.rpc("telegram_staff_sale_draft_set_customer", {
    p_telegram_user_id: staff.telegram_user_id, p_draft_id: draftId,
    p_customer_name: customer.name, p_customer_phone: customer.phone
  });
  if (error || !data) {
    console.error("telegram-bot-entry: sale customer failed", { code: error?.code });
    return saleMessage("Client non enregistré, réessayez.");
  }
  const result = data as {
    changed: boolean; reason?: string; order_id?: string; lines?: SaleLine[]; payment_method?: string;
    discount_amount?: number; customer_name?: string; customer_phone?: string;
  };
  if (!result.changed) return saleRefusal(result);
  return {
    text: saleRecap({
      lines: (result.lines ?? []).map(l => ({ ...l, unit_price: Number(l.unit_price), quantity: Number(l.quantity) })),
      payment_method: result.payment_method ?? "", discount_amount: Number(result.discount_amount ?? 0),
      customer_name: result.customer_name ?? customer.name, customer_phone: result.customer_phone ?? customer.phone
    }),
    reply_markup: {
      inline_keyboard: [
        [{ text: "✅ Valider l'encaissement", callback_data: saleConfirmCb(draftId) }],
        [{ text: "❌ Annuler", callback_data: saleCancelCb(draftId) }]
      ]
    }
  };
}

async function actionSaleComplete(staff: StaffMember, draftId: string): Promise<Screen> {
  const supabase = db();
  if (!supabase || !UUID_RE.test(draftId)) return saleMessage("Action invalide.");
  const { data, error } = await supabase.rpc("telegram_staff_complete_sale", {
    p_telegram_user_id: staff.telegram_user_id, p_draft_id: draftId
  });
  if (error || !data) {
    console.error("telegram-bot-entry: sale complete failed", { code: error?.code });
    return saleMessage("Encaissement non confirmé. Vérifiez « 📊 Ventes du Jour » avant de réessayer.");
  }
  const result = data as { changed: boolean; reason?: string; error?: string; order_id?: string; total?: number; customer_name?: string; payment_method?: string };
  if (!result.changed) return saleRefusal(result);
  return saleMessage(
    `✅ <b>Vente enregistrée</b>\n\n` +
    `Commande : <b>${escapeHtml(result.order_id ?? "")}</b>\n` +
    `Total : <b>${money(result.total)}</b> — ${escapeHtml(payLabel(result.payment_method ?? ""))}\n` +
    `Client : ${escapeHtml(result.customer_name ?? "")}\n\n` +
    `Stock de la boutique mis à jour, équipe prévenue.`
  );
}

async function actionSaleCancel(staff: StaffMember, draftId: string): Promise<Screen> {
  const supabase = db();
  if (!supabase || !UUID_RE.test(draftId)) return saleMessage("Action invalide.");
  const { data, error } = await supabase.rpc("telegram_staff_sale_draft_cancel", {
    p_telegram_user_id: staff.telegram_user_id, p_draft_id: draftId
  });
  if (error || !data) return saleMessage("Annulation non confirmée, réessayez.");
  const result = data as { changed: boolean; reason?: string; order_id?: string };
  if (!result.changed && result.reason !== "cancelled") return saleRefusal(result);
  return saleMessage("🗑 Vente annulée. Aucun encaissement enregistré.");
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
  // Columns of orders are total and date; cancelled and returned orders are not sales.
  let query = supabase?.from("orders").select("id, total").gte("date", todayStartDouala())
    .not("status", "in", "(cancelled,returned)");
  if (store) query = query?.eq("store_id", store.id);
  const { data } = await query ?? { data: [] };

  const orders = (data ?? []) as { id: string; total: number | null }[];
  const total = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

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
  } else if (action === "sv") {
    screen = await screenSalePayment(staff, parts[2] ?? "", parts[3] || "apple");
  } else if (action === "sp") {
    const refusal = await actionSaleOpen(staff, parts[2] ?? "", parts[3] ?? "", chatId);
    if (!refusal) return;
    screen = refusal;
  } else if (action === "sc") {
    screen = await actionSaleComplete(staff, parts[2] ?? "");
  } else if (action === "sx") {
    screen = await actionSaleCancel(staff, parts[2] ?? "");
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
  } else if (action === "rh") {
    screen = await screenHr(staff);
  } else if (action === "rh_s") {
    screen = await screenHrStore(staff, parts[2] ?? "");
  } else if (action === "rh_p") {
    screen = await screenHrPending(staff);
  } else if (action === "rh_na") {
    screen = await screenHrNoAccount(staff);
  } else if (action === "rh_m") {
    screen = await screenHrMember(staff, parts[2] ?? "");
  } else if (action === "rh_xc") {
    screen = await screenHrDeactivateConfirm(staff, parts[2] ?? "");
  } else if (action === "rh_x") {
    screen = await actionHrActive(staff, parts[2] ?? "", parts[3] ?? "");
  } else if (action === "rh_o") {
    screen = await screenHrTargetPeriod(staff, parts[2] ?? "");
  } else if (action === "rh_op") {
    screen = await screenHrTargetAmount(staff, parts[2] ?? "", parts[3] ?? "");
  } else if (action === "rh_ov") {
    screen = await actionHrTarget(staff, parts[2] ?? "", Number(parts[3]) * 1000, parts[4] ?? "");
  } else if (action === "rh_oc") {
    // Free amount: a ForceReply whose text carries the context (see handleMessage).
    const period = parts[2] ?? "";
    const m = isHrPeriod(period) ? await hrMember(staff, parts[3] ?? "") : hrMessage("Action invalide.");
    if ("text" in m) {
      screen = m;
    } else {
      await telegram("sendMessage", {
        chat_id: chatId, text: objectivePrompt(period as HrPeriodKey, m.id, m.name),
        reply_markup: { force_reply: true, input_field_placeholder: "1500000" }
      });
      return;
    }
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

  // Reply to an "Autre montant" prompt. The tag is context only: the RPC re-checks the rank.
  const reply = message.reply_to_message as Obj | undefined;
  const objective = (reply?.from as Obj | undefined)?.is_bot === true
    ? parseObjectiveTag(String(reply?.text ?? ""))
    : null;
  if (objective) {
    const staff = await getStaff(fromId);
    if (!staff) {
      await telegram("sendMessage", { chat_id: chatId, text: linkHint, reply_markup: shareKeyboard });
      return;
    }
    const amount = parseTargetAmount(rawText);
    const screen = amount === null
      ? hrMessage("Montant invalide (ex. 1500000 ou 1,5m). Touchez à nouveau « ✏️ Autre montant ».", hrMemberBack(objective.staffId))
      : await actionHrTarget(staff, objective.period, amount, objective.staffId);
    await renderScreen(chatId, undefined, screen);
    return;
  }

  // Reply to a sale prompt (#VTE:). The tag is context only: the RPC re-checks the owner.
  const sale = (reply?.from as Obj | undefined)?.is_bot === true
    ? parseSaleTag(String(reply?.text ?? ""))
    : null;
  if (sale) {
    const staff = await getStaff(fromId);
    if (!staff) {
      await telegram("sendMessage", { chat_id: chatId, text: linkHint, reply_markup: shareKeyboard });
      return;
    }
    await renderScreen(chatId, undefined, await actionSaleCustomer(staff, sale.draftId, rawText));
    return;
  }

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
