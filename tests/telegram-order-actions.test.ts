import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { ORDER_CANCEL_REASONS, ORDER_OPEN_STATUSES } from '../utils/orderWorkflow';
import {
  handleOrderActionCallback,
  isOrderActionable,
  orderActionCallbackData,
  orderActionRows,
  parseOrderActionCallback,
  replaceOrderActionRows,
  ORDER_ACTION_REPLIES,
  TELEGRAM_CANCEL_REASONS,
  type OrderActionDeps,
  type OrderActionRpcResult,
  type OrderState,
} from '../supabase/functions/_shared/telegramOrderActions';
import { telegramReplyMarkup } from '../supabase/functions/_shared/staffNotifyChannels/telegram';
import { customerWhatsAppLink, ORDER_SNAPSHOT_COLUMNS } from '../supabase/functions/_shared/staffNotifyOrder';
import type { StaffNotification } from '../supabase/functions/_shared/staffNotify';

const SQL = readFileSync(resolve(__dirname, '../supabase/migrations/20261114_003_telegram_order_actions.sql'), 'utf-8');
const BOT = readFileSync(resolve(__dirname, '../supabase/functions/telegram-bot-entry/index.ts'), 'utf-8');

const ORDER_ID = 'XP-20261114-0001';
const CTX = { siteUrl: 'https://example.test' };

const alert = (status: string, overrides: Partial<StaffNotification> = {}): StaffNotification => ({
  notification_id: '00000000-0000-4000-8000-000000000001',
  event_type: 'order_created',
  title: 'Nouvelle commande',
  message: `#${ORDER_ID} — 150 000 FCFA`,
  link_to_tab: 'orders',
  link_to_id: ORDER_ID,
  order: { id: ORDER_ID, customer_name: 'Client Test', customer_phone: '690000001', delivery_mode: 'delivery', status },
  ...overrides,
});

const callbacks = (rows: { callback_data?: string }[][]) => rows.flat().map((b) => b.callback_data).filter(Boolean) as string[];

describe('callback_data', () => {
  it('aller-retour et ≤ 64 octets pour l\'id le plus long accepté', () => {
    const longId = 'A'.repeat(40);
    for (const op of ['dlv', 'dok', 'cash', 'unr', 'cxl', 'back'] as const) {
      const data = orderActionCallbackData(op, longId);
      expect(new TextEncoder().encode(data).length).toBeLessThanOrEqual(64);
      expect(parseOrderActionCallback(data)).toEqual({ op, orderId: longId });
    }
    const cxr = orderActionCallbackData('cxr', longId, 4);
    expect(new TextEncoder().encode(cxr).length).toBeLessThanOrEqual(64);
    expect(parseOrderActionCallback(cxr)).toEqual({ op: 'cxr', orderId: longId, reasonIndex: 4 });
  });

  it('rejette les données forgées', () => {
    for (const bad of [
      'nav:oa:xxx:ID', 'nav:oa:dlv:', 'nav:oa:dlv:a;b', 'nav:oa:dlv:ID:1', 'nav:oa:cxr:ID', 'nav:oa:cxr:ID:5',
      'nav:oa:cxr:ID:-1', 'nav:oa:cxr:ID:1.5', 'nav:oa:cxr:ID:1:2', `nav:oa:dlv:${'A'.repeat(41)}`, 'nav:ack:x', '',
    ]) expect(parseOrderActionCallback(bad)).toBeNull();
  });
});

describe('listes miroir', () => {
  it('motifs = ORDER_CANCEL_REASONS (TS et SQL)', () => {
    expect([...TELEGRAM_CANCEL_REASONS]).toEqual([...ORDER_CANCEL_REASONS]);
    expect(SQL).toContain(`ARRAY[${ORDER_CANCEL_REASONS.map((r) => `'${r}'`).join(', ')}]`);
  });

  it('statuts ouverts = ORDER_OPEN_STATUSES (TS et SQL)', () => {
    for (const s of ORDER_OPEN_STATUSES) expect(isOrderActionable(s, 'delivery')).toBe(true);
    for (const s of ['delivered', 'cancelled', 'refused', 'returned', undefined]) expect(isOrderActionable(s, 'delivery')).toBe(false);
    expect(isOrderActionable('pending', 'pos')).toBe(false);
    expect(SQL).toContain(`ARRAY[${ORDER_OPEN_STATUSES.map((s) => `'${s}'`).join(', ')}]`);
  });
});

