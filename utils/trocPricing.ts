import type { BlockerReason, TrocDeviceForm, TrocEvaluationResult, TrocTradeInGrade } from '../types';

export type { BlockerReason };

export const PRICING_RULE_VERSION = 'v2';

/** Paliers Smart Troc — source unique des montants affichés (front). */
export type TrocTier = 'express' | 'premium' | 'safety' | 'certif';

export const TROC_BASE_PRICE_XAF = 100;

export const TROC_TIER_PRICES: Record<TrocTier, number> = {
  express: 100,
  premium: 500,
  safety:  1000,
  certif:  300,
} as const;

export const TROC_TIER_LABELS: Record<TrocTier, string> = {
  express: 'Express',
  premium: 'Premium',
  safety:  'Sûreté',
  certif:  'Certif',
};

/** Choix Express / Premium / Sûreté avant paiement — désactivé (2 tunnels, prix fixe en entrée). */
export const TROC_TIER_SELECTOR_ENABLED = false;

/** Palier imposé au tunnel « Troquer mon appareil ». */
export const TROC_TUNNEL_TIER: TrocTier = 'express';

/** Affichage uniforme des frais (landing, paiement, CTA). */
export const formatTrocFee = (
  amount: number = TROC_TIER_PRICES.express,
  opts?: { short?: boolean },
): string => {
  const n = new Intl.NumberFormat('fr-FR').format(amount).replace(/\u202f/g, ' ').replace(/\s/g, ' ');
  return opts?.short ? `${n} F` : `${n} XAF`;
};

export type DesirabilityTier = 'premium' | 'high' | 'mid' | 'standard' | 'budget';

const DESIRABILITY_COEFFICIENTS: Record<DesirabilityTier, number> = {
  premium:  1.00,  // iPhone 14+, Samsung S23+, Fold/Flip
  high:     0.85,  // iPhone 12-13, Samsung S20-S22, A54+
  mid:      0.75,  // iPhone X-11, Samsung A34-A53, Xiaomi 13
  standard: 0.65,  // Samsung A-series entrée, Tecno Phantom, Infinix Zero
  budget:   0.55,  // Tecno Spark, Infinix Hot, Itel, Nokia entrée
};

// Le magasin rachète à 60 % du prix revente marché → couvre reconditionnement + marge.
// Politique boss : "dès que la marchandise quitte la boutique, l'amortissement a commencé"
// → ratio volontairement serré (était 0,70).
const BASE_VALUE_MULTIPLIER = 0.60;

// Décote cash vs crédit boutique.
// Le crédit boutique est la valeur "marketing principale" (= sortie pure de l'algo).
// Le client peut aussi choisir cash, mais touche -18 % (écart creusé pour pousser le crédit,
// qui revient en CA sur le neuf → faible décaissement réel pour le magasin).
// Marketing : "le crédit boutique inclut un bonus de +18 %" — vrai (credit = cash × 1.18).
export const CASH_DISCOUNT = 0.18;

/** Bonus crédit affiché (UI) — dérivé de CASH_DISCOUNT pour ne jamais dériver. */
export const CREDIT_BONUS_PERCENT = Math.round(CASH_DISCOUNT * 100);

/** Plancher digne : un appareil ACCEPTÉ ne reçoit jamais une offre humiliante
 *  (réputation/bouche-à-oreille > quelques milliers économisés). */
export const DIGNIFIED_FLOOR_XAF = 15000;

/** Convertit la valeur crédit boutique (= sortie algo) en valeur cash immédiate. */
export const creditToCash = (credit: number): number =>
  roundTo5000(credit / (1 + CASH_DISCOUNT));

export const floorTo5000 = (amount: number): number => Math.floor(amount / 5000) * 5000;

export const roundTo5000 = (amount: number): number => {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return floorTo5000(amount);
};

export const scoreToColor = (score: number): 'green' | 'orange' | 'red' => {
  if (score >= 70) return 'green';
  if (score >= 40) return 'orange';
  return 'red';
};

// ─── Scores par critère (0-100) ──────────────────────────────────────────────

const screenScore = (condition: string): number => {
  switch (condition) {
    case 'parfait':       return 100;
    case 'micro_rayures': return 80;
    case 'rayures':       return 50;
    case 'fissuré':       return 0;
    default:              return 60;
  }
};

const bodyScore = (condition: string): number => {
  switch (condition) {
    case 'parfait':       return 100;
    case 'micro_rayures': return 80;
    case 'rayures':       return 55;
    case 'bosses':        return 25;
    default:              return 65;
  }
};

const cameraScore = (condition: string): number => {
  switch (condition) {
    case 'bon':          return 100;
    case 'rayures':      return 70;
    case 'défectueuse':  return 0;
    default:             return 100;
  }
};

