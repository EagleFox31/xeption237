import type { Product } from '../types';

export type FacetKey = 'storage' | 'ram' | 'condition';

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface FacetGroup {
  key: FacetKey;
  label: string;
  options: FacetOption[];
}

const STORAGE_BUCKETS = [32, 64, 128, 256, 512, 1024] as const;
const RAM_BUCKETS = [2, 3, 4, 6, 8, 12, 16] as const;

const STORAGE_LABEL: Record<number, string> = {
  32: '32 Go',
  64: '64 Go',
  128: '128 Go',
  256: '256 Go',
  512: '512 Go',
  1024: '1 To',
};

const RAM_LABEL: Record<number, string> = {
  2: '2 Go',
  3: '3 Go',
  4: '4 Go',
  6: '6 Go',
  8: '8 Go',
  12: '12 Go',
  16: '16 Go',
};

const SPEC_STORAGE = /stockage|storage|capacit/i;
const SPEC_RAM = /ram|mémoire|memoire|memory/i;

/** Facettes affichées par catégorie (ordre = priorité décision acheteur) */
export const getFacetKeysForCategory = (category: string): FacetKey[] => {
  const cat = category.toLowerCase();
  if (cat === 'phones' || cat === 'smartphones') return ['storage', 'ram', 'condition'];
  if (cat === 'tablettes' || cat === 'tablets') return ['storage', 'ram', 'condition'];
  if (cat === 'ordinateurs' || cat === 'laptops' || cat === 'computer') return ['storage', 'ram', 'condition'];
  if (cat === 'accessories') return ['condition'];
  return [];
};

const extractGbNumbers = (text: string, unit: 'storage' | 'ram'): number[] => {
  if (!text) return [];
  const found = new Set<number>();
  const re = unit === 'storage'
    ? /(\d+)\s*(to|tb|go|gb)/gi
    : /(\d+)\s*(go|gb)\s*(?:ram|de ram)?/gi;

  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    let n = Number.parseInt(m[1], 10);
    if (!Number.isFinite(n) || n <= 0) continue;
    const u = m[2].toLowerCase();
    if (unit === 'storage') {
      const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 12).toLowerCase();
      if (/^\s*ram/.test(tail)) continue;
      if ((u === 'go' || u === 'gb') && n <= 16) continue;
    }
    if (unit === 'storage' && (u === 'to' || u === 'tb')) n *= 1024;
    if (unit === 'ram' && n > 32) continue;
    if (unit === 'storage' && n > 2048) continue;
    found.add(n);
  }
  return [...found];
};

/** RAM explicite dans le titre (évite de confondre avec le stockage). */
const extractRamFromName = (text: string): number[] => {
  if (!text) return [];
  const found = new Set<number>();
  const patterns = [
    /(\d+)\s*(go|gb)\s*(?:de\s+)?ram\b/gi,
    /(\d+)\s*gb\s*ram\b/gi,
    /\bram\s*[:=]?\s*(\d+)\s*(go|gb)\b/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const n = Number.parseInt(m[1], 10);
      if (Number.isFinite(n) && n > 0 && n <= 32) found.add(n);
    }
  }
  return [...found];
};

const extractRamFromSpecValue = (value: string): number[] => {
  if (!value) return [];
  const fromExplicit = extractGbNumbers(value, 'ram').filter((n) => n <= 32);
  if (fromExplicit.length) return fromExplicit;
  const nums = [...value.matchAll(/(\d+)\s*(go|gb)\b/gi)]
    .map((m) => Number.parseInt(m[1], 10))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 32);
  if (nums.length) return [Math.min(...nums)];
  return [];
};

const bucketize = (values: number[], buckets: readonly number[]): number[] => {
  const out = new Set<number>();
  for (const v of values) {
    const bucket = buckets.find((b) => b === v) ?? buckets.find((b) => Math.abs(b - v) <= 1);
    if (bucket) out.add(bucket);
  }
  return [...out];
};

export const getProductStorageBuckets = (product: Product): number[] => {
  const raw: number[] = [];
  for (const spec of product.specs || []) {
    if (SPEC_STORAGE.test(spec.label)) raw.push(...extractGbNumbers(spec.value, 'storage'));
  }
  raw.push(...extractGbNumbers(product.name, 'storage'));
  return bucketize(raw, STORAGE_BUCKETS);
};

