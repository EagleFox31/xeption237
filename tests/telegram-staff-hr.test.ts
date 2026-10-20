import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20261020_015_telegram_staff_hr.sql', 'utf8');
const bot = readFileSync('supabase/functions/telegram-bot-entry/index.ts', 'utf8');
const targetsMigration = readFileSync('supabase/migrations/20260824_025_erp_step7_sales_targets.sql', 'utf8');

const body = (src: string, fn: string) => {
  const start = src.indexOf(`FUNCTION public.${fn}(`);
  return src.slice(start, src.indexOf('$$;', start));
};

const RPCS = {
  telegram_staff_hr_overview: '(text)',
  telegram_staff_set_member_active: '(text, uuid, boolean)',
  telegram_staff_set_sales_target: '(text, uuid, text, numeric)'
};

describe('Telegram HR migration', () => {
  it('is transactional and every RPC is a pinned SECURITY DEFINER', () => {
    expect(sql).toMatch(/^BEGIN;/m);
    expect(sql).toMatch(/^COMMIT;/m);
    for (const fn of ['_telegram_hr_actor', ...Object.keys(RPCS)]) {
      expect(body(sql, fn)).toContain('SECURITY DEFINER');
      expect(body(sql, fn)).toContain('SET search_path = public');
    }
  });

  it('exposes the RPCs to service_role only', () => {
    for (const [fn, sig] of Object.entries(RPCS)) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${fn}${sig}\n  FROM PUBLIC, anon, authenticated;`);
      expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.${fn}${sig} TO service_role;`);
    }
    for (const helper of ['_staff_role_rank(text)', '_telegram_hr_actor(text)']) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${helper} FROM PUBLIC, anon, authenticated;`);
      expect(sql).not.toContain(`GRANT EXECUTE ON FUNCTION public.${helper}`);
    }
  });

  it('re-identifies a linked, non-banned direction member', () => {
    const actor = body(sql, '_telegram_hr_actor');
    expect(actor).toContain('l.revoked_at IS NULL');
    expect(actor).toContain('banned_until');
    expect(actor).toContain("ERRCODE = '42501'");
    expect(actor).toContain('< 2');
  });

  it('checks the actor before any write and never audits a no-op', () => {
    for (const fn of ['telegram_staff_set_member_active', 'telegram_staff_set_sales_target']) {
      const src = body(sql, fn);
      const firstWrite = Math.min(...['UPDATE ', 'INSERT '].map(k => src.indexOf(k)).filter(i => i >= 0));
      expect(src.indexOf('_telegram_hr_actor(')).toBeLessThan(firstWrite);
      expect(src.indexOf('INSERT INTO public.telegram_staff_action_audit'))
        .toBeGreaterThan(src.lastIndexOf("RETURN jsonb_build_object('changed', false"));
      expect(src).toContain("set_config('app.actor_name', coalesce(v_actor.o_staff_name, ''), true)");
    }
  });

  it('deactivation guards self / rank / account and cuts Telegram access', () => {
    const src = body(sql, 'telegram_staff_set_member_active');
    for (const reason of ["'self'", "'rank'", "'no_account'"]) expect(src).toContain(reason);
    expect(src).toContain('UPDATE public.telegram_staff_links SET revoked_at = now()');
    expect(src).toContain("SET status = 'rejected'");
  });

  it('targets upsert on the ERP unique index without the JWT-bound ERP RPC', () => {
    const src = body(sql, 'telegram_staff_set_sales_target');
    expect(targetsMigration).toMatch(/ux_sales_targets_staff_period[\s\S]*?\(staff_id, period_kind\)[\s\S]*?WHERE scope_type = 'staff'/);
    expect(src).toContain("ON CONFLICT (staff_id, period_kind) WHERE scope_type = 'staff'");
    expect(src).toContain("('daily', 'weekly', 'monthly')");
    expect(src).not.toContain('upsert_sales_target');
    expect(src).not.toContain('_require_direction_staff');
  });
});

describe('Telegram bot HR section', () => {
  it('shows the HR button in the direction menu only', () => {
    const main = bot.slice(bot.indexOf('async function screenMain('), bot.indexOf('async function screenStore('));
    const [direction, others] = main.split('const rows: InlineButton[][] = [[');
    expect(direction).toContain('callback_data: "nav:rh"');
    expect(others).not.toContain('nav:rh');
  });

  it('every HR screen and action is gated on the direction rank', () => {
    const fns = [...bot.matchAll(/async function ((?:screenHr|actionHr)\w*)\(staff: StaffMember[^{]*\{\n(.*)\n/g)];
    expect(fns.length).toBeGreaterThanOrEqual(8);
    for (const [, name, firstLine] of fns) {
      expect(firstLine, name).toMatch(/if \(staff\.rank < RANK_DIRECTION\) return hrDenied\(\);|await hrMember\(staff,|if \(!isHrPeriod\(period\)\)/);
    }
    expect(bot).toMatch(/async function hrMember[^{]*\{\n\s+if \(staff\.rank < RANK_DIRECTION\) return hrDenied\(\);/);
  });

  it('routes every HR callback and handles the free-amount reply', () => {
    for (const route of ['rh', 'rh_s', 'rh_p', 'rh_na', 'rh_m', 'rh_xc', 'rh_x', 'rh_o', 'rh_op', 'rh_ov', 'rh_oc']) {
      expect(bot).toContain(`action === "${route}"`);
    }
    expect(bot).toContain('force_reply: true');
    expect(bot).toMatch(/is_bot === true\s+\? parseObjectiveTag/);
  });
});
