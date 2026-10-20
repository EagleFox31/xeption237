import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20261020_009_telegram_link_by_phone.sql', 'utf8');
const bot = readFileSync('supabase/functions/telegram-bot-entry/index.ts', 'utf8');
const api = readFileSync('supabase/functions/telegram-miniapp-api/index.ts', 'utf8');

describe('Telegram link by shared phone number', () => {
  it('RPC is service_role only', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.telegram_staff_link_by_phone\(TEXT, TEXT\)\s+FROM PUBLIC, anon, authenticated;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.telegram_staff_link_by_phone\(TEXT, TEXT\) TO service_role;/);
  });

  it('requires a unique full-number match and keeps direction on the ERP code', () => {
    expect(sql).toContain("v_digits !~ '^[0-9]{9}$'");
    expect(sql).toContain("'phone_ambiguous'");
    expect(sql).toContain("('vendeur', 'editor', 'responsable', 'manager', 'manager_vente')");
    expect(sql).toContain("'use_erp_code'");
    expect(sql).toContain("'no_account'");
  });

  it('is idempotent and never steals an active link', () => {
    expect(sql).toContain("'changed', false");
    expect(sql).toContain("'telegram_already_linked'");
    expect(sql).toContain("'staff_already_linked'");
    expect(sql).toContain("'link.phone'");
  });

  it('bot only accepts the sender own contact', () => {
    expect(bot).toContain('contact.user_id !== fromId');
    expect(bot).toMatch(/request_contact:\s*true/);
    expect(bot).toContain('"telegram_staff_link_by_phone"');
    expect(bot).not.toContain('bind_staff_by_phone');
  });

  it('bot troc actions go through the audited RPC', () => {
    expect(bot).toContain('"telegram_staff_troc_action"');
    expect(bot).not.toMatch(/from\("trade_in_requests"\)[^;]*\.update\(/);
  });

  it('legacy bind_staff_by_phone is no longer executable by any API role', () => {
    const revoke = readFileSync('supabase/migrations/20261020_011_disable_bind_staff_by_phone.sql', 'utf8');
    expect(revoke).toMatch(/REVOKE ALL ON FUNCTION public\.bind_staff_by_phone\(TEXT, TEXT\)\s+FROM PUBLIC, anon, authenticated, service_role;/);
  });

  it('Mini App scopes a vendeur stock view to their own store', () => {
    expect(api).toContain('from("store_stock")');
    expect(api).toContain('.eq("store_id",staff.storeId)');
  });
});
