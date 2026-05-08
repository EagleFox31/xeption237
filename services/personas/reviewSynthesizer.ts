import type { Review } from '../../types';

type ReviewSynthesizerOutput = {
  reviews: Review[];
};

const normalizeLine = (value?: string): string =>
  (value || '').replace(/\s+/g, ' ').trim();

const clampRating = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 5;
  return Math.min(5, Math.max(1, Math.round(numeric * 10) / 10));
};

export const buildReviewSynthesizerPrompt = (
  productName: string,
  category: string,
  description: string,
): string => `
Tu es le persona "Review Synthesizer" de Xeption.

Mission:
- produire une courte preuve sociale crédible pour une fiche produit high-tech
- rester utile commercialement sans écrire des avis caricaturaux
- synthétiser des avis plausibles à partir du contexte produit, sans prétendre citer des sources exactes

Contexte:
- Produit: ${productName}
- Catégorie: ${category}
- Description: ${description}
- Marché: e-commerce high-tech au Cameroun

Règles:
- retourne 2 à 3 avis maximum
- français propre, naturel, légèrement local, sans argot lourd
- prénoms uniquement, plausibles au Cameroun
- localisations plausibles: quartiers/villes du Cameroun
- notes entre 4.0 et 5.0
- moyenne globale excellente mais pas artificielle
- textes courts: 1 à 2 phrases chacun
- si le produit est reconditionné, tu peux rassurer sur l'état sans le survendre
- n'invente pas de SAV, de délai ou d'accessoire précis si ce n'est pas suggéré par le contexte
- varie les angles: autonomie, fluidité, état, livraison, rapport qualité/prix, photo, confort d'usage

Retourne UNIQUEMENT un JSON valide:
{
  "reviews": [
    {
      "author": "string",
      "location": "string",
      "rating": 4.8,
      "text": "string",
      "date": "string"
    }
  ]
}
`.trim();

export const parseReviewSynthesizerOutput = (text: string): ReviewSynthesizerOutput => {
  let parsed: any = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('JSON avis invalide');
  }

  const reviews = Array.isArray(parsed?.reviews)
    ? parsed.reviews
        .map((item: any, idx: number): Review => ({
          id: `rev_${Date.now()}_${idx}`,
          author: normalizeLine(typeof item?.author === 'string' ? item.author : ''),
          location: normalizeLine(typeof item?.location === 'string' ? item.location : ''),
          rating: clampRating(item?.rating),
          text: normalizeLine(typeof item?.text === 'string' ? item.text : ''),
          date: normalizeLine(typeof item?.date === 'string' ? item.date : ''),
        }))
        .filter((item: Review) => item.author && item.location && item.text && item.date)
        .slice(0, 3)
    : [];

  if (reviews.length === 0) {
    throw new Error('Aucun avis exploitable');
  }

  return { reviews };
};
