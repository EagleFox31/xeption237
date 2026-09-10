// @ts-ignore
const Deno = globalThis.Deno;

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FETCH_TIMEOUT_MS = 10_000;

const ALLOWED_IMEI_STATUSES = new Set([
  'not_checked',
  'valid',
  'invalid',
  'check_failed',
]);

const ALLOWED_BLACKLIST = new Set(['unknown', 'clear', 'blacklisted']);
const ALLOWED_ASSURANCE = new Set(['basic', 'premium']);

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const sanitizeImei = (value?: string): string => (value || '').replace(/\D/g, '').trim();

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
};

const validateBody = (body: Record<string, unknown>): string | null => {
  const sessionKey = str(body.sessionKey).trim();
  if (!sessionKey) return 'sessionKey requis';

  const customerName = str(body.customerName).trim();
  if (customerName.length < 2) return 'customerName requis';

  const phone = str(body.customerPhone).replace(/\s/g, '');
  if (!/^[62]\d{8}$/.test(phone)) return 'customerPhone invalide';

  if (!str(body.deviceBrand).trim()) return 'deviceBrand requis';
  if (!str(body.deviceModel).trim()) return 'deviceModel requis';

  if (!Array.isArray(body.photoUrls) || body.photoUrls.length === 0) {
    return 'photoUrls requis (au moins 1 photo)';
  }
  if (body.photoUrls.length > 8) return 'photoUrls : maximum 8 photos';

  const imeiStatus = str(body.imeiStatus) || 'not_checked';
  if (!ALLOWED_IMEI_STATUSES.has(imeiStatus)) return 'imeiStatus invalide';

  const blacklist = str(body.imeiBlacklistStatus) || 'unknown';
  if (!ALLOWED_BLACKLIST.has(blacklist)) return 'imeiBlacklistStatus invalide';

  const assurance = str(body.imeiAssuranceLevel) || 'basic';
  if (!ALLOWED_ASSURANCE.has(assurance)) return 'imeiAssuranceLevel invalide';

  return null;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const validationError = validateBody(body as Record<string, unknown>);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const sk = str(body.sessionKey).trim();
    const normalizedImei = sanitizeImei(str(body.imei));
    const photoUrls = (body.photoUrls as string[]).filter((u) => typeof u === 'string' && u.length > 0);

    const rowPayload = {
      customer_name: str(body.customerName).trim(),
      customer_phone: str(body.customerPhone).replace(/\s/g, ''),
      customer_email: str(body.customerEmail).trim() || null,
      device_brand: str(body.deviceBrand).trim(),
      device_model: str(body.deviceModel).trim(),
      device_storage: str(body.deviceStorage).trim() || null,
      device_ram: str(body.deviceRam).trim() || null,
      acquisition_condition: str(body.acquisitionCondition) || 'used',
      purchase_date: null,
      ownership_rank: str(body.ownershipRank) || 'unknown',
      battery_health: Number.isFinite(Number(body.batteryHealth))
        ? Number(body.batteryHealth)
        : 80,
      screen_condition: str(body.screenCondition).trim() || null,
      body_condition: str(body.bodyCondition).trim() || null,
      camera_condition: str(body.cameraCondition).trim() || 'bon',
      previous_repairs: str(body.previousRepairs).trim() || 'aucune',
      powers_on: body.powersOn ?? true,
      charges_normally: body.chargesNormally ?? true,
      biometrics_work: body.biometricsWork ?? true,
      account_unlocked: body.accountUnlocked ?? true,
      has_water_damage: body.hasWaterDamage ?? false,
      has_original_box: body.hasOriginalBox ?? false,
      has_invoice: body.hasInvoice ?? false,
      accessories: Array.isArray(body.accessories) ? body.accessories : [],
      photo_urls: photoUrls,
      imei: normalizedImei || null,
      imei_status: str(body.imeiStatus) || 'not_checked',
      imei_blacklist_status: str(body.imeiBlacklistStatus) || 'unknown',
      imei_assurance_level: str(body.imeiAssuranceLevel) || 'basic',
      session_key: sk,
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    };

    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    };

    const existingRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/trade_in_requests?session_key=eq.${encodeURIComponent(sk)}&status=eq.in_progress&select=id&limit=1`,
      { headers },
    );

    let existingId: string | null = null;
    if (existingRes.ok) {
      const rows = await existingRes.json();
      if (Array.isArray(rows) && rows[0]?.id) existingId = rows[0].id;
    }

    if (existingId) {
      const patchRes = await fetchWithTimeout(
        `${supabaseUrl}/rest/v1/trade_in_requests?id=eq.${encodeURIComponent(existingId)}`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body: JSON.stringify(rowPayload),
        },
      );

      if (!patchRes.ok) {
        const err = await patchRes.text();
        console.error('[upsert-troc-intake] patch_error', err);
        return new Response(JSON.stringify({ error: 'Erreur mise à jour dossier' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      const patched = await patchRes.json();
      const row = Array.isArray(patched) ? patched[0] : patched;
      return new Response(
        JSON.stringify({
          id: row.id,
          photoCount: photoUrls.length,
          status: 'in_progress',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const insertRes = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/trade_in_requests`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(rowPayload),
      },
    );

    if (!insertRes.ok) {
      const err = await insertRes.text();
      console.error('[upsert-troc-intake] insert_error', err);
      return new Response(JSON.stringify({ error: 'Erreur création dossier' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const inserted = await insertRes.json();
    const row = Array.isArray(inserted) ? inserted[0] : inserted;

    // Lier la session funnel au dossier partiel
    await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/troc_sessions?session_key=eq.${encodeURIComponent(sk)}`,
      {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          trade_in_id: row.id,
          last_step: 'photos',
          device_brand: rowPayload.device_brand,
          device_model: rowPayload.device_model,
          updated_at: rowPayload.updated_at,
        }),
      },
    );

    return new Response(
      JSON.stringify({
        id: row.id,
        photoCount: photoUrls.length,
        status: 'in_progress',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: unknown) {
    console.error('[upsert-troc-intake] fatal', error);
    return new Response(
      JSON.stringify({ error: (error as Error)?.message ?? 'unknown' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
