import type { Product } from '../types';
import {
  getProductPrimaryRamBucket,
  getProductPrimaryStorageBucket,
} from './shopFacets';

export type HighlightSpecKey =
  | 'screen'
  | 'storage'
  | 'ram'
  | 'processor'
  | 'gpu'
  | 'battery'
  | 'generic';

export interface ProductHighlightSpec {
  key: HighlightSpecKey;
  label: string;
  value: string;
}

const STORAGE_LABEL: Record<number, string> = {
  32: '32 Go',
  64: '64 Go',
  128: '128 Go',
  256: '256 Go',
  512: '512 Go',
  1024: '1 To',
};

const RAM_LABEL: Record<number, string> = {
  2: '2 Go RAM',
  3: '3 Go RAM',
  4: '4 Go RAM',
  6: '6 Go RAM',
  8: '8 Go RAM',
  12: '12 Go RAM',
  16: '16 Go RAM',
};

const SPEC_SCREEN = /écran|ecran|screen|display|diagonal|pouce|taille/i;
const SPEC_PROCESSOR = /processeur|processor|cpu|chip|soc/i;
const SPEC_GPU = /graphique|gpu|carte graphique|rtx|gtx|radeon/i;
const SPEC_BATTERY = /batterie|battery|autonomie/i;

const SKIP_GENERIC_SPEC = /prix|price|garantie|warranty|couleur|color|marque|brand/i;

const formatStorage = (gb: number): string =>
  STORAGE_LABEL[gb] || `${gb} Go`;

const formatRam = (gb: number): string =>
  RAM_LABEL[gb] || `${gb} Go RAM`;

const normalizeInches = (raw: string): string | null => {
  const cleaned = raw.replace(',', '.').trim();
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n <= 0 || n > 100) return null;
  const formatted = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  return `${formatted}"`;
};

const extractScreenFromText = (text: string): string | null => {
  if (!text) return null;

  const patterns = [
    /(\d+[,.]?\d*)\s*(?:pouces|inch|in)\b/i,
    /(\d+[,.]\d+)\s*"/,
    /(\d+)\s*"/,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const val = normalizeInches(m[1]);
      if (val) return val;
    }
  }
  return null;
};

const extractScreenInches = (product: Product): string | null => {
  for (const spec of product.specs || []) {
    if (SPEC_SCREEN.test(spec.label)) {
      const fromValue = extractScreenFromText(spec.value) ?? normalizeInches(spec.value);
      if (fromValue) return fromValue;
      if (spec.value.trim()) return spec.value.trim();
    }
  }
  return (
    extractScreenFromText(product.name)
    ?? extractScreenFromText(product.description || '')
  );
};

const findSpecValue = (product: Product, pattern: RegExp): string | null => {
  for (const spec of product.specs || []) {
    if (pattern.test(spec.label) && spec.value.trim()) {
      return spec.value.trim();
    }
  }
  return null;
};

const truncate = (value: string, max = 28): string =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

/** Clés de mini-cartes par catégorie (ordre d’affichage). */
export const getHighlightSpecKeysForCategory = (category: string): HighlightSpecKey[] => {
  const cat = category.toLowerCase();
  if (cat === 'phones' || cat === 'smartphones') {
    return ['screen', 'storage', 'ram', 'battery'];
  }
  if (cat === 'tablettes' || cat === 'tablets') {
    return ['screen', 'storage', 'ram'];
  }
  if (cat === 'ordinateurs' || cat === 'laptops' || cat === 'computer') {
    return ['screen', 'processor', 'storage', 'ram', 'gpu'];
  }
  if (cat === 'gaming' || cat === 'consoles') {
    return ['storage', 'ram', 'gpu', 'screen'];
  }
  if (cat === 'accessories') {
    return ['generic'];
  }
  return ['screen', 'storage', 'ram'];
};

const extractGenericHighlights = (product: Product, limit = 3): ProductHighlightSpec[] => {
  const specs = (product.specs || [])
    .filter((s) => s.label.trim() && s.value.trim() && !SKIP_GENERIC_SPEC.test(s.label))
    .slice(0, limit);

  return specs.map((spec) => ({
    key: 'generic' as const,
    label: spec.label.trim(),
    value: truncate(spec.value.trim(), 32),
  }));
};

const resolveHighlight = (
  product: Product,
  key: HighlightSpecKey,
): ProductHighlightSpec | null => {
  if (key === 'generic') return null;

  if (key === 'screen') {
    const value = extractScreenInches(product);
    return value ? { key, label: 'Écran', value } : null;
  }

  if (key === 'storage') {
    const bucket = getProductPrimaryStorageBucket(product);
    if (bucket !== null) {
      return { key, label: 'Stockage', value: formatStorage(bucket) };
    }
    const fromSpec = findSpecValue(product, /stockage|storage|capacit|rom|ssd|hdd/i);
    return fromSpec ? { key, label: 'Stockage', value: truncate(fromSpec) } : null;
  }

  if (key === 'ram') {
    const bucket = getProductPrimaryRamBucket(product);
    if (bucket !== null) {
      return { key, label: 'RAM', value: formatRam(bucket) };
    }
    const fromSpec = findSpecValue(product, /ram|mémoire|memoire|memory/i);
    return fromSpec ? { key, label: 'RAM', value: truncate(fromSpec) } : null;
  }

  if (key === 'processor') {
    const value = findSpecValue(product, SPEC_PROCESSOR);
    return value ? { key, label: 'Processeur', value: truncate(value) } : null;
  }

  if (key === 'gpu') {
    const value = findSpecValue(product, SPEC_GPU);
    return value ? { key, label: 'Graphique', value: truncate(value) } : null;
  }

  if (key === 'battery') {
    const value = findSpecValue(product, SPEC_BATTERY);
    return value ? { key, label: 'Batterie', value: truncate(value) } : null;
  }

  return null;
};

/** Mini-cartes specs pour la fiche produit (avant le prix). */
export const getProductHighlightSpecs = (product: Product): ProductHighlightSpec[] => {
  const keys = getHighlightSpecKeysForCategory(product.category);

  if (keys.includes('generic')) {
    return extractGenericHighlights(product);
  }

  const seen = new Set<string>();
  const highlights: ProductHighlightSpec[] = [];

  for (const key of keys) {
    const spec = resolveHighlight(product, key);
    if (!spec) continue;
    const dedupeKey = `${spec.label}:${spec.value}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    highlights.push(spec);
    if (highlights.length >= 4) break;
  }

  return highlights;
};
