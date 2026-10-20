/**
 * Xeption Telegram Mini App API — signed Telegram identity + current staff RBAC.
 * Runs inside the existing Xeption Supabase project, using project-owned secrets.
 * Trigenys Notify hosts the Mini App and proxies requests to this Edge Function.
 *
 * No second bot, no duplicated notification sender, and no service-role key in Cloudflare.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

type Json = Record<string, unknown>;
type StaffRole = "vendeur" | "responsable" | "direction" | "super_admin";
type Staff = { telegramUserId: string; authUserId: string; name: string; role: StaffRole };

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SITE_URL = (Deno.env.get("SITE_URL") || "https://www.xeptionetwork.shop").replace(/\/+$/, "");
const WRITE_ENABLED = Deno.env.get("MINIAPP_WRITES_ENABLED") === "true";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const allowedCategories = new Set(["alerts", "stock", "images", "trocs", "marketplace"]);
const UUID_RE = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

const cors = {
  "Access-Control-Allow-Origin": "https://trigenys-notify-staging-api.lawrynnjennifer.workers.dev",
  "Access-Control-Allow-Headers": "content-type,x-telegram-init-data",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Max-Age": "600",
  "Vary": "Origin",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function answer(status: number, data: object): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" }
  });
}

function encode(v: string): Uint8Array { return new TextEncoder().encode(v); }
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function sign(key: Uint8Array, input: string): Promise<Uint8Array> {
  const imported = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", imported, encode(input)));
}

/** Raw Telegram.WebApp.initData signature validation, not initDataUnsafe. */
export async function verifiedTelegramUser(raw: string, now = Math.floor(Date.now() / 1000)): Promise<string> {
  if (!BOT_TOKEN || !raw || raw.length > 8192) throw new ApiError(401, "INVALID_TELEGRAM_SESSION");
  const params = new URLSearchParams(raw);
  const pairs = Array.from(params.entries());
  if (pairs.length < 3 || new Set(pairs.map(p => p[0])).size !== pairs.length) {
    throw new ApiError(401, "INVALID_TELEGRAM_SESSION");
  }
  const hash = params.get("hash");
  const authText = params.get("auth_date");
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash) || !authText || !/^[0-9]{10}$/.test(authText)) {
    throw new ApiError(401, "INVALID_TELEGRAM_SESSION");
  }
  const authDate = Number(authText);
  if (!Number.isSafeInteger(authDate) || authDate > now + 60 || now - authDate > 3600) {
    throw new ApiError(401, "EXPIRED_TELEGRAM_SESSION");
  }
  const checkString = pairs.filter(([k]) => k !== "hash")
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, value]) => key + "=" + value).join("\n");
  const secret = await sign(encode("WebAppData"), BOT_TOKEN);
  const computed = await sign(secret, checkString);
  const expected = Uint8Array.from(hash.match(/.{2}/g)!.map(byte => Number.parseInt(byte,16)));
  if (!bytesEqual(computed, expected)) throw new ApiError(401, "INVALID_TELEGRAM_SESSION");
  let user: unknown;
  try { user = JSON.parse(params.get("user") || "null"); }
  catch { throw new ApiError(401, "INVALID_TELEGRAM_SESSION"); }
  if (!user || typeof user !== "object" || Array.isArray(user)) {
    throw new ApiError(401, "INVALID_TELEGRAM_SESSION");
  }
  const id = (user as Json).id;
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0) {
    throw new ApiError(401, "INVALID_TELEGRAM_SESSION");
  }
  return String(id);
}

