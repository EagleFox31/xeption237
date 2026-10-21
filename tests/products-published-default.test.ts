import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const fix = read('supabase/migrations/20261021_008_products_published_default.sql');
const telegram = read('supabase/migrations/20261021_007_product_visibility_and_telegram_create.sql');

describe('products.is_published : seuls les produits Telegram naissent masqués', () => {
  it('le défaut est true pour ERP, Studio et funnel', () => {
    expect(fix).toContain('ALTER COLUMN is_published SET DEFAULT true;');
    expect(fix).not.toMatch(/UPDATE|DELETE|DROP/);
  });

  it('la création Telegram écrit is_published = false explicitement', () => {
    const insert = telegram.slice(telegram.indexOf('INSERT INTO public.products'));
    expect(insert).toMatch(/is_published/);
    expect(telegram).toMatch(/'is_published', false/);
  });
});
