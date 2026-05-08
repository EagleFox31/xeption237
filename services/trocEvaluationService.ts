import { supabase } from './supabaseClient';
import { computeOfferV2, PRICING_RULE_VERSION } from '../utils/trocPricing';
import { TROC_MESSAGES } from '../utils/trocMessages';
import type { TrocDeviceForm, TrocEvaluationMode, TrocEvaluationResult, TradeInRequest, TrocPayment } from '../types';

const TROC_SESSION_TRACKING_PREFIX = 'troc_session_initialized:';

export type ImeiDeviceInfo = { brand: string; model: string };
export type ImeiHistoryInference = { brand: string; model: string; count: number; confidence: number };

/**
 * Levée par evaluateDevice quand Gemini Vision identifie au moins une photo non
 * conforme (capture d'écran, objet non-téléphone, image marketing, photo
 * illisible). Le hook intercepte cette erreur et renvoie le client à l'étape
 * photos avec les index marqués pour remplacement individuel.
 *
 * Distinct de FRAUD_DETECTED : un client qui sélectionne par erreur une photo
 * de sa galerie n'est pas un fraudeur, juste quelqu'un qui s'est trompé.
 */
export class PhotoRetakeRequiredError extends Error {
  readonly issueIndices: number[];
  constructor(indices: number[]) {
    super('PHOTOS_TO_RETAKE');
    this.name = 'PhotoRetakeRequiredError';
    this.issueIndices = indices;
  }
}

export type TradeInModel = {
  id: string;
  brand: string;
  model_name: string;
  category: string;
  base_price: number;
};

const normalize = (value?: string) => (value || '').trim().toLowerCase();
const sanitizeImei = (value?: string): string => (value || '').replace(/\D/g, '').trim();

const ALLOWED_IMEI_CHECK_STATUSES = new Set(['valid', 'invalid', 'check_failed']);

