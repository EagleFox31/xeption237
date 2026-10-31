import { useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigationType, type NavigationType } from 'react-router-dom';

const STORAGE_KEY = 'xeption:scroll-positions';
/** Durée max d'attente du contenu asynchrone (produits, pages lazy) avant de restaurer. */
const RESTORE_TIMEOUT_MS = 2500;
/** Nombre de positions mémorisées (les plus anciennes sont oubliées). */
const MAX_ENTRIES = 50;

/**
 * Position à appliquer en arrivant sur une page : la position mémorisée sur un retour /
 * avance navigateur (POP), le haut de page pour une nouvelle navigation (PUSH / REPLACE).
 */
export const resolveScrollTarget = (navigationType: NavigationType, saved: number | undefined): number =>
  navigationType === 'POP' && saved !== undefined ? saved : 0;

const readPositions = (): Record<string, number> => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
};

const savePosition = (key: string, y: number) => {
  try {
    const positions = readPositions();
    delete positions[key];
    positions[key] = y;
    const keys = Object.keys(positions);
    keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).forEach((k) => delete positions[k]);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    /* stockage indisponible (navigation privée) : on retombe sur le haut de page */
  }
};

/**
 * Restaure la position de défilement au retour arrière (ex. guide → accueil, section « Guides d'achat »)
 * et remonte en haut pour toute nouvelle page. Remplace le scrollRestoration natif, inefficace en SPA
 * quand le contenu se charge après la navigation.
 */
export const useScrollRestoration = (): void => {
  const { key } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  // Mémorise la position de la page courante pendant qu'on y défile.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => savePosition(key, window.scrollY));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [key]);

  useLayoutEffect(() => {
    const target = resolveScrollTarget(navigationType, readPositions()[key]);
    if (target === 0) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    // Le contenu (produits, carrousels) arrive après la navigation : on réessaie jusqu'à ce que
    // la page soit assez haute, sauf si l'utilisateur reprend la main entretemps.
    const deadline = performance.now() + RESTORE_TIMEOUT_MS;
    let frame = 0;
    let cancelled = false;
    const cancel = () => { cancelled = true; };
    const tryRestore = () => {
      if (cancelled) return;
      const reachable = document.documentElement.scrollHeight - window.innerHeight >= target;
      if (reachable || performance.now() > deadline) {
        window.scrollTo({ top: target, behavior: 'instant' });
        return;
      }
      frame = requestAnimationFrame(tryRestore);
    };
    window.addEventListener('wheel', cancel, { passive: true, once: true });
    window.addEventListener('touchstart', cancel, { passive: true, once: true });
    tryRestore();
    return () => {
      cancel();
      cancelAnimationFrame(frame);
      window.removeEventListener('wheel', cancel);
      window.removeEventListener('touchstart', cancel);
    };
  }, [key, navigationType]);
};