function normalizeRole(raw: unknown): StaffRole | null {
  if (raw === "editor") return "vendeur";
  if (["manager", "manager_vente", "manager vente", "directeur_commercial"].includes(String(raw))) return "responsable";
  if (raw === "admin") return "direction";
  return raw === "vendeur" || raw === "responsable" || raw === "direction" || raw === "super_admin" ? raw : null;
}
const roleRanks: Record<StaffRole, number> = { vendeur:0, responsable:1, direction:2, super_admin:3 };
function allowed(role: StaffRole, target: unknown): boolean {
  if (!target || target === "all") return true;
  const needed = normalizeRole(target);
  return needed !== null && roleRanks[role] >= roleRanks[needed];
}

async function getStaff(email: string): Promise<{name: string; role: StaffRole}> {
  const e = email.trim().toLowerCase();
  const { data, error } = await supabase.from("staff").select("name,email,role")
    .ilike("email", e).limit(50);
  if (error) throw new ApiError(502, "STAFF_LOOKUP_FAILED");
  const row = (data || []).find((item: Json) =>
    typeof item.email === "string" && item.email.trim().toLowerCase() === e);
  const role = normalizeRole(row?.role);
  if (!row || !role) throw new ApiError(403, "NOT_XEPTION_STAFF");
  return { name: typeof row.name === "string" ? row.name : e, role };
}

async function linkedStaff(telegramUserId: string): Promise<Staff> {
  const { data: links, error: e } = await supabase.from("telegram_staff_links")
    .select("auth_user_id").eq("telegram_user_id", telegramUserId).is("revoked_at",null).limit(1);
  if (e) throw new ApiError(502, "LINK_LOOKUP_FAILED");
  const id = links?.[0]?.auth_user_id;
  if (!id) throw new ApiError(403, "LINK_XEPTION_ACCOUNT");

  const { data, error } = await supabase.auth.admin.getUserById(id);
  if (error || !data?.user || !data.user.email) throw new ApiError(403, "XEPTION_ACCOUNT_DISABLED");
  if (data.user.banned_until && Date.parse(data.user.banned_until) > Date.now()) {
    throw new ApiError(403, "XEPTION_ACCOUNT_DISABLED");
  }
  const staff = await getStaff(data.user.email);
  return { telegramUserId, authUserId:id, ...staff };
}

const LINK_CODE_RE = /^[0-9a-f]{32}$/;

async function sha256Hex(input: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encode(input)));
  return Array.from(digest, b => b.toString(16).padStart(2, "0")).join("");
}

/** One-time code issued by the ERP (create_telegram_link_code): burnt by a single UPDATE. */
async function userFromLinkCode(code: string, telegramUserId: string): Promise<{id: string; email: string}> {
  const { data, error } = await supabase.from("telegram_link_codes")
    .update({ used_at: new Date().toISOString(), used_by_telegram_user_id: telegramUserId })
    .eq("code_hash", await sha256Hex(code))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("auth_user_id");
  if (error) throw new ApiError(502, "LINK_LOOKUP_FAILED");
  const id = data?.[0]?.auth_user_id;
  if (!id) throw new ApiError(401, "LINK_CODE_INVALID");
  const { data: found, error: userError } = await supabase.auth.admin.getUserById(id);
  if (userError || !found?.user?.email) throw new ApiError(403, "XEPTION_ACCOUNT_DISABLED");
  if (found.user.banned_until && Date.parse(found.user.banned_until) > Date.now()) {
    throw new ApiError(403, "XEPTION_ACCOUNT_DISABLED");
  }
  return { id, email: found.user.email };
}

async function userFromAccessToken(accessToken: unknown): Promise<{id: string; email: string}> {
  if (typeof accessToken !== "string" || accessToken.length < 20 || accessToken.length > 5000) {
    throw new ApiError(401, "XEPTION_AUTH_FAILED");
  }
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user?.id || !data.user.email) throw new ApiError(401, "XEPTION_AUTH_FAILED");
  return { id: data.user.id, email: data.user.email };
}

