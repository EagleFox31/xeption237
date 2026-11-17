// Résolution du prix de base d'une reprise : première source exploitable dans un ordre fixe.
//
// Règle métier (ADR-005) : catalogue de reprise → catalogue boutique → estimation de marché.
// Un modèle vendu en boutique mais absent de `trade_in_models` prend une base dérivée de NOTRE
// prix de vente, pas d'une estimation en ligne déconnectée (cas réel : Pixel 8 Pro estimé
// 1 090 000 alors que la boutique le vend 205 000 à 280 000).
//
// Module PUR, sans dépendance : une copie identique vit dans
// `supabase/functions/_shared/basePriceResolution.ts` (frontière Vite / Deno) ; un test garantit
// que les deux copies ne divergent pas.

/**
 * Conversion prix boutique → `base_price` de reprise. `base_price` est une référence « neuf » :
 * calibré le 2026-11-17 sur la médiane `base_price / prix boutique le plus bas` des 16 modèles
 * présents dans les deux catalogues (1,14 – 2,15). Revue : `npm run troc:catalog-gaps`.
 */
export const SHOP_TO_TRADE_IN_BASE_RATIO = 1.7;

/** Pas d'arrondi du prix de base dérivé (aligné sur les offres). */
export const SHOP_BASE_ROUNDING_XAF = 5000;

export type BasePriceSource = 'catalog' | 'observed' | 'shop' | 'market' | 'fallback' | 'none';

export interface BasePriceCandidate {
  source: Exclude<BasePriceSource, 'none'>;
  /** Appelée seulement si aucune source précédente n'a donné de prix (évite les appels inutiles). */
  load: () => Promise<number | null | undefined> | number | null | undefined;
}

export interface ResolvedBasePrice {
  basePrice: number;
  source: BasePriceSource;
}

export const isUsableBasePrice = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

/** Prix de base dérivé du prix boutique le plus bas, ou null si la boutique ne vend pas le modèle. */
export const shopPriceToBasePrice = (lowestShopPrice: number | null | undefined): number | null => {
  if (!isUsableBasePrice(lowestShopPrice)) return null;
  const base = Math.floor((lowestShopPrice * SHOP_TO_TRADE_IN_BASE_RATIO) / SHOP_BASE_ROUNDING_XAF) * SHOP_BASE_ROUNDING_XAF;
  return base > 0 ? base : null;
};

/**
 * Première source qui donne un prix > 0, dans l'ordre fourni. Une source en erreur est ignorée
 * (on passe à la suivante) : une panne d'une source ne doit pas bloquer le dossier.
 */
export const resolveFirstBasePrice = async (candidates: BasePriceCandidate[]): Promise<ResolvedBasePrice> => {
  for (const candidate of candidates) {
    try {
      const value = Number(await candidate.load());
      if (isUsableBasePrice(value)) return { basePrice: value, source: candidate.source };
    } catch {
      // source indisponible → suivante
    }
  }
  return { basePrice: 0, source: 'none' };
};
