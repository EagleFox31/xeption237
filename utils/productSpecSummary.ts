import { Product } from '../types';

/** Ordre de priorité des specs affichées en sous-titre de carte (les plus scannables). */
const PRIORITY: RegExp[] = [
  /écran|ecran|display|dalle/i,
  /\bram\b|mémoire vive|memoire vive/i,
  /stockage|storage|\brom\b/i,
  /batterie|battery|autonomie/i,
  /photo|caméra|camera|capteur/i,
  /processeur|puce|chipset|\bsoc\b|\bcpu\b/i,
  /réseau|reseau|network|\b[45]g\b/i,
];

/**
 * Résumé court des caractéristiques clés d'un produit pour le sous-titre de carte
 * (ex : « 6,67" AMOLED · 8 Go / 256 Go · 5000 mAh · 108 MP »). Prend les specs par ordre
 * de priorité, puis complète avec le reste. Vide si aucune spec (la carte retombe alors
 * sur la description).
 */
export function productSpecSummary(product: Product, max = 4): string {
  const specs = (product.specs || []).filter((s) => s?.label && s?.value);
  if (!specs.length) return '';

  const picked: { label: string; value: string }[] = [];
  const take = (s: { label: string; value: string }) => {
    if (picked.length < max && !picked.includes(s)) picked.push(s);
  };

  for (const re of PRIORITY) {
    const s = specs.find((x) => re.test(x.label) && !picked.includes(x));
    if (s) take(s);
    if (picked.length >= max) break;
  }
  for (const s of specs) take(s); // complète si moins de `max` prioritaires

  // Décimales à la française pour la lecture grand public : "14.5" → "14,5".
  const fr = (v: string) => v.replace(/(\d)\.(\d)/g, '$1,$2');
  return picked.map((s) => fr(s.value.trim())).join(' · ');
}
