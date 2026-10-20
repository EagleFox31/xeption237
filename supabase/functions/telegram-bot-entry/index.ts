/**
 * Xeption Bot — interactive private-chat entry point for Trigenys Notify Mini App.
 *
 * Existing notify-staff delivery is outbound only and remains unchanged.
 * This function intentionally ignores group traffic. /stock and /prix read the catalogue
 * only through telegram_staff_product_lookup, which requires a linked staff account.
 *
 * /configure is protected by existing CRON_SECRET (call only from Supabase Vault)
 * and FAILS CLOSED when another application already owns the bot webhook.
 * / receives Telegram updates signed by setWebhook(secret_token).
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const token = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const adminSecret = Deno.env.get("CRON_SECRET") ?? "";
const miniApp = "https://trigenys-notify-staging-api.lawrynnjennifer.workers.dev/miniapp";
const webhookUrl = "https://tawnusmfyvugqczaydat.supabase.co/functions/v1/telegram-bot-entry";
const encoder = new TextEncoder();

type Obj = Record<string, unknown>;

function constantTimeEqual(actual: string, expected: string): boolean {
  const a = encoder.encode(actual);
  const b = encoder.encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i=0;i<a.length;i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function webhookSecret(): Promise<string> {
  const raw = encoder.encode("xeption-telegram-bot-entry:" + adminSecret);
  const hash = await crypto.subtle.digest("SHA-256", raw);
  return Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2,"0")).join("");
}

function json(status: number, value: object): Response {
  return new Response(JSON.stringify(value),{
    status,headers:{"content-type":"application/json","cache-control":"no-store"}
  });
}

async function telegram(method: string, body?: Obj): Promise<Obj> {
  if (!token) throw new Error("Missing Telegram token");
  const res = await fetch("https://api.telegram.org/bot" + token + "/" + method, {
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify(body ?? {}),
    signal:AbortSignal.timeout(10000)
  });
  const result = await res.json() as Obj;
  if (!res.ok || result.ok !== true) throw new Error("Telegram operation failed: " + method);
  return result;
}

async function configure(): Promise<Response> {
  const current = await telegram("getWebhookInfo");
  const details = (current.result ?? {}) as Obj;
  const existing = typeof details.url === "string" ? details.url : "";
  if (existing && existing !== webhookUrl) {
    // A bot may already be processed by another app. Do not steal its updates.
    return json(409,{status:"WEBHOOK_OWNED_BY_ANOTHER_SERVICE",changed:false});
  }
  await telegram("setChatMenuButton",{
    menu_button:{type:"web_app",text:"Ouvrir Xeption",web_app:{url:miniApp}}
  });
  await telegram("setMyCommands",{
    commands:[
      {command:"start",description:"Ouvrir l'espace staff Xeption"},
      {command:"aide",description:"Accéder au centre de gestion"},
      {command:"stock",description:"Stock d'un produit, ex. /stock iPhone 13"},
      {command:"prix",description:"Prix boutique, ex. /prix S24"}
    ],
    scope:{type:"all_private_chats"}
  });
  await telegram("setMyShortDescription",{
    short_description:"Notifications et gestion des opérations Xeption : stock, trocs et Marketplace."
  });
  await telegram("setMyDescription",{
    description:"Bienvenue dans l'espace staff Xeption. Ouvrez la Mini App pour consulter vos alertes et gérer les opérations autorisées depuis Telegram. L'accès aux données requiert un compte staff Xeption."
  });
  if (!existing) {
    await telegram("setWebhook",{
      url:webhookUrl,
      secret_token:await webhookSecret(),
      allowed_updates:["message"],
      drop_pending_updates:false
    });
  }
  return json(200,{status:"CONFIGURED",webhook: webhookUrl,menu_button:true,
    commands:["start","aide","stock","prix"],existing_webhook_reused:existing === webhookUrl});
}

const escapeHtml = (value: string) =>
  value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const money = (value: unknown) =>
  value === null || value === undefined ? "—" : new Intl.NumberFormat("fr-FR").format(Number(value)) + " F";

function db() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  return url && key ? createClient(url,key,{auth:{persistSession:false}}) : null;
}

const SHARE_PHONE_TEXT = "📱 Partager mon numéro";
const shareKeyboard = {
  keyboard:[[{text:SHARE_PHONE_TEXT,request_contact:true}]],
  resize_keyboard:true,one_time_keyboard:true
};
const linkHint = "🔐 Associez d'abord votre compte : touchez « " + SHARE_PHONE_TEXT +
  " » (vendeurs) ou ERP Xeption → « Lier mon Telegram » (direction).";

async function isLinked(telegramUserId: string): Promise<boolean> {
  const supabase = db();
  if (!supabase) return false;
  const {data} = await supabase.from("telegram_staff_links").select("telegram_user_id")
    .eq("telegram_user_id",telegramUserId).is("revoked_at",null).limit(1);
  return Boolean(data?.length);
}

const LINK_REFUSALS: Record<string,string> = {
  phone_not_found: "Ce numéro n'est enregistré pour aucun membre du staff. Demandez à la direction de l'ajouter dans l'ERP (écran Équipe).",
  phone_ambiguous: "Ce numéro est enregistré sur plusieurs fiches staff. La direction doit corriger l'ERP.",
  use_erp_code: "Les comptes direction s'associent depuis l'ERP Xeption → « Lier mon Telegram ».",
  no_account: "Votre compte Xeption n'est pas encore activé. Demandez à la direction de générer votre mot de passe (🔑, écran Équipe).",
  telegram_already_linked: "Ce compte Telegram est déjà associé à un autre membre du staff.",
  staff_already_linked: "Ce membre du staff est déjà associé à un autre compte Telegram. Contactez la direction."
};

/** Contact shared via request_contact. Only the sender's own number is accepted. */
async function handleContact(message: Obj, chatId: number | string): Promise<void> {
  const contact = message.contact as Obj;
  const fromId = (message.from as Obj | undefined)?.id;
  const removeKeyboard = {remove_keyboard:true};
  if (typeof fromId !== "number" || contact.user_id !== fromId || typeof contact.phone_number !== "string") {
    await telegram("sendMessage",{chat_id:chatId,reply_markup:shareKeyboard,
      text:"Pour des raisons de sécurité, seul votre propre numéro est accepté : utilisez le bouton « " + SHARE_PHONE_TEXT + " »."});
    return;
  }
  const supabase = db();
  if (!supabase) {
    await telegram("sendMessage",{chat_id:chatId,text:"Association indisponible pour le moment."});
    return;
  }
  const {data,error} = await supabase.rpc("telegram_staff_link_by_phone",{
    p_telegram_user_id:String(fromId),p_phone:contact.phone_number.slice(0,32)
  });
  if (error || !data) {
    console.error("telegram-bot-entry: phone link failed",{code:error?.code});
    await telegram("sendMessage",{chat_id:chatId,text:"Association indisponible pour le moment."});
    return;
  }
  const result = data as {linked:boolean; changed?:boolean; reason?:string; name?:string;
    store?:string | null; notify_telegram_ids?:string[]};
  if (!result.linked) {
    await telegram("sendMessage",{chat_id:chatId,reply_markup:removeKeyboard,
      text:LINK_REFUSALS[result.reason ?? ""] ?? "Association refusée."});
    return;
  }
  const name = escapeHtml(result.name ?? "");
  const store = result.store ? " · " + escapeHtml(result.store) : "";
  await telegram("sendMessage",{chat_id:chatId,parse_mode:"HTML",reply_markup:removeKeyboard,
    text:"✅ Compte associé : <b>" + name + "</b>" + store +
      "\n\nTapez <code>/stock iPhone 13</code> devant un client ou ouvrez l'espace staff."});
  if (!result.changed) return;
  for (const id of result.notify_telegram_ids ?? []) {
    // A failed alert to one manager must not undo the link nor block the others.
    await telegram("sendMessage",{chat_id:id,parse_mode:"HTML",
      text:"🔗 <b>" + name + "</b>" + store + " a associé son Telegram à l'espace staff Xeption."})
      .catch(() => console.error("telegram-bot-entry: manager alert failed"));
  }
}