async function link(telegramUserId: string, input: Json): Promise<object> {
  let user: {id: string; email: string};
  if (input.linkCode !== undefined) {
    if (typeof input.linkCode !== "string" || !LINK_CODE_RE.test(input.linkCode)) {
      throw new ApiError(401, "LINK_CODE_INVALID");
    }
    user = await userFromLinkCode(input.linkCode, telegramUserId);
  } else {
    user = await userFromAccessToken(input.xeptionAccessToken);
  }
  const staff = await getStaff(user.email);
  const { data: existing, error: findError } = await supabase.from("telegram_staff_links")
    .select("auth_user_id,revoked_at").eq("telegram_user_id",telegramUserId).maybeSingle();
  if (findError) throw new ApiError(502,"LINK_LOOKUP_FAILED");
  if (existing && !existing.revoked_at && existing.auth_user_id !== user.id) {
    throw new ApiError(409, "TELEGRAM_ALREADY_LINKED");
  }
  const { error: updateError } = await supabase.from("telegram_staff_links")
    .upsert({
      telegram_user_id:telegramUserId,
      auth_user_id:user.id,
      revoked_at:null
    }, {onConflict:"telegram_user_id"});
  if (updateError) throw new ApiError(409, "ALREADY_LINKED");
  return {linked:true,telegramName:"Personnel",staff};
}

async function list(category: string, staff: Staff): Promise<Json[]> {
  if (!allowedCategories.has(category)) throw new ApiError(400, "INVALID_CATEGORY");
  if (category === "trocs" && !allowed(staff.role,"responsable")) throw new ApiError(403,"INSUFFICIENT_ROLE");
  let result: {data: unknown; error: unknown};
  switch (category) {
    case "stock":
      result = await supabase.from("products").select("id,name,stock,price").lte("stock",2).order("name").limit(60); break;
    case "images":
      result = await supabase.from("products").select("id,name,image,price")
        .or("image.is.null,image.eq.,image.ilike.*placeholder*,image.ilike.*icon-192*").order("name").limit(60); break;
    case "trocs":
      result = await supabase.from("trade_in_requests").select(
        "id,device_brand,device_model,status,trade_in_value_cash,trade_in_value,target_product_name,photo_urls,created_at")
        .in("status",["pending","accepted","contacted","appointment"])
        .order("created_at",{ascending:false}).limit(60); break;
    case "marketplace":
      result = await supabase.from("marketplace_listings").select(
        "id,device_brand,device_model,grade,price_min,price_max,status,city,created_at")
        .order("created_at",{ascending:false}).limit(60); break;
    default:
      result = await supabase.from("admin_notifications").select(
        "id,title,event_type,link_to_tab,link_to_id,target_role,created_at,read_at")
        .is("read_at",null).order("created_at",{ascending:false}).limit(60); break;
  }
  if (result.error || !Array.isArray(result.data)) throw new ApiError(502,"XEPTION_READ_FAILED");
  return (result.data as Json[]).filter(row => category !== "alerts" || allowed(staff.role,row.target_role));
}

