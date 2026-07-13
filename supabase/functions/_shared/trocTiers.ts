/**
 * Paliers Smart Troc — source unique côté edge functions Deno.
 *
 * Doit rester aligné avec utils/trocPricing.ts côté front.
 * Si tu modifies un montant ici, mets à jour TROC_TIER_PRICES côté front.
 */

export type TrocTier = 'express' | 'premium' | 'safety' | 'certif';

export const TROC_TIERS: readonly TrocTier[] = ['express', 'premium', 'safety', 'certif'] as const;

export const TROC_TIER_PRICES: Record<TrocTier, number> = {
  express: 150,
  premium: 500,
  safety:  1000,
  certif:  300,
};

export const TROC_TIER_LABELS: Record<TrocTier, string> = {
  express: 'Express',
  premium: 'Premium',
  safety:  'Sûreté',
  certif:  'Certif',
};

export const isTrocTier = (value: unknown): value is TrocTier =>
  typeof value === 'string' && (TROC_TIERS as readonly string[]).includes(value);

/**
 * Résout le tier à appliquer.
 * Si la valeur n'est pas un palier valide, retourne 'express' (palier sécurisé par défaut).
 */
export const resolveTier = (value: unknown): TrocTier =>
  isTrocTier(value) ? value : 'express';
