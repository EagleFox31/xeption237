/** Images sombres — fond global (accueil, troc…) */
export const SITE_BACKGROUND_IMAGES = [
  '/background/back1.jpg',
  '/background/back2.jpg',
  '/background/back3.jpg',
  '/background/back4.jpg',
  '/background/back5.jpg',
  '/background/back6.jpg',
] as const;

/** Images claires — pages lecture / institutionnelles */
export const SITE_BACKGROUND_LIGHT_IMAGES = [
  '/background/clairback1.jpg',
  '/background/clairback2.jpg',
  '/background/clairback3.jpg',
  '/background/clairback4.jpg',
  '/background/clairback5.jpg',
  '/background/clairback6.jpg',
] as const;

/** Pages sans vidéo — images rotatives uniquement */
export const IMAGE_ONLY_BACKGROUND_ROUTES = ['/troc', '/bon'] as const;

/** Pages avec fond clair dédié */
export const LIGHT_BACKGROUND_ROUTES = [
  '/about',
  '/contact',
  '/shop',
  '/mentions-legales',
  '/politique-confidentialite',
  '/politique-cookies',
  '/cgv',
  '/cgv-smart-troc',
  '/avis',
] as const;

export const isLightBackgroundRoute = (pathname: string): boolean =>
  LIGHT_BACKGROUND_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

export const isImageOnlyBackgroundRoute = (pathname: string): boolean =>
  IMAGE_ONLY_BACKGROUND_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

/** Délai aléatoire entre 5 et 10 minutes */
export const nextBackgroundRotationDelayMs = (): number => {
  const min = 5 * 60 * 1000;
  const max = 10 * 60 * 1000;
  return min + Math.random() * (max - min);
};
