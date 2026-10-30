import { describe, it, expect } from 'vitest';
import { GUIDES, HELP_TOPICS, LANDING_PAGES, getSeoContentRoutes } from '../../content/seo';
import { CATEGORY_SLUGS } from '../../constants/dbSchema';

const STATIC_ROUTES = ['/', '/shop', '/troc', '/tracking', '/sav', '/cgv', '/cgv-smart-troc', '/about', '/contact'];
const knownPaths = new Set([...STATIC_ROUTES, ...getSeoContentRoutes().map((r) => r.path)]);
const allArticles = [...GUIDES, ...HELP_TOPICS];
const allPages = [...LANDING_PAGES, ...allArticles];

describe('intégrité des contenus SEO', () => {
  it('slugs uniques et au format URL', () => {
    for (const group of [LANDING_PAGES, GUIDES, HELP_TOPICS]) {
      const slugs = group.map((x) => x.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      slugs.forEach((s) => expect(s).toMatch(/^[a-z0-9-]+$/));
    }
  });

  it('références croisées existantes', () => {
    const landingSlugs = new Set(LANDING_PAGES.map((l) => l.slug));
    const guideSlugs = new Set(GUIDES.map((g) => g.slug));
    for (const page of allPages) {
      page.relatedLandings.forEach((s) => expect(landingSlugs.has(s), `${page.slug} → ${s}`).toBe(true));
      (page.relatedGuides ?? []).forEach((s) => expect(guideSlugs.has(s), `${page.slug} → ${s}`).toBe(true));
    }
  });

  it('chaque lien interne pointe vers une route connue', () => {
    for (const a of allArticles) {
      for (const section of a.sections) {
        (section.links ?? []).forEach((l) => expect(knownPaths.has(l.to), `${a.slug} → ${l.to}`).toBe(true));
      }
    }
  });

  it('title ≤ 65 et meta description 70–160 caractères', () => {
    for (const page of allPages) {
      expect(page.title.length, page.slug).toBeLessThanOrEqual(65);
      expect(page.metaDescription.length, page.slug).toBeGreaterThanOrEqual(70);
      expect(page.metaDescription.length, page.slug).toBeLessThanOrEqual(160);
    }
  });

  it('landings : au moins 3 FAQ et catégories valides', () => {
    const categories = new Set<string>(Object.values(CATEGORY_SLUGS));
    for (const l of LANDING_PAGES) {
      expect(l.faq.length, l.slug).toBeGreaterThanOrEqual(3);
      (l.filter.categories ?? []).forEach((c) => expect(categories.has(c), `${l.slug}: ${c}`).toBe(true));
    }
  });
});
