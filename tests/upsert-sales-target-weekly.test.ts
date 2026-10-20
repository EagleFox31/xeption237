import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TARGET_PERIOD_LABELS } from '../utils/salesTargets';

const sql = readFileSync('supabase/migrations/20261020_016_upsert_sales_target_weekly.sql', 'utf8').replace(/\r\n/g, '\n');

describe('upsert_sales_target accepte toutes les périodes proposées par l\'ERP', () => {
  it('valide chaque période de TARGET_PERIOD_LABELS', () => {
    const allowed = sql.match(/p_period_kind NOT IN \(([^)]*)\)/)?.[1] ?? '';
    for (const kind of Object.keys(TARGET_PERIOD_LABELS)) {
      expect(allowed).toContain(`'${kind}'`);
    }
  });

  it('reste transactionnelle et fermée à anon', () => {
    expect(sql).toMatch(/^BEGIN;/m);
    expect(sql).toMatch(/^COMMIT;/m);
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.upsert_sales_target\([^)]*\) FROM PUBLIC, anon;/);
  });
});
