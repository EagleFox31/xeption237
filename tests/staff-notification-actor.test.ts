import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20261020_014_staff_notification_actor.sql', 'utf8');
const previous = readFileSync('supabase/migrations/20261020_007_telegram_staff_stock_and_troc.sql', 'utf8');

const body = (src: string, fn: string) => {
  const start = src.indexOf(`FUNCTION public.${fn}(`);
  return src.slice(start, src.indexOf('$$;', start));
};

describe('Staff notification actor ("Par : <nom>")', () => {
  it('stamps the actor once, before insert, without ever blocking the alert', () => {
    expect(sql).toMatch(/BEFORE INSERT ON public\.admin_notifications\s+FOR EACH ROW EXECUTE FUNCTION public\.stamp_admin_notification_actor\(\)/);
    const stamp = body(sql, 'stamp_admin_notification_actor');
    expect(stamp).toContain("position('Par : ' IN coalesce(NEW.message, '')) = 0");
    expect(stamp).toContain("concat_ws(' — '");
    expect(stamp).toContain('EXCEPTION WHEN OTHERS');
  });

  it('resolves the actor from the bot setting first, then the staff session', () => {
    const actor = body(sql, '_notification_actor_name');
    expect(actor.indexOf("current_setting('app.actor_name', true)")).toBeLessThan(actor.indexOf('auth.uid()'));
    expect(actor).toContain('JOIN public.staff s');
  });

  it('telegram troc action passes the staff name for the transaction only', () => {
    expect(body(sql, 'telegram_staff_troc_action')).toContain("set_config('app.actor_name', coalesce(v_staff_name, ''), true)");
  });

  it('keeps the previous troc action contract (roles, state machine, audit, grants)', () => {
    const strip = (s: string) => s
      .replace(/SELECT l\.auth_user_id, lower\(s\.role\)[^\n]*/, 'SELECT')
      .replace(/.*v_staff_name.*\n/g, '')
      .replace(/.*app\.actor_name.*\n/g, '')
      .replace(/.*Local à la transaction.*\n/g, '')
      .replace(/\s+/g, ' ');
    expect(strip(body(sql, 'telegram_staff_troc_action'))).toBe(strip(body(previous, 'telegram_staff_troc_action')));
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.telegram_staff_troc_action\([^)]*\)\s+FROM PUBLIC, anon, authenticated;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.telegram_staff_troc_action\([^)]*\)\s+TO service_role;/);
  });

  it('helpers are not callable by clients', () => {
    for (const fn of ['_notification_actor_name', 'stamp_admin_notification_actor']) {
      expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\(\\)\\s+FROM PUBLIC, anon, authenticated;`));
    }
  });
});
