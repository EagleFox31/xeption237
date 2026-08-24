import { supabase } from './supabaseClient';
import { computeOfferV2, PRICING_RULE_VERSION, MAX_DEVICE_AGE_YEARS, type TrocTier } from '../utils/trocPricing';
import { TROC_MESSAGES } from '../utils/trocMessages';
import { isTrocPhotosCredibilityVerified } from '../utils/trocPhotoCredibilitySession';
import { normalizeModelKey } from '../utils/modelKey';
import { getProductDisplayName } from '../utils/productDisplay';
import { computeVoucherExpiry } from '../utils/trocVoucher';
import {
  sanitizeImei,
  isValidImei as isValidImeiStrict,
  isTrivialTestImei,
} from '../utils/imeiValidation';
import type { Product, TrocDeviceForm, TrocEvaluationMode, TrocEvaluationResult, TradeInRequest, TrocPayment, MarketTrend } from '../types';

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

/** Photos d’un autre appareil que celui déclaré (ex. montre vs téléphone). */
export class DeviceMismatchError extends Error {
  readonly detail: string;
  constructor(detail?: string) {
    super('DEVICE_MISMATCH');
    this.name = 'DeviceMismatchError';
    this.detail = detail?.trim() ?? '';
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

const ALLOWED_IMEI_CHECK_STATUSES = new Set(['valid', 'invalid', 'check_failed']);

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

/**
 * Liste des marques uniques connues dans la table Argus.
 * Retourne une liste triée alphabétiquement, dédupliquée (normalisation casse).
 * Utilisée par l'autocomplete marque du formulaire Smart Troc.
 */
export const fetchArgusBrands = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('trade_in_models')
      .select('brand')
      .order('brand', { ascending: true });
    if (error || !data) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const row of data as Array<{ brand: string }>) {
      const trimmed = (row.brand || '').trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(trimmed);
    }
    return result;
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

  if (!isValidImeiStrict(normalizedImei)) {
    if (isTrivialTestImei(normalizedImei)) {
      return { status: 'check_failed', blacklistStatus: 'unknown', assuranceLevel: 'basic', reason: 'trivial_test_imei' };
    }
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
      return { status: 'check_failed', blacklistStatus: 'unknown', assuranceLevel: 'basic', reason };
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

/**
 * Récupère la cote du marché pour un modèle (pipeline cascade Wayback → Bing → fallback âge).
 * Non-bloquant : renvoie null en cas d'erreur pour ne pas faire échouer l'évaluation.
 */
export const getMarketTrend = async (
  brand: string,
  model: string,
): Promise<MarketTrend | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-market-trend', {
      body: { brand, model },
    });
    if (error || !data || typeof data !== 'object') return null;
    if (!('label' in data)) return null;
    return data as MarketTrend;
  } catch {
    return null;
  }
};

/**
 * Année de sortie du modèle depuis la table de référence `phone_releases`.
 * Renvoie null si inconnu → on NE bloque PAS sur l'âge (jamais refuser sur donnée manquante).
 * Table seedée + remplie via scripts/import-phone-releases.mjs (Wikidata).
 */
export const getReleaseYear = async (brand: string, model: string): Promise<number | null> => {
  const modelKey = normalizeModelKey(brand, model);
  if (!modelKey) return null;
  try {
    const { data, error } = await supabase
      .from('phone_releases')
      .select('release_year')
      .eq('model_key', modelKey)
      .maybeSingle();
    if (error || !data) return null;
    const year = Number(data.release_year);
    return Number.isFinite(year) ? year : null;
  } catch {
    return null;
  }
};

/**
 * Pré-check âge AVANT paiement : si l'appareil HORS-catalogue dépasse 8 ans,
 * renvoie un résultat refusé "trop ancien" (sinon null). Évite l'enchaînement
 * « payé → puis refusé » (sentiment d'arnaque) : on prévient dès l'étape IMEI.
 */
