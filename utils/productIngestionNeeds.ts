import type { Product } from '../types';
import { isWeakProductDescription } from './productDescription';

export function hasValidSpecs(specs: Product['specs']): boolean {
  return (
    Array.isArray(specs) &&
    specs.length > 0 &&
    specs.some((s) => (s.label || '').trim() && (s.value || '').trim())
  );
}

const COMMERCIAL_KEYS = ['stockage', 'origine', 'source', 'sim', 'conditionnement', 'condition', 'ram'];

export function isMinimalCommercialSpecs(specs: Product['specs']): boolean {
  if (!hasValidSpecs(specs)) return true;
  const labels = (specs || []).map((s) => (s.label || '').toLowerCase());
  const rich = ['écran', 'processeur', 'appareil photo', 'batterie', 'réseau', 'os', 'puissance', 'taille'];
  if (labels.some((l) => rich.some((r) => l.includes(r)))) return false;
  return labels.every((l) =>
    COMMERCIAL_KEYS.some((k) => l.includes(k)) || l === 'notes',
  );
}

export function productNeedsAiEnrichment(
  product: Pick<Product, 'name' | 'description' | 'specs' | 'pros' | 'cons'>,
): boolean {
  if (isWeakProductDescription(product.description, product.name)) return true;
  if (!hasValidSpecs(product.specs) || isMinimalCommercialSpecs(product.specs)) return true;
  const hasProsCons =
    Array.isArray(product.pros) &&
    product.pros.length > 0 &&
    Array.isArray(product.cons) &&
    product.cons.length > 0;
  if (!hasProsCons) return true;
  return false;
}
