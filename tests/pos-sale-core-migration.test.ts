import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20261020_017_pos_sale_core.sql', 'utf8').replace(/\r\n/g, '\n');
const body = (fn: string) => {
  const start = sql.indexOf(`FUNCTION public.${fn}(`);
  return sql.slice(start, sql.indexOf('$$;', start));
};
const SIG = '(text, text, text, text, text, text, text, numeric, jsonb, text, text, uuid, uuid, numeric)';

describe('POS sale core extraction', () => {
  it('is transactional', () => {
    expect(sql).toMatch(/^BEGIN;/m);
    expect(sql).toMatch(/^COMMIT;/m);
  });

  it('keeps the ERP wrapper contract (JWT check, defaults, ACL)', () => {
    const wrapper = body('complete_pos_sale_atomic');
    expect(wrapper).toContain("auth.jwt() ->> 'email'");
    expect(wrapper).toContain("Accès réservé à l''équipe");
    expect(wrapper).toContain("p_status text DEFAULT 'delivered'");
    expect(wrapper).toContain('p_discount_amount numeric DEFAULT 0');
    expect(wrapper).toContain('public._pos_sale_core(');
    expect(sql).not.toMatch(/REVOKE[^;]*complete_pos_sale_atomic/);
    expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.complete_pos_sale_atomic${SIG}\n  TO authenticated, service_role;`);
  });

  it('core holds the whole sale and is never granted', () => {
    const core = body('_pos_sale_core');
    expect(core).toContain('SECURITY DEFINER');
    expect(core).toContain('SET search_path = public');
    expect(core).not.toContain('auth.jwt()');
    for (const piece of ['_store_sale_line', '_insert_order_items', 'Remise supérieure au sous-total',
      'Total incohérent', 'unique_violation', 'Aucune boutique assignée au vendeur', 'Vendeur non identifié']) {
      expect(core).toContain(piece);
    }
    expect(sql).toContain(`REVOKE ALL ON FUNCTION public._pos_sale_core${SIG}\n  FROM PUBLIC, anon, authenticated;`);
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\._pos_sale_core/);
  });
});
