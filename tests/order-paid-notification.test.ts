import { describe, it, expect, vi } from 'vitest';
import {
  ORDER_PAID_EVENT_TYPE,
  ORDER_PAID_TITLE,
  ORDER_PAID_STATUS_LABEL,
  orderPaidDedupKey,
  formatOrderPaidChannel,
  formatOrderPaidMessage,
  emitOrderPaidNotification,
  patchOrderPaymentPaid,
} from '../supabase/functions/_shared/orderPayment';
import { DEFAULT_STAFF_EVENT_TYPES, eventIcon } from '../supabase/functions/_shared/staffNotify';
import { formatTelegramNotification } from '../supabase/functions/_shared/staffNotifyChannels/telegram';
import { WAHA_DEFAULT_EVENT_TYPES, NOTIFY_EVENT_ALIASES, toNotifyEvent } from '../supabase/functions/_shared/staffNotifyChannels/waha';

describe('Lot 5 — Notification order_paid (CamPay webhook / statut)', () => {
  const supabaseUrl = 'https://example.supabase.co';
  const serviceKey = 'srv-key-test';
  const orderId = 'ORD-2026-0042';
  const reference = `ORDPAY-${orderId}-1730000000000`;
  const campayRef = 'CPY-REF-998877';

  describe('Formatage et clé de déduplication', () => {
    it('génère la dedup_key déterministe order_paid.<order_id>', () => {
      expect(orderPaidDedupKey('ORD-2026-0042')).toBe('order_paid.ORD-2026-0042');
      expect(orderPaidDedupKey('  ORD-2026-0042  ')).toBe('order_paid.ORD-2026-0042');
    });

    it('normalise les libellés de canaux Mobile Money sans données client', () => {
      expect(formatOrderPaidChannel('om')).toBe('Orange Money');
      expect(formatOrderPaidChannel('OM')).toBe('Orange Money');
      expect(formatOrderPaidChannel('momo')).toBe('MTN MoMo');
      expect(formatOrderPaidChannel('MOMO')).toBe('MTN MoMo');
      expect(formatOrderPaidChannel(null)).toBe('Mobile Money');
    });

    it('formate un message métier fixe sans aucune PII client', () => {
      const msgOm = formatOrderPaidMessage(150000, 'om');
      expect(msgOm).toBe('150 000 FCFA — Orange Money — Paiement en ligne confirmé');

      const msgMomo = formatOrderPaidMessage(85000, 'momo');
      expect(msgMomo).toBe('85 000 FCFA — MTN MoMo — Paiement en ligne confirmé');
    });
  });

  describe('Émission et idempotence sur rejeu du webhook', () => {
    it('émet order_paid lors du premier passage en statut paid', async () => {
      const calls: Array<{ url: string; method: string; headers: Headers; body?: unknown }> = [];

      const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? 'GET';
        const headers = new Headers(init?.headers);
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ url, method, headers, body });

        if (url.includes('/rest/v1/order_payments') && method === 'GET') {
          return new Response(
            JSON.stringify([{ order_id: orderId, status: 'pending', amount: 150000, channel: 'om' }]),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        if (url.includes('/rest/v1/order_payments') && method === 'PATCH') {
          return new Response(null, { status: 204 });
        }
        if (url.includes('/rest/v1/rpc/confirm_order_payment_and_consume_stock')) {
          return new Response(JSON.stringify({ success: true, order_id: orderId, consumed: true }), { status: 200 });
        }
        if (url.includes('/rest/v1/admin_notifications')) {
          return new Response(null, { status: 201 });
        }
        return new Response(null, { status: 404 });
      });

      const res = await patchOrderPaymentPaid(
        supabaseUrl,
        serviceKey,
        reference,
        campayRef,
        mockFetch as unknown as typeof fetch,
      );

      expect(res).toEqual({ ok: true, orderId });
      expect(calls).toHaveLength(4);

      const notifCall = calls[3];
      expect(notifCall.url).toBe(`${supabaseUrl}/rest/v1/admin_notifications?on_conflict=dedup_key`);
      expect(notifCall.method).toBe('POST');
      expect(notifCall.headers.get('Prefer')).toBe('resolution=ignore-duplicates,return=minimal');
      expect(notifCall.body).toEqual({
        dedup_key: `order_paid.${orderId}`,
        event_type: ORDER_PAID_EVENT_TYPE,
        title: ORDER_PAID_TITLE,
        message: `150 000 FCFA — Orange Money — ${ORDER_PAID_STATUS_LABEL}`,
        link_to_tab: 'orders',
        link_to_id: orderId,
        target_role: null,
        created_by: 'webhook',
      });
    });

    it('idempotence (niveau 1) : un webhook rejoué sur un paiement déjà paid ne réémet aucune notification', async () => {
      let state: 'pending' | 'paid' = 'pending';
      const notifCalls: unknown[] = [];

      const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? 'GET';

        if (url.includes('/rest/v1/order_payments') && method === 'GET') {
          return new Response(
            JSON.stringify([{ order_id: orderId, status: state, amount: 150000, channel: 'momo' }]),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        if (url.includes('/rest/v1/order_payments') && method === 'PATCH') {
          state = 'paid';
          return new Response(null, { status: 204 });
        }
        if (url.includes('/rest/v1/rpc/confirm_order_payment_and_consume_stock')) {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        if (url.includes('/rest/v1/admin_notifications')) {
          notifCalls.push(JSON.parse(String(init?.body)));
          return new Response(null, { status: 201 });
        }
        return new Response(null, { status: 404 });
      });

      // 1er appel (webhook initial)
      const first = await patchOrderPaymentPaid(
        supabaseUrl,
        serviceKey,
        reference,
        campayRef,
        mockFetch as unknown as typeof fetch,
      );
      // 2e appel (webhook CamPay rejoué ou poll get-payment-status simultané)
      const second = await patchOrderPaymentPaid(
        supabaseUrl,
        serviceKey,
        reference,
        campayRef,
        mockFetch as unknown as typeof fetch,
      );

      expect(first).toEqual({ ok: true, orderId });
      expect(second).toEqual({ ok: true, orderId });
      expect(notifCalls).toHaveLength(1);
    });

    it('idempotence (niveau 2) : deux appels directs à emitOrderPaidNotification envoient la même dedup_key avec ignore-duplicates', async () => {
      const seenKeys = new Set<string>();
      let insertedCount = 0;

      const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const headers = new Headers(init?.headers);
        const body = JSON.parse(String(init?.body));

        expect(url).toContain('on_conflict=dedup_key');
        expect(headers.get('Prefer')).toContain('resolution=ignore-duplicates');

        if (!seenKeys.has(body.dedup_key)) {
          seenKeys.add(body.dedup_key);
          insertedCount += 1;
        }
        return new Response(null, { status: 201 });
      });

      await emitOrderPaidNotification(
        supabaseUrl,
        serviceKey,
        { orderId, amount: 150000, channel: 'om' },
        mockFetch as unknown as typeof fetch,
      );
      await emitOrderPaidNotification(
        supabaseUrl,
        serviceKey,
        { orderId, amount: 150000, channel: 'om' },
        mockFetch as unknown as typeof fetch,
      );

      expect(insertedCount).toBe(1);
    });

    it('contrat non-régressif : un échec de notification ne casse jamais la validation du paiement', async () => {
      const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? 'GET';

        if (url.includes('/rest/v1/order_payments') && method === 'GET') {
          return new Response(
            JSON.stringify([{ order_id: orderId, status: 'pending', amount: 95000, channel: 'om' }]),
            { status: 200 },
          );
        }
        if (url.includes('/rest/v1/order_payments') && method === 'PATCH') {
          return new Response(null, { status: 204 });
        }
        if (url.includes('/rest/v1/rpc/confirm_order_payment_and_consume_stock')) {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        }
        if (url.includes('/rest/v1/admin_notifications')) {
          return new Response('Internal Server Error', { status: 500 });
        }
        return new Response(null, { status: 404 });
      });

      const res = await patchOrderPaymentPaid(
        supabaseUrl,
        serviceKey,
        reference,
        campayRef,
        mockFetch as unknown as typeof fetch,
      );

      expect(res).toEqual({ ok: true, orderId });
    });
  });

  describe('Canaux Telegram et WhatsApp (Trigenys Notify)', () => {
    it('inclut order_paid dans DEFAULT_STAFF_EVENT_TYPES et WAHA_DEFAULT_EVENT_TYPES', () => {
      expect(DEFAULT_STAFF_EVENT_TYPES).toContain('order_paid');
      expect(WAHA_DEFAULT_EVENT_TYPES).toContain('order_paid');
      expect(NOTIFY_EVENT_ALIASES.order_paid).toBe('order.paid');
      expect(eventIcon('order_paid')).toBe('💳');
    });

    it('formate correctement la notification Telegram et l enveloppe canonique WhatsApp sans PII', () => {
      const notif = {
        notification_id: '123e4567-e89b-12d3-a456-426614174099',
        created_at: '2026-10-30T08:00:00.000Z',
        event_type: 'order_paid',
        title: ORDER_PAID_TITLE,
        message: formatOrderPaidMessage(150000, 'om'),
        link_to_tab: 'orders',
        link_to_id: orderId,
      };

      const tgText = formatTelegramNotification(notif);
      expect(tgText).toBe(
        '💳 <b>COMMANDE PAYÉE EN LIGNE</b>\n\n📱 <b><u>150 000 FCFA</u></b>\n▫️ Orange Money\n▫️ Paiement en ligne confirmé',
      );

      const wahaEvent = toNotifyEvent(notif, { siteUrl: 'https://www.xeptionetwork.shop' });
      expect(wahaEvent).toEqual({
        version: 1,
        project: 'xeption',
        id: notif.notification_id,
        type: 'order.paid',
        occurredAt: '2026-10-30T08:00:00.000Z',
        priority: 'high',
        resource: { kind: 'order', id: orderId },
        audience: 'staff',
        facts: {
          subject: '150 000 FCFA',
          amountPaidXaf: 150000,
          paymentChannel: 'Orange Money',
          paymentStatus: 'Paiement en ligne confirmé',
        },
        actionUrl: 'https://www.xeptionetwork.shop/admin/orders',
      });
    });
  });
});
