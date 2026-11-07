import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_STAFF_EVENT_TYPES,
  dailyDigestLines,
  eventIcon,
  formatPlainNotification,
  isDailyDigest,
  type StaffNotification,
} from '../supabase/functions/_shared/staffNotify';
import { WAHA_DEFAULT_EVENT_TYPES } from '../supabase/functions/_shared/staffNotifyChannels/waha';
import {
  TELEGRAM_MAX_MESSAGE_LENGTH,
  formatTelegramNotification,
  telegramReplyMarkup,
  truncateTelegramText,
} from '../supabase/functions/_shared/staffNotifyChannels/telegram';
import {
  DIGEST_ACK_REPLIES,
  digestAckCallbackData,
  handleDigestAckCallback,
  parseDigestAckCallback,
  stripDigestAckButtons,
} from '../supabase/functions/_shared/telegramDigestAck';
import type { NotificationEventType } from '../services/notificationService';

const MIGRATION_PATH = resolve(__dirname, '../supabase/migrations/20261107_001_notify_daily_digest.sql');
const NOTIFICATION_ID = '11111111-2222-4333-8444-555555555555';
const CTX = { siteUrl: 'https://example.test' };

const digest = (message?: string): StaffNotification => ({
  notification_id: NOTIFICATION_ID,
  event_type: 'daily_digest',
  title: '📅 Bilan du jour — Boutique Test',
  message:
    message ??
    [
      'Journée du 07/11/2026',
      'Ventes : 3 · 1 250 000 FCFA',
      'Canaux : Espèces 1 000 000 FCFA · OM 250000 FCFA',
      'Caisse : non clôturée',
      'Dettes en cours : aucune',
      'Trocs en attente (toutes boutiques) : 2',
      'Objectifs : aucun objectif boutique défini',
    ].join('\n'),
  link_to_tab: 'analytics',
  link_to_id: null,
});

describe('Daily digest — migration 20261107_001', () => {
  const sql = existsSync(MIGRATION_PATH) ? readFileSync(MIGRATION_PATH, 'utf-8') : '';

  it('définit public.notify_daily_digest(p_day) en SECURITY DEFINER, search_path fixé', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.notify_daily_digest\(p_day date DEFAULT NULL\)/);
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path = public, pg_temp/);
    expect(sql).toMatch(/^BEGIN;/m);
    expect(sql).toMatch(/^COMMIT;/m);
  });

  it('est idempotente : dedup_key daily_digest.<store_code>.<YYYY-MM-DD> et ON CONFLICT DO NOTHING', () => {
    expect(sql).toMatch(/v_dedup_prefix\s+constant text\s+:= 'daily_digest'/);
    expect(sql).toMatch(/format\('%s\.%s\.%s', v_dedup_prefix, r\.code, to_char\(v_day, 'YYYY-MM-DD'\)\)/);
    expect(sql).toMatch(/ON CONFLICT \(dedup_key\) DO NOTHING/);
    expect(sql).toMatch(/GET DIAGNOSTICS v_count = ROW_COUNT/);
  });

  it('agrège au fuseau Africa/Douala, par boutique active, depuis orders_reportable', () => {
    expect(sql).toMatch(/v_timezone\s+constant text\s+:= 'Africa\/Douala'/);
    expect(sql).toMatch(/FROM public\.stores s WHERE s\.active/);
    expect(sql).toMatch(/FROM public\.orders_reportable o/);
    expect(sql).toMatch(/public\.order_payments op/);
    expect(sql).toMatch(/public\.store_cash_reports/);
    expect(sql).toMatch(/public\.store_debts/);
    expect(sql).toMatch(/public\.trade_in_requests/);
    expect(sql).toMatch(/public\.sales_targets/);
  });

  it("n'a pas de nombre magique : statuts et libellés sont des constantes nommées", () => {
    expect(sql).toMatch(/v_troc_open_statuses\s+constant text\[\]/);
    expect(sql).toMatch(/v_debt_open_statuses\s+constant text\[\]/);
    expect(sql).toMatch(/v_target_role\s+constant text\s+:= 'responsable'/);
    expect(sql).toMatch(/v_event_type\s+constant text\s+:= 'daily_digest'/);
  });

  it('réserve la fonction au service_role (REVOKE PUBLIC/anon/authenticated)', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.notify_daily_digest\(date\) FROM PUBLIC, anon, authenticated;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.notify_daily_digest\(date\) TO service_role;/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\._format_xaf\(numeric\) FROM PUBLIC, anon, authenticated;/);
  });

  it('planifie daily-digest-evening à 19:00 UTC (20 h Douala) avec unschedule préalable', () => {
    expect(sql).toMatch(/c_job_name\s+constant text := 'daily-digest-evening'/);
    expect(sql).toMatch(/c_schedule_utc constant text := '0 19 \* \* \*'/);
    expect(sql).toMatch(/cron\.unschedule\(jobid\)/);
    expect(sql).toMatch(/\$cron\$SELECT public\.notify_daily_digest\(\);\$cron\$/);
    expect(sql).toMatch(/RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM/);
  });
});

