/** Moyens de paiement boutique / commande */
export type PaymentMethod = 'CASH' | 'OM' | 'MOMO' | 'CARD' | 'TROC';

export type PosPaymentMethod = PaymentMethod;

export const POS_PAYMENT_OPTIONS: {
  id: PosPaymentMethod;
  label: string;
  shortLabel: string;
}[] = [
  { id: 'CASH', label: 'Espèces', shortLabel: 'Cash' },
  { id: 'OM', label: 'Orange Money', shortLabel: 'OM' },
  { id: 'MOMO', label: 'MTN MoMo', shortLabel: 'MoMo' },
  { id: 'CARD', label: 'Carte bancaire', shortLabel: 'Carte' },
  { id: 'TROC', label: 'Smart Troc', shortLabel: 'Troc' },
];

/** Paiements encaissables pour le reste à payer (hors crédit troc). */
export const TROC_REST_PAYMENT_OPTIONS = POS_PAYMENT_OPTIONS.filter((o) => o.id !== 'TROC');

export const getPaymentMethodLabel = (method: string | undefined | null): string => {
  const found = POS_PAYMENT_OPTIONS.find((o) => o.id === method);
  if (found) return found.label;
  if (method === 'CARD') return 'Carte bancaire';
  return method ?? '—';
};
