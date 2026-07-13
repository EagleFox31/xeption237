const SHOP_FILTER_KEYS = [
  'cat',
  'brand',
  'q',
  'sort',
  'promo',
  'stock',
  'storage',
  'ram',
  'condition',
  'price_min',
  'price_max',
] as const;

export type ShopFilterParamKey = (typeof SHOP_FILTER_KEYS)[number];

/** Sauvegarde tous les filtres boutique (fallback retour produit). */
export const persistShopFilters = (searchParams: URLSearchParams): void => {
  if (typeof sessionStorage === 'undefined') return;
  for (const key of SHOP_FILTER_KEYS) {
    const value = searchParams.get(key);
    if (value) sessionStorage.setItem(`shop_filter_${key}`, value);
    else sessionStorage.removeItem(`shop_filter_${key}`);
  }
};

/** Restaure les filtres boutique depuis sessionStorage. */
export const restoreShopSearchParams = (): URLSearchParams => {
  const params = new URLSearchParams();
  if (typeof sessionStorage === 'undefined') return params;
  for (const key of SHOP_FILTER_KEYS) {
    const value = sessionStorage.getItem(`shop_filter_${key}`);
    if (value) params.set(key, value);
  }
  return params;
};

export const buildShopReturnPath = (): string => {
  const params = restoreShopSearchParams();
  const qs = params.toString();
  return qs ? `/shop?${qs}` : '/shop';
};
