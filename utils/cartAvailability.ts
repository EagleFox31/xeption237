import type { Product } from '../types';

/**
 * Disponibilité à la vente en ligne.
 *
 * Pourquoi ce module : la vitrine affiche « Sur commande » dès que `stock <= 0`,
 * mais la RPC `create_order_atomic` refuse toute commande dont le stock est
 * insuffisant. Sans garde côté client, l'acheteur remplissait tout le tunnel
 * puis échouait au paiement. Une seule règle, partagée par le panier et les
 * boutons, évite que l'affichage et la base se contredisent.
 */

/** Libellé affiché à la place de l'achat quand le produit n'est pas en stock. */
export const ON_REQUEST_LABEL = 'Commander sur demande';

/** Un produit n'est commandable en ligne que s'il a un stock connu et positif. */
export const isOrderableOnline = (product: Pick<Product, 'stock'>): boolean =>
  Number.isFinite(product.stock) && product.stock > 0;

export type AddToCartDecision =
  | { kind: 'add' }
  | { kind: 'on_request' }
  | { kind: 'max_reached'; stock: number };

/**
 * Décide ce que fait un clic « ajouter au panier ».
 * - stock nul ou inconnu → commande sur demande (contact boutique) ;
 * - quantité déjà au niveau du stock → refus, la base refuserait aussi ;
 * - sinon → ajout.
 */
export const decideAddToCart = (
  product: Pick<Product, 'stock'>,
  quantityInCart: number,
): AddToCartDecision => {
  if (!isOrderableOnline(product)) return { kind: 'on_request' };
  if (quantityInCart >= product.stock) return { kind: 'max_reached', stock: product.stock };
  return { kind: 'add' };
};
