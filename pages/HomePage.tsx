import React, { useMemo } from 'react';
import { PageSEO, JsonLd, websiteJsonLd, itemListJsonLd, absoluteUrl } from '../utils/seo';
import { Zap, Smartphone, RotateCcw, Headphones, Laptop, Sparkles, ArrowRight } from 'lucide-react';
import Hero from '../components/Hero';
import HomeTrustBandeau from '../components/HomeTrustBandeau';
import HomeProductRow from '../components/home/HomeProductRow';
import PackList from '../components/PackList';
import TrocSection from '../components/TrocSection';
import { Product, Pack } from '../types';
import { useNavigate } from 'react-router-dom';
import { getProductSlug } from '../utils/slug';
import { getProductDisplayName } from '../utils/productDisplay';
import { weekSeed, seededShuffle } from '../utils/seededRandom';

const ROW_LIMIT = 12;

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

  const goProduct = (p: Product) => navigate(`/product/${getProductSlug(p)}`);

  // Rangées produit thématiques (vitrines de l'accueil, façon merchandising).
  const rows = useMemo(() => ({
    bonnesAffaires: products.filter((p) => p.isPromo).slice(0, ROW_LIMIT),
    smartphones: products.filter((p) => p.category === 'phones').slice(0, ROW_LIMIT),
    reconditionnes: products.filter((p) => p.condition === 'refurbished').slice(0, ROW_LIMIT),
    accessoires: products.filter((p) => p.category === 'accessories').slice(0, ROW_LIMIT),
    ordinateurs: products.filter((p) => p.category === 'computer').slice(0, ROW_LIMIT),
    nouveautes: [...products]
      .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
      .slice(0, ROW_LIMIT),
  }), [products]);

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

      <div id="featured-products" className="pt-1 pb-6">
        <HomeProductRow
          tightTop
          eyebrow="Deals" title="Bonnes Affaires"
          icon={<Zap className="w-6 h-6 md:w-7 md:h-7 text-red-400 fill-current" />}
          products={rows.bonnesAffaires}
          onViewAll={() => navigate('/shop?promo=1')}
          onAddToCart={onAddToCart} onProductClick={goProduct}
        />
        <HomeProductRow
          eyebrow="Catégorie" title="Smartphones"
          icon={<Smartphone className="w-6 h-6 md:w-7 md:h-7 text-blue-400" />}
          products={rows.smartphones}
          onViewAll={() => navigate('/shop?cat=phones')}
          onAddToCart={onAddToCart} onProductClick={goProduct}
        />
        <HomeProductRow
          eyebrow="L'occasion maligne" title="Reconditionnés"
          icon={<RotateCcw className="w-6 h-6 md:w-7 md:h-7 text-emerald-400" />}
          products={rows.reconditionnes}
          onViewAll={() => navigate('/shop?condition=refurbished')}
          onAddToCart={onAddToCart} onProductClick={goProduct}
        />
        <HomeProductRow
          eyebrow="Catégorie" title="Accessoires"
          icon={<Headphones className="w-6 h-6 md:w-7 md:h-7 text-xeption-gold" />}
          products={rows.accessoires}
          onViewAll={() => navigate('/shop?cat=accessories')}
          onAddToCart={onAddToCart} onProductClick={goProduct}
        />
        <HomeProductRow
          eyebrow="Catégorie"
          title="Ordinateurs & Gaming"
          mobileTitle="PC & Gaming"
          icon={<Laptop className="w-6 h-6 md:w-7 md:h-7 text-purple-400" />}
          products={rows.ordinateurs}
          onViewAll={() => navigate('/shop?cat=computer')}
          onAddToCart={onAddToCart} onProductClick={goProduct}
        />
        <HomeProductRow
          eyebrow="Frais du jour" title="Nouveautés"
          icon={<Sparkles className="w-6 h-6 md:w-7 md:h-7 text-xeption-gold" />}
          products={rows.nouveautes}
          onViewAll={() => navigate('/shop')}
          onAddToCart={onAddToCart} onProductClick={goProduct}
        />

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-xeption-gold text-black font-tech font-bold text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] transition-all"
          >
            Voir tout le catalogue
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      <PackList packs={packs} products={products} onAddPackToCart={onAddPackToCart} />

      <TrocSection onNavigate={(page) => navigate(`/${page}`)} />
    </>
  );
};

export default HomePage;
