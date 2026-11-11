/**
 * Classement « bon / moyen / mauvais » des chiffres du bilan caisse, pour les
 * colorer dans l'UI. Pur : les seuils sont nommés, la couleur est décidée ailleurs.
 */

export type FigureTone = 'good' | 'neutral' | 'bad';

/** Couverture des rapports : ≥ 90 % bon, ≥ 70 % moyen, sinon mauvais. */
export const COVERAGE_GOOD_MIN = 0.9;
export const COVERAGE_NEUTRAL_MIN = 0.7;

/** Part des sorties « boss » : ≤ 15 % bon, ≤ 30 % moyen, au-delà mauvais. */
export const BOSS_SHARE_GOOD_MAX = 0.15;
export const BOSS_SHARE_NEUTRAL_MAX = 0.3;

/** Tolérance autour de la moyenne avant de qualifier une valeur (±10 %). */
export const AVERAGE_BAND = 0.1;

export const signTone = (value: number): FigureTone => (value > 0 ? 'good' : value < 0 ? 'bad' : 'neutral');

export const coverageTone = (ratio: number | null): FigureTone => {
  if (ratio === null) return 'neutral';
  if (ratio >= COVERAGE_GOOD_MIN) return 'good';
  if (ratio >= COVERAGE_NEUTRAL_MIN) return 'neutral';
  return 'bad';
};

export const bossShareTone = (share: number | null): FigureTone => {
  if (share === null) return 'neutral';
  if (share <= BOSS_SHARE_GOOD_MAX) return 'good';
  if (share <= BOSS_SHARE_NEUTRAL_MAX) return 'neutral';
  return 'bad';
};

/** Compare une valeur à une référence (moyenne) : au-dessus de la bande = bon, en dessous = mauvais. */
export const versusAverageTone = (value: number, average: number): FigureTone => {
  if (!Number.isFinite(average) || average <= 0) return 'neutral';
  if (value >= average * (1 + AVERAGE_BAND)) return 'good';
  if (value <= average * (1 - AVERAGE_BAND)) return 'bad';
  return 'neutral';
};

/** Montant « à éviter » (dettes, jours à zéro) : 0 = bon, sinon mauvais. */
export const burdenTone = (value: number): FigureTone => (value > 0 ? 'bad' : 'good');

export const average = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length;
