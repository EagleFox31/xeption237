import { Product } from '../types';

type Spec = { label: string; value: string };

/**
 * Specs de traçabilité interne (fournisseur, lot d'arrivage) posées à l'import
 * (`mfoundiCatalogParser`) : utiles à l'ERP, jamais montrées au client ni au schéma SEO.
 */
const INTERNAL_SPEC_LABELS = /^\s*source\s*$/i;

export const isInternalSpec = (label?: string | null): boolean =>
  INTERNAL_SPEC_LABELS.test(label || '');

/** Specs affichables côté boutique : label + valeur non vides, specs internes exclues. */
export function getPublicSpecs(specs: Product['specs'] | null | undefined): Spec[] {
  if (!Array.isArray(specs)) return [];
  return specs.filter(
    (s): s is Spec =>
      !!s && !!String(s.label ?? '').trim() && !!String(s.value ?? '').trim() && !isInternalSpec(s.label),
  );
}