describe('clavier des alertes', () => {
  it('commande ouverte : actions + WhatsApp, liens existants conservés', () => {
    const rows = telegramReplyMarkup(alert('pending'), CTX, undefined, 'Xeption_bot').inline_keyboard;
    expect(rows[0][0].url).toContain('/admin/');
    expect(callbacks(rows)).toEqual([
      orderActionCallbackData('dlv', ORDER_ID), orderActionCallbackData('unr', ORDER_ID), orderActionCallbackData('cxl', ORDER_ID),
    ]);
    const wa = rows.flat().find((b) => b.text.includes('WhatsApp'));
    expect(wa?.url).toMatch(/^https:\/\/wa\.me\/237690000001\?text=/);
  });

  it('colis parti : pas d\'annulation', () => {
    expect(callbacks(telegramReplyMarkup(alert('shipped'), CTX).inline_keyboard)).not.toContain(orderActionCallbackData('cxl', ORDER_ID));
  });

  it('aucune action : commande close, vente comptoir, alerte d\'issue, snapshot absent', () => {
    for (const n of [
      alert('delivered'),
      alert('pending', { order: { id: ORDER_ID, delivery_mode: 'pos', status: 'pending' } }),
      alert('pending', { event_type: 'order_delivered' }),
      alert('pending', { order: undefined }),
    ]) expect(callbacks(telegramReplyMarkup(n, CTX).inline_keyboard)).toEqual([]);
  });

  it('le statut est lu avec le snapshot', () => {
    expect(ORDER_SNAPSHOT_COLUMNS.split(',')).toContain('status');
  });
});

describe('lien WhatsApp client', () => {
  it('prénom, numéro de commande, pas de montant', () => {
    const url = new URL(customerWhatsAppLink({ id: ORDER_ID, customer_name: 'Client Test', customer_phone: '00237 690 000 001' }, 'Boutique Démo')!);
    expect(url.host).toBe('wa.me');
    expect(url.pathname).toBe('/237690000001');
    expect(url.searchParams.get('text')).toBe(`Bonjour Client, ici Boutique Démo au sujet de votre commande #${ORDER_ID}.`);
  });

  it('absent si numéro invalide', () => {
    expect(customerWhatsAppLink({ id: ORDER_ID, customer_phone: 'abc' })).toBeUndefined();
    expect(customerWhatsAppLink({ id: ORDER_ID })).toBeUndefined();
  });
});

describe('replaceOrderActionRows', () => {
  it('garde les liens, remplace les actions', () => {
    const markup = { inline_keyboard: [[{ text: 'Voir ↗', url: 'https://example.test' }], ...orderActionRows(ORDER_ID, 'pending')] };
    expect(replaceOrderActionRows(markup, [])).toEqual({ inline_keyboard: [[{ text: 'Voir ↗', url: 'https://example.test' }]] });
    expect(replaceOrderActionRows(null, []).inline_keyboard).toEqual([]);
  });
});

// ── Traitement du clic ──────────────────────────────────────────────────────────

const cb = (data: string) => ({
  id: 'cbq-1',
  data,
  from: { id: 1001, first_name: 'Testeur' },
  message: {
    message_id: 77,
    chat: { id: -100123, type: 'supergroup' },
    text: '🛍️ NOUVELLE COMMANDE',
    entities: [{ type: 'bold', offset: 3, length: 17 }],
    reply_markup: { inline_keyboard: [[{ text: 'Voir ↗', url: 'https://example.test' }], ...orderActionRows(ORDER_ID, 'pending')] },
  },
});

const makeDeps = (over: Partial<OrderActionDeps> & { result?: OrderActionRpcResult; state?: OrderState | null } = {}) => {
  const telegram = vi.fn(async (_m: string, _b: Record<string, unknown>) => ({}));
  const act = vi.fn(async () => over.result ?? { data: { changed: true, outcome: 'delivered', status: 'delivered', actor: 'Vendeur Test' } });
  const orderState = vi.fn(async () => (over.state === undefined ? { status: 'pending', paymentStatus: 'paid', deliveryMode: 'delivery' } : over.state));
  const deps: OrderActionDeps = {
    actor: { rank: 0, name: 'Vendeur Test' },
    act, orderState, telegram,
    now: () => new Date('2026-11-14T13:05:00Z'),
    ...over,
  };
  return { deps, telegram, act, orderState };
};

const call = (telegram: ReturnType<typeof vi.fn>, method: string) =>
  telegram.mock.calls.find(([m]) => m === method)?.[1] as Record<string, any> | undefined;

