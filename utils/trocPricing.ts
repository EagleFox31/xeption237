import type { BlockerReason, TrocDeviceForm, TrocEvaluationResult, TrocTradeInGrade } from '../types';

export type { BlockerReason };

export const PRICING_RULE_VERSION = 'v2';

export type DesirabilityTier = 'premium' | 'high' | 'mid' | 'standard' | 'budget';

const DESIRABILITY_COEFFICIENTS: Record<DesirabilityTier, number> = {
  premium:  1.00,  // iPhone 14+, Samsung S23+, Fold/Flip
  high:     0.85,  // iPhone 12-13, Samsung S20-S22, A54+
  mid:      0.75,  // iPhone X-11, Samsung A34-A53, Xiaomi 13
  standard: 0.65,  // Samsung A-series entrée, Tecno Phantom, Infinix Zero
  budget:   0.55,  // Tecno Spark, Infinix Hot, Itel, Nokia entrée
};

// Le magasin rachète à 70 % du prix revente marché → couvre reconditionnnement + marge.
const BASE_VALUE_MULTIPLIER = 0.70;

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

export const resolveDesirabilityTier = (brand: string, model: string): DesirabilityTier => {
  const b = (brand || '').toLowerCase();
  const m = (model || '').toLowerCase();

  const isApple   = b.includes('iphone') || b.includes('apple');
  const isSamsung = b.includes('samsung');
  const isXiaomi  = b.includes('xiaomi') || b.includes('redmi') || b.includes('poco');

  if (isApple) {
    // iPhone 14, 15, 16 (et Pro/Max/Plus) → premium
    if (/\b(1[4-9]|[2-9]\d)\b/.test(m) || m.includes('pro') || m.includes('max') || m.includes('plus')) return 'premium';
    // iPhone 12, 13
    if (/\b1[23]\b/.test(m)) return 'high';
    // iPhone X, XS, 11
    if (/\b1[01]\b/.test(m) || m.includes('xs') || / x\b/.test(m)) return 'mid';
    return 'standard';
  }

  if (isSamsung) {
    // S23+, S24+, Fold, Flip → premium
    if (/s2[3-9]|s[3-9]\d/.test(m) || m.includes('fold') || m.includes('flip')) return 'premium';
    // S20, S21, S22, A54, A55, A73
    if (/s2[012]/.test(m) || m.includes('a54') || m.includes('a55') || m.includes('a73')) return 'high';
    // A34, A35, A52, A53
    if (/a[35][2-9]|a3[45]|a5[23]/.test(m)) return 'mid';
    // A01-A33, M series
    return 'standard';
  }

  if (isXiaomi) {
    if (/\b1[4-9]\b/.test(m) || m.includes('ultra')) return 'high';
    if (/\b1[23]\b/.test(m) || m.includes('note 13') || m.includes('note 12')) return 'mid';
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

export const checkBlockers = (form: TrocDeviceForm, basePrice: number): BlockerReason | null => {
  if (form.powersOn === false)      return 'powers_off';
  if (form.hasWaterDamage === true) return 'water_damage';
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 'no_base_price';
  return null;
};

// ─── Arbre de décision principal ─────────────────────────────────────────────

export interface OfferV2Result extends Pick<TrocEvaluationResult, 'tradeInValue' | 'tradeInGrade'> {
  conditionScore: number;
  scoreColor: 'green' | 'orange' | 'red';
  blockerReason: BlockerReason | null;
  desirabilityTier: DesirabilityTier;
  desirabilityCoeff: number;
  baseValue: number;
}

export const computeOfferV2 = (form: TrocDeviceForm, basePrice: number): OfferV2Result => {
  // Étape 1 — Refus directs
  const blocker = checkBlockers(form, basePrice);
  if (blocker) {
    return {
      conditionScore: 0,
      scoreColor: 'red',
      tradeInValue: 0,
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
  const tradeInValue = roundTo5000(rawValue);

  // Étape 6 — Grade
  let tradeInGrade: TrocTradeInGrade;
  if (tradeInValue === 0) {
    tradeInGrade = 'refuse';
  } else if (conditionScore >= 70) {
    tradeInGrade = 'excellent';
  } else if (conditionScore >= 40) {
    tradeInGrade = 'bon';
  } else if (conditionScore >= 20) {
    tradeInGrade = 'pieces';
  } else {
    tradeInGrade = 'refuse';
  }

  return {
    conditionScore,
    scoreColor,
    tradeInValue,
    tradeInGrade,
    blockerReason: null,
    desirabilityTier: tier,
    desirabilityCoeff,
    baseValue,
  };
};