const batteryScore = (health: number): number => {
  if (health >= 90) return 100;
  if (health >= 80) return 80;
  if (health >= 70) return 50;
  if (health >= 60) return 25;
  return 0;
};

const repairScore = (repairs: string): number => {
  switch (repairs) {
    case 'aucune':   return 100;
    case 'batterie': return 80;
    case 'écran':    return 60;
    case 'autre':    return 40;
    default:         return 100;
  }
};

const accessoriesScore = (form: TrocDeviceForm): number => {
  const hasBox     = form.hasOriginalBox ?? false;
  const hasInvoice = form.hasInvoice ?? false;
  if (hasBox && hasInvoice) return 100;
  if (hasBox || hasInvoice) return 60;
  return 0;
};

// ─── Score d'état pondéré (0-100) ────────────────────────────────────────────
//
// Poids calibrés pour le marché camerounais :
// L'écran pèse le plus lourd (visible, coût de remplacement élevé).
// La batterie est remplaçable à bas coût — poids modéré.
// La charge et la biométrie sont des blocages fonctionnels.

export const computeConditionScore = (form: TrocDeviceForm): number => {
  const s =
    screenScore(form.screenCondition)                   * 0.30 +
    batteryScore(form.batteryHealth ?? 80)              * 0.20 +
    bodyScore(form.bodyCondition)                       * 0.15 +
    cameraScore(form.cameraCondition ?? 'bon')          * 0.10 +
    ((form.chargesNormally ?? true) ? 100 : 0)          * 0.08 +
    ((form.biometricsWork ?? true)  ? 100 : 50)         * 0.07 +
    repairScore(form.previousRepairs ?? 'aucune')       * 0.05 +
    accessoriesScore(form)                              * 0.05;

  return Math.round(Math.max(0, Math.min(100, s)));
};

// ─── Désirabilité du modèle ───────────────────────────────────────────────────
//
// Mesure la liquidité de revente : à score d'état égal, un modèle désirable
// se revend plus vite → on peut offrir plus au client.

