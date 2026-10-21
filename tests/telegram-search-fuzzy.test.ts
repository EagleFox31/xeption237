import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Recherche de stock tolérante aux fautes de frappe (Telegram staff bot)', () => {
  const migrationPath = 'supabase/migrations/20261021_002_telegram_search_products_fuzzy.sql';

  it('la migration existe et active les extensions PostgreSQL nécessaires', () => {
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS fuzzystrmatch');
  });

  it('définit la fonction RPC telegram_search_products_fuzzy avec tolérance Levenshtein 2-3 caractères', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('FUNCTION public.telegram_search_products_fuzzy');
    expect(sql).toContain('word_similarity(');
    expect(sql).toContain('levenshtein(');
    expect(sql).toContain('p_store_code text DEFAULT NULL');
    expect(sql).toContain('p_telegram_user_id text DEFAULT NULL');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.telegram_search_products_fuzzy');
  });

  it('branche telegram_staff_product_lookup sur telegram_search_products_fuzzy pour les commandes slash', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('FUNCTION public.telegram_staff_product_lookup');
    expect(sql).toContain('public.telegram_search_products_fuzzy(');
  });

  it('seul le bot (service_role) peut exécuter les deux RPC de recherche', () => {
    const acl = readFileSync('supabase/migrations/20261021_003_telegram_search_acl.sql', 'utf8').replace(/\r\n/g, '\n');
    for (const fn of ['telegram_search_products_fuzzy(text, text, text, integer)', 'telegram_staff_product_lookup(text, text)']) {
      expect(acl).toContain(`REVOKE ALL ON FUNCTION public.${fn}\n  FROM PUBLIC, anon, authenticated;`);
      expect(acl).toContain(`GRANT EXECUTE ON FUNCTION public.${fn} TO service_role;`);
    }
  });
});