describe('Daily digest — type d’événement', () => {
  it('est relayé par défaut sur Telegram avec son icône, pas sur WhatsApp', () => {
    expect(DEFAULT_STAFF_EVENT_TYPES).toContain('daily_digest');
    expect(eventIcon('daily_digest')).toBe('📅');
    expect(WAHA_DEFAULT_EVENT_TYPES).not.toContain('daily_digest');
  });

  it('existe dans NotificationEventType (front)', () => {
    const t: NotificationEventType = 'daily_digest';
    expect(t).toBe('daily_digest');
  });
});

describe('Daily digest — format', () => {
  it('découpe le message par ligne et espace les milliers des montants FCFA', () => {
    const lines = dailyDigestLines(digest());
    expect(lines).toHaveLength(7);
    expect(lines[2]).toBe('Canaux : Espèces 1 000 000 FCFA · OM 250 000 FCFA');
    expect(isDailyDigest(digest())).toBe(true);
    expect(isDailyDigest({ event_type: 'debt_overdue' })).toBe(false);
  });

  it('texte brut : titre sans emoji en tête puis une ligne par bloc', () => {
    const text = formatPlainNotification(digest(), CTX);
    expect(text.split('\n')[0]).toBe('📅 Bilan du jour — Boutique Test');
    expect(text).toContain('Ventes : 3 · 1 250 000 FCFA');
    expect(text).toContain('https://example.test/admin/analytics');
  });

  it('Telegram : titre en gras, lignes à puce, HTML échappé, pas de sujet souligné', () => {
    const html = formatTelegramNotification(digest('Ventes : 1 <test> & co'));
    expect(html.startsWith('📅 <b>Bilan du jour — Boutique Test</b>\n\n')).toBe(true);
    expect(html).toContain('▫️ Ventes : 1 &lt;test&gt; &amp; co');
    expect(html).not.toContain('<u>');
  });

  it('Telegram : les autres types gardent leur format (sujet souligné, détails « — »)', () => {
    const html = formatTelegramNotification({
      notification_id: NOTIFICATION_ID,
      event_type: 'debt_overdue',
      title: '📋 Dettes en attente — Boutique',
      message: '2 dette(s) de plus de 7 j — 45000 FCFA restants',
    });
    expect(html).toContain('<b><u>2 dette(s) de plus de 7 j</u></b>');
    expect(html).toContain('▫️ 45 000 FCFA restants');
  });

  it('tronque à la dernière ligne complète sous 4096 caractères', () => {
    const longLine = 'x'.repeat(500);
    const html = formatTelegramNotification(digest(Array.from({ length: 12 }, () => longLine).join('\n')));
    expect(html.length).toBeLessThanOrEqual(TELEGRAM_MAX_MESSAGE_LENGTH);
    expect(html.endsWith('…')).toBe(true);
    const body = html.slice(0, -1);
    expect(body.split('\n').every((l) => l === '' || l.startsWith('📅') || l === `▫️ ${longLine}`)).toBe(true);
    expect(truncateTelegramText('abc', 10)).toBe('abc');
  });
});

