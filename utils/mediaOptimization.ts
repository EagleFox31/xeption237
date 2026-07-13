
/**
 * Utilitaire d'optimisation média pour Xeption Network
 * Cible spécifiquement les connexions lentes (237) via Cloudinary
 */

import { getBandwidthTier, type BandwidthTier } from './bandwidthDetector';

const IMAGE_FALLBACK = '/icons/icon-192x192.png';

const imageQualityForTier = (tier: BandwidthTier): string => {
  if (tier === 'slow') return 'q_auto:low';
  if (tier === 'fast') return 'q_auto:good';
  return 'q_auto:eco';
};

const capWidthForTier = (width: number, tier: BandwidthTier): number => {
  if (tier === 'slow') return Math.min(width, 640);
  if (tier === 'medium') return Math.min(width, 1024);
  return width;
};

export const optimizeImage = (url: string | undefined, width: number = 800): string => {
  if (!url) return IMAGE_FALLBACK;

  // Si ce n'est pas une image Cloudinary, on retourne l'URL telle quelle
  if (!url.includes('cloudinary.com')) return url;

  const tier = getBandwidthTier();
  const cappedWidth = capWidthForTier(width, tier);
  const quality = imageQualityForTier(tier);

  // f_auto : format optimal (AVIF / WebP)
  // q_auto:* : qualité selon bande passante détectée
  const transformation = `f_auto,${quality},w_${cappedWidth},dpr_auto,c_limit`;

  // Insertion de la transformation dans l'URL
  const parts = url.split('/upload/');
  if (parts.length === 2) {
    return `${parts[0]}/upload/${transformation}/${parts[1]}`;
  }

  return url;
};

/** Vignette produit carrée (hero / grilles) — même cadre pour phones et laptops */
export const optimizeProductThumb = (url: string | undefined, size: number = 400): string => {
  if (!url) return IMAGE_FALLBACK;
  if (!url.includes('cloudinary.com')) return url;

  const tier = getBandwidthTier();
  const cappedSize = capWidthForTier(size, tier);
  const quality = imageQualityForTier(tier);
  const transformation = `f_auto,${quality},w_${cappedSize},h_${cappedSize},dpr_auto,c_fill,g_center`;

  const parts = url.split('/upload/');
  if (parts.length === 2) {
    return `${parts[0]}/upload/${transformation}/${parts[1]}`;
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
