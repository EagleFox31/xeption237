// @ts-ignore
const Deno = globalThis.Deno;

import { SCREEN_CONDITIONS, BODY_CONDITIONS, CAMERA_CONDITIONS, REPAIR_OPTIONS } from '../_shared/conditions.ts';

export {};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FETCH_TIMEOUT_MS = 5000;
type OwnershipRank = 'unknown' | 'first' | 'second' | 'third_plus';
type AcquisitionCondition = 'new' | 'used';
type DesirabilityTier = 'premium' | 'high' | 'mid' | 'standard' | 'budget';

const ALLOWED_IMEI_STATUSES = new Set([
  'not_checked',
  'valid',
  'invalid',
  'check_failed',
]);

const sanitizeImei = (value?: string): string => (value || '').replace(/\D/g, '').trim();
const is15Digits = (value: string): boolean => /^\d{15}$/.test(value);

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

const floorTo5000 = (n: number) => Math.floor(n / 5000) * 5000;
const roundTo5000 = (n: number) => (Number.isFinite(n) && n > 0 ? floorTo5000(n) : 0);

const parsePurchaseMonth = (value?: string): { year: number; month: number } | null => {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  if (month < 1 || month > 12) return null;
  return { year, month };
};

const computeDeviceAgeMonths = (purchaseDate?: string, now: Date = new Date()): number | null => {
  const parsed = parsePurchaseMonth(purchaseDate);
  if (!parsed) return null;
  const diff = (now.getFullYear() - parsed.year) * 12 + (now.getMonth() + 1 - parsed.month);
  if (diff < 0) return null;
  return diff;
};

const scoreToColor = (score: number): 'green' | 'orange' | 'red' => {
  if (score >= 70) return 'green';
  if (score >= 40) return 'orange';
  return 'red';
};

// ─── Arbre de décision v2 ─────────────────────────────────────────────────────

const DESIRABILITY_COEFFICIENTS: Record<DesirabilityTier, number> = {
  premium:  1.00,
  high:     0.85,
  mid:      0.75,
  standard: 0.65,
  budget:   0.55,
};

const screenScore = (c: string): number =>
  c === 'parfait' ? 100 : c === 'micro_rayures' ? 80 : c === 'rayures' ? 50 : c === 'fissuré' ? 0 : 60;

const bodyScore = (c: string): number =>
  c === 'parfait' ? 100 : c === 'micro_rayures' ? 80 : c === 'rayures' ? 55 : c === 'bosses' ? 25 : 65;

const cameraScore = (c: string): number =>
  c === 'bon' ? 100 : c === 'rayures' ? 70 : c === 'défectueuse' ? 0 : 100;

const batteryScore = (h: number): number =>
  h >= 90 ? 100 : h >= 80 ? 80 : h >= 70 ? 50 : h >= 60 ? 25 : 0;

const repairScore = (r: string): number =>
  r === 'aucune' ? 100 : r === 'batterie' ? 80 : r === 'écran' ? 60 : r === 'autre' ? 40 : 100;

const accessoriesScore = (hasBox: boolean, hasInvoice: boolean): number =>
  hasBox && hasInvoice ? 100 : hasBox || hasInvoice ? 60 : 0;

const computeConditionScore = (body: any): number => {
  const s =
    screenScore(body.screenCondition ?? '')                         * 0.30 +
    batteryScore(Number(body.batteryHealth ?? 80))                  * 0.20 +
    bodyScore(body.bodyCondition ?? '')                             * 0.15 +
    cameraScore(body.cameraCondition ?? 'bon')                      * 0.10 +
    ((body.chargesNormally ?? true)  ? 100 : 0)                     * 0.08 +
    ((body.biometricsWork ?? true)   ? 100 : 50)                    * 0.07 +
    repairScore(body.previousRepairs ?? 'aucune')                   * 0.05 +
    accessoriesScore(!!body.hasOriginalBox, !!body.hasInvoice)      * 0.05;
  return Math.round(Math.max(0, Math.min(100, s)));
};

