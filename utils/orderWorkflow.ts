import type { Order } from '../types';

export type OrderStatus = Order['status'];

/** Transitions autorisées — spec MODELE_STOCK_MULTI_BOUTIQUES §5 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  shipped: ['delivered', 'refused'],
  refused: ['returned'],
  returned: [],
  delivered: [],
  cancelled: [],
};

export const canTransitionOrder = (from: OrderStatus, to: OrderStatus): boolean =>
  ORDER_TRANSITIONS[from]?.includes(to) ?? false;

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
  refused: 'Refus livraison',
  returned: 'Retour reçu',
};

export const getOrderStatusLabel = (status: Order['status']): string =>
  ORDER_STATUS_LABELS[status] || status;

export const canIssueInvoice = (order: Order): boolean =>
  INVOICE_ELIGIBLE_STATUSES.includes(order.status);

export const canCancelOrder = (order: Order): boolean =>
  canTransitionOrder(order.status, 'cancelled');

/** Statuts « en cours » : la fiche propose Livrée / Annulée / Client injoignable.
 * Même liste que notify_order_stale et mark_order_unreachable (20261110_001). */
export const ORDER_OPEN_STATUSES: ReadonlyArray<OrderStatus> = ['pending', 'confirmed', 'ready', 'shipped'];

export const isOrderOpen = (order: Pick<Order, 'status'>): boolean =>
  ORDER_OPEN_STATUSES.includes(order.status);

/** Motifs d'annulation : liste fermée, relayée telle quelle dans l'alerte staff
 * (notify_order_outcome n'accepte que ces libellés, aucun texte libre). */
export const ORDER_CANCEL_REASONS = [
  'Client injoignable',
  'Client a renoncé',
  'Rupture de stock',
  'Doublon',
  'Prix ou délai refusé',
] as const;

export type OrderCancelReason = (typeof ORDER_CANCEL_REASONS)[number];

export const UNREACHABLE_CANCEL_REASON: OrderCancelReason = 'Client injoignable';

/** Nombre de tentatives sans réponse à partir duquel la fiche propose l'annulation. */
export const UNREACHABLE_CANCEL_THRESHOLD = 3;

/**
 * Étapes intermédiaires à enchaîner avant l'encaissement qui passe la commande en « Livrée ».
 * Pur : aucune transition directe vers delivered (l'encaissement reste le seul chemin).
 * Chaque pas est validé par canTransitionOrder ; une chaîne invalide renvoie [].
 */
export const planDeliveredSteps = (order: Pick<Order, 'status' | 'deliveryMode'>): OrderStatus[] => {
  const handover: OrderStatus = order.deliveryMode === 'delivery' ? 'shipped' : 'ready';
  let steps: OrderStatus[];
  switch (order.status) {
    case 'pending':
      steps = ['confirmed', handover];
      break;
    case 'confirmed':
      steps = [handover];
      break;
    default:
      return [];
  }
  let from: OrderStatus = order.status;
  for (const to of steps) {
    if (!canTransitionOrder(from, to)) return [];
    from = to;
  }
  return canTransitionOrder(from, 'delivered') ? steps : [];
};

/** La commande peut-elle être menée jusqu'à « Livrée » depuis la fiche ? */
export const canMarkDelivered = (order: Pick<Order, 'status' | 'deliveryMode'>): boolean =>
  order.status === 'ready' || order.status === 'shipped' || planDeliveredSteps(order).length > 0;

export const getInvoiceGateLabel = (status: Order['status']): string => {
  if (status === 'cancelled' || status === 'returned') return '—';
  if (status === 'pending') return 'Après acceptation';
  return '';
};

export const getInvoiceHint = (status: Order['status']): string => {
  if (status === 'pending') return 'Accepte la commande d’abord, puis tu pourras imprimer la facture.';
  if (status === 'cancelled') return 'Pas de facture : commande annulée.';
  if (status === 'returned') return 'Pas de facture : retour reçu, stock libéré.';
  return 'Imprimer ou envoyer le PDF au client.';
};

export const getOrderActionHint = (order: Order): string => {
  const unpaid =
    order.paymentStatus !== 'paid' &&
    order.status !== 'cancelled' &&
    order.status !== 'pending' &&
    order.status !== 'returned';

  if (unpaid && order.paymentMethod !== 'CASH' && ['confirmed', 'shipped', 'ready'].includes(order.status)) {
    return 'À faire : encaisser Mobile Money avant de terminer';
  }
  if (unpaid && order.paymentMethod === 'CASH' && ['confirmed', 'shipped', 'ready'].includes(order.status)) {
    return 'À faire : confirmer les espèces reçues';
  }

  switch (order.status) {
    case 'pending':
      return 'À faire : accepter ou annuler';
    case 'confirmed':
      return order.deliveryMode === 'delivery'
        ? 'À faire : expédier au client'
        : 'À faire : préparer pour le retrait';
    case 'shipped':
      return 'À faire : livrer et encaisser, ou marquer refus livraison';
    case 'ready':
      return 'À faire : le client retire et paie en boutique';
    case 'refused':
      return 'Colis en retour — marque « Retour reçu » quand il est de nouveau en rayon';
    case 'delivered':
      return 'C’est bon, vente terminée';
    case 'cancelled':
      return 'Vente annulée';
    case 'returned':
      return 'Retour constaté — stock libéré';
    default:
      return '';
  }
};

/** Aide page commandes — une ligne, langage boutique. */
export const SALES_PAGE_HINT =
  'Accepte, expédie ou prépare, encaisse à la livraison. Un colis refusé ne s’annule pas : il revient en rayon via « Retour reçu ».';
