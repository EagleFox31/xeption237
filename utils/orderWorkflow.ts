import type { Order } from '../types';

/** Statuts où la facture officielle peut être émise (commande validée). */
export const INVOICE_ELIGIBLE_STATUSES: ReadonlyArray<Order['status']> = [
  'confirmed',
  'shipped',
  'ready',
  'delivered',
];

export const ORDER_STATUS_LABELS: Record<Order['status'], string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  ready: 'Prête au retrait',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const getOrderStatusLabel = (status: Order['status']): string =>
  ORDER_STATUS_LABELS[status] || status;

export const canIssueInvoice = (order: Order): boolean =>
  INVOICE_ELIGIBLE_STATUSES.includes(order.status);

export const getInvoiceGateLabel = (status: Order['status']): string => {
  if (status === 'cancelled') return '—';
  if (status === 'pending') return 'Après acceptation';
  return '';
};

export const getInvoiceHint = (status: Order['status']): string => {
  if (status === 'pending') return 'Accepte la commande d’abord, puis tu pourras imprimer la facture.';
  if (status === 'cancelled') return 'Pas de facture : commande annulée.';
  return 'Imprimer ou envoyer le PDF au client.';
};

export const getOrderActionHint = (order: Order): string => {
  switch (order.status) {
    case 'pending':
      return 'À faire : accepter ou refuser';
    case 'confirmed':
      return order.deliveryMode === 'delivery'
        ? 'À faire : envoyer au client'
        : 'À faire : préparer pour le retrait';
    case 'shipped':
      return 'À faire : confirmer que le client a reçu';
    case 'ready':
      return 'À faire : le client a retiré en boutique ?';
    case 'delivered':
      return 'C’est bon, vente terminée';
    case 'cancelled':
      return 'Vente annulée';
    default:
      return '';
  }
};

/** Aide page commandes — une ligne, langage boutique. */
export const SALES_PAGE_HINT =
  'Chaque ligne est une vente : accepte, prépare et envoie (ou retrait boutique), marque terminée quand le client a reçu — facture PDF après acceptation.';
