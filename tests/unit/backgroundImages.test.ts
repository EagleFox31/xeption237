import { describe, it, expect } from 'vitest';
import { isImageOnlyBackgroundRoute } from '../../constants/backgroundImages';
import { guidePath, helpPath, landingPath } from '../../utils/routes';

describe('isImageOnlyBackgroundRoute', () => {
  it('pages SEO : fond image, sans vidéo', () => {
    expect(isImageOnlyBackgroundRoute(landingPath('iphone-cameroun'))).toBe(true);
    expect(isImageOnlyBackgroundRoute('/guides')).toBe(true);
    expect(isImageOnlyBackgroundRoute(guidePath('quel-pc-portable-200000-fcfa'))).toBe(true);
    expect(isImageOnlyBackgroundRoute(helpPath())).toBe(true);
    expect(isImageOnlyBackgroundRoute(helpPath('garanties'))).toBe(true);
  });

  it("garde la vidéo sur l'accueil et ne capte pas les préfixes voisins", () => {
    expect(isImageOnlyBackgroundRoute('/')).toBe(false);
    expect(isImageOnlyBackgroundRoute('/categories')).toBe(false);
    expect(isImageOnlyBackgroundRoute('/guidesx')).toBe(false);
  });
});
