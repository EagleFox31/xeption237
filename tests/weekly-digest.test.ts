import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STAFF_EVENT_TYPES,
  formatPlainNotification,
  type StaffNotification,
} from '../supabase/functions/_shared/staffNotify';
import { WAHA_DEFAULT_EVENT_TYPES } from '../supabase/functions/_shared/staffNotifyChannels/waha';
import {
  formatTelegramNotification,
  telegramReplyMarkup,
} from '../supabase/functions/_shared/staffNotifyChannels/telegram';
import {
  WEEKLY_DIGEST_EVENT_TYPE,
  formatPlainWeeklyDigest,
  formatTelegramWeeklyDigest,
  isWeeklyDigest,
} from '../supabase/functions/_shared/weeklyDigest';
import type { NotificationEventType } from '../services/notificationService';

const MIGRATION_PATH = resolve(__dirname, '../supabase/migrations/20261114_001_weekly_digest.sql');
const CTX = { siteUrl: 'https://example.test' };
const EMOJI = /\p{Extended_Pictographic}/u;

/** Données fictives : boutiques et montants inventés. */
const weekly = (message?: string): StaffNotification => ({
  notification_id: '11111111-2222-4333-8444-555555555555',
  event_type: WEEKLY_DIGEST_EVENT_TYPE,
  title: 'Bilan de la semaine du 09/11 au 15/11',
  message:
    message ??
    [
      '*Boutique A & Co*',
      'Entrées : 1 000 F',
      'Sorties : 400 F',
      '',
      '*Total semaine*',
      'Entrées 1 000 F | Sorties 400 F | Boss 0 F',
      '',
      '*À noter*',
      '- Rien à signaler.',
    ].join('\n'),
  link_to_tab: 'analytics',
  link_to_id: null,
});

describe('Bilan hebdomadaire — mise en forme', () => {
  it('reconnaît le type weekly_digest et lui seul', () => {
    expect(isWeeklyDigest(weekly())).toBe(true);
    expect(isWeeklyDigest({ event_type: 'daily_digest' })).toBe(false);
  });

  it('Telegram : titre et sections en gras, texte échappé, aucun emoji', () => {
    const text = formatTelegramNotification(weekly());
    expect(text.startsWith('<b>Bilan de la semaine du 09/11 au 15/11</b>\n\n')).toBe(true);
    expect(text).toContain('<b>Boutique A &amp; Co</b>');
    expect(text).toContain('<b>À noter</b>');
    expect(text).toContain('Entrées 1 000 F | Sorties 400 F | Boss 0 F');
    expect(text).not.toMatch(/\*/);
    expect(text).not.toMatch(EMOJI);
  });

  it('garde une ligne vide entre sections et en écrase les doublons', () => {
    const text = formatTelegramWeeklyDigest(weekly('*A*\nx\n\n\n\n*B*\ny'), (t) => t);
    expect(text).toBe('<b>Bilan de la semaine du 09/11 au 15/11</b>\n\n<b>A</b>\nx\n\n<b>B</b>\ny');
  });

  it('ne met pas en gras une ligne qui contient seulement des astérisques internes', () => {
    const text = formatTelegramWeeklyDigest(weekly('Prix *promo* : 10 F'), (t) => t);
    expect(text.endsWith('Prix *promo* : 10 F')).toBe(true);
  });

  it('texte brut : balisage WhatsApp conservé, lien en dernière ligne', () => {
    const text = formatPlainNotification(weekly(), CTX);
    expect(text.split('\n')[0]).toBe('*Bilan de la semaine du 09/11 au 15/11*');
    expect(text).toContain('*Total semaine*');
    expect(text.endsWith('\n\nhttps://example.test/admin/analytics')).toBe(true);
    expect(text).not.toMatch(EMOJI);
    expect(formatPlainWeeklyDigest(weekly())).not.toContain('https://');
  });

  it('pas de bouton « Vu » réservé au bilan journalier', () => {
    const markup = telegramReplyMarkup(weekly(), CTX);
    expect(JSON.stringify(markup)).not.toContain('callback_data');
    expect(markup.inline_keyboard[0][0].url).toBe('https://example.test/admin/analytics');
  });
});

describe('Bilan hebdomadaire — routage', () => {
  it('relayé par défaut (Telegram), pas sur WhatsApp tant que Trigenys Notify ne le gère pas', () => {
    expect(DEFAULT_STAFF_EVENT_TYPES).toContain('weekly_digest');
    expect(WAHA_DEFAULT_EVENT_TYPES).not.toContain('weekly_digest');
    const type: NotificationEventType = 'weekly_digest';
    expect(type).toBe(WEEKLY_DIGEST_EVENT_TYPE);
  });
});

describe('Migration 20261114_001 — contrat SQL', () => {
  const sql = readFileSync(MIGRATION_PATH, 'utf8');

  it('transactionnelle et rejouable', () => {
    expect(sql).toMatch(/^BEGIN;$/m);
    expect(sql).toMatch(/^COMMIT;$/m);
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.notify_weekly_digest(p_day date DEFAULT NULL)');
    expect(sql).toContain('ON CONFLICT (dedup_key) DO NOTHING');
    expect(sql).toMatch(/cron\.unschedule\(j\.jobid\) FROM cron\.job j WHERE j\.jobname = c_job_name/);
  });

  it('dedup par semaine ISO et lundi 07:00 UTC (08 h Douala)', () => {
    expect(sql).toContain("to_char(v_week_start, 'IYYY-\"W\"IW')");
    expect(sql).toContain("c_job_name     constant text := 'weekly-digest-monday'");
    expect(sql).toContain("c_schedule_utc constant text := '0 7 * * 1'");
    expect(sql).toContain("(now() AT TIME ZONE v_timezone)::date - 1");
  });

  it('réservée au service_role', () => {
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.notify_weekly_digest(date) FROM PUBLIC, anon, authenticated;');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.notify_weekly_digest(date) TO service_role;');
    expect(sql).toMatch(/SECURITY DEFINER\s+SET search_path = public, pg_temp/);
  });

  it('ne lit aucune donnée client et n’écrit que dans admin_notifications', () => {
    expect(sql).not.toMatch(/customer_name|phone|device_model/);
    const writes = sql.match(/\b(INSERT INTO|UPDATE|DELETE FROM)\s+[\w.]+/g) ?? [];
    expect(writes).toEqual(['INSERT INTO public.admin_notifications']);
  });

  it('message sans emoji (format validé par la direction)', () => {
    const body = sql.slice(sql.indexOf('AS $$'), sql.indexOf('$$;'));
    expect(body).not.toMatch(EMOJI);
  });
});
