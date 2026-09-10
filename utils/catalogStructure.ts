import type { Brand, Product, ProductRange } from '../types';
import { getBrandDisplayName, resolveBrandKeyToDbId, resolveProductBrandId, type BrandRef } from './productBrand';

export interface CatalogBrand {
  id: string;
  name: string;
  slug?: string;
  isDbBrand: boolean;
}

function brandRefs(brands: Brand[]): BrandRef[] {
  return brands.map((b) => ({ id: b.id, name: b.name, slug: b.slug }));
}

/** Clé marque canonique (uuid DB) — évite les doublons name:asus vs uuid ASUS. */
export function normalizeCatalogBrandKey(brandKey: string, brands: Brand[]): string {
  const refs = brandRefs(brands);
  return resolveBrandKeyToDbId(brandKey, refs) ?? brandKey;
}

export function resolveCatalogBrandId(product: Product, brands: Brand[]): string | null {
  const resolved = resolveProductBrandId(product, brandRefs(brands));
  if (!resolved) return null;
  return normalizeCatalogBrandKey(resolved, brands);
}

export function catalogBrandFromId(id: string, brands: Brand[]): CatalogBrand {
  const db = brands.find((b) => b.id === id);
  if (db) return { id: db.id, name: db.name, slug: db.slug, isDbBrand: true };
  return {
    id,
    name: getBrandDisplayName(id, brandRefs(brands)),
    isDbBrand: false,
  };
}

export function brandIdsForCategory(
  categorySlug: string,
  brands: Brand[],
  ranges: ProductRange[],
  products: Product[],
): Set<string> {
  const ids = new Set<string>();
  for (const r of ranges) {
    if (r.category === categorySlug && r.brand_id) {
      ids.add(normalizeCatalogBrandKey(r.brand_id, brands));
    }
  }
  for (const p of products) {
    if (p.category !== categorySlug) continue;
    const id = resolveCatalogBrandId(p, brands);
    if (id) ids.add(id);
  }
  return ids;
}

export function brandsForCategory(
  categorySlug: string,
  brands: Brand[],
  ranges: ProductRange[],
  products: Product[],
): CatalogBrand[] {
  return [...brandIdsForCategory(categorySlug, brands, ranges, products)]
    .map((id) => catalogBrandFromId(id, brands))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export function gammeCountForBrand(
  categorySlug: string,
  brandId: string,
  ranges: ProductRange[],
  brands: Brand[] = [],
): number {
  const canonical = brands.length ? normalizeCatalogBrandKey(brandId, brands) : brandId;
  return ranges.filter((r) => {
    if (r.category !== categorySlug) return false;
    const rangeBrand = brands.length ? normalizeCatalogBrandKey(r.brand_id, brands) : r.brand_id;
    return rangeBrand === canonical;
  }).length;
}

export function productsForBrand(
  categorySlug: string,
  brandId: string,
  brands: Brand[],
  products: Product[],
): Product[] {
  const canonical = normalizeCatalogBrandKey(brandId, brands);
  return products.filter(
    (p) =>
      p.category === categorySlug &&
      resolveCatalogBrandId(p, brands) === canonical,
  );
}

export function productsWithoutRangeForBrand(
  categorySlug: string,
  brandId: string,
  brands: Brand[],
  products: Product[],
): Product[] {
  return productsForBrand(categorySlug, brandId, brands, products).filter((p) => !p.productRange);
}
