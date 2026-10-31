import React, { useMemo } from 'react';
import { BookOpen, LayoutGrid } from 'lucide-react';
import { GUIDES, LANDING_PAGES } from '../../content/seo';
import { Product } from '../../types';
import { buildGuideCards, buildLandingCards } from '../../utils/contentCards';
import { orderGuidesForShowcase } from '../../utils/contentMeta';
import { GUIDES_INDEX_PATH } from '../../utils/routes';
import HomeCarouselRow from '../home/HomeCarouselRow';
import GuideCard from './GuideCard';
import LandingCard from './LandingCard';

const GUIDE_ITEM_CLASS = 'w-[calc((100%-0.75rem)/1.4)] md:w-[calc((100%-2rem)/3)] xl:w-[calc((100%-3rem)/4)]';

/**
 * Accueil : rayons et guides d'achat en carrousels de cartes (même coque que les rangées produit).
 * Tous les liens restent des <a href> crawlables, y compris au prérendu (sans produits → pictogrammes).
 */
const SeoLinksBlock: React.FC<{ products: Product[] }> = ({ products }) => {
  const { landings, guides } = useMemo(() => {
    // Un seul `used` pour les deux carrousels : pas la même photo sur un rayon et un guide.
    const used = new Set<string>();
    return {
      landings: buildLandingCards(LANDING_PAGES, products, used),
      guides: buildGuideCards(orderGuidesForShowcase(GUIDES), products, used),
    };
  }, [products]);

  return (
    <div className="pb-10">
      <HomeCarouselRow
        eyebrow="Acheter"
        title="Nos rayons"
        icon={<LayoutGrid className="w-6 h-6 text-xeption-gold" />}
        viewAllTo="/shop"
        viewAllLabel="Boutique"
        itemsLabel="Rayons"
      >
        {landings.map(({ landing, cover, productCount }) => (
          <LandingCard key={landing.slug} landing={landing} cover={cover} productCount={productCount} />
        ))}
      </HomeCarouselRow>

      <HomeCarouselRow
        eyebrow="Bien choisir"
        title="Guides d'achat"
        icon={<BookOpen className="w-6 h-6 text-xeption-gold" />}
        viewAllTo={GUIDES_INDEX_PATH}
        viewAllLabel={`Les ${GUIDES.length} guides`}
        itemsLabel="Guides"
        itemClassName={GUIDE_ITEM_CLASS}
      >
        {guides.map(({ guide, fallbackProduct }) => (
          <GuideCard key={guide.slug} guide={guide} fallbackProduct={fallbackProduct} />
        ))}
      </HomeCarouselRow>
    </div>
  );
};

export default SeoLinksBlock;
