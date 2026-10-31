import { describe, it, expect } from 'vitest';
import { buildTikTokPlayerUrl } from '../../components/TikTokVideoButton';
import { SHOP_TIKTOK_URL, SHOP_TOUR_VIDEOS, TROC_TUTORIAL_TIKTOK_VIDEO_ID } from '../../constants/contact';
import { GUIDES, LANDING_PAGES } from '../../content/seo';

describe('vidéos TikTok', () => {
  it('construit l’URL du lecteur officiel', () => {
    expect(buildTikTokPlayerUrl('123')).toBe('https://www.tiktok.com/player/v1/123?autoplay=1&rel=0');
  });

  it('pointe vers le compte officiel', () => {
    expect(SHOP_TIKTOK_URL).toBe('https://www.tiktok.com/@xeption_cameroun');
  });

  it('chaque vidéo déclarée a un identifiant numérique, un libellé et un titre', () => {
    const videos = [...GUIDES, ...LANDING_PAGES].flatMap((page) => page.videos ?? []).concat(SHOP_TOUR_VIDEOS);
    expect(videos.length).toBeGreaterThan(0);
    const ids = [TROC_TUTORIAL_TIKTOK_VIDEO_ID, ...videos.map((v) => v.tiktokId)];
    for (const id of ids) expect(id).toMatch(/^\d{15,22}$/);
    for (const v of videos) {
      expect(v.label.trim()).not.toBe('');
      expect(v.title.trim()).not.toBe('');
    }
  });

  it('pas deux fois la même vidéo sur une page', () => {
    for (const page of [...GUIDES, ...LANDING_PAGES]) {
      const ids = (page.videos ?? []).map((v) => v.tiktokId);
      expect(new Set(ids).size, page.slug).toBe(ids.length);
    }
  });
});
