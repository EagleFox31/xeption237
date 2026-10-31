import { describe, it, expect } from 'vitest';
import { videoHeadline } from '../../components/content/VideoTeaser';

describe('videoHeadline', () => {
  it('retire le préfixe « Vidéo : » et remet une majuscule', () => {
    expect(videoHeadline('Vidéo : le Smart Troc en pratique')).toBe('Le Smart Troc en pratique');
  });

  it('laisse intact un libellé sans préfixe', () => {
    expect(videoHeadline('Visite de la boutique')).toBe('Visite de la boutique');
  });
});
