/**
 * Non-régression — fiche commande admin sur mobile : les articles s'affichent en cartes
 * (nom complet, quantité, prix) sans tableau à défilement horizontal qui bloquait le scroll.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('../../services/supabaseClient', () => ({
  supabase: { rpc: () => Promise.resolve({ data: null, error: null }) },
}));
vi.mock('../../hooks/useDueFeedbackInvites', () => ({
  useDueFeedbackInvites: () => ({ invites: [], markSent: vi.fn() }),
}));

import OrderDetailModal from '../../components/admin/modals/OrderDetailModal';

const order = {
  id: 'ORD-TEST-0001',
  customer_name: 'Blaise',
  customer_phone: '654917388',
  customer_email: 'client@example.com',
  customer_city: 'Yaoundé (Centre), Nsimeyong',
  delivery_mode: 'delivery',
  payment_method: 'Cash à la livraison',
  status: 'pending',
  total: 180000,
  created_at: '2026-11-09T09:01:56Z',
  items: [{ id: 'p1', name: 'Samsung Galaxy A16 128 Go', category: 'phones', price: 90000, quantity: 2, image: '' }],
} as any;

describe('OrderDetailModal — articles sur mobile', () => {
  it('affiche chaque article en carte avec nom complet, quantité et sous-total', () => {
    render(<OrderDetailModal order={order} onClose={() => {}} />);
    const list = screen.getByTestId('order-items-mobile');
    expect(list.className).toContain('sm:hidden');
    const card = within(list).getByText('Samsung Galaxy A16 128 Go').closest('li')!;
    expect(card.textContent).toMatch(/2 × 90[\s  ,.]?000 FCFA/);
    expect(card.textContent).toMatch(/180[\s  ,.]?000 FCFA/);
    expect(list.querySelector('table')).toBeNull();
  });

  it('réserve le tableau aux écrans ≥ sm', () => {
    render(<OrderDetailModal order={order} onClose={() => {}} />);
    const table = document.querySelector('table')!;
    expect(table.parentElement!.className).toContain('hidden sm:block');
  });
});
