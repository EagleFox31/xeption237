/**
 * Xeption Bot — interactive private-chat entry point for Trigenys Notify Mini App.
 *
 * Existing notify-staff delivery is outbound only and remains unchanged.
 * This function intentionally ignores group traffic and never reads Xeption records.
 *
 * /configure is protected by existing CRON_SECRET (call only from Supabase Vault)
 * and FAILS CLOSED when another application already owns the bot webhook.
 * / receives Telegram updates signed by setWebhook(secret_token).
 */
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
      {command:"aide",description:"Accéder au centre de gestion"}
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
    commands:["start","aide"],existing_webhook_reused:existing === webhookUrl});
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
  const rawText = typeof message.text === "string" ? message.text.trim() : "";
  const cmd = rawText.split(/\s+/)[0]?.split("@")[0]?.toLowerCase();
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
      "🔐 <i>Pour accéder aux données, associez votre compte professionnel Xeption.</i>",
    parse_mode:"HTML",
    reply_markup:{
      inline_keyboard:[[{text:"📲 Accéder aux opérations",web_app:{url:miniApp}}]]
    }
  });
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