describe('handleOrderActionCallback', () => {
  it('ignore les autres callbacks', async () => {
    const { deps, telegram } = makeDeps();
    expect(await handleOrderActionCallback(cb('nav:ack:x'), deps)).toBe(false);
    expect(telegram).not.toHaveBeenCalled();
  });

  it('compte non lié : alerte, aucune écriture', async () => {
    const { deps, act, telegram } = makeDeps({ actor: null });
    expect(await handleOrderActionCallback(cb(orderActionCallbackData('dok', ORDER_ID)), deps)).toBe(true);
    expect(act).not.toHaveBeenCalled();
    expect(call(telegram, 'answerCallbackQuery')).toMatchObject({ text: ORDER_ACTION_REPLIES.notLinked, show_alert: true });
  });

  it('Livrée, commande payée : demande confirmation', async () => {
    const { deps, telegram, act } = makeDeps();
    await handleOrderActionCallback(cb(orderActionCallbackData('dlv', ORDER_ID)), deps);
    expect(act).not.toHaveBeenCalled();
    const rows = call(telegram, 'editMessageReplyMarkup')!.reply_markup.inline_keyboard;
    expect(callbacks(rows)).toEqual([orderActionCallbackData('dok', ORDER_ID), orderActionCallbackData('back', ORDER_ID)]);
    expect(rows[0][0].url).toBe('https://example.test');
  });

  it('Livrée, non payée : propose espèces reçues', async () => {
    const { deps, telegram } = makeDeps({ state: { status: 'shipped', paymentStatus: 'pending', deliveryMode: 'delivery' } });
    await handleOrderActionCallback(cb(orderActionCallbackData('dlv', ORDER_ID)), deps);
    expect(call(telegram, 'answerCallbackQuery')).toMatchObject({ text: ORDER_ACTION_REPLIES.needsPayment, show_alert: true });
    expect(callbacks(call(telegram, 'editMessageReplyMarkup')!.reply_markup.inline_keyboard)[0]).toBe(orderActionCallbackData('cash', ORDER_ID));
  });

  it('commande déjà close : retire les actions', async () => {
    const { deps, telegram } = makeDeps({ state: { status: 'delivered', paymentStatus: 'paid', deliveryMode: 'delivery' } });
    await handleOrderActionCallback(cb(orderActionCallbackData('dlv', ORDER_ID)), deps);
    expect(callbacks(call(telegram, 'editMessageReplyMarkup')!.reply_markup.inline_keyboard)).toEqual([]);
  });

  it('confirmation : appelle la RPC puis ajoute la ligne de suivi et retire les actions', async () => {
    const { deps, telegram, act } = makeDeps();
    await handleOrderActionCallback(cb(orderActionCallbackData('dok', ORDER_ID)), deps);
    expect(act).toHaveBeenCalledWith(ORDER_ID, 'delivered', '1001', undefined);
    const edit = call(telegram, 'editMessageText')!;
    expect(edit.text).toBe('🛍️ NOUVELLE COMMANDE\n✅ Livrée — Vendeur Test, 14:05');
    expect(edit.entities).toEqual([{ type: 'bold', offset: 3, length: 17 }]);
    expect(callbacks(edit.reply_markup.inline_keyboard)).toEqual([]);
  });

  it('édition du texte refusée : met au moins le clavier à jour', async () => {
    const { deps, telegram } = makeDeps();
    telegram.mockImplementation(async (m: string) => { if (m === 'editMessageText') throw new Error('x'); return {}; });
    await handleOrderActionCallback(cb(orderActionCallbackData('dok', ORDER_ID)), deps);
    expect(call(telegram, 'editMessageReplyMarkup')).toBeDefined();
  });

  it('Annuler : refusé sous responsable, sans lecture ni écriture', async () => {
    const { deps, act, orderState, telegram } = makeDeps();
    await handleOrderActionCallback(cb(orderActionCallbackData('cxl', ORDER_ID)), deps);
    await handleOrderActionCallback(cb(orderActionCallbackData('cxr', ORDER_ID, 0)), deps);
    expect(act).not.toHaveBeenCalled();
    expect(orderState).not.toHaveBeenCalled();
    expect(telegram.mock.calls.every(([m, b]) => m === 'answerCallbackQuery' && b.text === ORDER_ACTION_REPLIES.cancelForbidden)).toBe(true);
  });

  it('Annuler (responsable) : motifs puis annulation avec le libellé de la liste', async () => {
    const { deps, telegram, act } = makeDeps({
      actor: { rank: 1, name: 'Resp Test' },
      result: { data: { changed: true, outcome: 'cancelled', status: 'cancelled', actor: 'Resp Test' } },
    });
    await handleOrderActionCallback(cb(orderActionCallbackData('cxl', ORDER_ID)), deps);
    expect(callbacks(call(telegram, 'editMessageReplyMarkup')!.reply_markup.inline_keyboard)).toHaveLength(ORDER_CANCEL_REASONS.length + 1);
    await handleOrderActionCallback(cb(orderActionCallbackData('cxr', ORDER_ID, 2)), deps);
    expect(act).toHaveBeenCalledWith(ORDER_ID, 'cancelled', '1001', 'Rupture de stock');
    expect(call(telegram, 'editMessageText')!.text).toContain('❌ Annulée (Rupture de stock) — Resp Test, 14:05');
  });

  it('Injoignable : garde les actions ; doublon < 10 min signalé', async () => {
    const { deps, telegram } = makeDeps({ result: { data: { changed: true, outcome: 'unreachable', status: 'confirmed', count: 2, actor: 'Vendeur Test' } } });
    await handleOrderActionCallback(cb(orderActionCallbackData('unr', ORDER_ID)), deps);
    const edit = call(telegram, 'editMessageText')!;
    expect(edit.text).toContain('📵 Injoignable (tentative n°2) — Vendeur Test, 14:05');
    expect(callbacks(edit.reply_markup.inline_keyboard)).toContain(orderActionCallbackData('unr', ORDER_ID));

    const again = makeDeps({ result: { data: { changed: false, outcome: 'unreachable_recent', status: 'confirmed', count: 2 } } });
    await handleOrderActionCallback(cb(orderActionCallbackData('unr', ORDER_ID)), again.deps);
    expect(call(again.telegram, 'editMessageText')).toBeUndefined();
    expect(call(again.telegram, 'answerCallbackQuery')!.text).toContain('n°2');
  });

  it('erreurs RPC : 42501, refus métier P0001, panne', async () => {
    const forbidden = makeDeps({ result: { errorCode: '42501' } });
    await handleOrderActionCallback(cb(orderActionCallbackData('unr', ORDER_ID)), forbidden.deps);
    expect(call(forbidden.telegram, 'answerCallbackQuery')!.text).toBe(ORDER_ACTION_REPLIES.notLinked);

    const business = makeDeps({ result: { errorCode: 'P0001', errorMessage: 'Stock insuffisant' } });
    await handleOrderActionCallback(cb(orderActionCallbackData('cash', ORDER_ID)), business.deps);
    expect(call(business.telegram, 'answerCallbackQuery')!.text).toBe('⚠️ Stock insuffisant');

    const down = makeDeps({ result: { errorCode: 'XX000', errorMessage: 'internal detail' } });
    await handleOrderActionCallback(cb(orderActionCallbackData('cash', ORDER_ID)), down.deps);
    expect(call(down.telegram, 'answerCallbackQuery')!.text).toBe(ORDER_ACTION_REPLIES.unavailable);
    expect(call(down.telegram, 'editMessageText')).toBeUndefined();
  });
});

