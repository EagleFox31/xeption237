
/**
 * Utilitaire d'optimisation média pour Xeption Network
 * Cible spécifiquement les connexions lentes (237) via Cloudinary
 */

import { getBandwidthTier, type BandwidthTier } from './bandwidthDetector';

const IMAGE_FALLBACK = '/icons/icon-192x192.png';

/**
 * Cloudinary facture chaque chaîne de transformation distincte (crédits « Transformations »).
 * On borne donc les variantes : quelques paliers de largeur, une seule qualité, pas de dpr_auto
 * (qui crée une variante par densité d'écran). Le réseau lent descend d'un palier de largeur.
 */
export const IMAGE_WIDTH_BUCKETS = [160, 320, 480, 800, 1280] as const;
const IMAGE_QUALITY = 'q_auto:eco';
const PLACEHOLDER_WIDTH = 32;

const tierMaxWidth = (tier: BandwidthTier): number => {
  if (tier === 'slow') return 800;
  return 1280;
};

/** Plus petit palier >= width, plafonné selon la bande passante. */
export const snapWidth = (width: number, tier: BandwidthTier = 'fast'): number => {
  const max = tierMaxWidth(tier);
  const bucket = IMAGE_WIDTH_BUCKETS.find((b) => b >= width) ?? IMAGE_WIDTH_BUCKETS[IMAGE_WIDTH_BUCKETS.length - 1];
  return Math.min(bucket, max);
};

const buildCloudinaryTransform = (
  parts: string[],
  transformation: string,
): string => `${parts[0]}/upload/${transformation}/${parts[1]}`;

export const optimizeImage = (
  url: string | undefined,
  width: number = 800,
  // Conservé pour compatibilité d'appel ; dpr_auto n'est plus émis (voir IMAGE_WIDTH_BUCKETS).
  _options?: { dpr?: boolean },
): string => {
  if (!url) return IMAGE_FALLBACK;

  // Si ce n'est pas une image Cloudinary, on retourne l'URL telle quelle
  if (!url.includes('cloudinary.com')) return url;

  // f_auto : format optimal (AVIF / WebP)
  const transformation = `f_auto,${IMAGE_QUALITY},w_${snapWidth(width, getBandwidthTier())},c_limit`;

  const parts = url.split('/upload/');
  if (parts.length === 2) {
    return buildCloudinaryTransform(parts, transformation);
  }

  return url;
};

/**
 * Génère un placeholder LQIP (Low-Quality Image Placeholder) flouté ultra-léger (~250 octets)
 * Téléchargé instantanément même en 2G/3G, permettant un affichage flou immédiat des vraies couleurs.
 */
export const optimizeImagePlaceholder = (url: string | undefined, _width?: number): string => {
  if (!url) return IMAGE_FALLBACK;
  if (!url.includes('cloudinary.com')) return url;

  // Largeur fixe : une seule variante floue par image, quel que soit l'appelant
  const transformation = `f_auto,q_auto:low,w_${PLACEHOLDER_WIDTH},e_blur:200,c_limit`;
  const parts = url.split('/upload/');
  if (parts.length === 2) {
    return buildCloudinaryTransform(parts, transformation);
  }
  return url;
};

/**
 * Génère une chaîne srcset responsive pour Cloudinary
 * ex: "url_180 180w, url_320 320w, url_640 640w"
 */
export const generateCloudinarySrcSet = (
  url: string | undefined,
  widths: number[] = [180, 320, 480, 640, 800],
): string | undefined => {
  if (!url || !url.includes('cloudinary.com')) return undefined;

  const tier = getBandwidthTier();
  const snapped = [...new Set(widths.map((w) => snapWidth(w, tier)))].sort((a, b) => a - b);
  return snapped
    .map((w) => `${optimizeImage(url, w)} ${w}w`)
    .join(', ');
};

/** Vignette produit carrée (hero / grilles) — même cadre pour phones et laptops */
export const optimizeProductThumb = (url: string | undefined, size: number = 400): string => {
  if (!url) return IMAGE_FALLBACK;
  if (!url.includes('cloudinary.com')) return url;

  const s = snapWidth(size, getBandwidthTier());
  const transformation = `f_auto,${IMAGE_QUALITY},w_${s},h_${s},c_fill,g_center`;

  const parts = url.split('/upload/');
  if (parts.length === 2) {
    return buildCloudinaryTransform(parts, transformation);
  }

  return url;
};

export const optimizeVideo = (url: string | undefined): string => {
  if (!url) return '';
  if (!url.includes('cloudinary.com')) return url;

  const tier = getBandwidthTier();
  const quality = tier === 'slow' ? 'q_auto:low' : tier === 'fast' ? 'q_auto:eco' : 'q_auto:eco';
  const maxWidth = tier === 'slow' ? 960 : 1280;

  const transformation = `f_auto:video,${quality},vc_auto,ac_none,w_${maxWidth},c_limit`;

  const parts = url.split('/upload/');
  if (parts.length === 2) {
    // Nettoyage des anciens paramètres s'ils existent (comme q_auto:best qui est trop lourd)
    const rawPath = parts[1].replace(/q_[^/]+\//, ''); 
    return `${parts[0]}/upload/${transformation}/${rawPath}`;
  }

  return url;
};
