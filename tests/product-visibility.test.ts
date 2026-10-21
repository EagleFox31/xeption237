import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { filterStorefrontProducts, isStorefrontVisible } from '../utils/productVisibility';

describe('vitrine : produits masqués exclus', () => {
  it('masque uniquement is_published = false explicite', () => {
    expect(isStorefrontVisible({ isPublished: true })).toBe(true);
    expect(isStorefrontVisible({ isPublished: undefined })).toBe(true);
    expect(isStorefrontVisible({ isPublished: false })).toBe(false);
  });

  it('filtre sans muter la liste', () => {
    const list = [{ id: 'a', isPublished: true }, { id: 'b', isPublished: false }];
    expect(filterStorefrontProducts(list).map((p) => p.id)).toEqual(['a']);
    expect(list).toHaveLength(2);
  });

  it('les requêtes troc publiques ne remontent que les produits publiés', () => {
    for (const file of ['components/troc/TrocUpgradeChoice.tsx', 'components/mobile/MobileTrocResult.tsx']) {
      expect(readFileSync(file, 'utf8')).toContain(".eq('is_published', true)");
    }
  });

  it('App.tsx passe la liste filtrée aux routes publiques et la liste complète à l’ERP/Studio', () => {
    const app = readFileSync('App.tsx', 'utf8').replace(/\r\n/g, '\n');
    expect(app).toContain('filterStorefrontProducts(products)');
    expect(app).toMatch(/<ShopPage\s+products=\{storefrontProducts\}/);
    expect(app).toMatch(/<AdminPage[\s\S]*?products=\{products\}/);
  });
});
