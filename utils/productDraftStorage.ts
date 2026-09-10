import type { Product } from '../types';

const PRODUCT_DRAFT_KEY = 'xeption_admin_product_draft_v1';
const PRODUCT_DRAFT_ACTIVE_KEY = 'xeption_admin_product_draft_active_v1';
const MAX_DRAFT_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 jours de validité max

export interface ProductDraftMeta {
  product: Product;
  savedAt: number;
  isNew: boolean;
}

/**
 * Vérifie si le produit contient des informations saisies par l'utilisateur
 * (pour ne pas sauvegarder une fiche totalement vierge).
 */
export function hasProductDraftContent(product?: Product | null): boolean {
  if (!product) return false;
  const hasName = Boolean(product.name && product.name.trim().length > 0);
  const hasDesc = Boolean(product.description && product.description.trim().length > 0);
  const hasPrice = typeof product.price === 'number' && product.price > 0;
  const hasImage = Boolean(product.image && product.image.trim().length > 0);
  const hasGallery = Array.isArray(product.images) && product.images.length > 0;
  const hasSpecs = Array.isArray(product.specs) && product.specs.length > 0;
  const hasPros = Array.isArray(product.pros) && product.pros.length > 0;
  const hasCons = Array.isArray(product.cons) && product.cons.length > 0;
  const hasBrand = Boolean(product.brand && product.brand.trim().length > 0);
  const hasRange = Boolean(product.productRange && product.productRange.trim().length > 0);

  return (
    hasName ||
    hasDesc ||
    hasPrice ||
    hasImage ||
    hasGallery ||
    hasSpecs ||
    hasPros ||
    hasCons ||
    hasBrand ||
    hasRange
  );
}

/**
 * Sauvegarde le brouillon dans le localStorage et marque l'éditeur comme actif.
 */
export function saveProductDraft(product: Product): void {
  if (typeof window === 'undefined') return;
  try {
    if (!product) return;
    const isNew = product.id.startsWith('new_');
    const meta: ProductDraftMeta = {
      product,
      savedAt: Date.now(),
      isNew,
    };
    localStorage.setItem(PRODUCT_DRAFT_KEY, JSON.stringify(meta));
    localStorage.setItem(PRODUCT_DRAFT_ACTIVE_KEY, 'true');
  } catch (err) {
    // Quota ou navigation privée
    console.warn('Impossible de sauvegarder le brouillon produit dans le localStorage', err);
  }
}

/**
 * Charge le brouillon s'il existe et n'a pas expiré.
 */
export function loadProductDraft(): ProductDraftMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PRODUCT_DRAFT_KEY);
    if (!raw) return null;
    const meta = JSON.parse(raw) as ProductDraftMeta;
    if (!meta || !meta.product) return null;

    if (Date.now() - meta.savedAt > MAX_DRAFT_AGE_MS) {
      clearProductDraft();
      return null;
    }
    return meta;
  } catch {
    clearProductDraft();
    return null;
  }
}

/**
 * Indique si l'éditeur était ouvert au moment où la page s'est fermée/rechargée.
 */
export function isProductDraftActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(PRODUCT_DRAFT_ACTIVE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Désactive le flag d'ouverture automatique (l'utilisateur a fermé volontairement),
 * tout en conservant les données du brouillon pour une reprise ultérieure.
 */
export function setProductDraftInactive(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PRODUCT_DRAFT_ACTIVE_KEY);
  } catch {}
}

/**
 * Supprime définitivement le brouillon et le flag actif.
 */
export function clearProductDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PRODUCT_DRAFT_KEY);
    localStorage.removeItem(PRODUCT_DRAFT_ACTIVE_KEY);
  } catch {}
}
