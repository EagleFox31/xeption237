// @ts-ignore
const Deno = globalThis.Deno;

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FETCH_TIMEOUT_MS = 5000;
const TAC_LOOKUP_RETRIES = 1;
const IMEI_INFO_RETRIES = 1;
const PREMIUM_RETRIES = 1;
const IMEI_INFO_API_BASE = 'https://dash.imei.info/api';
const IMEI_INFO_BASIC_SERVICE_ID = 0;
const IMEI_INFO_CACHE_CONFIDENCE = 0.92;
const TAC_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const IMEICHECK_NET_SERVICE_ID_BLACKLIST = 12;
const HISTORY_LOOKUP_LIMIT = 250;
const HISTORY_MIN_EVIDENCE = 2;
const HISTORY_MIN_CONFIDENCE = 0.5;

type Tier = 'basic' | 'premium';
type DeviceInfo = { brand: string; model: string };
type ImeiValidationStatus = 'valid' | 'invalid' | 'check_failed';
type BlacklistStatus = 'unknown' | 'clear' | 'blacklisted';
type AssuranceLevel = 'basic' | 'premium';
type DeviceInfoSource = 'tac_lookup' | 'imei_info' | 'internal_history' | 'seed_kb' | null;

type BasicResult = {
  status: ImeiValidationStatus;
  reason?: string;
  message?: string;
  provider?: string;
  imeiValidity: 'valid' | 'invalid';
  blacklistStatus: BlacklistStatus;
  assuranceLevel: AssuranceLevel;
  deviceInfo: DeviceInfo | null;
  deviceInfoSource?: DeviceInfoSource;
  deviceInfoConfidence?: number | null;
  deviceInfoEvidenceCount?: number;
};

