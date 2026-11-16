/**
 * Fiche commande : issue en un geste (Livrée / Annulée / Client injoignable) et lien d'avis
 * mis en évidence après la livraison (migration 20261110_001, plan suivi de commande).
 */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../services/supabaseClient', () => ({
  supabase: { rpc: () => Promise.resolve({ data: null, error: null }) },
}));

import OrderDetailModal from '../components/admin/modals/OrderDetailModal';
import OrderOutcomeActions, { type OrderOutcomeHandlers } from '../components/admin/modals/OrderOutcomeActions';
import type { Order } from '../types';

const baseOrder = {
  id: 'ORD-TEST-0001',
  customerName: 'Blaise',
  customerPhone: '654917388',
  customerCity: 'Yaoundé',
  deliveryMode: 'delivery',
  paymentMethod: 'CASH',
  paymentStatus: 'pending',
  status: 'confirmed',
  total: 90000,
  date: '09/11/2026',
  items: [{ id: 'p1', name: 'Samsung Galaxy A16', category: 'phones', price: 90000, quantity: 1, image: '' }],
} as unknown as Order;

const handlers = (over: Partial<OrderOutcomeHandlers> = {}): OrderOutcomeHandlers => ({
  onMarkDelivered: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
  onMarkUnreachable: vi.fn().mockResolvedValue({ count: 1, skipped: false }),
  ...over,
});

const button = (name: RegExp) => screen.getByRole('button', { name });

describe('OrderOutcomeActions', () => {
  it('affiche trois boutons d’au moins 48 px pour une commande en cours', () => {
    render(<OrderOutcomeActions order={baseOrder} handlers={handlers()} />);
    for (const name of [/livrée/i, /^annulée$/i, /client injoignable/i]) {
      expect(button(name).className).toContain('min-h-[48px]');
    }
    expect(screen.getByText('tentative n°1')).toBeTruthy();
  });

  it('Livrée délègue l’enchaînement des étapes et affiche l’erreur en ligne', async () => {
    const onMarkDelivered = vi.fn().mockRejectedValue(new Error('Stock insuffisant'));
    render(<OrderOutcomeActions order={baseOrder} handlers={handlers({ onMarkDelivered })} />);
    fireEvent.click(button(/livrée/i));
    expect(onMarkDelivered).toHaveBeenCalledWith(baseOrder);
    expect((await screen.findByRole('alert')).textContent).toBe('Stock insuffisant');
  });

  it('Annulée exige un motif de la liste fermée avant de confirmer', () => {
    const h = handlers();
    render(<OrderOutcomeActions order={baseOrder} handlers={h} />);
    fireEvent.click(button(/^annulée$/i));
    const confirm = button(/confirmer l’annulation/i) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/motif d’annulation/i), { target: { value: 'Rupture de stock' } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(h.onCancel).toHaveBeenCalledWith(baseOrder, 'Rupture de stock');
  });

  it('masque Annulée quand la commande ne peut plus être annulée (expédiée)', () => {
    render(<OrderOutcomeActions order={{ ...baseOrder, status: 'shipped' }} handlers={handlers()} />);
    expect(screen.queryByRole('button', { name: /^annulée$/i })).toBeNull();
    expect(button(/livrée/i)).toBeTruthy();
  });

  it('Client injoignable : confirme la tentative ou signale le doublon des 10 min', async () => {
    const onMarkUnreachable = vi.fn()
      .mockResolvedValueOnce({ count: 2, skipped: false })
      .mockResolvedValueOnce({ count: 2, skipped: true });
    render(<OrderOutcomeActions order={baseOrder} handlers={handlers({ onMarkUnreachable })} />);
    fireEvent.click(button(/client injoignable/i));
    expect(onMarkUnreachable).toHaveBeenCalledWith('ORD-TEST-0001');
    expect((await screen.findByRole('status')).textContent).toMatch(/Tentative n°2 notée/);
    await waitFor(() => expect((button(/client injoignable/i) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button(/client injoignable/i));
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Déjà notée il y a moins de 10 min/));
  });

  it('propose « Annuler — Client injoignable » à partir de 3 tentatives', () => {
    const h = handlers();
    const { rerender } = render(<OrderOutcomeActions order={{ ...baseOrder, unreachableCount: 2 }} handlers={h} />);
    expect(screen.queryByRole('button', { name: /annuler — client injoignable/i })).toBeNull();
    rerender(<OrderOutcomeActions order={{ ...baseOrder, unreachableCount: 3 }} handlers={h} />);
    fireEvent.click(button(/annuler — client injoignable/i));
    expect(h.onCancel).toHaveBeenCalledWith(expect.objectContaining({ id: 'ORD-TEST-0001' }), 'Client injoignable');
  });

  it('masque Client injoignable sans handler', () => {
    render(<OrderOutcomeActions order={baseOrder} handlers={handlers({ onMarkUnreachable: undefined })} />);
    expect(screen.queryByRole('button', { name: /client injoignable/i })).toBeNull();
  });
});

describe('OrderDetailModal — pied de fiche et lien d’avis', () => {
  it('affiche le pied d’issue pour une commande en cours, pas pour une commande close', () => {
    const { rerender } = render(<OrderDetailModal order={baseOrder} onClose={() => {}} outcome={handlers()} />);
    expect(screen.getByTestId('order-outcome-actions')).toBeTruthy();
    rerender(<OrderDetailModal order={{ ...baseOrder, status: 'delivered' }} onClose={() => {}} outcome={handlers()} />);
    expect(screen.queryByTestId('order-outcome-actions')).toBeNull();
  });

  it('sans handlers (usages existants), la fiche reste en lecture seule', () => {
    render(<OrderDetailModal order={baseOrder} onClose={() => {}} />);
    expect(screen.queryByTestId('order-outcome-actions')).toBeNull();
  });

  it('commande livrée : met en évidence « Envoyer le lien d’avis »', () => {
    const invite = {
      token: 'tok-1', order_id: 'ORD-TEST-0001', repair_ticket_id: null, kind: 'service',
      customer_name: 'Blaise', customer_phone: '654917388', headline: null,
      invite_at: '2026-11-09T10:00:00Z', sent_at: null, completed_at: null,
    } as const;
    const other = { ...invite, token: 'tok-2', order_id: 'ORD-OTHER' };
    render(
      <OrderDetailModal
        order={{ ...baseOrder, status: 'delivered', paymentStatus: 'paid' }}
        onClose={() => {}}
        feedbackInvites={[invite, other]}
        onFeedbackSent={vi.fn()}
      />,
    );
    const section = screen.getByTestId('order-feedback-invites');
    expect(section.getAttribute('aria-label')).toBe('Envoyer le lien d’avis');
    expect(section.querySelectorAll('button').length).toBe(1);
  });
});
