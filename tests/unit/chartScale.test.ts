import { describe, expect, it } from 'vitest';
import { computeChartScale, niceCeil } from '../../utils/chartScale';

describe('niceCeil', () => {
  it('rounds up to 1 / 2 / 2.5 / 5 / 10 × 10^n', () => {
    expect(niceCeil(1)).toBe(1);
    expect(niceCeil(1.2)).toBe(2);
    expect(niceCeil(2.3)).toBe(2.5);
    expect(niceCeil(3)).toBe(5);
    expect(niceCeil(7)).toBe(10);
    expect(niceCeil(1_234_567)).toBe(2_000_000);
    expect(niceCeil(460_000)).toBe(500_000);
  });

  it('falls back to 1 for zero, negative or non-finite input', () => {
    expect(niceCeil(0)).toBe(1);
    expect(niceCeil(-5)).toBe(1);
    expect(niceCeil(Number.NaN)).toBe(1);
  });
});

describe('computeChartScale', () => {
  it('returns a unit scale when there is no positive value', () => {
    expect(computeChartScale([])).toEqual({ max: 1, ticks: [0, 0.25, 0.5, 0.75, 1] });
    expect(computeChartScale([0, 0]).max).toBe(1);
  });

  it('produces a max ≥ every value and evenly spaced ticks', () => {
    const scale = computeChartScale([1_817_000, 41_710_500, 2_939_000], 4);
    expect(scale.max).toBeGreaterThanOrEqual(41_710_500);
    expect(scale.ticks[0]).toBe(0);
    expect(scale.ticks[scale.ticks.length - 1]).toBe(scale.max);
    const gaps = new Set(scale.ticks.slice(1).map((t, i) => t - scale.ticks[i]));
    expect(gaps.size).toBe(1);
  });

  it('ignores NaN values', () => {
    expect(computeChartScale([Number.NaN, 30]).max).toBe(30);
  });
});
