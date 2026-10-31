import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { estimateReadingMinutes, orderGuidesForShowcase, resolveLandingIcon } from '../../utils/contentMeta';
import { GUIDES, LANDING_PAGES, PRODUCT_VIDEOS, getLandingBySlug } from '../../content/seo';
import { tiktokCoverPath } from '../../components/TikTokVideoButton';
import type { ArticleDef } from '../../content/seo/types';

const article = (words: number): ArticleDef => ({
  slug: 'a', h1: '', title: '', metaDescription: '', navLabel: '', summary: '', updatedAt: '2026-10-31',
  relatedLandings: [],
  sections: [{ id: 's', heading: '', paragraphs: [Array.from({ length: words }, () => 'mot').join(' ')] }],
});

describe('estimateReadingMinutes', () => {
  it('arrondit au-dessus avec un minimum de 1 min', () => {
    expect(estimateReadingMinutes(article(0))).toBe(1);
    expect(estimateReadingMinutes(article(200))).toBe(1);
    expect(estimateReadingMinutes(article(201))).toBe(2);
  });

  it('donne une durée plausible pour chaque guide publié', () => {
    GUIDES.forEach((g) => expect(estimateReadingMinutes(g)).toBeLessThanOrEqual(15));
  });
});

describe('resolveLandingIcon', () => {
  it('privilégie navIcon, sinon la catégorie', () => {
    expect(resolveLandingIcon(getLandingBySlug('montres-connectees-samsung-cameroun')!)).toBe('watch');
    expect(resolveLandingIcon(getLandingBySlug('telephones-moins-100000-fcfa')!)).toBe('wallet');
    expect(resolveLandingIcon(getLandingBySlug('pc-portables-lenovo-cameroun')!)).toBe('laptop');
    expect(resolveLandingIcon(getLandingBySlug('iphone-cameroun')!)).toBe('smartphone');
  });

  it('chaque rayon a un pictogramme', () => {
    LANDING_PAGES.forEach((l) => expect(resolveLandingIcon(l)).toBeTruthy());
  });
});

describe('orderGuidesForShowcase', () => {
  it('place les guides avec vidéo en tête sans muter la source', () => {
    const before = GUIDES.map((g) => g.slug);
    const ordered = orderGuidesForShowcase(GUIDES);
    const firstWithout = ordered.findIndex((g) => !g.videos?.length);
    expect(ordered.slice(firstWithout).every((g) => !g.videos?.length)).toBe(true);
    expect(GUIDES.map((g) => g.slug)).toEqual(before);
  });
});

describe('couvertures TikTok hébergées', () => {
  it('chaque vidéo citée dans les contenus a sa couverture dans public/', () => {
    const ids = [
      ...GUIDES.flatMap((g) => g.videos ?? []),
      ...LANDING_PAGES.flatMap((l) => l.videos ?? []),
      ...PRODUCT_VIDEOS.map((p) => p.video),
    ].map((v) => v.tiktokId);
    const missing = ids.filter((id) => !existsSync(resolve(__dirname, '../../public', tiktokCoverPath(id).slice(1))));
    expect(missing, 'lancer node scripts/fetch-tiktok-covers.mjs').toEqual([]);
  });
});
