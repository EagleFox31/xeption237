/**
 * Échelle « propre » pour un axe de graphe : borne haute arrondie à un multiple
 * lisible (1, 2, 2,5, 5 × 10^n) et graduations régulières. Pur, sans dépendance.
 */

const NICE_STEPS = [1, 2, 2.5, 5, 10] as const;
const DEFAULT_TICK_COUNT = 4;

export interface ChartScale {
  /** Borne haute de l'axe (≥ max des valeurs, > 0). */
  max: number;
  /** Graduations de 0 à max inclus. */
  ticks: number[];
}

/** Arrondit `value` au premier palier « propre » supérieur ou égal. */
export const niceCeil = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const fraction = value / magnitude;
  const step = NICE_STEPS.find((s) => fraction <= s) ?? 10;
  return step * magnitude;
};

export const computeChartScale = (values: readonly number[], tickCount = DEFAULT_TICK_COUNT): ChartScale => {
  const maxValue = values.reduce((m, v) => (Number.isFinite(v) && v > m ? v : m), 0);
  const safeTicks = Math.max(1, Math.floor(tickCount));
  if (maxValue <= 0) {
    return { max: 1, ticks: Array.from({ length: safeTicks + 1 }, (_, i) => i / safeTicks) };
  }
  const step = niceCeil(maxValue / safeTicks);
  const max = step * Math.ceil(maxValue / step);
  const ticks: number[] = [];
  for (let t = 0; t <= max + step / 2; t += step) ticks.push(Number(t.toFixed(10)));
  return { max, ticks };
};
