/**
 * Non-régression — le lien « Ouvrir la commande » des alertes WhatsApp/Telegram
 * (/admin/orders/<id>) ouvre directement la fiche de la commande.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const notifyInfo = vi.fn();
vi.mock('../../utils/notify', () => ({ notifyInfo: (...a: unknown[]) => notifyInfo(...a), notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('../../services/supabaseClient', () => ({
  supabase: { rpc: () => Promise.resolve({ data: null, error: null }) },
}));
vi.mock('../../hooks/useDueFeedbackInvites', () => ({
  useDueFeedbackInvites: () => ({ invites: [], markSent: vi.fn() }),
}));

import OrdersTab from '../../components/admin/tabs/OrdersTab';
import { notificationLink } from '../../supabase/functions/_shared/staffNotify';

const order = {
  id: 'ORD-3MR8-G6XF',
  customer_name: 'Blaise',
  customer_phone: '654917388',
  customer_email: 'client@example.com',
  customer_city: 'Yaoundé (Centre), Nsimeyong',
  delivery_mode: 'delivery',
  payment_method: 'Cash à la livraison',
  status: 'pending',
  total: 90000,
  created_at: '2026-11-09T09:01:56Z',
  items: [{ id: 'p1', name: 'Samsung Galaxy A16 128 Go', category: 'phones', price: 90000, quantity: 1, image: '' }],
} as any;

const baseProps = {
  onUpdateStatus: vi.fn(), onCancelOrder: vi.fn(), onCollectPayment: vi.fn(),
  paymentUiState: 'idle' as any, paymentError: null, collectingOrder: null,
  onCloseCollectPayment: vi.fn(), onInitiateCampay: vi.fn(), onMarkCashPaid: vi.fn(),
};

describe('Lien direct vers une commande', () => {
  it('le lien de notification pointe vers la commande, pas la liste', () => {
    const link = notificationLink(
      { notification_id: 'n1', event_type: 'order_created', title: 't', message: 'm', link_to_tab: 'orders', link_to_id: order.id } as any,
      { siteUrl: 'https://www.xeptionetwork.shop' },
    );
    expect(link).toEqual({ label: 'Ouvrir la commande', url: 'https://www.xeptionetwork.shop/admin/orders/ORD-3MR8-G6XF' });
  });

  it('ouvre la fiche de la commande ciblée puis rend la main', () => {
    const onFocusHandled = vi.fn();
    render(<OrdersTab {...baseProps} orders={[order]} focusRequestId={order.id} onFocusHandled={onFocusHandled} />);
    expect(screen.getByTestId('order-items-mobile')).toBeTruthy();
    expect(onFocusHandled).toHaveBeenCalledTimes(1);
  });

  it('commande inconnue : message clair, aucune fiche ouverte', () => {
    const onFocusHandled = vi.fn();
    render(<OrdersTab {...baseProps} orders={[order]} focusRequestId="ORD-INCONNUE" onFocusHandled={onFocusHandled} />);
    expect(screen.queryByTestId('order-items-mobile')).toBeNull();
    expect(notifyInfo).toHaveBeenCalledWith('Commande introuvable', expect.any(String));
    expect(onFocusHandled).toHaveBeenCalledTimes(1);
  });
});
