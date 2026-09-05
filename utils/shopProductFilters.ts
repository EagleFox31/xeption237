import type { Product } from '../types';
import {
  resolveProductBrandId,
  UNASSIGNED_BRAND_KEY,
  type BrandRef,
} from './productBrand';
import { matchesProductSearch } from './productSearch';
import { productMatchesPrice } from './shopPriceFilter';
import {
  buildFacetGroup,
  getFacetKeysForCategory,
  productMatchesCondition,
  productMatchesRam,
  productMatchesStorage,
  type FacetGroup,
  type FacetKey,
} from './shopFacets';

export interface ShopFilterCriteria {
  activeBrand: string;
  searchQuery: string;
  promoOnly: boolean;
  inStockOnly: boolean;
  storageFilter: string;
  ramFilter: string;
  conditionFilter: string;
  priceMin: number | null;
  priceMax: number | null;
}

export type ShopCountExclude = 'brand' | 'price' | FacetKey;

/** Applique les filtres boutique ; `exclude` omet un axe pour recalculer ses compteurs facettés. */
export const applyShopFilters = (
  products: Product[],
  criteria: ShopFilterCriteria,
  brands: BrandRef[],
  exclude?: ShopCountExclude,
): Product[] => {
  let list = products;

  if (exclude !== 'brand' && criteria.activeBrand !== 'all') {
    if (criteria.activeBrand === UNASSIGNED_BRAND_KEY) {
      list = list.filter((p) => !resolveProductBrandId(p, brands));
    } else {
      list = list.filter((p) => resolveProductBrandId(p, brands) === criteria.activeBrand);
    }
  }

  if (criteria.searchQuery.trim()) {
    list = list.filter((p) => matchesProductSearch(p, criteria.searchQuery));
  }
  if (criteria.promoOnly) list = list.filter((p) => p.isPromo);
  if (criteria.inStockOnly) list = list.filter((p) => p.stock > 0);

  if (exclude !== 'storage' && criteria.storageFilter && criteria.storageFilter !== 'all') {
    list = list.filter((p) => productMatchesStorage(p, criteria.storageFilter));
  }
  if (exclude !== 'ram' && criteria.ramFilter && criteria.ramFilter !== 'all') {
    list = list.filter((p) => productMatchesRam(p, criteria.ramFilter));
  }
  if (exclude !== 'condition' && criteria.conditionFilter && criteria.conditionFilter !== 'all') {
    list = list.filter((p) => productMatchesCondition(p, criteria.conditionFilter));
  }

  if (exclude !== 'price') {
    list = list.filter((p) => productMatchesPrice(p, criteria.priceMin, criteria.priceMax));
  }

  return list;
};

export interface BrandCountOption {
  id: string;
  count: number;
}

export const buildBrandCounts = (
  products: Product[],
  brands: BrandRef[],
): { options: BrandCountOption[]; unassigned: number } => {
  const counts = new Map<string, number>();
  let unassigned = 0;

  products.forEach((p) => {
    const brandKey = resolveProductBrandId(p, brands);
    if (!brandKey) {
      unassigned += 1;
      return;
    }
    counts.set(brandKey, (counts.get(brandKey) || 0) + 1);
  });

  const options = [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);

  return { options, unassigned };
};

/** Compteurs facettés : chaque groupe ignore son propre filtre actif. */
export const buildFacetedFacetGroups = (
  productsInCategory: Product[],
  category: string,
  criteria: ShopFilterCriteria,
  brands: BrandRef[],
): FacetGroup[] => {
  const keys = getFacetKeysForCategory(category);
  return keys
    .map((key) => {
      const pool = applyShopFilters(productsInCategory, criteria, brands, key);
      return buildFacetGroup(pool, key);
    })
    .filter((group): group is FacetGroup => group !== null);
};