describe('migration 20261114_003', () => {
  it('RPC bot réservée au service_role, transactionnelle', () => {
    expect(SQL).toMatch(/^BEGIN;$/m);
    expect(SQL).toMatch(/^COMMIT;$/m);
    expect(SQL).toMatch(/REVOKE ALL ON FUNCTION public\.telegram_staff_order_action\(text, text, text, text\)\s+FROM PUBLIC, anon, authenticated;/);
    expect(SQL).toMatch(/GRANT EXECUTE ON FUNCTION public\.telegram_staff_order_action\(text, text, text, text\)\s+TO service_role;/);
    expect(SQL).toContain("set_config('request.jwt.claims'");
    expect(SQL).toMatch(/set_config\('[^']+', [^;]+, true\)/);
    expect(SQL).not.toMatch(/set_config\([^;]*false\)/);
    expect(SQL).toContain("'order.' || p_action");
  });

  it('mark_order_cash_paid : garde staff et anon révoqué', () => {
    const body = SQL.slice(SQL.indexOf('CREATE OR REPLACE FUNCTION public.mark_order_cash_paid('));
    expect(body).toMatch(/lower\(s\.email\) = lower\(auth\.jwt\(\) ->> 'email'\)/);
    expect(body).toMatch(/REVOKE ALL ON FUNCTION public\.mark_order_cash_paid\(text, text\) FROM PUBLIC, anon;/);
  });

  it('le bot route les boutons avant le refus réservé à la direction', () => {
    const router = BOT.slice(BOT.indexOf('async function handleCallbackQuery('));
    const route = router.indexOf('handleOrderActionCallback(cb');
    expect(route).toBeGreaterThan(router.indexOf('if (isGroup)'));
    expect(route).toBeLessThan(router.indexOf('staff.rank < RANK_DIRECTION'));
    expect(BOT).toContain('rpc("telegram_staff_order_action"');
  });
});
