import { Product } from '../types';
import { normalizeSamsungGalaxySpelling } from './productDisplay';

export type BrandRef = { id: string; name: string; slug?: string };

/** Filtre marque : produits sans marque reconnue */
export const UNASSIGNED_BRAND_KEY = '__unassigned__';

const PHONE_NAME_TOKENS = [
  'google pixel',
  'samsung',
  'iphone',
  'redmi',
  'xiaomi',
  'infinix',
  'tecno',
  'itel',
  'honor',
  'oppo',
  'vivo',
  'oneplus',
  'realme',
  'nokia',
  'huawei',
  'blackview',
  'apple',
  'ipad',
] as const;

const PC_NAME_TOKENS = [
  'macbook',
  'microsoft',
  'surface',
  'lenovo',
  'asus',
  'acer',
  'dell',
  'hp',
  'msi',
  'apple',
] as const;

const ACCESSORY_NAME_TOKENS = ['oraimo', 'cmf', 'soundcore', 'anker', 'jbl'] as const;

function findCanonicalSamsung(brands: BrandRef[]): BrandRef | undefined {
  return brands.find(
    (b) => b.slug === 'samsung' || b.name.toLowerCase() === 'samsung',
  );
}

/** Une seule entrée « Samsung » — pas Samsung + Samsung Galaxy dans les filtres. */
export function canonicalizeBrandKey(brandKey: string, brands: BrandRef[]): string {
  if (!brandKey || brandKey === UNASSIGNED_BRAND_KEY) return brandKey;

  const samsung = findCanonicalSamsung(brands);
  if (!samsung) return brandKey;

  const fromDb = brands.find((b) => b.id === brandKey);
  if (fromDb && fromDb.name.toLowerCase().includes('samsung')) {
    return samsung.id;
  }

  if (brandKey.startsWith('name:')) {
    const token = brandKey.slice(5).replace(/-/g, ' ');
    if (token === 'samsung' || token === 'galaxy') return samsung.id;
  }

  return brandKey;
}

function inferBrandFromName(nameLower: string, brands: BrandRef[]): string | null {
  const samsung = findCanonicalSamsung(brands);
  const sorted = [...brands].sort((a, b) => b.name.length - a.name.length);
  for (const b of sorted) {
    const brandName = b.name.toLowerCase();
    if (!nameLower.includes(brandName)) continue;
    if (brandName.includes('samsung') && samsung) return samsung.id;
    return b.id;
  }

  const allTokens = [...PHONE_NAME_TOKENS, ...PC_NAME_TOKENS, ...ACCESSORY_NAME_TOKENS];
  const tokensByLen = [...allTokens].sort((a, b) => b.length - a.length);
  for (const token of tokensByLen) {
    if (!nameLower.includes(token)) continue;
    if (token === 'samsung' && samsung) return samsung.id;
    const match = brands.find(
      (b) =>
        b.name.toLowerCase().includes(token) ||
        (b.slug && b.slug.replace(/-/g, ' ').includes(token)),
    );
    if (match) return canonicalizeBrandKey(match.id, brands);
    return `name:${token.replace(/\s+/g, '-')}`;
  }

  return null;
}

/** Résout l’identifiant de marque (DB id) depuis product.brand ou le nom du produit. */
export function resolveProductBrandId(product: Product, brands: BrandRef[]): string | null {
  const raw = product.brand?.trim();
  if (raw) {
    const byId = brands.find((b) => b.id === raw);
    if (byId) return canonicalizeBrandKey(byId.id, brands);
    const bySlug = brands.find((b) => b.slug === raw);
    if (bySlug) return canonicalizeBrandKey(bySlug.id, brands);
    const byName = brands.find((b) => b.name.toLowerCase() === raw.toLowerCase());
    if (byName) return canonicalizeBrandKey(byName.id, brands);
    // brand orphelin en DB → tenter le nom du produit
  }

  const inferred = inferBrandFromName(
    normalizeSamsungGalaxySpelling(product.name).toLowerCase(),
    brands,
  );
  return inferred ? canonicalizeBrandKey(inferred, brands) : null;
}

export function getBrandDisplayName(brandKey: string, brands: BrandRef[]): string {
  const canonical = canonicalizeBrandKey(brandKey, brands);
  const fromDb = brands.find((b) => b.id === canonical);
  if (fromDb) return fromDb.name;
  if (canonical === UNASSIGNED_BRAND_KEY) return 'Sans marque';
  if (canonical.startsWith('name:')) {
    const token = canonical.slice(5).replace(/-/g, ' ');
    if (token === 'macbook' || token === 'apple') return 'Apple';
    if (token === 'hp') return 'HP';
    if (token === 'google pixel') return 'Google Pixel';
    if (token === 'blackview') return 'Blackview';
    if (token === 'ipad') return 'Apple';
    if (token === 'oraimo') return 'Oraimo';
    if (token === 'cmf') return 'CMF';
    if (token === 'samsung' || token === 'galaxy') return 'Samsung';
    return token.charAt(0).toUpperCase() + token.slice(1);
  }
  return canonical;
}
