import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/20261020_013_telegram_direction_link_by_phone.sql', 'utf8');

describe('Direction links Telegram by shared phone number', () => {
  it('accepts direction roles alongside store staff', () => {
    expect(sql).toMatch(/\('vendeur', 'editor', 'responsable', 'manager', 'manager_vente',\s+'direction', 'admin', 'super_admin'\)/);
  });

  it('keeps every link guarantee and stays service_role only', () => {
    for (const guard of ["'phone_ambiguous'", "'no_account'", "'telegram_already_linked'", "'staff_already_linked'", "'link.phone'"]) {
      expect(sql).toContain(guard);
    }
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.telegram_staff_link_by_phone\(TEXT, TEXT\)\s+FROM PUBLIC, anon, authenticated;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.telegram_staff_link_by_phone\(TEXT, TEXT\) TO service_role;/);
    expect(sql.trim().endsWith('COMMIT;')).toBe(true);
  });
});
