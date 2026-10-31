import { GUIDES } from './guides';
import { HELP_TOPICS } from './helpTopics';
import { LANDING_PAGES } from './landingPages';
import { PRODUCT_VIDEOS } from './productVideos';
import type { ArticleDef, LandingPageDef, SeoRouteEntry } from './types';

export { GUIDES, HELP_TOPICS, LANDING_PAGES, PRODUCT_VIDEOS };
export type * from './types';

export const getLandingBySlug = (slug?: string): LandingPageDef | undefined =>
  LANDING_PAGES.find((l) => l.slug === slug);
export const getGuideBySlug = (slug?: string): ArticleDef | undefined => GUIDES.find((g) => g.slug === slug);
export const getHelpTopicBySlug = (slug?: string): ArticleDef | undefined =>
  HELP_TOPICS.find((h) => h.slug === slug);

/** Résout une liste de slugs en définitions, en ignorant les inconnus. */
export const pickBySlugs = <T extends { slug: string }>(items: T[], slugs: string[] = []): T[] =>
  slugs.map((s) => items.find((i) => i.slug === s)).filter((i): i is T => Boolean(i));

const latest = (dates: string[]) => dates.slice().sort().at(-1) ?? '';

/** Routes de contenu SEO : consommées par le manifeste de build (sitemap + prerender). */
export const getSeoContentRoutes = (): SeoRouteEntry[] => [
  ...LANDING_PAGES.map((l) => ({ path: `/categorie/${l.slug}`, changefreq: 'daily' as const, priority: 0.8, lastmod: l.updatedAt })),
  { path: '/guides', changefreq: 'weekly', priority: 0.6, lastmod: latest(GUIDES.map((g) => g.updatedAt)) },
  ...GUIDES.map((g) => ({ path: `/guides/${g.slug}`, changefreq: 'monthly' as const, priority: 0.6, lastmod: g.updatedAt })),
  { path: '/aide', changefreq: 'monthly', priority: 0.5, lastmod: latest(HELP_TOPICS.map((h) => h.updatedAt)) },
  ...HELP_TOPICS.map((h) => ({ path: `/aide/${h.slug}`, changefreq: 'monthly' as const, priority: 0.4, lastmod: h.updatedAt })),
];