/** Une seule capacité stockage par produit (compteurs facettés + filtre cohérents). */
export const getProductPrimaryStorageBucket = (product: Product): number | null => {
  const fromSpecs: number[] = [];
  for (const spec of product.specs || []) {
    if (SPEC_STORAGE.test(spec.label)) {
      fromSpecs.push(...extractGbNumbers(spec.value, 'storage'));
    }
  }
  const specBuckets = bucketize(fromSpecs, STORAGE_BUCKETS);
  if (specBuckets.length) return Math.max(...specBuckets);

  const nameBuckets = bucketize(extractGbNumbers(product.name, 'storage'), STORAGE_BUCKETS);
  if (nameBuckets.length) return Math.max(...nameBuckets);

  return null;
};

/** Une seule valeur RAM par produit (compteurs facettés + filtre cohérents). */
export const getProductPrimaryRamBucket = (product: Product): number | null => {
  const fromSpecs: number[] = [];
  for (const spec of product.specs || []) {
    if (SPEC_RAM.test(spec.label)) {
      fromSpecs.push(...extractRamFromSpecValue(spec.value));
    }
  }
  const specBuckets = bucketize(fromSpecs, RAM_BUCKETS);
  if (specBuckets.length) return Math.max(...specBuckets);

  const nameBuckets = bucketize(extractRamFromName(product.name), RAM_BUCKETS);
  if (nameBuckets.length) return Math.max(...nameBuckets);

  return null;
};

export const getProductRamBuckets = (product: Product): number[] => {
  const primary = getProductPrimaryRamBucket(product);
  return primary !== null ? [primary] : [];
};

export const productMatchesStorage = (product: Product, storageGb: string): boolean => {
  const target = Number.parseInt(storageGb, 10);
  if (!Number.isFinite(target)) return true;
  const primary = getProductPrimaryStorageBucket(product);
  if (primary !== null) return primary === target;
  return getProductStorageBuckets(product).includes(target);
};

export const productMatchesRam = (product: Product, ramGb: string): boolean => {
  const target = Number.parseInt(ramGb, 10);
  if (!Number.isFinite(target)) return true;
  const primary = getProductPrimaryRamBucket(product);
  if (primary !== null) return primary === target;
  return false;
};

export const productMatchesCondition = (product: Product, condition: string): boolean => {
  if (!condition || condition === 'all') return true;
  return (product.condition || 'new') === condition;
};

export const buildFacetGroup = (products: Product[], key: FacetKey): FacetGroup | null => {
  if (key === 'storage') {
    const counts = new Map<number, number>();
    for (const p of products) {
      const bucket = getProductPrimaryStorageBucket(p);
      if (bucket !== null) {
        counts.set(bucket, (counts.get(bucket) || 0) + 1);
      }
    }
    const options = STORAGE_BUCKETS
      .filter((b) => counts.has(b))
      .map((b) => ({
        value: String(b),
        label: STORAGE_LABEL[b] || `${b} Go`,
        count: counts.get(b) || 0,
      }));
    return options.length ? { key: 'storage', label: 'Stockage', options } : null;
  }

  if (key === 'ram') {
    const counts = new Map<number, number>();
    for (const p of products) {
      const bucket = getProductPrimaryRamBucket(p);
      if (bucket !== null) {
        counts.set(bucket, (counts.get(bucket) || 0) + 1);
      }
    }
    const options = RAM_BUCKETS
      .filter((b) => counts.has(b))
      .map((b) => ({
        value: String(b),
        label: RAM_LABEL[b] || `${b} Go RAM`,
        count: counts.get(b) || 0,
      }));
    return options.length ? { key: 'ram', label: 'RAM', options } : null;
  }

  const newCount = products.filter((p) => (p.condition || 'new') === 'new').length;
  const refCount = products.filter((p) => p.condition === 'refurbished').length;
  const options: FacetOption[] = [];
  if (newCount) options.push({ value: 'new', label: 'Neuf', count: newCount });
  if (refCount) options.push({ value: 'refurbished', label: 'Reconditionné', count: refCount });
  return options.length ? { key: 'condition', label: 'État', options } : null;
};

export const buildFacetGroups = (
  products: Product[],
  category: string,
): FacetGroup[] => {
  const keys = getFacetKeysForCategory(category);
  if (!keys.length) return [];

  return keys
    .map((key) => buildFacetGroup(products, key))
    .filter((group): group is FacetGroup => group !== null);
};

export const FACET_PARAM_KEYS: Record<FacetKey, string> = {
  storage: 'storage',
  ram: 'ram',
  condition: 'condition',
};