/** "14 T", "14T", "14-T" → même clé compacte pour le matching. */
export const compactModelName = (model: string): string =>
  (model || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

export const resolveDesirabilityTier = (brand: string, model: string): DesirabilityTier => {
  const b = (brand || '').toLowerCase();
  const m = (model || '').toLowerCase();
  const compact = compactModelName(model);

  const isApple   = b.includes('iphone') || b.includes('apple');
  const isSamsung = b.includes('samsung');
  const isXiaomi  = b.includes('xiaomi') || b.includes('redmi') || b.includes('poco');

  if (isApple) {
    // iPhone 14, 15, 16 (et Pro/Max/Plus) → premium
    if (/(?:1[4-9]|[2-9]\d)/.test(compact) || m.includes('pro') || m.includes('max') || m.includes('plus')) return 'premium';
    // iPhone 12, 13
    if (/1[23]/.test(compact)) return 'high';
    // iPhone X, XS, 11
    if (/1[01]/.test(compact) || m.includes('xs') || compact.includes('x')) return 'mid';
    return 'standard';
  }

  if (isSamsung) {
    // S23+, S24+, Fold, Flip → premium
    if (/s2[3-9]|s[3-9]\d/.test(compact) || compact.includes('fold') || compact.includes('flip')) return 'premium';
    // S20, S21, S22, A54, A55, A73
    if (/s2[012]/.test(compact) || compact.includes('a54') || compact.includes('a55') || compact.includes('a73')) return 'high';
    // A34, A35, A52, A53
    if (/a[35][2-9]|a3[45]|a5[23]/.test(compact)) return 'mid';
    // A01-A33, M series
    return 'standard';
  }

  if (isXiaomi) {
    if (/1[4-9]/.test(compact) || m.includes('ultra')) return 'high';
    if (/1[23]/.test(compact) || m.includes('note 13') || m.includes('note 12')) return 'mid';
    return 'standard';
  }

  if (b.includes('oppo')) {
    if (m.includes('find')) return 'high';
    if (m.includes('reno')) return 'mid';
    return 'standard';
  }

  if (b.includes('tecno')) {
    if (m.includes('phantom')) return 'mid';
    if (m.includes('camon')) return 'standard';
    return 'budget';
  }

  if (b.includes('infinix')) {
    if (m.includes('zero')) return 'standard';
    return 'budget';
  }

  if (b.includes('itel') || b.includes('nokia') || b.includes('wiko')) return 'budget';
  if (b.includes('huawei') || b.includes('honor') || b.includes('realme') || b.includes('oneplus')) return 'standard';

  return 'standard';
};

// ─── Critères bloquants ───────────────────────────────────────────────────────

/** Au-delà de cet âge, l'appareil n'est plus repris. */
export const MAX_DEVICE_AGE_YEARS = 8;

/**
 * @param releaseYear   Année de sortie (null = inconnue → pas de blocage d'âge ;
 *                      on ne refuse jamais sur une donnée manquante).
 * @param isCatalogModel true = modèle référencé dans `trade_in_models` (prix curé par le staff).
 *                      Le catalogue PRIME sur l'âge : un modèle référencé est acheté quel que
 *                      soit son âge (le staff décide le plancher en ajoutant/retirant un modèle,
 *                      pas le calendrier). La règle des 8 ans ne gate que le HORS-catalogue.
 */
export const checkBlockers = (
  form: TrocDeviceForm,
  basePrice: number,
  releaseYear?: number | null,
  isCatalogModel = false,
): BlockerReason | null => {
  if (form.powersOn === false)      return 'powers_off';
  if (form.hasWaterDamage === true) return 'water_damage';
  if (
    !isCatalogModel &&
    releaseYear != null &&
    new Date().getFullYear() - releaseYear > MAX_DEVICE_AGE_YEARS
  ) {
    return 'too_old';
  }
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 'no_base_price';
  return null;
};

// ─── Arbre de décision principal ─────────────────────────────────────────────

export interface OfferV2Result extends Pick<TrocEvaluationResult, 'tradeInValue' | 'tradeInGrade'> {
  /** Valeur crédit boutique = sortie pure de l'algo (montant principal affiché). */
  tradeInValueCredit: number;
  /** Valeur cash = crédit / 1.10, arrondie au multiple de 5000 inférieur. */
  tradeInValueCash: number;
  conditionScore: number;
  scoreColor: 'green' | 'orange' | 'red';
  blockerReason: BlockerReason | null;
  desirabilityTier: DesirabilityTier;
  desirabilityCoeff: number;
  baseValue: number;
}

export const computeOfferV2 = (
  form: TrocDeviceForm,
  basePrice: number,
  releaseYear?: number | null,
  isCatalogModel = false,
): OfferV2Result => {
  // Étape 1 — Refus directs (le catalogue prime sur l'âge)
  const blocker = checkBlockers(form, basePrice, releaseYear, isCatalogModel);
  if (blocker) {
    return {
      conditionScore: 0,
      scoreColor: 'red',
      tradeInValue: 0,
      tradeInValueCredit: 0,
      tradeInValueCash: 0,
      tradeInGrade: 'refuse',
      blockerReason: blocker,
      desirabilityTier: 'standard',
      desirabilityCoeff: DESIRABILITY_COEFFICIENTS.standard,
      baseValue: 0,
    };
  }

  // Étape 2 — Valeur de base (prix reprise marché × 70 %)
  const baseValue = basePrice * BASE_VALUE_MULTIPLIER;

  // Étape 3 — Score d'état pondéré (0-100)
  const conditionScore = computeConditionScore(form);
  const scoreColor = scoreToColor(conditionScore);

  // Étape 4 — Coefficient de désirabilité du modèle
  const tier = resolveDesirabilityTier(form.deviceBrand, form.deviceModel);
  const desirabilityCoeff = DESIRABILITY_COEFFICIENTS[tier];

  // Étape 5 — Valeur finale
  // valeur = base × (score/100) × coeff_désirabilité
  const rawValue = baseValue * (conditionScore / 100) * desirabilityCoeff;
  let tradeInValue = roundTo5000(rawValue);

  // Étape 6 — Grade (basé sur l'état, pas la valeur)
  let tradeInGrade: TrocTradeInGrade;
  if (conditionScore >= 70) {
    tradeInGrade = 'excellent';
  } else if (conditionScore >= 40) {
    tradeInGrade = 'bon';
  } else if (conditionScore >= 20) {
    tradeInGrade = 'pieces';
  } else {
    tradeInGrade = 'refuse';
  }

  // Étape 7 — Plancher digne / refus
  if (tradeInGrade === 'refuse' || tradeInValue <= 0) {
    tradeInValue = 0;
    tradeInGrade = 'refuse';
  } else if (tradeInValue < DIGNIFIED_FLOOR_XAF) {
    tradeInValue = DIGNIFIED_FLOOR_XAF;
  }

  // Crédit boutique = valeur principale (= sortie algo).
  // Cash = -10 %, arrondi inférieur multiple de 5000.
  const tradeInValueCredit = tradeInValue;
  const tradeInValueCash   = creditToCash(tradeInValue);

  return {
    conditionScore,
    scoreColor,
    tradeInValue,
    tradeInValueCredit,
    tradeInValueCash,
    tradeInGrade,
    blockerReason: null,
    desirabilityTier: tier,
    desirabilityCoeff,
    baseValue,
  };
};