const isValidImei = (imei: string): boolean => {
  if (!/^\d{15}$/.test(imei)) return false;
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

// La heuristique locale génère uniquement la justification textuelle.
// Le score d'état est maintenant produit par computeOfferV2 (arbre de décision).
const localHeuristicJustification = (
  form: TrocDeviceForm,
  conditionScore: number,
  photosCount: number,
): string => {
  return TROC_MESSAGES.heuristic(
    form.batteryHealth || 80,
    form.screenCondition,
    form.bodyCondition,
    photosCount,
    form.accessories?.length || 0,
  );
};

type CheckImeiResponse = {
  status: 'valid' | 'invalid' | 'check_failed';
  blacklistStatus: 'unknown' | 'clear' | 'blacklisted';
  assuranceLevel: 'basic' | 'premium';
  provider?: string;
  fallback?: boolean;
  reason?: string;
  deviceInfo?: ImeiDeviceInfo | null;
};

type MarketPriceIntelResponse = {
  referencePrice?: number;
  lowPrices?: number[];
  highPrices?: number[];
  offersCount?: number;
  sourceCount?: number;
  confidence?: number;
  strategy?: string;
};

// Prix catalogue de référence en XAF pour les modèles courants au Cameroun.
// Utilisé en dernier recours si market-price-intel ne trouve rien.
// À enrichir au fil des passages en boutique.
const CATALOG_FALLBACK: Array<{ brands: string[]; models: string[]; price: number }> = [
  { brands: ['samsung'], models: ['s24 ultra'],          price: 950_000 },
  { brands: ['samsung'], models: ['s24+', 's24 plus'],   price: 750_000 },
  { brands: ['samsung'], models: ['s24'],                price: 600_000 },
  { brands: ['samsung'], models: ['s23 ultra'],          price: 750_000 },
  { brands: ['samsung'], models: ['s23+', 's23 plus'],   price: 600_000 },
  { brands: ['samsung'], models: ['s23'],                price: 500_000 },
  { brands: ['samsung'], models: ['s22 ultra'],          price: 600_000 },
  { brands: ['samsung'], models: ['s22+', 's22 plus'],   price: 450_000 },
  { brands: ['samsung'], models: ['s22'],                price: 380_000 },
  { brands: ['samsung'], models: ['s21+', 's21 plus'],   price: 300_000 },
  { brands: ['samsung'], models: ['s21'],                price: 250_000 },
  { brands: ['samsung'], models: ['a55'],                price: 350_000 },
  { brands: ['samsung'], models: ['a54'],                price: 280_000 },
  { brands: ['samsung'], models: ['a35'],                price: 220_000 },
  { brands: ['samsung'], models: ['a34'],                price: 200_000 },
  { brands: ['iphone', 'apple'], models: ['16 pro max'], price: 1_200_000 },
  { brands: ['iphone', 'apple'], models: ['16 pro'],     price: 1_000_000 },
  { brands: ['iphone', 'apple'], models: ['16 plus'],    price: 850_000 },
  { brands: ['iphone', 'apple'], models: ['16'],         price: 750_000 },
  { brands: ['iphone', 'apple'], models: ['15 pro max'], price: 1_000_000 },
  { brands: ['iphone', 'apple'], models: ['15 pro'],     price: 850_000 },
  { brands: ['iphone', 'apple'], models: ['15 plus'],    price: 700_000 },
  { brands: ['iphone', 'apple'], models: ['15'],         price: 600_000 },
  { brands: ['iphone', 'apple'], models: ['14 pro max'], price: 800_000 },
  { brands: ['iphone', 'apple'], models: ['14 pro'],     price: 650_000 },
  { brands: ['iphone', 'apple'], models: ['14'],         price: 500_000 },
  { brands: ['iphone', 'apple'], models: ['13 pro max'], price: 650_000 },
  { brands: ['iphone', 'apple'], models: ['13 pro'],     price: 500_000 },
  { brands: ['iphone', 'apple'], models: ['13'],         price: 380_000 },
  { brands: ['xiaomi'],          models: ['14t pro'],    price: 650_000 },
  { brands: ['xiaomi'],          models: ['14t'],        price: 500_000 },
  { brands: ['xiaomi'],          models: ['14 ultra'],   price: 800_000 },
  { brands: ['xiaomi'],          models: ['14'],         price: 550_000 },
  { brands: ['xiaomi'],          models: ['13t pro'],    price: 500_000 },
  { brands: ['xiaomi'],          models: ['13t'],        price: 400_000 },
  { brands: ['xiaomi'],          models: ['13'],         price: 380_000 },
  { brands: ['xiaomi', 'redmi'], models: ['note 13 pro'],price: 250_000 },
  { brands: ['xiaomi', 'redmi'], models: ['note 13'],    price: 180_000 },
  { brands: ['xiaomi', 'redmi'], models: ['note 12 pro'],price: 200_000 },
  { brands: ['xiaomi', 'redmi'], models: ['note 12'],    price: 160_000 },
  { brands: ['oppo'],            models: ['find x7'],    price: 700_000 },
  { brands: ['oppo'],            models: ['reno 12'],    price: 300_000 },
  { brands: ['oppo'],            models: ['reno 11'],    price: 250_000 },
  { brands: ['tecno'],           models: ['phantom x2'], price: 350_000 },
  { brands: ['tecno'],           models: ['camon 30'],   price: 180_000 },
  { brands: ['infinix'],         models: ['zero 40'],    price: 250_000 },
  { brands: ['infinix'],         models: ['note 40'],    price: 180_000 },
];

const fallbackCatalogPrice = (form: TrocDeviceForm): number => {
  const brand = (form.deviceBrand || '').toLowerCase();
  const model = (form.deviceModel || '').toLowerCase();
  for (const entry of CATALOG_FALLBACK) {
    const brandMatch = entry.brands.some(b => brand.includes(b));
    if (!brandMatch) continue;
    const modelMatch = entry.models.some(m => model.includes(m));
    if (modelMatch) return entry.price;
  }
  return 0;
};

export const fetchArgusModels = async (brand?: string): Promise<TradeInModel[]> => {
  try {
    let query = supabase.from('trade_in_models').select('*').order('model_name', { ascending: true });
    if (brand) {
      query = query.ilike('brand', `%${brand}%`);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data as TradeInModel[];
  } catch {
    return [];
  }
};

const resolveBasePrice = async (
  form: TrocDeviceForm,
  currentBasePrice: number
): Promise<number> => {
  if (Number.isFinite(currentBasePrice) && currentBasePrice > 0) return currentBasePrice;

  try {
    const { data, error } = await supabase.functions.invoke('market-price-intel', {
      body: {
        deviceBrand: form.deviceBrand,
        deviceModel: form.deviceModel,
        deviceStorage: form.deviceStorage || null,
        deviceRam: form.deviceRam || null,
        countryCode: 'CM',
        forceRefresh: true,
      },
    });
    if (error || !data) return fallbackCatalogPrice(form);
    const intel = data as MarketPriceIntelResponse;
    const ref = Number(intel.referencePrice || 0);
    return Number.isFinite(ref) && ref > 0 ? ref : fallbackCatalogPrice(form);
  } catch {
    return 0;
  }
};

export const checkImei = async (
  imei: string,
): Promise<CheckImeiResponse> => {
  const normalizedImei = sanitizeImei(imei);

  if (!isValidImei(normalizedImei)) {
    throw new Error(TROC_MESSAGES.imei_invalid_luhn);
  }

  try {
    const { data, error } = await supabase.functions.invoke('check-imei', {
      body: { imei: normalizedImei },
    });

    if (error || !data) {
      const httpStatus = (error as any)?.context?.status;
      let reason: string;
      if (httpStatus === 429)                          reason = 'rate_limited';
      else if (httpStatus === 503 || httpStatus === 502) reason = 'provider_unavailable';
      else if (httpStatus >= 500)                      reason = 'check_failed';
      else                                             reason = (error as any)?.message || 'invoke_error';
      return { status: 'check_failed', reason };
    }

    if (!ALLOWED_IMEI_CHECK_STATUSES.has(data.status)) {
      return { status: 'check_failed', blacklistStatus: 'unknown', assuranceLevel: 'basic', reason: 'invalid_response' };
    }

    return {
      status: data.status as CheckImeiResponse['status'],
      blacklistStatus: data.blacklistStatus ?? 'unknown',
      assuranceLevel: data.assuranceLevel ?? 'basic',
      provider: data.provider,
      fallback: data.fallback,
      reason: data.reason,
      deviceInfo: data.deviceInfo ?? null,
    };
  } catch (error: any) {
    const isTimeout = error?.message?.toLowerCase().includes('timeout') ||
                      error?.name === 'AbortError';
    const httpStatus = error?.context?.status;
    let reason: string;
    if (isTimeout)                                     reason = 'timeout';
    else if (httpStatus === 429)                       reason = 'rate_limited';
    else if (httpStatus === 503 || httpStatus === 502) reason = 'provider_unavailable';
    else if (httpStatus >= 500)                        reason = 'check_failed';
    else                                               reason = error?.message || 'unknown';
    return { status: 'check_failed', blacklistStatus: 'unknown', assuranceLevel: 'basic', reason };
  }
};

// Seuil de confiance minimum pour qu'une inférence historique soit retournée.
// En dessous, les données sont trop fragmentées pour être fiables.
const HISTORY_MIN_CONFIDENCE = 0.45;

// Normalisation renforcée : supprime les espaces multiples, tirets, parenthèses,
// et variantes marketing communes ("plus", "pro", "lite", "edition"...) pour
// regrouper les variantes proches dans le même bucket.
// Normalisation pour regrouper les variantes de saisie dans les buckets historiques.
// Réduit à alphanum lowercase avec espaces simples — ne supprime PAS les tokens
// marketing (pro, plus, max...) pour éviter de fusionner des modèles distincts.
const normalizeModel = (value?: string): string =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const lookupImeiFromHistory = async (imei: string): Promise<ImeiHistoryInference | null> => {
  const tac = sanitizeImei(imei).slice(0, 8);
  if (!/^\d{8}$/.test(tac)) return null;

  try {
    const { data, error } = await supabase
      .from('trade_in_requests')
      .select('device_brand, device_model, status, imei')
      .like('imei', `${tac}%`)
      .in('status', ['validated', 'completed'])
      .limit(500);

    if (error || !data || data.length === 0) return null;

    const buckets = new Map<string, { brand: string; model: string; count: number }>();
    for (const row of data as any[]) {
      const brand = String(row.device_brand || '').trim();
      const model = String(row.device_model || '').trim();
      // Exclure les entrées sans marque ET sans modèle
      if (!brand && !model) continue;
      // Exclure les entrées avec marque manquante (donnée trop incomplète)
      if (!brand) continue;
      const key = `${normalize(brand)}|${normalizeModel(model)}`;
      const prev = buckets.get(key);
      if (prev) {
        prev.count += 1;
      } else {
        buckets.set(key, { brand, model, count: 1 });
      }
    }

    if (buckets.size === 0) return null;

    const totalRows = Array.from(buckets.values()).reduce((acc, b) => acc + b.count, 0);

    let best: { brand: string; model: string; count: number } | null = null;
    for (const item of buckets.values()) {
      if (!best || item.count > best.count) best = item;
    }

    if (!best || best.count === 0) return null;

    const confidence = best.count / totalRows;

    // En dessous du seuil, l'historique est trop fragmenté — on ne retourne rien
    // plutôt qu'une suggestion peu fiable qui pourrait induire en erreur.
    if (confidence < HISTORY_MIN_CONFIDENCE) return null;

    return { brand: best.brand, model: best.model, count: best.count, confidence };
  } catch {
    return null;
  }
};

export const evaluateDevice = async (
  form: TrocDeviceForm,
  photoUrls: string[],
  imeiBlacklistStatus: TradeInRequest['imei_blacklist_status'],
  basePrice: number
): Promise<TrocEvaluationResult> => {
  if (imeiBlacklistStatus === 'blacklisted') {
    return {
      score: 0,
      scoreColor: 'red',
      justification: TROC_MESSAGES.imei_blacklisted,
      tradeInValue: 0,
      tradeInGrade: 'refuse',
      evaluationMode: 'local_heuristic',
      pricingRuleVersion: PRICING_RULE_VERSION,
    };
  }

  const aiEnabled =
    typeof import.meta !== 'undefined' &&
    (import.meta as any)?.env?.VITE_ENABLE_TROC_AI === 'true';

  // Étape 1 — Prix de base marché (argus → market-intel → catalogue hardcodé)
  const resolvedBasePrice = await resolveBasePrice(form, basePrice);

  // Étape 2 — Arbre de décision v2 : score d'état + offre monétaire
  const offer = computeOfferV2(form, resolvedBasePrice);

  // Étape 3 — Justification textuelle
  //   • Si Gemini est activé : il fournit le texte basé sur les photos
  //     (détection fraude incluse — si fraude, on surclasse l'offre en refus)
  //   • Sinon : texte généré depuis les champs du formulaire

  let justification = localHeuristicJustification(form, offer.conditionScore, photoUrls.length);
  let evaluationMode: TrocEvaluationMode = 'local_heuristic';
  let finalOffer = offer;

  if (aiEnabled && photoUrls.length > 0) {
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-device', {
        body: {
          photoUrls,
          deviceInfo: {
            brand:           form.deviceBrand,
            model:           form.deviceModel,
            storage:         form.deviceStorage,
            ram:             form.deviceRam,
            batteryHealth:   form.batteryHealth,
            screenCondition: form.screenCondition,
            bodyCondition:   form.bodyCondition,
            accessories:     form.accessories,
          },
        },
      });
      if (error || !data) throw new Error(error?.message ?? 'evaluate-device failed');

      // Photos non conformes (au moins une) — on demande gentiment au client de remplacer.
      // Pas de fraude : c'est une erreur de manipulation dans 99% des cas.
      const photoIssues: Array<{ index: number; reason?: string }> = Array.isArray(data.photoIssues)
        ? data.photoIssues
        : [];
      if (data.analysisDecision === 'photos_to_retake' || photoIssues.length > 0) {
        const indices = photoIssues
          .map((p) => Number(p?.index))
          .filter((i) => Number.isFinite(i) && i >= 1);
        throw new PhotoRetakeRequiredError(indices);
      }

      // Fraude explicite détectée par Gemini (cas extrême : preuves de montage).
      const geminiScore = Number(data.score ?? 0);
      if (data.fraudDetected || geminiScore === 0) {
        throw new Error(`FRAUD_DETECTED:${data.justification || "Veuillez mettre des photos claires d'un vrai téléphone correspondant au modèle déclaré."}`);
      }

      // Gemini fournit le texte visuel — on garde notre score décision
      justification = data.justification || justification;
      evaluationMode = 'vision_ai';
    } catch {
      justification = TROC_MESSAGES.heuristic_ai_fallback(justification);
      evaluationMode = 'local_heuristic_fallback';
    }
  }

  return {
    score: finalOffer.conditionScore,
    scoreColor: finalOffer.scoreColor,
    justification,
    tradeInValue: finalOffer.tradeInValue,
    tradeInGrade: finalOffer.tradeInGrade,
    evaluationMode,
    pricingRuleVersion: PRICING_RULE_VERSION,
    blockerReason: finalOffer.blockerReason ?? null,
  };
};

