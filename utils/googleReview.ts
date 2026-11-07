/** Hôtes acceptés pour un lien « laisser un avis » de la fiche Google Business Profile. */
const GOOGLE_REVIEW_HOSTS = new Set(['g.page', 'search.google.com', 'www.google.com', 'maps.app.goo.gl']);

/**
 * Valide le lien d'avis Google configuré. Retourne null si absent ou suspect :
 * l'appel à l'avis est alors simplement masqué.
 */
export const parseGoogleReviewUrl = (raw?: string | null): string | null => {
  const value = (raw || '').trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && GOOGLE_REVIEW_HOSTS.has(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
};