const resolveDesirabilityTier = (brand: string, model: string): DesirabilityTier => {
  const b = (brand || '').toLowerCase();
  const m = (model || '').toLowerCase();
  const isApple   = b.includes('iphone') || b.includes('apple');
  const isSamsung = b.includes('samsung');
  const isXiaomi  = b.includes('xiaomi') || b.includes('redmi') || b.includes('poco');

  if (isApple) {
    if (/\b(1[4-9]|[2-9]\d)\b/.test(m) || m.includes('pro') || m.includes('max') || m.includes('plus')) return 'premium';
    if (/\b1[23]\b/.test(m)) return 'high';
    if (/\b1[01]\b/.test(m) || m.includes('xs') || / x\b/.test(m)) return 'mid';
    return 'standard';
  }
  if (isSamsung) {
    if (/s2[3-9]|s[3-9]\d/.test(m) || m.includes('fold') || m.includes('flip')) return 'premium';
    if (/s2[012]/.test(m) || m.includes('a54') || m.includes('a55') || m.includes('a73')) return 'high';
    if (/a[35][2-9]|a3[45]|a5[23]/.test(m)) return 'mid';
    return 'standard';
  }
  if (isXiaomi) {
    if (/\b1[4-9]\b/.test(m) || m.includes('ultra')) return 'high';
    if (/\b1[23]\b/.test(m) || m.includes('note 13') || m.includes('note 12')) return 'mid';
    return 'standard';
  }
  if (b.includes('oppo'))    return m.includes('find') ? 'high' : m.includes('reno') ? 'mid' : 'standard';
  if (b.includes('tecno'))   return m.includes('phantom') ? 'mid' : m.includes('camon') ? 'standard' : 'budget';
  if (b.includes('infinix')) return m.includes('zero') ? 'standard' : 'budget';
  if (b.includes('itel') || b.includes('nokia') || b.includes('wiko')) return 'budget';
  return 'standard';
};

const computeOfferV2 = (body: any, basePrice: number) => {
  // Bloquants directs
  if (body.powersOn === false)       return { conditionScore: 0, tradeInValue: 0, tradeInGrade: 'refuse' as const, blocker: 'powers_off' };
  if (body.hasWaterDamage === true)  return { conditionScore: 0, tradeInValue: 0, tradeInGrade: 'refuse' as const, blocker: 'water_damage' };
  if (!Number.isFinite(basePrice) || basePrice <= 0) return { conditionScore: 0, tradeInValue: 0, tradeInGrade: 'refuse' as const, blocker: 'no_base_price' };

  const conditionScore = computeConditionScore(body);
  const tier = resolveDesirabilityTier(body.deviceBrand ?? '', body.deviceModel ?? '');
  const baseValue = basePrice * 0.70;
  const rawValue = baseValue * (conditionScore / 100) * DESIRABILITY_COEFFICIENTS[tier];
  const tradeInValue = roundTo5000(rawValue);

  const tradeInGrade =
    tradeInValue === 0    ? 'refuse'    :
    conditionScore >= 70  ? 'excellent' :
    conditionScore >= 40  ? 'bon'       :
    conditionScore >= 20  ? 'pieces'    : 'refuse';

  return { conditionScore, tradeInValue, tradeInGrade, desirabilityTier: tier, blocker: null };
};

// ─── Validation ───────────────────────────────────────────────────────────────