async function productLookupReply(query: string, telegramUserId: string): Promise<string> {
  if (!query) return "Précisez un produit, par exemple : <code>/stock iPhone 13</code>";
  if (!/^\d{1,20}$/.test(telegramUserId)) return "Commande indisponible.";
  const supabase = db();
  if (!supabase) return "Recherche indisponible pour le moment.";
  const {data,error} = await supabase.rpc("telegram_staff_product_lookup",{
    p_query:query.slice(0,80),p_telegram_user_id:telegramUserId
  });
  if (error) {
    return error.code === "42501"
      ? linkHint
      : "Recherche indisponible pour le moment.";
  }
  const rows = (data ?? []) as {name: string; stock: number; price: number | string | null}[];
  if (!rows.length) return "Aucun produit trouvé pour « " + escapeHtml(query) + " ».";
  return "🔎 <b>" + escapeHtml(query) + "</b>\n\n" + rows.map(row =>
    (row.stock > 0 ? "✅" : "❌") + " <b>" + escapeHtml(row.name) + "</b>\n" +
    "    Stock : " + row.stock + " · Prix : " + money(row.price)
  ).join("\n");
}

async function handleUpdate(request: Request): Promise<Response> {
  const supplied = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!supplied || !constantTimeEqual(supplied,await webhookSecret())) {
    return json(401,{error:"UNAUTHORIZED"});
  }
  const raw = await request.text();
  if (raw.length > 16384) return json(413,{error:"TOO_LARGE"});
  let update: Obj;
  try { update=JSON.parse(raw) as Obj; } catch {return json(400,{error:"INVALID_JSON"});}
  const message = update.message as Obj | undefined;
  if (!message) return json(200,{ok:true});
  const chat = message.chat as Obj | undefined;
  const chatId = chat?.id;
  if (chat?.type !== "private" ||
    (typeof chatId !== "number" && typeof chatId !== "string")) {
    return json(200,{ok:true});
  }
  if (message.contact && typeof message.contact === "object") {
    await handleContact(message,chatId);
    return json(200,{ok:true});
  }
  const rawText = typeof message.text === "string" ? message.text.trim() : "";
  const cmd = rawText.split(/\s+/)[0]?.split("@")[0]?.toLowerCase();
  if (cmd === "/stock" || cmd === "/prix") {
    const fromId = (message.from as Obj | undefined)?.id;
    const query = rawText.slice(rawText.split(/\s+/)[0].length).trim();
    await telegram("sendMessage",{
      chat_id:chatId,
      text:await productLookupReply(query,String(fromId ?? "")),
      parse_mode:"HTML"
    });
    return json(200,{ok:true});
  }
  if (cmd !== "/start" && cmd !== "/aide" && cmd !== "/menu") {
    return json(200,{ok:true});
  }
  await telegram("sendMessage",{
    chat_id:chatId,
    text:
      "👋 <b>Espace Staff Xeption</b>\n\n" +
      "Retrouvez vos notifications et actions prioritaires :\n\n" +
      "▸ 📦 Surveiller les stocks faibles\n" +
      "▸ 🔄 Traiter les demandes de troc\n" +
      "▸ 🛍️ Valider les annonces marketplace\n" +
      "▸ 🖼️ Compléter les photos manquantes\n\n" +
      "🔎 Devant un client : <code>/stock iPhone 13</code> ou <code>/prix S24</code>\n\n" +
      "🔐 <i>Pour accéder aux données, associez votre compte professionnel Xeption.</i>",
    parse_mode:"HTML",
    reply_markup:{
      inline_keyboard:[[{text:"📲 Accéder aux opérations",web_app:{url:miniApp}}]]
    }
  });
  const fromId = (message.from as Obj | undefined)?.id;
  if (typeof fromId === "number" && !(await isLinked(String(fromId)))) {
    await telegram("sendMessage",{chat_id:chatId,reply_markup:shareKeyboard,
      text:"Vendeur ou responsable boutique ? Touchez « " + SHARE_PHONE_TEXT +
        " » pour associer votre compte en un geste."});
  }
  return json(200,{ok:true});
}

Deno.serve(async (request: Request) => {
  if (!token || !adminSecret) return json(503,{error:"UNCONFIGURED"});
  const pathname = new URL(request.url).pathname;
  if (request.method !== "POST") return json(405,{error:"METHOD_NOT_ALLOWED"});
  try {
    if (pathname.endsWith("/configure")) {
      const provided = request.headers.get("x-cron-secret") ?? "";
      if (!provided || !constantTimeEqual(provided,adminSecret)) {
        return json(401,{error:"UNAUTHORIZED"});
      }
      return await configure();
    }
    return await handleUpdate(request);
  } catch {
    // Never log bot tokens, Telegram user IDs or the request body.
    console.error("telegram-bot-entry: provider call failed");
    return json(502,{error:"BOT_API_UNAVAILABLE"});
  }
});
