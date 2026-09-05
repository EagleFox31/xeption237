/** Livraison à domicile offerte dès ce montant (sous-total produits). */
export const FREE_DELIVERY_THRESHOLD_XAF = 30000;

export function qualifiesForFreeDelivery(
  subtotal: number,
  deliveryMode: 'delivery' | 'pickup',
): boolean {
  return deliveryMode === 'delivery' && subtotal >= FREE_DELIVERY_THRESHOLD_XAF;
}

export function freeDeliveryRemaining(subtotal: number): number {
  return Math.max(0, FREE_DELIVERY_THRESHOLD_XAF - subtotal);
}

export function computeDeliveryFee(
  subtotal: number,
  deliveryMode: 'delivery' | 'pickup',
  zonePrice: number,
): number {
  if (deliveryMode === 'pickup') return 0;
  if (qualifiesForFreeDelivery(subtotal, deliveryMode)) return 0;
  return zonePrice;
}
