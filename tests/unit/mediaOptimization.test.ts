import { describe, it, expect } from 'vitest';
import {
  optimizeImage,
  optimizeImagePlaceholder,
  optimizeProductThumb,
  generateCloudinarySrcSet,
  snapWidth,
  IMAGE_WIDTH_BUCKETS,
} from '../../utils/mediaOptimization';
import { setBandwidthTier } from '../../utils/bandwidthDetector';

describe('mediaOptimization', () => {
  const sampleCloudinaryUrl =
    'https://res.cloudinary.com/xeption/image/upload/v1234567/products/iphone15.png';

  it('génère un placeholder LQIP flouté ultra-léger avec e_blur:200 et q_auto:low', () => {
    const placeholder = optimizeImagePlaceholder(sampleCloudinaryUrl, 24);
    expect(placeholder).toContain('w_32');
    expect(placeholder).toContain('e_blur:200');
    expect(placeholder).toContain('q_auto:low');
    expect(placeholder).toContain('f_auto');
  });

  it('génère un srcset Cloudinary multi-résolutions', () => {
    const srcSet = generateCloudinarySrcSet(sampleCloudinaryUrl, [180, 320, 640]);
    expect(srcSet).toBeDefined();
    expect(srcSet).toContain('320w');
    expect(srcSet).toContain('800w');
  });

  it('renvoie l’URL telle quelle si ce n’est pas du Cloudinary', () => {
    const localUrl = '/logos/apple.svg';
    expect(optimizeImagePlaceholder(localUrl)).toBe(localUrl);
    expect(generateCloudinarySrcSet(localUrl)).toBeUndefined();
  });

  it('arrondit les largeurs au palier supérieur, plafonné en réseau lent', () => {
    expect(snapWidth(96)).toBe(160);
    expect(snapWidth(240)).toBe(320);
    expect(snapWidth(400)).toBe(480);
    expect(snapWidth(700)).toBe(800);
    expect(snapWidth(1200)).toBe(1280);
    expect(snapWidth(4000)).toBe(1280);
    expect(snapWidth(1200, 'slow')).toBe(800);
  });

  it('borne le nombre de transformations distinctes par image (quota Cloudinary)', () => {
    setBandwidthTier('fast');
    const widths = [80, 96, 100, 112, 120, 150, 200, 240, 280, 300, 320, 400, 540, 560, 600, 640, 700, 720, 1100, 1200];
    const urls = new Set<string>(widths.map((w) => optimizeImage(sampleCloudinaryUrl, w)));
    widths.forEach((w) => urls.add(optimizeImage(sampleCloudinaryUrl, w, { dpr: true })));
    [24, 28, 40].forEach((w) => urls.add(optimizeImagePlaceholder(sampleCloudinaryUrl, w)));
    // paliers + placeholder + q_auto:good sur les 2 paliers >= 800
    expect(urls.size).toBe(IMAGE_WIDTH_BUCKETS.length + 1);
    urls.forEach((u) => expect(u.includes('w_800') || u.includes('w_1280') ? u.includes('q_auto:good') : !u.includes('q_auto:good')).toBe(true));
    urls.forEach((u) => expect(u).not.toContain('dpr_auto'));
    setBandwidthTier('slow');
  });

  it('dédoublonne le srcset après arrondi des largeurs', () => {
    const srcSet = generateCloudinarySrcSet(sampleCloudinaryUrl, [180, 320, 540, 720]);
    expect(srcSet?.split(', ').map((e) => e.split(' ')[1])).toEqual(['320w', '800w']);
  });

  it('garde q_auto:eco en réseau lent même en grand format', () => {
    expect(optimizeImage(sampleCloudinaryUrl, 1200)).toContain('q_auto:eco,w_800');
  });

  it('vignette carrée sur palier', () => {
    expect(optimizeProductThumb(sampleCloudinaryUrl, 400)).toContain('w_480,h_480,c_fill');
  });
});
