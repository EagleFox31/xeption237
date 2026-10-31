import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, LayoutGrid, LifeBuoy } from 'lucide-react';
import { Product } from '../../types';
import { GUIDES, LANDING_PAGES, PRODUCT_VIDEOS } from '../../content/seo';
import { getGuidesForProduct, getPrimaryLandingForProduct, getVideosForProduct } from '../../utils/landingPageFilter';
import { guidePath, helpPath, landingPath } from '../../utils/routes';
import { TikTokVideoButton } from '../TikTokVideoButton';

/** Maillage fiche produit → vidéos de présentation, rayon principal, guides applicables, aide. */
const ProductContentLinks: React.FC<{ product: Product; theme?: 'light' | 'dark' }> = ({ product, theme = 'light' }) => {
  const landing = getPrimaryLandingForProduct(product, LANDING_PAGES);
  const guides = getGuidesForProduct(product, GUIDES);
  const videos = getVideosForProduct(product, PRODUCT_VIDEOS);
  const dark = theme === 'dark';
  const title = dark ? 'text-white' : 'text-gray-800';
  const link = dark ? 'text-gray-300 hover:text-xeption-gold' : 'text-gray-700 hover:text-black';

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
      <ul className="grid gap-2 sm:grid-cols-2 text-sm">
        {landing && (
          <li>
            <Link to={landingPath(landing.slug)} className={`inline-flex items-center gap-2 underline-offset-4 hover:underline ${link}`}>
              <LayoutGrid className="w-4 h-4 text-xeption-gold" /> {landing.navLabel}
            </Link>
          </li>
        )}
        {guides.map((g) => (
          <li key={g.slug}>
            <Link to={guidePath(g.slug)} className={`inline-flex items-center gap-2 underline-offset-4 hover:underline ${link}`}>
              <BookOpen className="w-4 h-4 text-xeption-gold" /> {g.h1}
            </Link>
          </li>
        ))}
        <li>
          <Link to={helpPath('garanties')} className={`inline-flex items-center gap-2 underline-offset-4 hover:underline ${link}`}>
            <LifeBuoy className="w-4 h-4 text-xeption-gold" /> Garanties, livraison et retours
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default ProductContentLinks;