async function inputJson(request: Request): Promise<Json> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ApiError(415,"JSON_REQUIRED");
  const raw = await request.text();
  if (raw.length > 8192) throw new ApiError(413,"BODY_TOO_LARGE");
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("object required");
    return value as Json;
  } catch { throw new ApiError(400,"INVALID_JSON"); }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null,{status:204,headers:cors});
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY || !BOT_TOKEN) {
      throw new ApiError(503,"MINIAPP_NOT_CONFIGURED");
    }
    const endpoint = new URL(request.url).pathname.split("/").pop() || "";
    if (endpoint === "public-config" && request.method === "GET") {
      return answer(200,{
        supabaseUrl:SUPABASE_URL, supabaseAnonKey:SUPABASE_ANON_KEY,
        xeptionSiteUrl:SITE_URL, writesEnabled:WRITE_ENABLED
      });
    }
    const telegramUserId = await verifiedTelegramUser(request.headers.get("x-telegram-init-data") || "");
    if (endpoint === "link" && request.method === "POST") {
      return answer(200,await link(telegramUserId,await inputJson(request)));
    }
    if (endpoint === "session" && request.method === "GET") {
      try {
        const staff = await linkedStaff(telegramUserId);
        return answer(200,{linked:true,telegramName:"Personnel",staff:{name:staff.name,role:staff.role}});
      } catch(error) {
        if (error instanceof ApiError && error.code === "LINK_XEPTION_ACCOUNT") {
          return answer(200,{linked:false,telegramName:"Personnel"});
        }
        throw error;
      }
    }
    if (endpoint === "items" && request.method === "GET") {
      const staff = await linkedStaff(telegramUserId);
      const category = new URL(request.url).searchParams.get("category") || "alerts";
      return answer(200,{category,items:await list(category,staff)});
    }
    if (["ack","troc-action","marketplace-sold","restock"].includes(endpoint) && request.method === "POST") {
      if (!WRITE_ENABLED) throw new ApiError(403,"MINIAPP_READ_ONLY");
      const staff = await linkedStaff(telegramUserId);
      const input = await inputJson(request);
      if (endpoint === "ack") {
        if (typeof input.id !== "string" || !UUID_RE.test(input.id)) throw new ApiError(400,"INVALID_NOTIFICATION_ID");
        const {data,error} = await supabase.rpc("ack_staff_notification_from_telegram",{
          p_notification_id:input.id,p_telegram_user_id:telegramUserId
        });
        if (error) throw new ApiError(403,"ACTION_REJECTED");
        return answer(200,{acknowledged:data===true});
      }
      if (!allowed(staff.role,"responsable")) throw new ApiError(403,"INSUFFICIENT_ROLE");
      if (endpoint === "troc-action") {
        if (typeof input.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.id) ||
          !["contacted","validated","refused"].includes(String(input.action)) ||
          (input.reason !== undefined && (typeof input.reason !== "string" || input.reason.length > 300))) {
          throw new ApiError(400,"INVALID_TROC_ACTION");
        }
        if (input.action === "refused" && (typeof input.reason !== "string" || input.reason.trim().length < 5)) {
          throw new ApiError(400,"REJECTION_REASON_REQUIRED");
        }
        const {data,error} = await supabase.rpc("telegram_staff_troc_action",{
          p_request_id:input.id,p_action:input.action,p_reason:input.reason || null,
          p_telegram_user_id:telegramUserId
        });
        if (error) throw new ApiError(409,"ACTION_REJECTED");
        return answer(200,data as object);
      }
      if (endpoint === "restock") {
        if (typeof input.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(input.id) ||
          !Number.isInteger(input.quantity) || (input.quantity as number) < 1 || (input.quantity as number) > 50 ||
          typeof input.requestId !== "string" || !UUID_RE.test(input.requestId)) {
          throw new ApiError(400,"INVALID_RESTOCK");
        }
        const {data,error} = await supabase.rpc("telegram_staff_restock",{
          p_product_id:input.id,p_quantity:input.quantity,p_request_id:input.requestId,
          p_telegram_user_id:telegramUserId
        });
        if (error) throw new ApiError(409,"ACTION_REJECTED");
        return answer(200,data as object);
      }
      if (typeof input.id !== "string" || !UUID_RE.test(input.id)) throw new ApiError(400,"INVALID_LISTING_ID");
      const {data,error} = await supabase.rpc("telegram_staff_mark_marketplace_sold",{
        p_listing_id:input.id,p_telegram_user_id:telegramUserId
      });
      if (error) throw new ApiError(409,"ACTION_REJECTED");
      return answer(200,{changed:data===true});
    }
    return answer(404,{error:"NOT_FOUND"});
  } catch(error) {
    if (error instanceof ApiError) return answer(error.status,{error:error.code});
    console.error("telegram-miniapp-api: unexpected error");
    return answer(500,{error:"INTERNAL_ERROR"});
  }
});