const ALLOWED_EVALUATION_MODES  = new Set(['vision_ai', 'local_heuristic', 'local_heuristic_fallback']);
const ALLOWED_PRICING_VERSIONS  = new Set(['v1', 'v2']);
const ALLOWED_SCREEN_CONDITIONS = new Set([...SCREEN_CONDITIONS, '']);
const ALLOWED_BODY_CONDITIONS   = new Set([...BODY_CONDITIONS, '']);
const ALLOWED_CAMERA_CONDITIONS = new Set([...CAMERA_CONDITIONS, '']);
const ALLOWED_REPAIR_OPTIONS    = new Set([...REPAIR_OPTIONS, '']);
const ALLOWED_ACQUISITION       = new Set(['new', 'used']);
const ALLOWED_OWNERSHIP_RANKS   = new Set(['unknown', 'first', 'second', 'third_plus']);

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const validateBody = (body: any): string | null => {
  if (!str(body.customerName).trim())  return 'customerName requis';
  if (str(body.customerName).length > 100) return 'customerName trop long (max 100)';
  if (!str(body.customerPhone).trim()) return 'customerPhone requis';
  if (!/^[62]\d{8}$/.test(body.customerPhone)) return 'customerPhone invalide (format camerounais)';

  if (!str(body.deviceBrand).trim())  return 'deviceBrand requis';
  if (str(body.deviceBrand).length > 60) return 'deviceBrand trop long (max 60)';
  if (!str(body.deviceModel).trim())  return 'deviceModel requis';
  if (str(body.deviceModel).length > 100) return 'deviceModel trop long (max 100)';
  if (!str(body.purchaseDate).trim()) return 'purchaseDate requis (YYYY-MM-DD)';
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(str(body.purchaseDate))) return 'purchaseDate invalide (YYYY-MM-DD)';
  if (!ALLOWED_ACQUISITION.has(str(body.acquisitionCondition)))
    return `acquisitionCondition invalide`;
  if (body.ownershipRank !== undefined && body.ownershipRank !== null && !ALLOWED_OWNERSHIP_RANKS.has(str(body.ownershipRank)))
    return `ownershipRank invalide`;

  const ageMonths = computeDeviceAgeMonths(str(body.purchaseDate), new Date());
  if (ageMonths === null) return 'purchaseDate invalide (pas dans le futur)';

  const bh = Number(body.batteryHealth);
  if (!Number.isFinite(bh) || bh < 0 || bh > 100) return 'batteryHealth invalide (0-100)';

  if (!ALLOWED_SCREEN_CONDITIONS.has(str(body.screenCondition)))
    return `screenCondition invalide — valeurs acceptées : ${[...SCREEN_CONDITIONS].join(', ')}`;
  if (!ALLOWED_BODY_CONDITIONS.has(str(body.bodyCondition)))
    return `bodyCondition invalide — valeurs acceptées : ${[...BODY_CONDITIONS].join(', ')}`;
  if (body.cameraCondition !== undefined && !ALLOWED_CAMERA_CONDITIONS.has(str(body.cameraCondition)))
    return `cameraCondition invalide — valeurs acceptées : ${[...CAMERA_CONDITIONS].join(', ')}`;
  if (body.previousRepairs !== undefined && !ALLOWED_REPAIR_OPTIONS.has(str(body.previousRepairs)))
    return `previousRepairs invalide — valeurs acceptées : ${[...REPAIR_OPTIONS].join(', ')}`;

  if (!Array.isArray(body.photoUrls)) return 'photoUrls doit être un tableau';
  if (body.photoUrls.length > 8) return 'photoUrls : maximum 8 photos';
  if (body.photoUrls.some((u: unknown) => typeof u !== 'string' || u.length > 500))
    return 'photoUrls : chaque URL doit être une chaîne ≤ 500 caractères';

  if (body.accessories !== undefined) {
    if (!Array.isArray(body.accessories)) return 'accessories doit être un tableau';
    if (body.accessories.length > 20) return 'accessories : maximum 20 éléments';
    if (body.accessories.some((a: unknown) => typeof a !== 'string' || a.length > 60))
      return 'accessories : chaque élément doit être une chaîne ≤ 60 caractères';
  }

  if (body.evaluationMode !== undefined && !ALLOWED_EVALUATION_MODES.has(str(body.evaluationMode)))
    return `evaluationMode invalide`;
  if (body.pricingRuleVersion !== undefined && !ALLOWED_PRICING_VERSIONS.has(str(body.pricingRuleVersion)))
    return `pricingRuleVersion invalide — valeurs acceptées : v1, v2`;

  const score = Number(body.aiScore);
  if (body.aiScore !== undefined && (!Number.isFinite(score) || score < 0 || score > 100))
    return 'aiScore invalide (0-100)';

  return null;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const validationError = validateBody(body);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const {
      customerName, customerPhone, customerEmail,
      deviceBrand, deviceModel, deviceStorage, deviceRam,
      acquisitionCondition, purchaseDate, ownershipRank,
      batteryHealth, screenCondition, bodyCondition,
      cameraCondition, previousRepairs,
      powersOn, chargesNormally, biometricsWork, accountUnlocked, hasWaterDamage,
      hasOriginalBox, hasInvoice,
      accessories, photoUrls, imei,
      aiScore: clientScore, aiJustification, evaluationMode, pricingRuleVersion,
    } = body;

    const normalizedImei = sanitizeImei(imei);
    const rawDate = str(purchaseDate);
    const normalizedPurchaseDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? rawDate
      : /^\d{4}-\d{2}$/.test(rawDate)
        ? `${rawDate}-01`
        : null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // ── Prix de base : argus → market-intel ─────────────────────────────────
    let basePrice = 0;
    let tradeInModelId: string | null = null;
    try {
      const argusRes = await fetchWithTimeout(
        `${supabaseUrl}/rest/v1/trade_in_models?brand=ilike.*${encodeURIComponent(deviceBrand.trim())}*&model_name=ilike.*${encodeURIComponent(deviceModel.trim())}*&select=id,base_price&limit=1`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
      );
      if (argusRes.ok) {
        const rows = await argusRes.json();
        if (Array.isArray(rows) && rows[0]) {
          if (rows[0].base_price) basePrice = Number(rows[0].base_price) || 0;
          if (rows[0].id) tradeInModelId = rows[0].id;
        }
      }
    } catch { /* pas de prix argus */ }

    if (basePrice <= 0) {
      try {
        const intelRes = await fetchWithTimeout(`${supabaseUrl}/functions/v1/market-price-intel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            deviceBrand: deviceBrand.trim(), deviceModel: deviceModel.trim(),
            deviceStorage: deviceStorage || null, deviceRam: deviceRam || null,
            countryCode: 'CM', forceRefresh: true,
          }),
        });
        if (intelRes.ok) {
          const intelData = await intelRes.json();
          const ref = Number(intelData?.referencePrice || 0);
          if (Number.isFinite(ref) && ref > 0) basePrice = ref;
        }
      } catch { /* keep 0 */ }
    }

    // ── Vérification IMEI ────────────────────────────────────────────────────
    let imeiStatus = 'not_checked';
    let imeiBlacklistStatus = 'unknown';
    let imeiAssuranceLevel: 'basic' | 'premium' = 'basic';
    const imeiTier = Deno.env.get('IMEI_PREMIUM_API_KEY') ? 'premium' : 'basic';

    if (normalizedImei && is15Digits(normalizedImei)) {
      if (!luhnCheck(normalizedImei)) {
        imeiStatus = 'check_failed';
      } else {
        try {
          const res = await fetchWithTimeout(`${supabaseUrl}/functions/v1/check-imei`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({ imei: normalizedImei, tier: imeiTier }),
          });
          if (res.ok) {
            const data = await res.json();
            const rawStatus = data?.status;
            imeiStatus = ALLOWED_IMEI_STATUSES.has(rawStatus) ? rawStatus : 'check_failed';
            imeiBlacklistStatus = data?.blacklistStatus ?? 'unknown';
            imeiAssuranceLevel = data?.assuranceLevel === 'premium' ? 'premium' : 'basic';
          } else {
            imeiStatus = 'check_failed';
          }
        } catch {
          imeiStatus = 'check_failed';
        }
      }
    }

    if (imeiBlacklistStatus === 'blacklisted') {
      return new Response(JSON.stringify({ error: 'IMEI blacklisted - rachat refusé' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 422,
      });
    }

    // ── Arbre de décision v2 (server-side, non trusté depuis le front) ───────
    const { conditionScore, tradeInValue, tradeInGrade, desirabilityTier, blocker } = computeOfferV2(body, basePrice);
    const conditionScoreColor = scoreToColor(conditionScore);

    // Âge et rang propriétaire (conservés pour audit trail et affichage admin)
    const ageMonths = computeDeviceAgeMonths(purchaseDate as string | undefined, new Date());
    const clientAiScore = Math.round(Number(clientScore) || 0);

    // ── Persistance ──────────────────────────────────────────────────────────
    const insertRes = await fetchWithTimeout(`${supabaseUrl}/rest/v1/trade_in_requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        customer_name:    customerName.trim(),
        customer_phone:   customerPhone.trim(),
        customer_email:   customerEmail?.trim() || null,
        device_brand:     deviceBrand.trim(),
        device_model:     deviceModel.trim(),
        device_storage:   deviceStorage || null,
        device_ram:       deviceRam || null,
        acquisition_condition: acquisitionCondition || 'used',
        purchase_date:    normalizedPurchaseDate,
        ownership_rank:   ownershipRank || 'unknown',
        device_age_months: ageMonths,
        battery_health:   Number(batteryHealth),
        screen_condition: screenCondition || null,
        body_condition:   bodyCondition || null,
        camera_condition: cameraCondition || null,
        previous_repairs: previousRepairs || null,
        powers_on:        powersOn ?? true,
        charges_normally: chargesNormally ?? true,
        biometrics_work:  biometricsWork ?? true,
        account_unlocked: accountUnlocked ?? true,
        has_water_damage: hasWaterDamage ?? false,
        has_original_box: hasOriginalBox ?? false,
        has_invoice:      hasInvoice ?? false,
        accessories:      Array.isArray(accessories) ? accessories : [],
        photo_urls:       Array.isArray(photoUrls) ? photoUrls : [],
        imei:             normalizedImei || null,
        imei_status:      imeiStatus,
        imei_blacklist_status: imeiBlacklistStatus,
        imei_assurance_level: imeiAssuranceLevel,
        ai_score:         conditionScore,
        client_ai_score:  clientAiScore,
        ai_score_color:   conditionScoreColor,
        ai_justification: String(aiJustification || '').slice(0, 2000),
        trade_in_value:   tradeInValue,
        trade_in_grade:   tradeInGrade,
        blocker_reason:   blocker ?? null,
        desirability_tier: desirabilityTier ?? null,
        evaluation_mode:  evaluationMode || 'local_heuristic',
        pricing_rule_version: pricingRuleVersion || 'v2',
        trade_in_model_id: tradeInModelId,
        status: 'pending',
      }),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      console.error('[save-trade-in] insert_error', err);
      return new Response(JSON.stringify({ error: 'Erreur lors de la sauvegarde' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const rows = await insertRes.json();
    const row  = Array.isArray(rows) ? rows[0] : rows;

    return new Response(JSON.stringify({ id: row.id, voucherReference: row.voucher_reference }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[save-trade-in] fatal', error);
    return new Response(JSON.stringify({ error: error?.message ?? 'unknown' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
