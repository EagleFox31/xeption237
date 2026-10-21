import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const acl = read('supabase/migrations/20261021_009_telegram_product_publish_acl.sql');
const reject = read('supabase/migrations/20261021_010_telegram_product_reject_traced.sql');
const bot = read('supabase/functions/telegram-bot-entry/index.ts');

const FUNCTIONS = [
  'telegram_staff_pending_products_count(text)',
  'telegram_staff_product_publish(text, text, numeric)',
  'telegram_staff_product_reject(text, text)'
];

describe('Publication Telegram : droits et garde-fous', () => {
  it('seul service_role exécute les RPC de publication (pas anon / authenticated)', () => {
    for (const fn of FUNCTIONS) {
      expect(acl).toContain(`REVOKE ALL ON FUNCTION public.${fn} FROM PUBLIC, anon, authenticated;`);
      expect(acl).toContain(`GRANT EXECUTE ON FUNCTION public.${fn} TO service_role;`);
    }
    expect(acl).not.toMatch(/TO authenticated/);
    expect(reject).not.toMatch(/TO authenticated/);
  });

  it('publier ne modifie jamais un produit déjà en ligne', () => {
    expect(acl).toContain("'reason', 'already_published'");
    expect(bot).toContain('.eq("id", productId).eq("is_published", false);');
  });

  it('refuser ne supprime rien et trace la sortie de stock', () => {
    expect(reject).not.toMatch(/DELETE FROM/);
    expect(reject).toContain('PERFORM public._store_stock_delta(');
    expect(reject).toContain("'has_sales'");
    expect(reject).toContain('rejected_at = now()');
  });

  it('un produit refusé quitte la file « en attente »', () => {
    expect(reject).toContain('WHERE is_published = false AND rejected_at IS NULL;');
    expect(bot).toContain('.is("rejected_at", null)');
  });
});