// ─── Funnel tracking ─────────────────────────────────────────────────────────

export const upsertSession = async (
  sessionKey: string,
  step: 'form' | 'photos' | 'imei' | 'payment' | 'result' | 'voucher',
  opts: { deviceBrand?: string; deviceModel?: string; tradeInId?: string } = {},
): Promise<void> => {
  const payload = {
    session_key: sessionKey,
    last_step: step,
    device_brand: opts.deviceBrand ?? null,
    device_model: opts.deviceModel ?? null,
    trade_in_id: opts.tradeInId ?? null,
    updated_at: new Date().toISOString(),
  };
  const trackingKey = `${TROC_SESSION_TRACKING_PREFIX}${sessionKey}`;
  const sessionAlreadyCreated = sessionStorage.getItem(trackingKey) === '1';

  const runUpdate = async () => {
    const { error: updateError } = await supabase
      .from('troc_sessions')
      .update({
        last_step: step,
        device_brand: opts.deviceBrand ?? null,
        device_model: opts.deviceModel ?? null,
        trade_in_id: opts.tradeInId ?? null,
        updated_at: payload.updated_at,
      })
      .eq('session_key', sessionKey);

    if (!updateError) return null;

    console.warn('[troc] session tracking skipped', {
      code: updateError.code,
      message: updateError.message,
      sessionKey,
      step,
      phase: 'update',
    });
    return updateError;
  };

  if (sessionAlreadyCreated) {
    await runUpdate();
    return;
  }

  const { error: insertError } = await supabase
    .from('troc_sessions')
    .insert(payload);

  if (!insertError) {
    sessionStorage.setItem(trackingKey, '1');
    return;
  }

  // PostgREST + RLS peut refuser le chemin ON CONFLICT/UPSERT sur une ligne existante.
  // On bascule donc sur un insert initial puis un update explicite en cas de doublon.
  if (insertError.code === '23505') {
    sessionStorage.setItem(trackingKey, '1');
    await runUpdate();
    return;
  }

  // Non-bloquant intentionnellement — un échec de tracking ne doit pas bloquer le flow.
  console.warn('[troc] session tracking skipped', {
    code: insertError.code,
    message: insertError.message,
    sessionKey,
    step,
    phase: 'insert',
  });
};

