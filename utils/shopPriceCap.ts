// Plafond « prix boutique » de l'offre de reprise.
//
// Règle métier : Xeption ne rachète jamais un appareil plus cher qu'une part de son PROPRE
// prix de vente du même modèle. Sans ce garde-fou, un modèle absent de `trade_in_models`
// tombe sur `market-price-intel` (prix neuf estimé) et l'offre peut dépasser le prix
// affiché en boutique (cas réel : Pixel 8 Pro, offre 365 000 vs boutique 205-280 000).
//
// Module PUR, sans dépendance : une copie identique vit dans
// `supabase/functions/_shared/shopPriceCap.ts` (frontière Vite / Deno) ; un test garantit
// que les deux copies ne divergent pas.

/** Part maximale du prix boutique le plus bas que peut atteindre l'offre (crédit). */
export const SHOP_PRICE_OFFER_CAP_RATIO = 0.7;

/** Pas d'arrondi des offres (aligné sur `roundTo5000` du pricing troc). */
export const SHOP_PRICE_CAP_ROUNDING_XAF = 5000;

/** Catégories boutique comparables à un appareil repris (slugs `categories.slug`). */
export const SHOP_PRICE_CAP_CATEGORIES = ['phones', 'tablettes'] as const;

/**
 * Mots qui, placés juste après le modèle, désignent une AUTRE déclinaison
 * (« Pixel 8 » ≠ « Pixel 8 Pro », « S23 » ≠ « S23 Ultra »).
 */
const VARIANT_SUFFIXES = new Set([
  'pro', 'max', 'plus', 'ultra', 'mini', 'lite', 'fe', 'edge', 'fold', 'flip', 'xl', 'neo', 'prime', 'note', 'air',
]);

export interface ShopPriceCandidate {
  name: string | null | undefined;
  price: number | string | null | undefined;
}

const tokenize = (value: string): string[] =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

/** Tokens du modèle, sans la marque répétée en tête (« Google Pixel 8 » → pixel 8). */
export const shopModelTokens = (brand: string, model: string): string[] => {
  const brandTokens = new Set(tokenize(brand));
  const tokens = tokenize(model);
  let start = 0;
  while (start < tokens.length - 1 && brandTokens.has(tokens[start])) start += 1;
  return tokens.slice(start);
};

/** Le produit boutique est-il EXACTEMENT ce modèle (pas une autre déclinaison) ? */
export const isSameShopModel = (productName: string, modelTokens: string[]): boolean => {
  // Un modèle sans chiffre (« iPhone ») est trop vague pour plafonner une offre.
  if (modelTokens.length === 0 || !modelTokens.some((t) => /\d/.test(t))) return false;
  const tokens = tokenize(productName);
  for (let i = 0; i + modelTokens.length <= tokens.length; i += 1) {
    if (modelTokens.every((t, k) => tokens[i + k] === t)) {
      const next = tokens[i + modelTokens.length];
      if (!next || !VARIANT_SUFFIXES.has(next)) return true;
    }
  }
  return false;
};

/** Prix de vente boutique le plus bas du modèle, ou null si la boutique ne le vend pas. */
export const findLowestShopPrice = (
  brand: string,
  model: string,
  products: ShopPriceCandidate[],
): number | null => {
  const modelTokens = shopModelTokens(brand, model);
  let lowest: number | null = null;
  for (const product of products) {
    const price = Number(product.price);
    if (!Number.isFinite(price) || price <= 0 || !product.name) continue;
    if (!isSameShopModel(product.name, modelTokens)) continue;
    if (lowest === null || price < lowest) lowest = price;
  }
  return lowest;
};

/** Token le plus discriminant pour pré-filtrer la requête produits (celui qui porte un chiffre). */
export const shopPriceSearchToken = (brand: string, model: string): string | null =>
  shopModelTokens(brand, model).find((t) => /\d/.test(t)) ?? null;

/**
 * Crédit maximal autorisé par le prix boutique (arrondi au pas inférieur), ou null
 * si aucun prix boutique n'est connu (pas de plafond).
 */
export const shopPriceCreditCap = (lowestShopPrice: number | null | undefined): number | null => {
  if (lowestShopPrice == null || !Number.isFinite(lowestShopPrice) || lowestShopPrice <= 0) return null;
  const raw = lowestShopPrice * SHOP_PRICE_OFFER_CAP_RATIO;
  return Math.floor(raw / SHOP_PRICE_CAP_ROUNDING_XAF) * SHOP_PRICE_CAP_ROUNDING_XAF;
};

/** Applique le plafond à un crédit déjà calculé (no-op si pas de prix boutique ou crédit nul). */
export const capCreditToShopPrice = (credit: number, lowestShopPrice: number | null | undefined): number => {
  const cap = shopPriceCreditCap(lowestShopPrice);
  if (cap === null || credit <= 0) return credit;
  return Math.min(credit, cap);
};
