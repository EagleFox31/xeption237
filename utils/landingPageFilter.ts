import type { ArticleDef, LandingPageDef, LandingSort, ProductFilter } from '../content/seo/types';
import { Product } from '../types';
import { slugify } from './slug';

const normalize = (value = '') => slugify(value).replace(/-/g, ' ');

/**
 * Marque : `brandName` résolu (voir attachBrandNames) OU fragment du nom produit.
 * Le OU couvre les fiches dont la marque n'est pas renseignée en base.
 */
const matchesBrand = (product: Product, filter: ProductFilter): boolean => {
  const { brands, nameIncludes } = filter;
  if (!brands?.length && !nameIncludes?.length) return true;

  const brandSlug = product.brandName ? slugify(product.brandName) : '';
  if (brands?.some((b) => slugify(b) === brandSlug)) return true;

  const name = normalize(product.name);
  return Boolean(nameIncludes?.some((fragment) => name.includes(normalize(fragment))));
};

export const matchesProductFilter = (product: Product, filter: ProductFilter): boolean => {
  if (filter.categories?.length && !filter.categories.includes(product.category)) return false;
  if (filter.conditions?.length && !filter.conditions.includes(product.condition ?? 'new')) return false;
  if (filter.minPrice !== undefined && !(product.price >= filter.minPrice)) return false;
  if (filter.maxPrice !== undefined && !(product.price <= filter.maxPrice)) return false;
  if (filter.inStockOnly && !(product.stock > 0)) return false;
  return matchesBrand(product, filter);
};

const freshness = (p: Product) => (p.releaseYear ?? 0) * 1e13 + (p.updated_at ? Date.parse(p.updated_at) || 0 : 0);

const SORTERS: Record<LandingSort, ((a: Product, b: Product) => number) | null> = {
  default: null,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  newest: (a, b) => freshness(b) - freshness(a),
};

/** Sélection d'une landing / d'un guide : filtre, tri (en stock d'abord), limite. Ne mute pas l'entrée. */
export const selectProducts = (
  products: Product[],
  filter: ProductFilter,
  sort: LandingSort = 'default',
  limit?: number,
): Product[] => {
  const sorter = SORTERS[sort];
  const inStockFirst = (a: Product, b: Product) => Number(b.stock > 0) - Number(a.stock > 0);
  const selected = products
    .filter((p) => matchesProductFilter(p, filter))
    .sort((a, b) => inStockFirst(a, b) || (sorter ? sorter(a, b) : 0));
  return limit !== undefined ? selected.slice(0, limit) : selected;
};

export const selectLandingProducts = (products: Product[], def: LandingPageDef): Product[] =>
  selectProducts(products, def.filter, def.sort, def.limit);

export const getGuidesForProduct = (product: Product, guides: ArticleDef[], max = 3): ArticleDef[] =>
  guides.filter((g) => g.appliesTo && matchesProductFilter(product, g.appliesTo)).slice(0, max);

/** Landing la plus spécifique (marque > prix > catégorie) contenant ce produit. */
export const getPrimaryLandingForProduct = (
  product: Product,
  landings: LandingPageDef[],
): LandingPageDef | undefined => {
  const specificity = (l: LandingPageDef) =>
    (l.filter.brands?.length ? 4 : 0) + (l.filter.conditions?.length ? 2 : 0) + (l.filter.maxPrice ? 1 : 0);
  return landings
    .filter((l) => matchesProductFilter(product, l.filter))
    .sort((a, b) => specificity(b) - specificity(a))[0];
};
