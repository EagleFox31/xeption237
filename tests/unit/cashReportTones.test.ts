import { describe, expect, it } from 'vitest';
import {
  average,
  bossShareTone,
  burdenTone,
  coverageTone,
  signTone,
  versusAverageTone,
} from '../../utils/cashReportTones';

describe('cashReportTones', () => {
  it('signTone: positive good, negative bad, zero neutral', () => {
    expect(signTone(10)).toBe('good');
    expect(signTone(-1)).toBe('bad');
    expect(signTone(0)).toBe('neutral');
  });

  it('coverageTone: thresholds at 90 % and 70 %, null neutral', () => {
    expect(coverageTone(null)).toBe('neutral');
    expect(coverageTone(0.95)).toBe('good');
    expect(coverageTone(0.9)).toBe('good');
    expect(coverageTone(0.75)).toBe('neutral');
    expect(coverageTone(0.5)).toBe('bad');
  });

  it('bossShareTone: ≤ 15 % good, ≤ 30 % neutral, above bad', () => {
    expect(bossShareTone(null)).toBe('neutral');
    expect(bossShareTone(0.1)).toBe('good');
    expect(bossShareTone(0.25)).toBe('neutral');
    expect(bossShareTone(0.5)).toBe('bad');
  });

  it('versusAverageTone: ±10 % band around the average', () => {
    expect(versusAverageTone(120, 100)).toBe('good');
    expect(versusAverageTone(105, 100)).toBe('neutral');
    expect(versusAverageTone(80, 100)).toBe('bad');
    expect(versusAverageTone(5, 0)).toBe('neutral');
  });

  it('burdenTone and average', () => {
    expect(burdenTone(0)).toBe('good');
    expect(burdenTone(3)).toBe('bad');
    expect(average([])).toBe(0);
    expect(average([2, 4])).toBe(3);
  });
});
