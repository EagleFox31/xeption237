import { describe, it, expect } from 'vitest';
import { HERO_LANDING_SLUGS } from '../../components/hero/HeroLandingLinks';
import { LANDING_PAGES } from '../../content/seo';

describe('HERO_LANDING_SLUGS', () => {
  it('chaque rayon mis en avant existe (un slug renommé ne doit pas disparaître en silence)', () => {
    const slugs = new Set(LANDING_PAGES.map((l) => l.slug));
    HERO_LANDING_SLUGS.forEach((slug) => expect(slugs.has(slug)).toBe(true));
  });
});
