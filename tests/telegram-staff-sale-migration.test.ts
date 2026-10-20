import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const sql = read('supabase/migrations/20261020_018_telegram_staff_sale.sql');
const bot = read('supabase/functions/telegram-bot-entry/index.ts');

const body = (fn: string) => {
  const start = sql.indexOf(`FUNCTION public.${fn}(`);
  return sql.slice(start, sql.indexOf('$$;', start));
};

const RPCS = {
  telegram_staff_sale_draft_open: '(text, text, text)',
  telegram_staff_sale_draft_set_customer: '(text, uuid, text, text)',
  telegram_staff_complete_sale: '(text, uuid)',
  telegram_staff_sale_draft_cancel: '(text, uuid)'
};

describe('Telegram sale migration', () => {
  it('is transactional and every function is a pinned SECURITY DEFINER', () => {
    expect(sql).toMatch(/^BEGIN;/m);
    expect(sql).toMatch(/^COMMIT;/m);
    for (const fn of ['_telegram_staff_actor', ...Object.keys(RPCS)]) {
      expect(body(fn)).toContain('SECURITY DEFINER');
      expect(body(fn)).toContain('SET search_path = public');
    }
  });

  it('exposes the RPCs to service_role only', () => {
    for (const [fn, sig] of Object.entries(RPCS)) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${fn}${sig}\n  FROM PUBLIC, anon, authenticated;`);
      expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.${fn}${sig} TO service_role;`);
    }
    expect(sql).toContain('REVOKE ALL ON FUNCTION public._telegram_staff_actor(text) FROM PUBLIC, anon, authenticated;');
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\._telegram_staff_actor/);
  });

  it('locks the drafts table behind RLS', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.telegram_sale_drafts');
    expect(sql).toContain('ALTER TABLE public.telegram_sale_drafts ENABLE ROW LEVEL SECURITY;');
    expect(sql).not.toMatch(/CREATE POLICY/);
  });

  it('every RPC re-identifies the sender', () => {
    for (const fn of Object.keys(RPCS)) {
      expect(body(fn)).toContain('public._telegram_staff_actor(p_telegram_user_id)');
    }
  });

  it('never trusts the caller for store, seller or price', () => {
    for (const fn of Object.keys(RPCS)) {
      expect(body(fn)).not.toMatch(/p_store_id|p_staff_id|p_price|p_total/);
    }
    expect(body('telegram_staff_sale_draft_open')).toMatch(/FROM public\.products p WHERE p\.id = p_product_id/);
    expect(body('telegram_staff_complete_sale')).toContain("'price_changed'");
  });

  it('completes idempotently through the shared POS core', () => {
    const complete = body('telegram_staff_complete_sale');
    expect(complete).toContain('FOR UPDATE');
    expect(complete).toContain("IF v_draft.status = 'completed' THEN");
    expect(complete).toContain('public._pos_sale_core(');
    expect(complete).toContain("set_config('app.actor_name'");
    expect(complete).toContain('ON CONFLICT (dedup_key) DO NOTHING');
    expect(complete).toContain("'pos_sale'");
  });

  it('accepts exactly the payment methods the bot offers', () => {
    expect(body('telegram_staff_sale_draft_open')).toContain("NOT IN ('CASH', 'OM', 'MOMO')");
  });
});

describe('Telegram bot sale wiring', () => {
  it('goes through the Telegram RPCs, never the ERP one', () => {
    expect(bot).not.toContain('complete_pos_sale_atomic');
    for (const fn of Object.keys(RPCS)) expect(bot).toContain(`"${fn}"`);
  });

  it('routes the sale callbacks and the #VTE reply', () => {
    for (const action of ['sv', 'sp', 'sc', 'sx']) expect(bot).toContain(`action === "${action}"`);
    expect(bot).toContain('parseSaleTag(');
  });

  it('only offers the sale from the seller own store', () => {
    expect(bot).toMatch(/staff\.store && store\?\.id === staff\.store\.id && product\.stock > 0 && cbFits\(/);
  });
});