export const precheckTooOld = async (
  form: TrocDeviceForm,
  basePrice: number,
): Promise<TrocEvaluationResult | null> => {
  const isCatalogModel = Number.isFinite(basePrice) && basePrice > 0;
  if (isCatalogModel) return null; // catalogue → accepté quel que soit l'âge
  const releaseYear = await getReleaseYear(form.deviceBrand, form.deviceModel);
  if (releaseYear == null || new Date().getFullYear() - releaseYear <= MAX_DEVICE_AGE_YEARS) {
    return null;
  }
  const offer = computeOfferV2(form, 0, releaseYear, false); // → blocker 'too_old'
  return {
    score: 0,
    scoreColor: 'red',
    justification: '',
    tradeInValue: 0,
    tradeInValueCredit: 0,
    tradeInValueCash: 0,
    tradeInGrade: offer.tradeInGrade,
    evaluationMode: 'local_heuristic',
    pricingRuleVersion: PRICING_RULE_VERSION,
    blockerReason: offer.blockerReason ?? 'too_old',
    marketTrend: null,
  };
};

/**
 * Cherche le modèle catalogue (`trade_in_models`) correspondant à brand+model, avec
 * normalisation (espaces/casse/accents) → "Xiaomi 14T" ↔ "Xiaomi 14 T".
 * Permet au QuickForm (auto-détection IMEI, sans sélection manuelle) d'obtenir le
 * prix EXACT + l'id catalogue, comme une sélection Wizard. Renvoie null si hors-catalogue.
 */
