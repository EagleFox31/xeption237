const DEFAULT_SITE_ORIGIN = 'https://www.xeptionetwork.shop';

const isLocalOrPrivateHost = (host: string): boolean => {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
  );
};

/**
 * Origine du site pour liens partagés (PDF, QR, WhatsApp, SMS).
 * Si l'application tourne sur un domaine public, on utilise l'origine du navigateur.
 * Si elle tourne en local ou sur une IP privée (192.168.x.x), on utilise le domaine public de production
 * afin que les clients puissent ouvrir le lien et que les messageries (WhatsApp, SMS) le reconnaissent comme lien cliquable.
 */
export const getPublicSiteOrigin = (): string => {
  const fromEnv = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_SITE_URL)?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (typeof window !== 'undefined' && window.location?.origin) {
    const hostname = window.location.hostname;
    if (!isLocalOrPrivateHost(hostname)) {
      return window.location.origin;
    }
  }

  return DEFAULT_SITE_ORIGIN;
};

export const buildPublicSiteUrl = (path: string): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${getPublicSiteOrigin()}${normalized}`;
};
