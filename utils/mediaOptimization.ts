
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
/** Grandes images (fiche produit) sur bonne connexion : qualité supérieure, 2 variantes en plus au plus. */
const HD_QUALITY = 'q_auto:good';
const HD_MIN_WIDTH = 800;

const qualityFor = (width: number, tier: BandwidthTier): string =>
  tier === 'fast' && width >= HD_MIN_WIDTH ? HD_QUALITY : IMAGE_QUALITY;
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

/** Variantes stockées par Trigenys Storage à l'upload (largeur en px, `/w320`, `/w800`). */
export const STORAGE_VARIANT_WIDTHS = [320, 800] as const;
const TRIGENYS_MEDIA_RE = /\/v1\/media\/[a-z][a-z0-9-]{1,39}\/[0-9a-f-]{36}$/i;

export const isTrigenysMedia = (url: string): boolean => {
  try {
    return TRIGENYS_MEDIA_RE.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

/** Plus petite variante couvrant la largeur demandée, sinon l'original. Le Worker sert l'original si la variante manque. */
const trigenysVariant = (url: string, width: number): string => {
  const variant = STORAGE_VARIANT_WIDTHS.find((w) => w >= width);
  return variant ? `${url}/w${variant}` : url;
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

  if (isTrigenysMedia(url)) return trigenysVariant(url, snapWidth(width, getBandwidthTier()));
  // Si ce n'est pas une image Cloudinary, on retourne l'URL telle quelle
  if (!url.includes('cloudinary.com')) return url;

  // f_auto : format optimal (AVIF / WebP)
  const tier = getBandwidthTier();
  const w = snapWidth(width, tier);
  const transformation = `f_auto,${qualityFor(w, tier)},w_${w},c_limit`;

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
  // Pas de flou côté Trigenys : la plus petite variante (souvent déjà en cache via la grille)
  if (isTrigenysMedia(url)) return trigenysVariant(url, 0);
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
  if (url && isTrigenysMedia(url)) {
    return STORAGE_VARIANT_WIDTHS.map((w) => `${url}/w${w} ${w}w`).join(', ');
  }
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
  // Recadrage carré laissé au CSS (object-cover) : pas de transformation serveur
  if (isTrigenysMedia(url)) return trigenysVariant(url, snapWidth(size, getBandwidthTier()));
  if (!url.includes('cloudinary.com')) return url;

  const tier = getBandwidthTier();
  const s = snapWidth(size, tier);
  const transformation = `f_auto,${qualityFor(s, tier)},w_${s},h_${s},c_fill,g_center`;

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
