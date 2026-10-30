import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { WAHA_DEFAULT_EVENT_TYPES, NOTIFY_EVENT_ALIASES } from '../supabase/functions/_shared/staffNotifyChannels/waha';
import { DEFAULT_STAFF_EVENT_TYPES, eventIcon } from '../supabase/functions/_shared/staffNotify';
import type { NotificationEventType } from '../services/notificationService';

const MIGRATION_PATH = resolve(__dirname, '../supabase/migrations/20261027_002_notify_time_based_reminders.sql');

describe('Lot 1 — Rappels staff liés au temps (Migration 20261027_002)', () => {
  it('le fichier de migration existe et est non vide', () => {
    expect(existsSync(MIGRATION_PATH)).toBe(true);
    const sql = readFileSync(MIGRATION_PATH, 'utf-8');
    expect(sql.length).toBeGreaterThan(100);
  });

  describe('Structure SQL et sécurité de la fonction notify_time_based_reminders()', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf-8');

    it('définit public.notify_time_based_reminders avec SECURITY DEFINER et search_path fixé', () => {
      expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.notify_time_based_reminders\(\)/);
      expect(sql).toMatch(/SECURITY DEFINER/);
      expect(sql).toMatch(/SET search_path = public, pg_temp/);
    });

    it('définit des constantes nommées dans le DECLARE sans intervalles en dur', () => {
      expect(sql).toMatch(/v_troc_stale_threshold\s+constant interval := interval '48 hours'/);
      expect(sql).toMatch(/v_troc_stale_max_age\s+constant interval := interval '14 days'/);
      expect(sql).toMatch(/v_voucher_warn_threshold\s+constant interval := interval '48 hours'/);
      expect(sql).toMatch(/v_debt_overdue_threshold\s+constant interval := interval '7 days'/);
    });

    it('empêche l avalanche au premier passage (troc créé il y a moins de 14 jours)', () => {
      expect(sql).toMatch(/r\.created_at >= now\(\) - v_troc_stale_max_age/);
      expect(sql).toMatch(/coalesce\(r\.updated_at, r\.created_at\) < now\(\) - v_troc_stale_threshold/);
      expect(sql).toMatch(/r\.status IN \('pending', 'accepted'\)/);
      expect(sql).toMatch(/format\('troc_stale\.%s', r\.id\)/);
    });

    it('traite les bons de troc qui expirent avec voucher_reference IS NOT NULL et exclusion de refused/cancelled', () => {
      expect(sql).toMatch(/r\.voucher_reference IS NOT NULL/);
      expect(sql).toMatch(/r\.voucher_expires_at > now\(\)/);
      expect(sql).toMatch(/r\.voucher_expires_at <= now\(\) \+ v_voucher_warn_threshold/);
      expect(sql).toMatch(/r\.status NOT IN \('completed', 'cancelled', 'refused'\)/);
      expect(sql).toMatch(/format\('voucher_expiring\.%s', r\.id\)/);
    });

    it('agrège les dettes par boutique et semaine ISO Africa/Douala sans données client, sans onglet admin et visible par tout le staff', () => {
      expect(sql).toMatch(/to_char\(now\(\) AT TIME ZONE 'Africa\/Douala', 'IYYY-"W"IW'\)/);
      expect(sql).toMatch(/format\('debt_overdue\.%s\.%s', d\.store_id, v_current_iso_week\)/);
      expect(sql).toMatch(/d\.status IN \('active', 'partial'\)/);
      expect(sql).toMatch(/d\.created_at <= now\(\) - v_debt_overdue_threshold/);
      expect(sql).toMatch(/GROUP BY d\.store_id, s\.name/);
      // Aucune référence aux colonnes clients (customer_name, customer_phone, etc.)
      const debtBlock = sql.slice(sql.indexOf('format(\'debt_overdue'), sql.indexOf('ON CONFLICT (dedup_key) DO NOTHING;', sql.indexOf('format(\'debt_overdue')));
      expect(debtBlock).not.toMatch(/customer_name|customer_phone|client/i);
      // link_to_tab = NULL, link_to_id = NULL, target_role = NULL (pas d'onglet admin, tout staff/direction)
      expect(debtBlock).toMatch(/NULL,\s*--\s*link_to_tab/i);
      expect(debtBlock).toMatch(/NULL,\s*--\s*link_to_id/i);
      expect(debtBlock).toMatch(/NULL,\s*--\s*target_role/i);
    });

    it('ferme strictement les privilèges à PUBLIC/anon/authenticated et accorde à service_role', () => {
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.notify_time_based_reminders\(\) FROM PUBLIC, anon, authenticated;/);
      expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.notify_time_based_reminders\(\) TO service_role;/);
    });

    it('planifie le job pg_cron de 8h à 20h Douala (0 7-19 * * * UTC) de façon réutilisable et idempotente', () => {
      expect(sql).toMatch(/WHERE jobname = 'time-based-reminders-hourly'/);
      expect(sql).toMatch(/PERFORM cron\.unschedule\(jobid\)/);
      expect(sql).toMatch(/'time-based-reminders-hourly',\s*'0 7-19 \* \* \*'/);
      expect(sql).toMatch(/\$cron\$SELECT public\.notify_time_based_reminders\(\);\$cron\$/);
    });
  });

  describe('Alignement canaux Telegram et WAHA', () => {
    it('DEFAULT_STAFF_EVENT_TYPES relaie les rappels temporels sur Telegram', () => {
      expect(DEFAULT_STAFF_EVENT_TYPES).toContain('troc_stale');
      expect(DEFAULT_STAFF_EVENT_TYPES).toContain('voucher_expiring');
      expect(DEFAULT_STAFF_EVENT_TYPES).toContain('debt_overdue');
      expect(eventIcon('troc_stale')).toBe('⏱️');
      expect(eventIcon('voucher_expiring')).toBe('⏳');
      expect(eventIcon('debt_overdue')).toBe('📋');
    });
    it('NotificationEventType accepte troc_stale, voucher_expiring, debt_overdue', () => {
      const types: NotificationEventType[] = ['troc_stale', 'voucher_expiring', 'debt_overdue'];
      expect(types).toHaveLength(3);
    });

    it('WAHA_DEFAULT_EVENT_TYPES inclut voucher_expiring', () => {
      expect(WAHA_DEFAULT_EVENT_TYPES).toContain('voucher_expiring');
    });

    it('NOTIFY_EVENT_ALIASES mappe voucher_expiring vers barter.voucher_expiring', () => {
      expect(NOTIFY_EVENT_ALIASES['voucher_expiring']).toBe('barter.voucher_expiring');
    });
  });
});
