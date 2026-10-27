import { createClient } from 'npm:@supabase/supabase-js@2';
import { assertAiRateLimit, rateLimitJsonResponse } from '../_shared/rateLimit.ts';

// Trigenys Storage: server-only media upload intent broker for Xeption.
// Tenant credentials stay in Supabase Vault and never enter the browser.
// - folder 'products': verified staff only.
// - folder 'trocs': anonymous customers (trade-in photos), rate-limited and size-capped.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const reply = (status: number, data: unknown) => new Response(JSON.stringify(data), {
  status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' }
});
const FOLDER_MAX_BYTES: Record<string, number> = {
  products: 8 * 1024 * 1024,
  trocs: 2 * 1024 * 1024,
};
const STORAGE_ORIGIN = (Deno.env.get('TRIGENYS_STORAGE_API_URL') ||
  'https://trigenys-storage-api.lawrynnjennifer.workers.dev').replace(/\/+$/, '');

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  if (!STORAGE_ORIGIN.startsWith('https://')) return reply(503, {error:'storage_unconfigured'});

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const publishable = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !publishable || !serviceRole) return reply(503,{error:'auth_not_ready'});

  let body: {folder?:unknown;maxBytes?:unknown;contentType?:unknown;sessionKey?:unknown};
  try {body = await request.json() as typeof body;} catch {return reply(400,{error:'invalid_json'});}
  const folder = typeof body.folder === 'string' ? body.folder : '';
  const maxAllowed = FOLDER_MAX_BYTES[folder];
  if (!maxAllowed || body.contentType !== 'image/webp' ||
      !Number.isSafeInteger(body.maxBytes) || (body.maxBytes as number) < 1 ||
      (body.maxBytes as number) > maxAllowed) {
    return reply(400,{error:'invalid_upload_request'});
  }

  try {
    const serverClient = createClient(supabaseUrl, serviceRole, {auth:{persistSession:false}});

    if (folder === 'trocs') {
      const sessionKey = typeof body.sessionKey === 'string' ? body.sessionKey.trim() : null;
      const rateLimit = await assertAiRateLimit(request, 'troc-photo-upload', sessionKey);
      if (!rateLimit.allowed) return rateLimitJsonResponse(rateLimit, cors);
    } else {
      const bearer = /^Bearer (.+)$/i.exec(request.headers.get('authorization') || '');
      if (!bearer) return reply(401, {error:'login_required'});
      // Verify the JWT against the Auth server; never trust user_metadata for roles.
      const sessionClient = createClient(supabaseUrl, publishable, { auth: {persistSession:false} });
      const {data:{user}, error:userError} = await sessionClient.auth.getUser(bearer[1]);
      if (userError || !user || !user.email || !user.email_confirmed_at) {
        return reply(401,{error:'verified_login_required'});
      }
      const { data: staff, error: staffError } = await serverClient
        .from('staff').select('id,role')
        .eq('email',user.email.trim().toLowerCase())
        .limit(1).maybeSingle();
      if (staffError || !staff?.role) return reply(403,{error:'staff_access_required'});
    }

    // SECURITY DEFINER RPC is executable by service_role only; no browser access.
    const {data:secret, error:secretError} = await serverClient
      .rpc('trigenys_storage_xeption_credential');
    if (secretError || typeof secret !== 'string' || secret.length < 32) {
      return reply(503,{error:'storage_credential_unavailable'});
    }
    const upstream = await fetch(STORAGE_ORIGIN+'/v1/uploads/authorize',{
      method:'POST',
      headers:{'content-type':'application/json','x-tenant-secret':secret},
      body:JSON.stringify({tenant:'xeption',folder,
        contentType:'image/webp',maxBytes:body.maxBytes})
    });
    if (!upstream.ok) return reply(502,{error:'storage_authorization_failed'});
    const intent = await upstream.json() as {
      token:string;mediaId:string;mediaUrl:string;uploadUrl:string;expiresAt:string
    };
    if (!intent.token || !intent.mediaId || !intent.uploadUrl || !intent.mediaUrl) {
      return reply(502,{error:'storage_intent_invalid'});
    }
    return reply(200,{...intent,origin:STORAGE_ORIGIN});
  } catch {
    return reply(503,{error:'storage_temporarily_unavailable'});
  }
});