describe('Daily digest — bouton « Vu »', () => {
  it('ajoute une ligne callback nav:dg_ack:<id> (≤ 64 octets) seulement pour daily_digest', () => {
    const digestRows = telegramReplyMarkup(digest(), CTX).inline_keyboard;
    const ack = digestRows.flat().find((b) => b.callback_data);
    expect(ack?.text).toBe('✅ Vu');
    expect(ack?.callback_data).toBe(`nav:dg_ack:${NOTIFICATION_ID}`);
    expect(new TextEncoder().encode(ack!.callback_data!).length).toBeLessThanOrEqual(64);

    const other = telegramReplyMarkup({ ...digest(), event_type: 'debt_overdue' }, CTX).inline_keyboard;
    expect(other.flat().some((b) => b.callback_data)).toBe(false);
  });

  it('parse le callback et rejette un id qui n’est pas un UUID', () => {
    expect(parseDigestAckCallback(digestAckCallbackData(NOTIFICATION_ID))).toBe(NOTIFICATION_ID);
    expect(parseDigestAckCallback('nav:dg_ack:drop table')).toBeNull();
    expect(parseDigestAckCallback('nav:pcr_v:abc')).toBeNull();
    expect(parseDigestAckCallback(undefined)).toBeNull();
  });

  it('retire le bouton Vu et garde les liens', () => {
    const markup = telegramReplyMarkup(digest(), CTX);
    const stripped = stripDigestAckButtons(markup);
    expect(stripped?.inline_keyboard.flat().some((b) => b.callback_data)).toBe(false);
    expect(stripped?.inline_keyboard.flat().some((b) => b.url?.endsWith('/admin/analytics'))).toBe(true);
    expect(stripDigestAckButtons({ inline_keyboard: [[{ text: '✅ Vu', callback_data: digestAckCallbackData(NOTIFICATION_ID) }]] })).toBeNull();
    expect(stripDigestAckButtons(undefined)).toBeNull();
  });

  const callback = (overrides: Record<string, unknown> = {}) => ({
    id: 'cb1',
    data: digestAckCallbackData(NOTIFICATION_ID),
    from: { id: 42 },
    message: {
      message_id: 7,
      chat: { id: -100, type: 'supergroup' },
      reply_markup: telegramReplyMarkup(digest(), CTX),
    },
    ...overrides,
  });

  it('ignore les autres callbacks (renvoie false sans appel Telegram)', async () => {
    const telegram = vi.fn();
    const handled = await handleDigestAckCallback(callback({ data: 'nav:pcr_v:x' }), { ack: vi.fn(), telegram });
    expect(handled).toBe(false);
    expect(telegram).not.toHaveBeenCalled();
  });

  it('acquitte via la RPC, répond puis retire le bouton du message', async () => {
    const ack = vi.fn().mockResolvedValue({ acknowledged: true });
    const telegram = vi.fn().mockResolvedValue({});
    expect(await handleDigestAckCallback(callback(), { ack, telegram })).toBe(true);
    expect(ack).toHaveBeenCalledWith(NOTIFICATION_ID, '42');
    expect(telegram).toHaveBeenNthCalledWith(1, 'answerCallbackQuery', {
      callback_query_id: 'cb1', text: DIGEST_ACK_REPLIES.acknowledged, show_alert: false,
    });
    const [method, body] = telegram.mock.calls[1] as [string, { chat_id: number; message_id: number; reply_markup: { inline_keyboard: { callback_data?: string }[][] } }];
    expect(method).toBe('editMessageReplyMarkup');
    expect(body.chat_id).toBe(-100);
    expect(body.message_id).toBe(7);
    expect(body.reply_markup.inline_keyboard.flat().some((b) => b.callback_data)).toBe(false);
  });

  it('déjà lue : répond sans alerte et retire quand même le bouton', async () => {
    const telegram = vi.fn().mockResolvedValue({});
    await handleDigestAckCallback(callback(), { ack: vi.fn().mockResolvedValue({ acknowledged: false }), telegram });
    expect(telegram.mock.calls[0][1]).toMatchObject({ text: DIGEST_ACK_REPLIES.alreadyRead });
    expect(telegram.mock.calls[1][0]).toBe('editMessageReplyMarkup');
  });

  it('42501 (vendeur ou compte non lié) : alerte « réservé », bouton conservé', async () => {
    const telegram = vi.fn().mockResolvedValue({});
    await handleDigestAckCallback(callback(), { ack: vi.fn().mockResolvedValue({ acknowledged: false, errorCode: '42501' }), telegram });
    expect(telegram).toHaveBeenCalledTimes(1);
    expect(telegram.mock.calls[0][1]).toMatchObject({ text: DIGEST_ACK_REPLIES.forbidden, show_alert: true });
  });

  it('RPC en erreur ou qui lève : alerte « indisponible », bouton conservé', async () => {
    const telegram = vi.fn().mockResolvedValue({});
    await handleDigestAckCallback(callback(), { ack: vi.fn().mockRejectedValue(new Error('boom')), telegram });
    await handleDigestAckCallback(callback(), { ack: vi.fn().mockResolvedValue({ acknowledged: false, errorCode: 'PGRST' }), telegram });
    expect(telegram).toHaveBeenCalledTimes(2);
    expect(telegram.mock.calls.every(([, body]) => (body as { text: string }).text === DIGEST_ACK_REPLIES.unavailable)).toBe(true);
  });
});
