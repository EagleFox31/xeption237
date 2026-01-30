import React from 'react';
import { Helmet } from 'react-helmet-async';
import Hero from '../components/Hero';
import TrustBar from '../components/TrustBar';
import DeliveryEstimator from '../components/DeliveryEstimator';
import ProductList from '../components/ProductList';
import PackList from '../components/PackList';
import TrocSection from '../components/TrocSection';
import { Product, Pack } from '../types';
import { useNavigate } from 'react-router-dom';

interface HomePageProps {
  products: Product[];
  packs: Pack[];
  onAddToCart: (product: Product) => void;
  onAddPackToCart: (pack: Pack) => void;
}

const HomePage: React.FC<HomePageProps> = ({ products, packs, onAddToCart, onAddPackToCart }) => {
  const navigate = useNavigate();

  // Logic for pinned products
  const pinnedProducts = products.filter(p => p.isFeatured);
  let displayFeatured = [...pinnedProducts];
  if (displayFeatured.length < 3) {
      const remainingSlots = 3 - displayFeatured.length;
      const fillers = products.filter(p => !p.isFeatured).slice(0, remainingSlots);
      displayFeatured = [...displayFeatured, ...fillers];
  }

  return (
    <>
      <Helmet>
        <title>Xeption | Le Ndamba du Digital au Cameroun</title>
        <meta name="description" content="Achetez, Vendez ou Troquez vos Smartphones et PC au Cameroun chez Xeption. iPhone, Samsung, MacBook au meilleur prix." />
      </Helmet>

      <Hero onShopNow={() => navigate('/shop')} />
      
      <TrustBar />
      
      <DeliveryEstimator />
      
      <div id="featured-products">
         <ProductList 
            products={displayFeatured} 
            onAddToCart={onAddToCart} 
            onProductClick={(p) => navigate(`/product/${p.id}`)} 
            title="Nos Pépites"
         />
      </div>
      
      <PackList packs={packs} products={products} onAddPackToCart={onAddPackToCart} />
      
      <TrocSection onNavigate={(page) => navigate(`/${page}`)} />
    </>
  );
};

export default HomePage;
