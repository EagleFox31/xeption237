import { describe, expect, it } from 'vitest';
import { decideAddToCart, isOrderableOnline } from '../utils/cartAvailability';
import { buildOnRequestOrderMessage } from '../utils/whatsappShare';

describe('isOrderableOnline', () => {
  it('accepte un stock positif', () => {
    expect(isOrderableOnline({ stock: 3 })).toBe(true);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('refuse un stock %s', (stock) => {
    expect(isOrderableOnline({ stock })).toBe(false);
  });

  it('refuse un stock absent (donnée incomplète)', () => {
    expect(isOrderableOnline({ stock: undefined as unknown as number })).toBe(false);
  });
});

describe('decideAddToCart', () => {
  it('Given un produit en stock et absent du panier, When on ajoute, Then on ajoute', () => {
    expect(decideAddToCart({ stock: 2 }, 0)).toEqual({ kind: 'add' });
  });

  it('Given un produit « Sur commande » (stock 0), When on ajoute, Then commande sur demande', () => {
    expect(decideAddToCart({ stock: 0 }, 0)).toEqual({ kind: 'on_request' });
  });

  it('Given le panier déjà au niveau du stock, When on ajoute, Then refus avec le stock', () => {
    expect(decideAddToCart({ stock: 2 }, 2)).toEqual({ kind: 'max_reached', stock: 2 });
  });

  it('Given une quantité sous le stock, When on ajoute, Then on ajoute', () => {
    expect(decideAddToCart({ stock: 2 }, 1)).toEqual({ kind: 'add' });
  });
});

describe('buildOnRequestOrderMessage', () => {
  const message = buildOnRequestOrderMessage('HP EliteBook 840 G8', 250000);

  it('cite le produit et le prix', () => {
    expect(message).toContain('HP EliteBook 840 G8');
    expect(message).toContain('250.000 XAF');
  });

  it('ne contient aucun emoji (hors plan multilingue de base)', () => {
    expect(/[\u{10000}-\u{10FFFF}]/u.test(message)).toBe(false);
  });
});
