import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductCard from '../../components/product/ProductCard';
import type { Product } from '../../types';

const product = {
  id: 'abc-123',
  name: 'Galaxy A16',
  price: 95000,
  image: 'https://example.com/a16.png',
  category: 'phones',
  stock: 3,
  description: '',
} as unknown as Product;

const renderCard = (onProductClick = vi.fn(), onAddToCart = vi.fn()) => {
  render(
    <MemoryRouter>
      <ProductCard product={product} onAddToCart={onAddToCart} onProductClick={onProductClick} />
    </MemoryRouter>,
  );
  return { onProductClick, onAddToCart };
};

describe('ProductCard — lien crawlable', () => {
  it('expose un <a href="/product/…"> vers la fiche', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toMatch(/^\/product\/.+abc-123/);
  });

  it('un clic simple délègue au callback existant', () => {
    const { onProductClick } = renderCard();
    fireEvent.click(screen.getByRole('link'));
    expect(onProductClick).toHaveBeenCalledWith(product);
  });

  it('ctrl+clic laisse le navigateur ouvrir un nouvel onglet', () => {
    const { onProductClick } = renderCard();
    fireEvent.click(screen.getByRole('link'), { ctrlKey: true });
    expect(onProductClick).not.toHaveBeenCalled();
  });

  it("le bouton Acheter n'est pas imbriqué dans le lien", () => {
    const { onAddToCart, onProductClick } = renderCard();
    const button = screen.getByRole('button', { name: /Acheter/ });
    expect(button.closest('a')).toBeNull();
    fireEvent.click(button);
    expect(onAddToCart).toHaveBeenCalledWith(product);
    expect(onProductClick).not.toHaveBeenCalled();
  });
});
