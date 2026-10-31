import type { ArticleDef, LandingIcon, LandingPageDef } from '../content/seo/types';
import { CATEGORY_SLUGS } from '../constants/dbSchema';

/** Vitesse de lecture moyenne d'un texte web en français (mots / minute). */
const WORDS_PER_MINUTE = 200;

const countWords = (text: string): number => text.split(/\s+/).filter(Boolean).length;

/** Temps de lecture indicatif d'un article (résumé, sections, FAQ), arrondi au-dessus, minimum 1 min. */
export const estimateReadingMinutes = (article: ArticleDef): number => {
  const texts = [
    article.summary,
    ...article.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.bullets ?? [])]),
    ...(article.faq ?? []).flatMap((f) => [f.q, f.a]),
  ];
  const words = texts.reduce((sum, t) => sum + countWords(t), 0);
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
};

const ICON_BY_CATEGORY: Record<string, LandingIcon> = {
  [CATEGORY_SLUGS.PHONES]: 'smartphone',
  [CATEGORY_SLUGS.ORDINATEURS]: 'laptop',
  [CATEGORY_SLUGS.TABLETTES]: 'tablet',
  [CATEGORY_SLUGS.ACCESSORIES]: 'headphones',
};

/** Ordre des guides en vitrine : ceux qui ont une vidéo d'abord (aperçu visuel), ordre du fichier sinon. */
export const orderGuidesForShowcase = (guides: ArticleDef[]): ArticleDef[] =>
  [...guides].sort((a, b) => Number(Boolean(b.videos?.length)) - Number(Boolean(a.videos?.length)));

/** Pictogramme d'un rayon : `navIcon` explicite, sinon celui de sa première catégorie. */
export const resolveLandingIcon = (landing: LandingPageDef): LandingIcon =>
  landing.navIcon ?? ICON_BY_CATEGORY[landing.filter.categories?.[0] ?? ''] ?? 'smartphone';
