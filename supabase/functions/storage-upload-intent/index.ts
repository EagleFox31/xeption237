import { createClient } from 'npm:@supabase/supabase-js@2';

// Trigenys Storage: server-only media upload intent broker for Xeption staff.
// Tenant credentials stay in Supabase Vault and never enter the browser.
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};
const reply = (status: number, data: unknown) => new Response(JSON.stringify(data), {
  status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' }
});
const MAX_BYTES = 8 * 1024 * 1024;
const STORAGE_ORIGIN = (Deno.env.get('TRIGENYS_STORAGE_API_URL') ||
  'https://trigenys-storage-api.lawrynnjennifer.workers.dev').replace(/\/+$/, '');

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  if (!STORAGE_ORIGIN.startsWith('https://')) return reply(503, {error:'storage_unconfigured'});

  const authHeader = request.headers.get('authorization') || '';
  const bearer = /^Bearer (.+)$/i.exec(authHeader);
  if (!bearer) return reply(401, {error:'login_required'});

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const publishable = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !publishable || !serviceRole) return reply(503,{error:'auth_not_ready'});

  try {
    // Verify the JWT against the Auth server; never trust user_metadata for roles.
    const sessionClient = createClient(supabaseUrl, publishable, { auth: {persistSession:false} });
    const {data:{user}, error:userError} = await sessionClient.auth.getUser(bearer[1]);
    if (userError || !user || !user.email || !user.email_confirmed_at) {
      return reply(401,{error:'verified_login_required'});
    }
    const serverClient = createClient(supabaseUrl, serviceRole, {auth:{persistSession:false}});
    const { data: staff, error: staffError } = await serverClient
      .from('staff').select('id,role')
      .eq('email',user.email.trim().toLowerCase())
      .limit(1).maybeSingle();
    if (staffError || !staff?.role) return reply(403,{error:'staff_access_required'});

    let body: {folder?:unknown;maxBytes?:unknown;contentType?:unknown};
    try {body = await request.json() as typeof body;} catch {return reply(400,{error:'invalid_json'});}
    // The first rollout is for staff product images only.
    if (body.folder !== 'products' || body.contentType !== 'image/webp' ||
        !Number.isSafeInteger(body.maxBytes) || (body.maxBytes as number) < 1 ||
        (body.maxBytes as number) > MAX_BYTES) {
      return reply(400,{error:'invalid_upload_request'});
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
      body:JSON.stringify({tenant:'xeption',folder:'products',
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
