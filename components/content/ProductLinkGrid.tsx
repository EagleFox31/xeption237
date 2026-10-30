import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';
import ProductCard from '../product/ProductCard';
import { productPath } from '../../utils/routes';

/** Grille de cartes produit (liens crawlables) pour landings et guides. */
const ProductLinkGrid: React.FC<{
  products: Product[];
  onAddToCart: (product: Product) => void;
}> = ({ products, onAddToCart }) => {
  const navigate = useNavigate();
  if (!products.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          onProductClick={(p) => navigate(productPath(p))}
        />
      ))}
    </div>
  );
};

export default ProductLinkGrid;
