/**
 * Injection paresseuse du script GTM.
 *
 * Appelée une fois au bootstrap (index.tsx). GTM se charge en asynchrone donc
 * il ne bloque pas le rendu React. Les events poussés dans le dataLayer AVANT
 * que gtm.js soit chargé sont mis en file d'attente et rejoués (comportement
 * standard GTM), donc on peut appeler `trackXxx()` sans attendre.
 *
 * Silencieux si VITE_GTM_ID absent (dev local sans compte configuré).
 */

const GTM_ID = (import.meta.env?.VITE_GTM_ID as string | undefined)?.trim();

export const initAnalytics = (): void => {
  if (!GTM_ID) return;
  if (typeof window === 'undefined') return;
  // Idempotent : si déjà injecté (HMR, rehydratation), on ne double pas.
  if ((window as any).__gtmInjected) return;
  (window as any).__gtmInjected = true;

  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);
};
