import { GUIDES, HELP_TOPICS, LANDING_PAGES, pickBySlugs } from '../../content/seo';
import type { ContentLink } from '../../content/seo/types';
import { guidePath, helpPath, landingPath } from '../../utils/routes';

export const landingLinks = (slugs?: string[]): ContentLink[] =>
  (slugs ? pickBySlugs(LANDING_PAGES, slugs) : LANDING_PAGES).map((l) => ({ to: landingPath(l.slug), label: l.navLabel }));

export const guideLinks = (slugs?: string[]): ContentLink[] =>
  (slugs ? pickBySlugs(GUIDES, slugs) : GUIDES).map((g) => ({ to: guidePath(g.slug), label: g.navLabel }));

export const helpLinks = (slugs?: string[]): ContentLink[] =>
  (slugs ? pickBySlugs(HELP_TOPICS, slugs) : HELP_TOPICS).map((h) => ({ to: helpPath(h.slug), label: h.navLabel }));