// ─────────────────────────────────────────────────────────────────────────────

export const saveTradeInRequest = async (
  form: TrocDeviceForm,
  photoUrls: string[],
  evaluation: TrocEvaluationResult,
): Promise<{ id: string; voucherReference: string }> => {
  // Le score IA est transmis mais l'offre monétaire est RECALCULÉE server-side.
  // imei_status est aussi revalidé par la edge function (Luhn + check-imei).
  const { data, error } = await supabase.functions.invoke('save-trade-in', {
    body: {
      customerName:    form.customerName,
      customerPhone:   form.customerPhone,
      customerEmail:   form.customerEmail || null,
      deviceBrand:     form.deviceBrand,
      deviceModel:     form.deviceModel,
      deviceStorage:   form.deviceStorage || null,
      deviceRam:       form.deviceRam || null,
      acquisitionCondition: form.acquisitionCondition,
      purchaseDate:    form.purchaseDate,
      ownershipRank:   form.ownershipRank,
      batteryHealth:   form.batteryHealth,
      screenCondition: form.screenCondition,
      bodyCondition:   form.bodyCondition,
      cameraCondition: form.cameraCondition,
      previousRepairs: form.previousRepairs,
      powersOn:        form.powersOn,
      chargesNormally: form.chargesNormally,
      biometricsWork:  form.biometricsWork,
      accountUnlocked: form.accountUnlocked,
      hasWaterDamage:  form.hasWaterDamage,
      hasOriginalBox:  form.hasOriginalBox,
      hasInvoice:      form.hasInvoice,
      accessories:     form.accessories ?? [],
      photoUrls,
      imei:            sanitizeImei(form.imei || '') || null,
      aiScore:         evaluation.score,
      aiJustification: evaluation.justification,
      evaluationMode:  evaluation.evaluationMode,
      pricingRuleVersion: evaluation.pricingRuleVersion,
    },
  });

  if (error || !data) throw new Error((error as any)?.message ?? 'save-trade-in failed');

  return { id: data.id, voucherReference: data.voucherReference };
};

// ─── Paiement Smart Troc ─────────────────────────────────────────────────────

export const createPayment = async (
  sessionKey: string,
  phone: string,
  customerName?: string,
  customerEmail?: string,
): Promise<{ reference: string; paymentUrl: string | null }> => {
  const { data, error } = await supabase.functions.invoke('create-payment', {
    body: { sessionKey, phone, customerName, customerEmail },
  });

  if (error || !data) {
    throw new Error((error as any)?.message ?? 'create-payment failed');
  }

  return { reference: data.reference, paymentUrl: data.paymentUrl ?? null };
};

export const getPaymentStatus = async (
  sessionKey: string,
  reference: string,
): Promise<Pick<TrocPayment, 'status'> | null> => {
  const { data, error } = await supabase.functions.invoke('get-payment-status', {
    body: { sessionKey, reference },
  });

  if (error || !data) return null;
  return { status: data.status };
};
