import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Le trigger d'historique écrit dans une table fermée en écriture (policy SELECT seule) :
// sa fonction doit tourner en SECURITY DEFINER, sinon tout changement de statut fait par le
// staff depuis l'ERP est rejeté par la RLS (refus de bon impossible, 2026-11-17).
const sql = readFileSync(
  resolve(__dirname, '../supabase/migrations/20261117_001_trade_in_status_history_definer.sql'),
  'utf8',
);

describe('log_trade_in_status_change — droits du trigger', () => {
  it('tourne en SECURITY DEFINER avec un search_path figé', () => {
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toMatch(/SET search_path = public, pg_temp/);
  });

  it("n'ouvre aucune policy d'écriture sur l'historique", () => {
    expect(sql).not.toMatch(/CREATE POLICY/i);
  });

  it("retire l'appel direct à PUBLIC, anon et authenticated", () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.log_trade_in_status_change\(\) FROM PUBLIC, anon, authenticated/);
  });

  it('reste rejouable (CREATE OR REPLACE dans une transaction)', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.log_trade_in_status_change\(\)/);
    expect(sql).toMatch(/^BEGIN;/m);
    expect(sql).toMatch(/^COMMIT;/m);
  });
});