const tacCache = new Map<string, { value: DeviceInfo | null; expiresAt: number }>();
const KNOWN_TAC_SEED_KB: Record<string, DeviceInfo> = {
  // ─── Samsung ───────────────────────────────────────────────────────────────
  '35315826': { brand: 'Samsung', model: 'Galaxy S21 Plus 5G' },
  '35800312': { brand: 'Samsung', model: 'Galaxy S22' },
  '35800411': { brand: 'Samsung', model: 'Galaxy S22 Ultra' },
  '35800511': { brand: 'Samsung', model: 'Galaxy S23' },
  '35800611': { brand: 'Samsung', model: 'Galaxy S23 Ultra' },
  '35315812': { brand: 'Samsung', model: 'Galaxy S21' },
  '35174811': { brand: 'Samsung', model: 'Galaxy A54' },
  '35174812': { brand: 'Samsung', model: 'Galaxy A34' },
  '35174613': { brand: 'Samsung', model: 'Galaxy A14' },
  '35174713': { brand: 'Samsung', model: 'Galaxy A24' },
  '35174914': { brand: 'Samsung', model: 'Galaxy A55' },
  '35174814': { brand: 'Samsung', model: 'Galaxy A35' },
  '35174614': { brand: 'Samsung', model: 'Galaxy A15' },
  '35315814': { brand: 'Samsung', model: 'Galaxy S24' },
  // ─── Apple ─────────────────────────────────────────────────────────────────
  '35307210': { brand: 'Apple', model: 'iPhone 12' },
  '35307310': { brand: 'Apple', model: 'iPhone 12 Pro Max' },
  '35299410': { brand: 'Apple', model: 'iPhone 12 Pro' },
  '35299511': { brand: 'Apple', model: 'iPhone 13' },
  '35299611': { brand: 'Apple', model: 'iPhone 13 Pro Max' },
  '35299711': { brand: 'Apple', model: 'iPhone 13 Pro' },
  '35299812': { brand: 'Apple', model: 'iPhone 14' },
  '35299912': { brand: 'Apple', model: 'iPhone 14 Pro Max' },
  '35300012': { brand: 'Apple', model: 'iPhone 14 Pro' },
  '35300113': { brand: 'Apple', model: 'iPhone 15' },
  '35300213': { brand: 'Apple', model: 'iPhone 15 Pro Max' },
  '35300313': { brand: 'Apple', model: 'iPhone 15 Pro' },
  '35300414': { brand: 'Apple', model: 'iPhone 16' },
  '35300514': { brand: 'Apple', model: 'iPhone 16 Pro Max' },
  // ─── Xiaomi / Redmi ────────────────────────────────────────────────────────
  '86591007': { brand: 'Xiaomi', model: 'Xiaomi 14T' },
  '86591008': { brand: 'Xiaomi', model: 'Xiaomi 14T Pro' },
  '86432906': { brand: 'Xiaomi', model: 'Redmi Note 13' },
  '86432907': { brand: 'Xiaomi', model: 'Redmi Note 13 Pro' },
  '86432908': { brand: 'Xiaomi', model: 'Redmi Note 13 Pro Plus' },
  '86432803': { brand: 'Xiaomi', model: 'Redmi Note 12' },
  '86432804': { brand: 'Xiaomi', model: 'Redmi Note 12 Pro' },
  '86432705': { brand: 'Xiaomi', model: 'Redmi 13C' },
  '86432706': { brand: 'Xiaomi', model: 'Redmi 12C' },
  '86432610': { brand: 'Xiaomi', model: 'Redmi 10C' },
  // ─── Tecno ─────────────────────────────────────────────────────────────────
  '35562784': { brand: 'Tecno', model: 'Tecno Pop 6 LTE' },
  '35601207': { brand: 'Tecno', model: 'Tecno Camon 19 Pro' },
  '35601208': { brand: 'Tecno', model: 'Tecno Camon 20 Pro' },
  '35601209': { brand: 'Tecno', model: 'Tecno Camon 21' },
  '35601210': { brand: 'Tecno', model: 'Tecno Phantom X2' },
  '35601206': { brand: 'Tecno', model: 'Tecno Spark 10' },
  // ─── Infinix ───────────────────────────────────────────────────────────────
  '35498907': { brand: 'Infinix', model: 'Infinix Note 30' },
  '35498908': { brand: 'Infinix', model: 'Infinix Hot 30' },
  '35498909': { brand: 'Infinix', model: 'Infinix Smart 7' },
  // ─── OPPO ──────────────────────────────────────────────────────────────────
  '86889703': { brand: 'OPPO', model: 'OPPO Reno 8' },
  '86889704': { brand: 'OPPO', model: 'OPPO Reno 10' },
  '86889705': { brand: 'OPPO', model: 'OPPO A98' },
};

const BRAND_DISPLAY_MAP: Record<string, string> = {
  SAMSUNG: 'Samsung',
  APPLE: 'Apple',
  XIAOMI: 'Xiaomi',
  REDMI: 'Xiaomi',
  POCO: 'Xiaomi',
  HUAWEI: 'Huawei',
  HONOR: 'Honor',
  TECNO: 'Tecno',
  INFINIX: 'Infinix',
  ITEL: 'Itel',
  OPPO: 'OPPO',
  ONEPLUS: 'OnePlus',
  REALME: 'Realme',
  VIVO: 'Vivo',
  NOKIA: 'Nokia',
  BLACKBERRY: 'BlackBerry',
  BLACKVIEW: 'Blackview',
  GOOGLE: 'Google',
  MOTOROLA: 'Motorola',
  LG: 'LG',
  ZTE: 'ZTE',
  SONY: 'Sony',
};

const normalizeBrand = (raw: string): string => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  const upper = trimmed.toUpperCase();
  if (BRAND_DISPLAY_MAP[upper]) return BRAND_DISPLAY_MAP[upper];
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const sanitizeImei = (value?: string): string => (value || '').replace(/\D/g, '').trim();
const is15Digits = (value: string): boolean => /^\d{15}$/.test(value);