export const findCatalogModel = async (
  brand: string,
  model: string,
): Promise<{ id: string; basePrice: number } | null> => {
  const norm = (s: string) =>
    (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
  const targetKey = norm(`${brand} ${model}`);
  if (targetKey.length < 4) return null;
  try {
    const { data, error } = await supabase
      .from('trade_in_models')
      .select('id, brand, model_name, base_price');
    if (error || !Array.isArray(data)) return null;
    const scored = data
      .map((m: any) => ({ m, catKey: norm(`${m.brand} ${m.model_name}`) }))
      .filter((x) => x.catKey.length >= 4);
    const hit =
      scored.find((x) => x.catKey === targetKey) ||
      scored.find((x) => x.catKey.includes(targetKey) || targetKey.includes(x.catKey));
    if (!hit || !hit.m.base_price) return null;
    return { id: hit.m.id as string, basePrice: Number(hit.m.base_price) || 0 };
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
      tradeInValueCredit: 0,
      tradeInValueCash: 0,
      tradeInGrade: 'refuse',
      evaluationMode: 'local_heuristic',
      pricingRuleVersion: PRICING_RULE_VERSION,
    };
  }

  const aiExplicitlyDisabled =
    typeof import.meta !== 'undefined' &&
    (import.meta as any)?.env?.VITE_ENABLE_TROC_AI === 'false';
  const photosCredibilityVerified =
    photoUrls.length > 0 && isTrocPhotosCredibilityVerified(photoUrls);
  const shouldRunVision =
    photoUrls.length > 0 && !aiExplicitlyDisabled && !photosCredibilityVerified;

  // Modèle catalogue = un base_price > 0 a été fourni en entrée (sélection dans trade_in_models).
  // Le catalogue prime sur l'âge → inutile de résoudre l'année de sortie dans ce cas.
  const isCatalogModel = Number.isFinite(basePrice) && basePrice > 0;

  // Étape 1 — Prix de base marché (argus → market-intel → catalogue hardcodé)
  //           + cote du marché en parallèle (non-bloquant)
  //           + année de sortie UNIQUEMENT pour le hors-catalogue (règle des 8 ans)
  const [resolvedBasePrice, marketTrend, releaseYear] = await Promise.all([
    resolveBasePrice(form, basePrice),
    getMarketTrend(form.deviceBrand, form.deviceModel),
    isCatalogModel ? Promise.resolve(null) : getReleaseYear(form.deviceBrand, form.deviceModel),
  ]);

  // Étape 2 — Arbre de décision v2 : score d'état + offre monétaire
  //           (catalogue → accepté quel que soit l'âge ; hors-catalogue > 8 ans → refus)
  const offer = computeOfferV2(form, resolvedBasePrice, releaseYear, isCatalogModel);

  // Étape 3 — Justification textuelle
  //   • Photos déjà validées (pré-paiement) : message crédibilité, pas de 2e appel Gemini
  //   • Sinon vision complète si activée, ou heuristique formulaire

  let justification = photosCredibilityVerified
    ? TROC_MESSAGES.credibilityVerified(form.batteryHealth || 80)
    : shouldRunVision
      ? 'Analyse visuelle en cours de consolidation — confirmation en boutique.'
      : localHeuristicJustification(form, offer.conditionScore, photoUrls.length);
  let evaluationMode: TrocEvaluationMode = photosCredibilityVerified
    ? 'credibility_verified'
    : 'local_heuristic';
  let finalOffer = offer;

  if (shouldRunVision) {
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

      const photoIssues: Array<{ index: number; reason?: string }> = Array.isArray(data.photoIssues)
        ? data.photoIssues
        : [];
      if (data.analysisDecision === 'photos_to_retake' || photoIssues.length > 0) {
        const indices = photoIssues
          .map((p) => Number(p?.index))
          .filter((i) => Number.isFinite(i) && i >= 1);
        throw new PhotoRetakeRequiredError(indices.length > 0 ? indices : photoUrls.map((_, i) => i + 1));
      }

      if (data.analysisDecision === 'mismatch') {
        throw new DeviceMismatchError(
          data.justification ||
            'Les photos ne correspondent pas au téléphone déclaré. Envoyez des photos nettes du bon appareil.',
        );
      }

      if (data.analysisDecision === 'fraud_suspected') {
        throw new Error(
          `FRAUD_DETECTED:${data.justification || "Les photos ne permettent pas de confirmer l'appareil déclaré."}`,
        );
      }

      const geminiScore = Number(data.score ?? 0);
      if (data.fraudDetected || geminiScore === 0) {
        throw new Error(
          `FRAUD_DETECTED:${data.justification || "Veuillez mettre des photos claires d'un vrai téléphone correspondant au modèle déclaré."}`,
        );
      }

      justification = data.justification || justification;
      evaluationMode = 'vision_ai';
    } catch (err) {
      if (err instanceof PhotoRetakeRequiredError) throw err;
      if (err instanceof DeviceMismatchError) throw err;
      if (err instanceof Error && err.message.startsWith('FRAUD_DETECTED:')) throw err;

      justification = TROC_MESSAGES.heuristic_ai_fallback(
        'Estimation basée sur vos déclarations. L’état réel et vos photos seront vérifiés lors du dépôt en boutique.',
      );
      evaluationMode = 'local_heuristic_fallback';
    }
  } else if (photoUrls.length > 0) {
    justification =
      'Estimation basée sur vos déclarations et votre IMEI. L’état réel de l’appareil et vos photos seront vérifiés lors du dépôt en boutique.';
  }

  return {
    score: finalOffer.conditionScore,
    scoreColor: finalOffer.scoreColor,
    justification,
    tradeInValue: finalOffer.tradeInValue,
    tradeInValueCredit: finalOffer.tradeInValueCredit,
    tradeInValueCash:   finalOffer.tradeInValueCash,
    tradeInGrade: finalOffer.tradeInGrade,
    evaluationMode,
    pricingRuleVersion: PRICING_RULE_VERSION,
    blockerReason: finalOffer.blockerReason ?? null,
    marketTrend: marketTrend ?? null,
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

// ─── Dossier partiel (photos uploadées) ───────────────────────────────────────

export const upsertTrocIntake = async (
  sessionKey: string,
  form: TrocDeviceForm,
  photoUrls: string[],
  imeiMeta: {
    imeiStatus: TradeInRequest['imei_status'];
    imeiBlacklistStatus: TradeInRequest['imei_blacklist_status'];
    imeiAssuranceLevel: TradeInRequest['imei_assurance_level'];
  },
): Promise<{ id: string; photoCount: number } | null> => {
  const { data, error } = await supabase.functions.invoke('upsert-troc-intake', {
    body: {
      sessionKey,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail || null,
      deviceBrand: form.deviceBrand,
      deviceModel: form.deviceModel,
      deviceStorage: form.deviceStorage || null,
      deviceRam: form.deviceRam || null,
      acquisitionCondition: form.acquisitionCondition,
      ownershipRank: form.ownershipRank,
      batteryHealth: form.batteryHealth,
      screenCondition: form.screenCondition || null,
      bodyCondition: form.bodyCondition || null,
      cameraCondition: form.cameraCondition,
      previousRepairs: form.previousRepairs,
      powersOn: form.powersOn,
      chargesNormally: form.chargesNormally,
      biometricsWork: form.biometricsWork,
      accountUnlocked: form.accountUnlocked,
      hasWaterDamage: form.hasWaterDamage,
      hasOriginalBox: form.hasOriginalBox,
      hasInvoice: form.hasInvoice,
      accessories: form.accessories ?? [],
      imei: form.imei || null,
      imeiStatus: imeiMeta.imeiStatus,
      imeiBlacklistStatus: imeiMeta.imeiBlacklistStatus,
      imeiAssuranceLevel: imeiMeta.imeiAssuranceLevel,
      photoUrls,
    },
  });

  if (error || !data?.id) {
    console.warn('[troc] upsert-troc-intake failed', error ?? data);
    return null;
  }

  return {
    id: data.id as string,
    photoCount: typeof data.photoCount === 'number' ? data.photoCount : photoUrls.length,
  };
};

// ─────────────────────────────────────────────────────────────────────────────

export const saveTradeInRequest = async (
  form: TrocDeviceForm,
  photoUrls: string[],
  evaluation: TrocEvaluationResult,
  sessionKey?: string,
  /** Appareil cible du troc (Smart Troc). Lié au MÊME dossier — voucher + précommande boutique. */
  targetProduct?: Product | null,
): Promise<{ id: string; voucherReference: string }> => {
  // Le score IA est transmis mais l'offre monétaire est RECALCULÉE server-side.
  // imei_status est aussi revalidé par la edge function (Luhn + check-imei).
  // sessionKey permet à save-trade-in de retrouver le tier payé dans troc_payments.

  // Échéance du bon = barème de validité indexé sur l'année de sortie du modèle repris
  // (pas la possession, legacy). release_year récupéré ici même (idempotent, un seul dossier accepté).
  const releaseYear = await getReleaseYear(form.deviceBrand, form.deviceModel);
  const { expiresAt: voucherExpiresAt } = computeVoucherExpiry(releaseYear);

  const { data, error } = await supabase.functions.invoke('save-trade-in', {
    body: {
      sessionKey:      sessionKey || null,
      customerName:    form.customerName,
      customerPhone:   form.customerPhone,
      customerEmail:   form.customerEmail || null,
      deviceBrand:     form.deviceBrand,
      deviceModel:     form.deviceModel,
      deviceStorage:   form.deviceStorage || null,
      deviceRam:       form.deviceRam || null,
      acquisitionCondition: form.acquisitionCondition,
      purchaseDate:    form.purchaseDateUnknown ? null : form.purchaseDate,
      purchaseDateUnknown: !!form.purchaseDateUnknown,
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
      // Id catalogue → le serveur lit le base_price par id (exact), pas par matching de nom.
      tradeInModelId:  form.tradeInModelId || null,
      // Smart Troc — appareil cible + validité du bon, sur le MÊME dossier (rien d'éparpillé).
      targetProductId:   targetProduct?.id ?? null,
      targetProductName: targetProduct ? getProductDisplayName(targetProduct) : null,
      voucherExpiresAt,
    },
  });

  if (error || !data) throw new Error((error as any)?.message ?? 'save-trade-in failed');

  return { id: data.id, voucherReference: data.voucherReference };
};

// ─── Ré-évaluation d'un bon périmé (tranche 3.2b) ────────────────────────────

/** Reconstruit un TrocDeviceForm depuis un dossier persisté (recalcul d'offre — état déjà déclaré). */
const formFromDossier = (r: TradeInRequest): TrocDeviceForm =>
  ({
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    deviceBrand: r.device_brand,
    deviceModel: r.device_model,
    deviceStorage: r.device_storage,
    deviceRam: r.device_ram,
    acquisitionCondition: r.acquisition_condition,
    batteryHealth: r.battery_health,
    screenCondition: r.screen_condition,
    bodyCondition: r.body_condition,
    cameraCondition: r.camera_condition,
    previousRepairs: r.previous_repairs,
    powersOn: r.powers_on,
    chargesNormally: r.charges_normally,
    biometricsWork: r.biometrics_work,
    accountUnlocked: r.account_unlocked,
    hasWaterDamage: r.has_water_damage,
    hasOriginalBox: r.has_original_box,
    hasInvoice: r.has_invoice,
    accessories: r.accessories ?? [],
    tradeInModelId: r.trade_in_model_id,
  }) as TrocDeviceForm;

export interface ReevaluationResult {
  oldCredit: number;
  newCredit: number;
  tradeInGrade: TradeInRequest['trade_in_grade'];
  expiresAt: string;
}

/**
 * Ré-évalue un bon périmé (cas `stale`, > grâce) aux conditions du JOUR et persiste le nouveau
 * crédit + une nouvelle échéance sur le MÊME dossier. Réutilise la formule d'origine
 * (`computeOfferV2`) avec l'état déjà déclaré + le `base_price` du jour → aucune divergence de pricing.
 */
export const reevaluateAndPersist = async (request: TradeInRequest): Promise<ReevaluationResult> => {
  const form = formFromDossier(request);
  const isCatalogModel = !!request.trade_in_model_id;

  // Catalogue → base_price courant du modèle ; hors-catalogue → market-price-intel (forceRefresh).
  let catalogBasePrice = 0;
  if (isCatalogModel && request.trade_in_model_id) {
    const { data } = await supabase
      .from('trade_in_models')
      .select('base_price')
      .eq('id', request.trade_in_model_id)
      .maybeSingle();
    catalogBasePrice = Number((data as { base_price?: number } | null)?.base_price ?? 0);
  }

  const [basePrice, releaseYear] = await Promise.all([
    resolveBasePrice(form, catalogBasePrice),
    getReleaseYear(request.device_brand, request.device_model),
  ]);

  const offer = computeOfferV2(form, basePrice, releaseYear, isCatalogModel);
  const newCredit = offer.tradeInValueCredit;
  const oldCredit = Number(request.trade_in_value ?? 0);
  const { expiresAt } = computeVoucherExpiry(releaseYear);

  const { error } = await supabase
    .from('trade_in_requests')
    .update({
      trade_in_value: newCredit,
      trade_in_value_cash: offer.tradeInValueCash,
      trade_in_grade: offer.tradeInGrade,
      voucher_expires_at: expiresAt,
      redemption_reason: `Ré-évaluation (bon périmé) : ${oldCredit.toLocaleString('fr-FR')} → ${newCredit.toLocaleString('fr-FR')} FCFA`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id);
  if (error) throw error;

  return { oldCredit, newCredit, tradeInGrade: offer.tradeInGrade, expiresAt };
};

// ─── Paiement Smart Troc ─────────────────────────────────────────────────────

export const createPayment = async (
  sessionKey: string,
  phone: string,
  opts: {
    tier?: TrocTier;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
  } = {},
): Promise<{ reference: string; paymentUrl: string | null; tier: TrocTier; amount: number }> => {
  const { data, error } = await supabase.functions.invoke('create-payment', {
    body: {
      sessionKey,
      phone,
      tier:           opts.tier ?? 'express',
      customerName:   opts.customerName,
      customerPhone:  opts.customerPhone,
      customerEmail:  opts.customerEmail,
    },
  });

  if (error || !data) {
    throw new Error((error as any)?.message ?? 'create-payment failed');
  }

  return {
    reference:  data.reference,
    paymentUrl: data.paymentUrl ?? null,
    tier:       data.tier ?? (opts.tier ?? 'express'),
    amount:     typeof data.amount === 'number' ? data.amount : 0,
  };
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

// ─── Certificats Premium / Sûreté ────────────────────────────────────────────

export interface TrocCertificate {
  reference: string;
  qrToken:   string;
  pdfUrl:    string;
  reused:    boolean;
}

export class TierNotEligibleError extends Error {
  currentTier: string;
  constructor(currentTier: string) {
    super('Certificat non inclus dans votre formule');
    this.name = 'TierNotEligibleError';
    this.currentTier = currentTier;
  }
}

/**
 * Génère (ou réutilise) le certificat PDF d'une demande Smart Troc.
 * Idempotent côté edge : appels multiples = même PDF.
 * Lève TierNotEligibleError si le tier de la demande n'est pas Premium ou Sûreté.
 */
export const generateCertificate = async (
  tradeInId: string,
): Promise<TrocCertificate> => {
  const { data, error } = await supabase.functions.invoke('generate-certificate', {
    body: { tradeInId },
  });

  if (error) {
    const ctx = (error as any)?.context;
    if (ctx?.status === 403) {
      const body = await ctx?.json?.().catch(() => null);
      throw new TierNotEligibleError(body?.currentTier ?? 'express');
    }
    throw new Error((error as any)?.message ?? 'generate-certificate failed');
  }

  if (!data?.pdfUrl) {
    throw new Error('Réponse invalide du générateur de certificat');
  }

  return {
    reference: data.reference,
    qrToken:   data.qrToken,
    pdfUrl:    data.pdfUrl,
    reused:    !!data.reused,
  };
};

export interface CertificateVerifyResult {
  reference:            string;
  device_brand:         string;
  device_model:         string;
  device_storage:       string | null;
  imei_last4:           string | null;
  trade_in_grade:       string | null;
  tier:                 string | null;
  imei_assurance_level: string | null;
  imei_blacklist_status: string | null;
  trade_in_value:       number | null;
  trade_in_value_cash:  number | null;
  ai_score:             number | null;
  created_at:           string;
  verified_count:       number;
}

// ─── Certificats IMEI « Certifié Xeption » ───────────────────────────────────

export interface ImeiCertificate {
  reference: string;
  qrToken:   string;
  pdfUrl:    string;
  reused:    boolean;
}

export interface ImeiCertificateVerifyResult {
  reference:         string;
  device_brand:      string | null;
  device_model:      string | null;
  imei_last4:        string | null;
  imei_status:       string;
  blacklist_status:  string;
  created_at:        string;
  verified_count:    number;
}

export type PublicCertificate =
  | { kind: 'trade_in'; data: CertificateVerifyResult }
  | { kind: 'imei'; data: ImeiCertificateVerifyResult };

export const generateImeiCertificate = async (payload: {
  sessionKey: string;
  paymentReference: string;
  customerName: string;
  imei: string;
  deviceBrand?: string;
  deviceModel?: string;
  imeiStatus: 'valid' | 'invalid' | 'check_failed';
  blacklistStatus: 'unknown' | 'clear' | 'blacklisted';
}): Promise<ImeiCertificate> => {
  const { data, error } = await supabase.functions.invoke('generate-imei-certificate', {
    body: payload,
  });

  if (error) {
    throw new Error((error as any)?.message ?? 'generate-imei-certificate failed');
  }

  if (!data?.pdfUrl) {
    throw new Error('Réponse invalide du générateur de certificat IMEI');
  }

  return {
    reference: data.reference,
    qrToken:   data.qrToken,
    pdfUrl:    data.pdfUrl,
    reused:    !!data.reused,
  };
};

export const getImeiCertificateByToken = async (
  token: string,
): Promise<ImeiCertificateVerifyResult | null> => {
  const { data, error } = await supabase.rpc('get_imei_certificate_by_token', { token });
  if (error) {
    console.warn('[getImeiCertificateByToken] rpc_failed', error.message);
    return null;
  }
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0] as ImeiCertificateVerifyResult;
};

/**
 * Lit un certificat depuis son qr_token (page publique /verify/:token).
 * Incrémente le compteur de scans côté DB.
 * Retourne null si le token n'existe pas.
 */
export const getCertificateByToken = async (
  token: string,
): Promise<CertificateVerifyResult | null> => {
  const { data, error } = await supabase.rpc('get_certificate_by_token', { token });
  if (error) {
    console.warn('[getCertificateByToken] rpc_failed', error.message);
    return null;
  }
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0] as CertificateVerifyResult;
};

/**
 * Page publique /verify/:token — certificat IMEI ou Smart Troc.
 */
export const getPublicCertificateByToken = async (
  token: string,
): Promise<PublicCertificate | null> => {
  const imei = await getImeiCertificateByToken(token);
  if (imei) return { kind: 'imei', data: imei };

  const troc = await getCertificateByToken(token);
  if (troc) return { kind: 'trade_in', data: troc };

  return null;
};
