import React from 'react';
import { Product } from '../../types';
import ProductCard from '../product/ProductCard';
import HomeCarouselRow, { type HomeCarouselRowProps } from './HomeCarouselRow';

interface HomeProductRowProps extends Omit<HomeCarouselRowProps, 'children' | 'itemsLabel' | 'itemClassName'> {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
}

/** Rangée produit de l'accueil (carrousel de ProductCard). */
const HomeProductRow: React.FC<HomeProductRowProps> = ({ products, onAddToCart, onProductClick, ...row }) => (
  <HomeCarouselRow {...row}>
    {products.map((product) => (
      <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} onProductClick={onProductClick} />
    ))}
  </HomeCarouselRow>
);

export default HomeProductRow;
