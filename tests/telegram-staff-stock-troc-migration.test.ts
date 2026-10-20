import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20261020_007_telegram_staff_stock_and_troc.sql', 'utf8');
const STOCK_ROLES = "('responsable', 'manager', 'manager_vente', 'direction', 'admin', 'super_admin')";

describe('Telegram staff RPC (stock, prix, troc) contract', () => {
  it.each(['telegram_staff_product_lookup', 'telegram_staff_restock', 'telegram_staff_troc_action'])(
    '%s is service_role only and requires a linked staff account',
    (fn) => {
      expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\)\\s+FROM PUBLIC, anon, authenticated;`));
      expect(sql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\([^)]*\\)\\s+TO service_role;`));
    },
  );

  it('restock is limited to manager-level roles, bounded and idempotent per request', () => {
    const restock = sql.slice(sql.indexOf('telegram_staff_restock('), sql.indexOf('telegram_staff_troc_action('));
    expect(restock).toContain(STOCK_ROLES);
    expect(restock).not.toMatch(/'vendeur'/);
    expect(restock).toContain('p_quantity < 1 OR p_quantity > 50');
    expect(restock).toContain("ref_type = 'telegram_restock' AND ref_id = p_request_id::text");
    expect(restock).toContain('_store_stock_delta(');
  });

  it('troc validation follows the ERP state machine and stamps validated_at', () => {
    expect(sql).toContain("v_status NOT IN ('pending','accepted','contacted','appointment')");
    expect(sql).toContain("validated_at = CASE WHEN p_action = 'validated' THEN now() ELSE validated_at END");
  });
});
