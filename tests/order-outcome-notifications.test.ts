import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { ORDER_CANCEL_REASONS, ORDER_OPEN_STATUSES } from '../utils/orderWorkflow';
import { DEFAULT_STAFF_EVENT_TYPES } from '../supabase/functions/_shared/staffNotify';
import { NOTIFY_EVENT_ALIASES, WAHA_DEFAULT_EVENT_TYPES } from '../supabase/functions/_shared/staffNotifyChannels/waha';
import type { NotificationEventType } from '../services/notificationService';

const MIGRATION_PATH = resolve(__dirname, '../supabase/migrations/20261114_002_order_outcome_notifications.sql');
const sql = existsSync(MIGRATION_PATH) ? readFileSync(MIGRATION_PATH, 'utf-8') : '';

/** Corps d'une fonction SQL (entre son CREATE et le $$; qui la ferme). */
const fnBody = (name: string): string => {
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = sql.indexOf('$$;', start);
  return sql.slice(start, end);
};

const openStatusesSql = `IN (${ORDER_OPEN_STATUSES.map((s) => `'${s}'`).join(', ')})`;

describe('Migration 20261110_001 — suivi de commande', () => {
  it('existe, est transactionnelle et ne touche ni orders_status_check ni sync_order_stock_on_status', () => {
    expect(sql.length).toBeGreaterThan(500);
    expect(sql).toMatch(/^BEGIN;$/m);
    expect(sql).toMatch(/^COMMIT;$/m);
    const code = sql.replace(/--.*$/gm, '');
    expect(code).not.toMatch(/orders_status_check/);
    expect(code).not.toMatch(/sync_order_stock_on_status/);
  });

  it('ajoute les colonnes du compteur « injoignable » de façon rejouable', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS unreachable_count integer NOT NULL DEFAULT 0/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS last_unreachable_at timestamptz/);
    expect(sql).toMatch(/CHECK \(unreachable_count >= 0\)/);
    expect(sql).toMatch(/IF NOT EXISTS \(\s*SELECT 1 FROM pg_constraint/);
  });

  it('la table orders est datée par « date » (pas de created_at)', () => {
    expect(fnBody('notify_order_stale')).not.toMatch(/created_at/);
    expect(fnBody('notify_order_stale')).toMatch(/o\.date < now\(\) - v_first_threshold/);
  });

  describe('notify_order_outcome', () => {
    const body = () => fnBody('notify_order_outcome');

    it('trigger AFTER UPDATE OF status, rejouable', () => {
      expect(sql).toMatch(/DROP TRIGGER IF EXISTS trg_notify_order_outcome ON public\.orders;/);
      expect(sql).toMatch(/CREATE TRIGGER trg_notify_order_outcome\s+AFTER UPDATE OF status ON public\.orders/);
    });

    it('ne réagit qu’à delivered / cancelled, hors ventes comptoir', () => {
      expect(body()).toMatch(/OLD\.status IS NOT DISTINCT FROM NEW\.status/);
      expect(body()).toMatch(/NEW\.status NOT IN \('delivered', 'cancelled'\)/);
      expect(body()).toMatch(/NEW\.delivery_mode = 'pos'/);
    });

    it('dedup order.<status>.<id> et ON CONFLICT DO NOTHING', () => {
      expect(body()).toMatch(/format\('order\.%s\.%s', NEW\.status, NEW\.id\)/);
      expect(body()).toMatch(/'order_' \|\| NEW\.status/);
      expect(body()).toMatch(/ON CONFLICT \(dedup_key\) DO NOTHING/);
    });

    it('ne relaie que les motifs de la liste fermée ORDER_CANCEL_REASONS (miroir exact)', () => {
      const m = body().match(/c_reasons constant text\[\] := ARRAY\[([^\]]+)\]/);
      expect(m).not.toBeNull();
      const sqlReasons = m![1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
      expect(sqlReasons).toEqual([...ORDER_CANCEL_REASONS]);
      expect(body()).toMatch(/NEW\.cancellation_reason = ANY \(c_reasons\)/);
    });

    it('un échec d’alerte ne bloque jamais le changement de statut', () => {
      expect(body()).toMatch(/EXCEPTION WHEN OTHERS THEN[\s\S]*RAISE WARNING 'notify_order_outcome/);
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.notify_order_outcome\(\) FROM PUBLIC, anon, authenticated;/);
    });
  });

  describe('mark_order_unreachable', () => {
    const body = () => fnBody('mark_order_unreachable');

    it('SECURITY DEFINER, search_path fixé, réservé au staff connecté', () => {
      expect(body()).toMatch(/SECURITY DEFINER/);
      expect(body()).toMatch(/SET search_path = public, pg_temp/);
      expect(body()).toMatch(/FROM public\._current_staff_ctx\(\)/);
      expect(body()).toMatch(/RAISE EXCEPTION 'Accès réservé à l''équipe'/);
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.mark_order_unreachable\(text\) FROM PUBLIC, anon;/);
      expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.mark_order_unreachable\(text\) TO authenticated;/);
    });

    it('verrouille la ligne et n’accepte que les statuts ouverts', () => {
      expect(body()).toMatch(/FOR UPDATE/);
      expect(body()).toContain(`v_order.status NOT ${openStatusesSql}`);
    });

    it('idempotent sur 10 min : aucune écriture, résultat skipped', () => {
      expect(body()).toMatch(/last_unreachable_at > v_at - interval '10 minutes'/);
      expect(body()).toMatch(/'skipped', true/);
    });

    it('dedup par tentative et message « tentative n°N »', () => {
      expect(body()).toMatch(/format\('order\.unreachable\.%s\.%s', p_order_id, v_count\)/);
      expect(body()).toMatch(/'order_unreachable'/);
      expect(body()).toMatch(/format\('tentative n°%s', v_count\)/);
      expect(body()).toMatch(/ON CONFLICT \(dedup_key\) DO NOTHING/);
    });
  });

  describe('notify_order_stale + pg_cron', () => {
    const body = () => fnBody('notify_order_stale');

    it('paliers 48 h puis 7 j, âge max 30 j, lot de 20', () => {
      expect(body()).toMatch(/v_first_threshold\s+constant interval := interval '48 hours'/);
      expect(body()).toMatch(/v_second_threshold constant interval := interval '7 days'/);
      expect(body()).toMatch(/v_max_age\s+constant interval := interval '30 days'/);
      expect(body()).toMatch(/v_batch_limit\s+constant integer\s+:= 20/);
      expect(body()).toMatch(/format\('order\.stale\.%s\.%s', d\.id, d\.tier\)/);
      expect(body()).toMatch(/THEN '7d' ELSE '48h'/);
    });

    it('statuts ouverts identiques au front, ventes comptoir exclues', () => {
      expect(body()).toContain(`o.status ${openStatusesSql}`);
      expect(body()).toMatch(/o\.delivery_mode IS DISTINCT FROM 'pos'/);
    });

    it('NOT EXISTS sur la dedup avant le LIMIT (les commandes déjà relancées ne bloquent pas le lot)', () => {
      const b = body();
      const notExists = b.indexOf('NOT EXISTS');
      const limit = b.indexOf('LIMIT v_batch_limit');
      expect(notExists).toBeGreaterThan(0);
      expect(limit).toBeGreaterThan(notExists);
      expect(b.indexOf('ORDER BY c.date')).toBeLessThan(limit);
    });

    it('droits service_role uniquement', () => {
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.notify_order_stale\(\) FROM PUBLIC, anon, authenticated;/);
      expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.notify_order_stale\(\) TO service_role;/);
    });

    it('job pg_cron rejouable (unschedule puis schedule)', () => {
      expect(sql).toMatch(/WHERE jobname = 'order-stale-hourly';/);
      expect(sql).toMatch(/'order-stale-hourly',\s+'15 7-19 \* \* \*',\s+\$cron\$SELECT public\.notify_order_stale\(\);\$cron\$/);
      expect(sql).toMatch(/RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;/);
    });
  });
});

describe('Contrat des 4 événements côté producteur', () => {
  const types = ['order_delivered', 'order_cancelled', 'order_unreachable', 'order_stale'] as const;
  // Vérification de type : la liste compile seulement si l'union les contient.
  const typed: NotificationEventType[] = [...types];

  it('relayés par défaut sur Telegram et WhatsApp, avec un alias order.*', () => {
    for (const t of typed) {
      expect(DEFAULT_STAFF_EVENT_TYPES).toContain(t);
      expect(WAHA_DEFAULT_EVENT_TYPES).toContain(t);
      expect(NOTIFY_EVENT_ALIASES[t]).toBe(t.replace('order_', 'order.'));
      expect(sql).toContain(t === 'order_delivered' || t === 'order_cancelled' ? "'order_' || NEW.status" : `'${t}'`);
    }
  });
});
