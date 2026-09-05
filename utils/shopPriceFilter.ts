import type { Product } from '../types';

export interface PriceBounds {
  min: number;
  max: number;
}

export const formatPriceFcfa = (value: number, compact = false): string => {
  if (compact) {
    if (value >= 1_000_000) {
      const m = value / 1_000_000;
      return `${Number.isInteger(m) ? m : m.toFixed(1)}M F`;
    }
    if (value >= 1_000) return `${Math.round(value / 1_000)}k F`;
  }
  return `${value.toLocaleString('fr-FR')} F`;
};

export const getPriceStep = (min: number, max: number): number => {
  const span = max - min;
  if (span <= 50_000) return 1_000;
  if (span <= 200_000) return 5_000;
  if (span <= 500_000) return 10_000;
  return 25_000;
};

const roundDown = (value: number, step: number): number =>
  Math.floor(value / step) * step;

const roundUp = (value: number, step: number): number =>
  Math.ceil(value / step) * step;

export const getProductPriceBounds = (products: Product[]): PriceBounds | null => {
  if (!products.length) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const p of products) {
    if (!Number.isFinite(p.price) || p.price <= 0) continue;
    min = Math.min(min, p.price);
    max = Math.max(max, p.price);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const step = getPriceStep(min, max);
  return {
    min: roundDown(min, step),
    max: roundUp(max, step),
  };
};

export const productMatchesPrice = (
  product: Product,
  min: number | null,
  max: number | null,
): boolean => {
  if (!Number.isFinite(product.price)) return false;
  if (min !== null && product.price < min) return false;
  if (max !== null && product.price > max) return false;
  return true;
};

export const isPriceFilterActive = (
  min: number | null,
  max: number | null,
): boolean => min !== null && max !== null;

export const parsePriceParam = (raw: string | null): number | null => {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export const clampPriceRange = (
  min: number,
  max: number,
  bounds: PriceBounds,
): { min: number; max: number } => ({
  min: Math.min(Math.max(min, bounds.min), bounds.max),
  max: Math.min(Math.max(max, bounds.min), bounds.max),
});
