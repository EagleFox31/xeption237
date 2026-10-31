/** Longueur max d'une meta description avant troncature par Google / les aperçus de liens. */
export const SEO_DESCRIPTION_MAX_LENGTH = 160;

const ELLIPSIS = '…';

/** Blancs à fusionner, hors espaces insécables (« 65 000 FCFA » ne doit pas se couper). */
const BREAKABLE_WHITESPACE = /[^\S  ]+/g;

/** Tronque sans couper un mot ; ajoute « … » seulement si le texte a été raccourci. */
export const truncateAtWord = (text: string, max: number): string => {
  const clean = text.replace(BREAKABLE_WHITESPACE, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - ELLIPSIS.length);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:.\-–—]+$/, '')}${ELLIPSIS}`;
};

/**
 * Marqueur présent dans tout titre de fiche produit : reprend la requête réelle
 * (« <modèle> prix Cameroun »). Dupliqué dans la garde de `scripts/prerender.mjs`.
 */
export const PRODUCT_SEO_TITLE_MARKER = 'prix Cameroun';

const formatFcfa = (price: number): string => `${price.toLocaleString('fr-FR')} FCFA`;

/** Titre de fiche au format des résultats concurrents : modèle, « prix Cameroun », montant. */
export const buildProductSeoTitle = (displayName: string, price?: number | null): string => {
  const pricePart = price && price > 0 ? ` : ${formatFcfa(price)}` : '';
  return `${displayName} ${PRODUCT_SEO_TITLE_MARKER}${pricePart} | Xeption`;
};

export interface ProductSeoDescriptionInput {
  displayName: string;
  description?: string | null;
  price?: number | null;
  inStock: boolean;
}

/**
 * Description d'aperçu (Google, WhatsApp, Facebook) : prix et disponibilité en tête,
 * car c'est ce qu'un client lit d'abord dans un lien partagé.
 */
export const buildProductSeoDescription = ({
  displayName,
  description,
  price,
  inStock,
}: ProductSeoDescriptionInput): string => {
  const pricePart = price && price > 0 ? formatFcfa(price) : null;
  const stockPart = inStock ? 'En stock' : 'Sur commande';
  const head = [pricePart, stockPart].filter(Boolean).join(' · ');
  const body =
    (description || '').replace(/\s+/g, ' ').trim() ||
    `${displayName} disponible chez Xeption Network. Livraison Yaoundé & Douala, paiement Mobile Money.`;
  return truncateAtWord(`${head}. ${body}`, SEO_DESCRIPTION_MAX_LENGTH);
};
