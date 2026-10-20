import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20261020_012_telegram_staff_activation_requests.sql', 'utf8');
const bot = readFileSync('supabase/functions/telegram-bot-entry/index.ts', 'utf8');

describe('Telegram staff activation approved by the direction', () => {
  it('requests table and RPCs are service_role only', () => {
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.telegram_staff_activation_requests FROM PUBLIC, anon, authenticated;/);
    for (const fn of [
      '_telegram_direction_ids\\(TEXT\\)',
      'telegram_staff_link_by_phone\\(TEXT, TEXT\\)',
      'telegram_staff_activation_decide\\(UUID, TEXT, TEXT\\)',
    ]) {
      expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\s+FROM PUBLIC, anon, authenticated;`));
      expect(sql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn} TO service_role;`));
    }
  });

  it('is replayable and keeps one open request per Telegram account', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.telegram_staff_activation_requests');
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS \S+\s+ON public\.telegram_staff_activation_requests \(telegram_user_id\) WHERE status = 'pending';/);
    expect(sql).toContain("ON CONFLICT (telegram_user_id) WHERE status = 'pending'");
  });

  it('keeps the existing link guarantees and throttles direction alerts', () => {
    expect(sql).toContain("'phone_ambiguous'");
    expect(sql).toContain("'use_erp_code'");
    expect(sql).toContain("'telegram_already_linked'");
    expect(sql).toContain("'staff_already_linked'");
    expect(sql).toContain("'link.phone'");
    expect(sql).toContain("interval '10 minutes'");
  });

  it('decision is direction only, single and audited', () => {
    expect(sql).toContain("lower(s.role) IN ('direction', 'admin', 'super_admin')");
    expect(sql).toContain("RAISE EXCEPTION 'Direction only' USING ERRCODE = '42501'");
    expect(sql).toMatch(/WHERE id = p_request_id FOR UPDATE;/);
    expect(sql).toContain("IF v_request.status <> 'pending' THEN");
    expect(sql).toContain("'activation.approve'");
    expect(sql).toContain("'activation.reject'");
    // Le numéro vérifié doit toujours correspondre à la fiche au moment de la décision.
    expect(sql).toContain('IS DISTINCT FROM v_request.phone_digits');
  });

  it('bot routes the decision through the RPC and links with the verified number', () => {
    expect(bot).toContain('"telegram_staff_activation_decide"');
    expect(bot).toContain('action === "act"');
    expect(bot).toContain('p_phone: result.phone_digits');
    expect(bot).toMatch(/if \(staff\.rank < RANK_DIRECTION\) \{\s+return \{ text: "🔒 Activation réservée à la direction\."/);
  });

  it('bot never shows the generated password', () => {
    const fn = bot.slice(bot.indexOf('async function actionActivation'), bot.indexOf('// ── Rendu des Écrans'));
    expect(fn).toContain('password: unusablePassword()');
    expect(fn).not.toMatch(/text:[^\n]*password/i);
  });

  it('activation callbacks fit Telegram 64-byte limit', () => {
    const uuid = '00000000-0000-0000-0000-000000000000';
    expect(new TextEncoder().encode(`nav:act:ok:${uuid}`).length).toBeLessThanOrEqual(64);
  });
});
