import React, { useMemo } from 'react';
import { PageSEO, JsonLd, websiteJsonLd, itemListJsonLd, absoluteUrl } from '../utils/seo';
import Hero from '../components/Hero';
import HomeTrustBandeau from '../components/HomeTrustBandeau';
import ProductList from '../components/ProductList';
import PackList from '../components/PackList';
import TrocSection from '../components/TrocSection';
import { Product, Pack } from '../types';
import { useNavigate } from 'react-router-dom';
import { getProductSlug } from '../utils/slug';
import { getProductDisplayName } from '../utils/productDisplay';
import { weekSeed, seededShuffle } from '../utils/seededRandom';

interface HomePageProps {
  products: Product[];
  packs: Pack[];
  onAddToCart: (product: Product) => void;
  onAddPackToCart: (pack: Pack) => void;
}

/** Promos → featured → reste ; 9 = 3 slides desktop (3 produits / slide) */
const HERO_PRODUCT_LIMIT = 9;
const HOME_ITEMLIST_LIMIT = 12;

const pickHeroProducts = (products: Product[], limit = HERO_PRODUCT_LIMIT): Product[] => {
  const seed = weekSeed();
  const promos   = seededShuffle(products.filter((p) => p.isPromo), seed);
  const featured = seededShuffle(products.filter((p) => p.isFeatured && !promos.includes(p)), seed + 1);
  const rest     = seededShuffle(products.filter((p) => !promos.includes(p) && !featured.includes(p)), seed + 2);
  const merged: Product[] = [];
  for (const p of [...promos, ...featured, ...rest]) {
    if (!merged.some((x) => x.id === p.id)) merged.push(p);
    if (merged.length >= limit) break;
  }
  return merged;
};

const HomePage: React.FC<HomePageProps> = ({ products, packs, onAddToCart, onAddPackToCart }) => {
  const navigate = useNavigate();

  const heroProducts = useMemo(() => pickHeroProducts(products, HERO_PRODUCT_LIMIT), [products]);
  const featuredItemList = useMemo(
    () =>
      itemListJsonLd({
        name: 'Nos Pépites — Xeption Network',
        path: '/',
        items: pickHeroProducts(products, HOME_ITEMLIST_LIMIT).map((p) => ({
          name: getProductDisplayName(p),
          url: absoluteUrl(`/product/${getProductSlug(p)}`),
        })),
      }),
    [products]
  );

  return (
    <>
      <PageSEO
        title="Xeption | Le Ndamba du Digital au Cameroun"
        description="Achetez, Vendez ou Troquez vos Smartphones et PC au Cameroun chez Xeption. iPhone, Samsung, MacBook au meilleur prix. Livraison Yaoundé & Douala."
        path="/"
      />
      {/* Le nœud #organization (Organization + ElectronicsStore local) est défini
          statiquement dans index.html (présent sur toutes les pages). On n'ajoute
          ici que WebSite + ItemList pour éviter tout doublon de @id. */}
      <JsonLd data={[websiteJsonLd(), featuredItemList]} />

      <HomeTrustBandeau />

      <Hero
        products={heroProducts}
        onShopNow={() => navigate('/shop')}
        onNavigateTroc={() => navigate('/troc')}
        onProductClick={(p) => navigate(`/product/${getProductSlug(p)}`)}
        onAddToCart={onAddToCart}
      />

      <div id="featured-products">
        <ProductList
          products={products}
          onAddToCart={onAddToCart}
          onProductClick={(p) => navigate(`/product/${getProductSlug(p)}`)}
          title="Nos Pépites"
          tightTop
        />
      </div>

      <PackList packs={packs} products={products} onAddPackToCart={onAddPackToCart} />

      <TrocSection onNavigate={(page) => navigate(`/${page}`)} />
    </>
  );
};

export default HomePage;
