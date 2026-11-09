import { parseGoogleReviewUrl } from '../utils/googleReview';

/**
 * Lien « laisser un avis » de la fiche Google Business Profile (`VITE_GOOGLE_REVIEW_URL`,
 * ex. https://g.page/r/<id>/review). Absent : l'invitation Google n'est pas affichée.
 */
export const GOOGLE_REVIEW_URL = parseGoogleReviewUrl(import.meta.env.VITE_GOOGLE_REVIEW_URL);
