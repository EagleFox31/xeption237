/**
 * Prix de référence constatés en boutique.
 *
 * Remplace `CATALOG_FALLBACK`, un tableau figé dans `trocEvaluationService.ts`
 * portant le commentaire « À enrichir au fil des passages en boutique » — alors
 * qu'aucun passage en boutique ne pouvait l'enrichir sans un déploiement.
 *
 * Ce module vit à part plutôt que dans `trocEvaluationService.ts` pour rester
 * indépendant du travail en cours sur ce fichier. Le branchement se fait en une
 * ligne, décrite en bas.
 *
 * ⚠️ Nature de la donnée : des prix **constatés sur le marché** — ce qu'un
 * appareil se vend ailleurs. Jamais nos propres prix de reprise : ancrer sur
 * nos prix rendrait l'évaluation circulaire.
 */

import { supabase } from './supabaseClient';

export interface MarketReferencePrice {
  priceXaf: number;
  observedAt: string;
  observedFrom: string;
  sampleCount: number;
}

/**
 * Médiane des relevés de moins de 180 jours pour ce modèle.
 *
 * Passe par la RPC `market_reference_price` (SECURITY DEFINER) : l'évaluation
 * de troc tourne en session anonyme et ne peut pas lire la table directement.
 * La RPC ne rend qu'un agrégat, jamais le détail des relevés.
 *
 * @returns `null` si aucun relevé exploitable — l'appelant retombe alors sur
 *          ses sources habituelles. Une absence n'est pas une erreur.
 */
export const fetchMarketReferencePrice = async (
  brand: string,
  model: string,
  countryCode = 'CM',
): Promise<MarketReferencePrice | null> => {
  const cleanBrand = brand?.trim();
  const cleanModel = model?.trim();
  if (!cleanBrand || !cleanModel) return null;

  const { data, error } = await supabase.rpc('market_reference_price', {
    p_brand: cleanBrand,
    p_model: cleanModel,
    p_country: countryCode,
  });

  if (error) {
    console.warn('[marketReference] lecture impossible :', error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  const price = Number(row?.price_xaf ?? 0);
  if (!Number.isFinite(price) || price <= 0) return null;

  return {
    priceXaf: Math.round(price),
    observedAt: String(row.observed_at ?? ''),
    observedFrom: String(row.observed_from ?? ''),
    sampleCount: Number(row.sample_count ?? 0),
  };
};

/**
 * Branchement dans `trocEvaluationService.ts` — une ligne, à poser une fois que
 * le travail en cours sur ce fichier sera intégré.
 *
 * Dans `resolveBasePrice`, la référence constatée passe AVANT
 * `market-price-intel` (donnée locale et datée, plus fiable qu'un scrape) et
 * bien avant `CATALOG_FALLBACK`, qui devient l'ultime recours :
 *
 *   const observed = await fetchMarketReferencePrice(form.deviceBrand, form.deviceModel);
 *   if (observed) return observed.priceXaf;
 */
export const REFERENCE_PRICE_WIRING_NOTE =
  'Voir le commentaire ci-dessus : brancher dans resolveBasePrice avant market-price-intel.';
