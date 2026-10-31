import React from 'react';
import { BookOpen, LayoutGrid, LifeBuoy } from 'lucide-react';
import { Product } from '../../types';
import { GUIDES, LANDING_PAGES, PRODUCT_VIDEOS } from '../../content/seo';
import { getGuidesForProduct, getPrimaryLandingForProduct, getVideosForProduct } from '../../utils/landingPageFilter';
import { guidePath, helpPath, landingPath } from '../../utils/routes';
import { TikTokVideoButton } from '../TikTokVideoButton';
import LinkTile from './LinkTile';

/** Maillage fiche produit → vidéos de présentation, rayon principal, guides applicables, aide. */
const ProductContentLinks: React.FC<{ product: Product; theme?: 'light' | 'dark' }> = ({ product, theme = 'light' }) => {
  const landing = getPrimaryLandingForProduct(product, LANDING_PAGES);
  const guides = getGuidesForProduct(product, GUIDES);
  const videos = getVideosForProduct(product, PRODUCT_VIDEOS);
  const dark = theme === 'dark';
  const title = dark ? 'text-white' : 'text-gray-800';

  return (
    <nav aria-label="Rayons et guides" className="max-w-5xl mx-auto px-4 pb-10 relative z-10">
      <h3 className={`text-lg font-bold uppercase font-tech mb-4 ${title}`}>Bien choisir</h3>
      {videos.map((video) => (
        <TikTokVideoButton
          key={video.tiktokId}
          videoId={video.tiktokId}
          label={video.label}
          title={video.title}
          className="mb-4 mr-4 text-xs"
        />
      ))}
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {landing && (
          <li>
            <LinkTile to={landingPath(landing.slug)} icon={LayoutGrid} kind="Rayon" title={landing.navLabel} theme={theme} />
          </li>
        )}
        {guides.map((g) => (
          <li key={g.slug}>
            <LinkTile
              to={guidePath(g.slug)}
              icon={BookOpen}
              kind="Guide"
              title={g.h1}
              badge={g.videos?.length ? 'Vidéo' : undefined}
              theme={theme}
            />
          </li>
        ))}
        <li>
          <LinkTile to={helpPath('garanties')} icon={LifeBuoy} kind="Aide" title="Garanties, livraison et retours" theme={theme} />
        </li>
      </ul>
    </nav>
  );
};

export default ProductContentLinks;
