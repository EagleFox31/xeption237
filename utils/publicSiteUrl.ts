const DEFAULT_SITE_ORIGIN = 'https://www.xeptionetwork.shop';

/**
 * Origine du site pour liens partagés (PDF, QR, WhatsApp).
 * Utilise toujours le domaine / IP / port courants du navigateur.
 */
export const getPublicSiteOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  const fromEnv = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  return DEFAULT_SITE_ORIGIN;
};

export const buildPublicSiteUrl = (path: string): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getPublicSiteOrigin()}${normalized}`;
};