// Same algorithm as front-end: compute check digit from first 14 digits.
const luhnCheck = (imei: string): boolean => {
  if (!is15Digits(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(imei[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return (10 - (sum % 10)) % 10 === parseInt(imei[14], 10);
};

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const withRetry = async <T>(fn: () => Promise<T>, retries: number): Promise<T> => {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
    }
  }
  throw lastError;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const parseTacDeviceInfo = (payload: unknown): DeviceInfo | null => {
  const data = asRecord(payload);
  if (!data) return null;
  const brand = typeof data.brand === 'string' ? data.brand.trim() : '';
  const model = typeof data.model === 'string' ? data.model.trim() : '';
  if (!brand) return null;
  return { brand, model };
};

const parsePremiumDeviceInfo = (payload: unknown): DeviceInfo | null => {
  const data = asRecord(payload);
  if (!data) return null;
  const props = asRecord(data.properties);
  const brand =
    (typeof props?.brand === 'string' && props.brand.trim()) ||
    (typeof props?.manufacturer === 'string' && props.manufacturer.trim()) ||
    '';
  const model =
    (typeof props?.model === 'string' && props.model.trim()) ||
    (typeof props?.deviceModel === 'string' && props.deviceModel.trim()) ||
    '';
  return brand ? { brand, model } : null;
};

const normalize = (value?: string) => (value || '').trim().toLowerCase();
const normalizeModel = (value?: string): string =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Lit le tac_cache persistant en DB (survit aux cold starts).
const dbTacRead = async (
  tac: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<DeviceInfo | null> => {
  try {
    const res = await fetchWithTimeout(
      `${supabaseUrl}/rest/v1/tac_cache?tac=eq.${tac}&select=brand,model&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows[0]?.brand) return null;
    return { brand: rows[0].brand, model: rows[0].model || '' };
  } catch {
    return null;
  }
};

// Écrit dans tac_cache après un lookup réussi (non-bloquant).
const dbTacWrite = (
  tac: string,
  deviceInfo: DeviceInfo,
  source: 'imeidb' | 'imeicheck' | 'imei_info' | 'manual',
  confidence: number,
  supabaseUrl: string,
  serviceKey: string,
): void => {
  fetchWithTimeout(
    `${supabaseUrl}/rest/v1/tac_cache`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({
        tac,
        brand: deviceInfo.brand,
        model: deviceInfo.model,
        source,
        confidence,
        verified_at: new Date().toISOString(),
      }),
    },
  ).catch(() => {
    // Non-bloquant — le lookup principal a déjà réussi.
  });
};

const tacLookup = async (
  imei: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<DeviceInfo | null> => {
  const tac = imei.slice(0, 8);
  const now = Date.now();

  // 1. Cache in-memory (hot path, durée de vie du worker)
  const cached = tacCache.get(tac);
  if (cached && cached.expiresAt > now) return cached.value;

  // 2. Cache DB persistant (survit aux cold starts)
  const dbResult = await dbTacRead(tac, supabaseUrl, serviceKey);
  if (dbResult) {
    tacCache.set(tac, { value: dbResult, expiresAt: now + TAC_CACHE_TTL_MS });
    return dbResult;
  }

  // 3. API externe imeidb.3q.ua
  const response = await withRetry(
    () =>
      fetchWithTimeout(`https://imeidb.3q.ua/imei/${imei}`, {
        headers: { Accept: 'application/json' },
      }),
    TAC_LOOKUP_RETRIES,
  );

  if (!response.ok) {
    throw new Error(`tac_lookup_http_${response.status}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('tac_lookup_invalid_json');
  }

  const deviceInfo = parseTacDeviceInfo(data);
  tacCache.set(tac, { value: deviceInfo, expiresAt: now + TAC_CACHE_TTL_MS });

  // Persiste en DB pour les prochains cold starts
  if (deviceInfo) {
    dbTacWrite(tac, deviceInfo, 'imeidb', 0.95, supabaseUrl, serviceKey);
  }

  return deviceInfo;
};

// Appel officiel à l'API B2B imei.info — service "Basic IMEI Check" ($0.020).
// Plus fiable et stable que le scraping HTML, et fournit brand/model normalisés.
const imeiInfoApiLookup = async (
  imei: string,
  apiKey: string,
): Promise<DeviceInfo | null> => {
  const url =
    `${IMEI_INFO_API_BASE}/check/${IMEI_INFO_BASIC_SERVICE_ID}/` +
    `?API_KEY=${encodeURIComponent(apiKey)}&imei=${imei}`;

  const response = await withRetry(
    () =>
      fetchWithTimeout(url, {
        headers: { Accept: 'application/json' },
      }),
    IMEI_INFO_RETRIES,
  );

  if (response.status === 429) throw new Error('imei_info_rate_limited');
  if (response.status === 402 || response.status === 403) {
    throw new Error('imei_info_quota_exhausted');
  }
  if (!response.ok) throw new Error(`imei_info_http_${response.status}`);

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('imei_info_invalid_json');
  }

  const obj = asRecord(data);
  if (!obj) return null;
  if (typeof obj.status === 'string' && obj.status !== 'Done') return null;

  const result = asRecord(obj.result);
  if (!result) return null;

  const brand = normalizeBrand(typeof result.brand_name === 'string' ? result.brand_name : '');
  const model = typeof result.model === 'string' ? result.model.trim() : '';
  if (!brand) return null;

  return { brand, model };
};

const inferFromInternalHistory = async (
  imei: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<{ deviceInfo: DeviceInfo; confidence: number; evidenceCount: number } | null> => {
  const tac = imei.slice(0, 8);
  const url = new URL(`${supabaseUrl}/rest/v1/trade_in_requests`);
  url.searchParams.set('select', 'device_brand,device_model,imei,status');
  url.searchParams.set('imei', `like.${tac}%`);
  url.searchParams.set('status', 'in.(validated,completed)');
  url.searchParams.set('limit', String(HISTORY_LOOKUP_LIMIT));

  const response = await fetchWithTimeout(url.toString(), {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) throw new Error(`history_lookup_http_${response.status}`);

  const rows = (await response.json()) as Array<{
    device_brand?: string;
    device_model?: string;
  }>;

  if (!Array.isArray(rows) || rows.length === 0) return null;

  const buckets = new Map<string, { brand: string; model: string; count: number }>();
  for (const row of rows) {
    const brand = String(row.device_brand || '').trim();
    const model = String(row.device_model || '').trim();
    if (!brand) continue;
    const key = `${normalize(brand)}|${normalizeModel(model)}`;
    const prev = buckets.get(key);
    if (prev) prev.count += 1;
    else buckets.set(key, { brand, model, count: 1 });
  }

  if (buckets.size === 0) return null;

  let best: { brand: string; model: string; count: number } | null = null;
  let total = 0;
  for (const item of buckets.values()) {
    total += item.count;
    if (!best || item.count > best.count) best = item;
  }

  if (!best || total === 0) return null;

  const confidence = best.count / total;
  if (best.count < HISTORY_MIN_EVIDENCE || confidence < HISTORY_MIN_CONFIDENCE) return null;

  return {
    deviceInfo: { brand: best.brand, model: best.model },
    confidence,
    evidenceCount: best.count,
  };
};



const topHistoryHints = async (
  imei: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<Array<{ brand: string; model: string; count: number }>> => {
  const tac = imei.slice(0, 8);
  const url = new URL(`${supabaseUrl}/rest/v1/trade_in_requests`);
  url.searchParams.set('select', 'device_brand,device_model,imei,status');
  url.searchParams.set('imei', `like.${tac}%`);
  url.searchParams.set('status', 'in.(validated,completed)');
  url.searchParams.set('limit', '100');

  const response = await fetchWithTimeout(url.toString(), {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) return [];

  const rows = (await response.json()) as Array<{ device_brand?: string; device_model?: string }>;
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const buckets = new Map<string, { brand: string; model: string; count: number }>();
  for (const row of rows) {
    const brand = String(row.device_brand || '').trim();
    const model = String(row.device_model || '').trim();
    if (!brand) continue;
    const key = `${normalize(brand)}|${normalizeModel(model)}`;
    const prev = buckets.get(key);
    if (prev) prev.count += 1;
    else buckets.set(key, { brand, model, count: 1 });
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};

const checkBasic = async (
  imei: string,
  supabaseUrl: string,
  serviceKey: string,
  imeiInfoKey: string | null,
): Promise<BasicResult> => {
  if (!luhnCheck(imei)) {
    return {
      status: 'check_failed',
      reason: 'invalid_imei_checksum',
      message: 'IMEI invalide - checksum incorrect',
      provider: 'luhn',
      imeiValidity: 'invalid',
      blacklistStatus: 'unknown',
      assuranceLevel: 'basic',
      deviceInfo: null,
      deviceInfoSource: null,
      deviceInfoConfidence: null,
      deviceInfoEvidenceCount: 0,
    };
  }

  // 1. Cache DB (survit aux cold starts, très rapide) et appel API TAC
  try {
    const deviceInfo = await tacLookup(imei, supabaseUrl, serviceKey);
    if (deviceInfo) {
      return {
        status: 'valid',
        message: 'IMEI valide. Le statut anti-vol nécessite une vérification avancée.',
        provider: 'tac-lookup',
        imeiValidity: 'valid',
        blacklistStatus: 'unknown',
        assuranceLevel: 'basic',
        deviceInfo,
        deviceInfoSource: 'tac_lookup',
        deviceInfoConfidence: 0.95,
        deviceInfoEvidenceCount: 1,
      };
    }
  } catch (error: any) {
    console.warn('[check-imei] tac_lookup_failed', error?.message ?? error);
  }

  // 2. Seed KB (si non trouvé en base/api locale)
  const tac = imei.slice(0, 8);
  const seeded = KNOWN_TAC_SEED_KB[tac];
  if (seeded) {
    return {
      status: 'valid',
      message: 'IMEI valide. Le statut anti-vol nécessite une vérification avancée.',
      provider: 'seed-kb',
      imeiValidity: 'valid',
      blacklistStatus: 'unknown',
      assuranceLevel: 'basic',
      deviceInfo: seeded,
      deviceInfoSource: 'seed_kb',
      deviceInfoConfidence: 0.9,
      deviceInfoEvidenceCount: 1,
    };
  }

  // 3. imei.info Official API ($0.020 / call) — paid, fiable, ~200ms.
  //    Placé avant les LLM car les modèles hallucinent et contaminent le cache.
  if (imeiInfoKey) {
    try {
      const deviceInfo = await imeiInfoApiLookup(imei, imeiInfoKey);
      if (deviceInfo) {
        dbTacWrite(tac, deviceInfo, 'imei_info', IMEI_INFO_CACHE_CONFIDENCE, supabaseUrl, serviceKey);
        return {
          status: 'valid',
          message: 'IMEI valide. Le statut anti-vol nécessite une vérification avancée.',
          provider: 'imei.info',
          imeiValidity: 'valid',
          blacklistStatus: 'unknown',
          assuranceLevel: 'basic',
          deviceInfo,
          deviceInfoSource: 'imei_info',
          deviceInfoConfidence: IMEI_INFO_CACHE_CONFIDENCE,
          deviceInfoEvidenceCount: 1,
        };
      }
    } catch (error: any) {
      console.warn('[check-imei] imei_info_api_failed', error?.message ?? error);
    }
  }

  // 4. Historique interne
  try {
    const history = await inferFromInternalHistory(imei, supabaseUrl, serviceKey);
    if (history) {
      return {
        status: 'valid',
        message: 'IMEI valide. Le statut anti-vol nécessite une vérification avancée.',
        provider: 'internal-history',
        imeiValidity: 'valid',
        blacklistStatus: 'unknown',
        assuranceLevel: 'basic',
        deviceInfo: history.deviceInfo,
        deviceInfoSource: 'internal_history',
        deviceInfoConfidence: history.confidence,
        deviceInfoEvidenceCount: history.evidenceCount,
      };
    }
  } catch (error: any) {
    console.warn('[check-imei] history_lookup_failed', error?.message ?? error);
  }

  // Model unknown is evidence gap, not fraud by default.
  return {
    status: 'valid',
    message: 'IMEI valide. Le statut anti-vol nécessite une vérification avancée.',
    provider: 'luhn',
    reason: 'device_info_unavailable',
    imeiValidity: 'valid',
    blacklistStatus: 'unknown',
    assuranceLevel: 'basic',
    deviceInfo: null,
    deviceInfoSource: null,
    deviceInfoConfidence: null,
    deviceInfoEvidenceCount: 0,
  };
};

const checkWithImeiCheckNet = async (imei: string, apiKey: string) => {
  const response = await withRetry(
    () =>
      fetchWithTimeout('https://api.imeicheck.net/v1/checks', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: imei,
          serviceId: IMEICHECK_NET_SERVICE_ID_BLACKLIST,
        }),
      }),
    PREMIUM_RETRIES,
  );

  if (!response.ok) throw new Error(`imeicheck_net_http_${response.status}`);

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('imeicheck_net_invalid_json');
  }

  const obj = asRecord(data);
  const props = asRecord(obj?.properties);
  const statusValue = typeof obj?.status === 'string' ? obj.status.toUpperCase() : '';
  const blacklistedProp = props?.blacklisted;
  const blacklistStatusProp =
    typeof props?.blacklistStatus === 'string' ? props.blacklistStatus.toUpperCase() : '';

  const isBlacklisted =
    blacklistedProp === true ||
    blacklistStatusProp === 'BLACKLISTED' ||
    statusValue === 'BLACKLISTED';

  return {
    status: (isBlacklisted ? 'invalid' : 'valid') as ImeiValidationStatus,
    provider: 'imeicheck.net',
    imeiValidity: 'valid' as const,
    blacklistStatus: (isBlacklisted ? 'blacklisted' : 'clear') as 'blacklisted' | 'clear',
    assuranceLevel: 'premium' as const,
    deviceInfo: parsePremiumDeviceInfo(data),
    deviceInfoSource: 'tac_lookup' as const,
    deviceInfoConfidence: 0.98,
    deviceInfoEvidenceCount: 1,
    raw: data,
  };
};

// Loggue un appel premium imeicheck.net pour audit coût (non-bloquant).
const logPremiumCall = (
  args: {
    sessionKey: string | null;
    tac: string;
    succeeded: boolean;
    httpStatus: number | null;
    blacklisted: boolean | null;
  },
  supabaseUrl: string,
  serviceKey: string,
): void => {
  fetchWithTimeout(
    `${supabaseUrl}/rest/v1/imei_premium_calls`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        session_key: args.sessionKey,
        imei_tac:    args.tac,
        tier:        'safety',
        provider:    'imeicheck.net',
        http_status: args.httpStatus,
        succeeded:   args.succeeded,
        blacklisted: args.blacklisted,
      }),
    },
  ).catch(() => { /* audit non-bloquant */ });
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const normalizedImei = sanitizeImei(payload?.imei);
    // Tier demandé : 'basic' (par défaut) ou 'premium' (palier safety).
    // Le palier 'premium' déclenche l'appel imeicheck.net pour vrai check blacklist.
    const requestedTier: Tier = payload?.tier === 'premium' ? 'premium' : 'basic';
    const sessionKey = typeof payload?.sessionKey === 'string' ? payload.sessionKey : null;

    if (!is15Digits(normalizedImei)) {
      return new Response(
        JSON.stringify({ status: 'check_failed', reason: 'invalid_imei_format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    if (!luhnCheck(normalizedImei)) {
      return new Response(
        JSON.stringify({
          status: 'check_failed',
          reason: 'invalid_imei_checksum',
          provider: 'luhn',
          imeiValidity: 'invalid',
          blacklistStatus: 'unknown',
          deviceInfo: null,
          deviceInfoSource: null,
          deviceInfoConfidence: null,
          deviceInfoEvidenceCount: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    const keyImeiInfo  = Deno.env.get('IMEI_INFO_API_KEY') ?? null;
    const keyPremium   = Deno.env.get('IMEI_PREMIUM_API_KEY') ?? null;
    const supabaseUrl  = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // ─── Cascade basic (toujours) ────────────────────────────────────────────
    let basic: BasicResult;
    try {
      basic = await checkBasic(normalizedImei, supabaseUrl, serviceKey, keyImeiInfo);
    } catch (err: any) {
      console.error('[check-imei] basic_cascade_failed', err?.message ?? err);
      return new Response(
        JSON.stringify({ status: 'check_failed', reason: 'no_provider_available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    // ─── Premium gating : tier=premium + clé configurée ──────────────────────
    // Si l'utilisateur a payé le palier Sûreté, on vérifie la blacklist mondiale
    // via imeicheck.net même si la cascade basic a réussi.
    const shouldRunPremium =
      requestedTier === 'premium' &&
      !!keyPremium &&
      basic.imeiValidity === 'valid';

    if (shouldRunPremium) {
      const tac = normalizedImei.slice(0, 8);
      try {
        const premium = await checkWithImeiCheckNet(normalizedImei, keyPremium);

        // Cache TAC si le premium a retourné un deviceInfo
        if (premium.deviceInfo && premium.deviceInfo.brand) {
          dbTacWrite(tac, premium.deviceInfo, 'imeicheck', 0.98, supabaseUrl, serviceKey);
        }

        logPremiumCall(
          {
            sessionKey,
            tac,
            succeeded: true,
            httpStatus: 200,
            blacklisted: premium.blacklistStatus === 'blacklisted',
          },
          supabaseUrl, serviceKey,
        );

        // Fusion : on garde le deviceInfo le plus riche, on prend la blacklist du premium
        const merged: BasicResult = {
          ...basic,
          status:          premium.status,
          provider:        premium.provider,
          blacklistStatus: premium.blacklistStatus,
          assuranceLevel:  'premium',
          deviceInfo:      premium.deviceInfo || basic.deviceInfo,
          deviceInfoSource:  premium.deviceInfo ? premium.deviceInfoSource : basic.deviceInfoSource,
          deviceInfoConfidence: premium.deviceInfo ? premium.deviceInfoConfidence : basic.deviceInfoConfidence,
          deviceInfoEvidenceCount: premium.deviceInfo ? premium.deviceInfoEvidenceCount : basic.deviceInfoEvidenceCount,
          message: premium.blacklistStatus === 'blacklisted'
            ? 'IMEI blacklisté — rachat refusé.'
            : 'IMEI valide — vérification blacklist mondiale OK.',
        };

        return new Response(JSON.stringify(merged), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      } catch (err: any) {
        console.warn('[check-imei] premium_failed_fallback_basic', err?.message ?? err);
        const httpMatch = /imeicheck_net_http_(\d+)/.exec(err?.message ?? '');
        logPremiumCall(
          {
            sessionKey,
            tac,
            succeeded: false,
            httpStatus: httpMatch ? Number(httpMatch[1]) : null,
            blacklisted: null,
          },
          supabaseUrl, serviceKey,
        );
        // Fallback gracieux : on retourne le basic en signalant que le premium a échoué.
        return new Response(
          JSON.stringify({ ...basic, premiumAttempted: true, premiumFailed: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }
    }

    // ─── Cas standard (tier basic ou pas de clé premium) ─────────────────────
    return new Response(JSON.stringify(basic), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[check-imei] fatal', error);
    return new Response(
      JSON.stringify({ status: 'check_failed', reason: error?.message ?? 'unknown' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  }
});
