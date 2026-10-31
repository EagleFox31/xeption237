import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const sql = read('supabase/migrations/20261021_005_telegram_staff_scope_store.sql');
const bot = read('supabase/functions/telegram-bot-entry/index.ts');

describe('Bot Telegram : boutique consultée par la direction', () => {
  it('migration additive et rejouable', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS scope_store_code text;/);
    expect(sql).not.toMatch(/DROP|NOT NULL/);
  });

  it('mémorise la boutique ouverte et la vide au menu principal', () => {
    expect(bot).toContain('if (action === "store" || action === "stocks" || action === "sell") await rememberScope(staff, parts[2] || null);');
    expect(bot).toContain('else if (action === "main") await rememberScope(staff, null);');
  });

  it('la recherche libre et /stock restent dans la boutique consultée', () => {
    const scoped = bot.match(/screenSearchResults\(staff, (rawText|query), staff\.scope_store_code \?\? undefined\)/g) ?? [];
    expect(scoped).toHaveLength(2);
    expect(bot).not.toMatch(/screenSearchResults\(staff, (rawText|query)\)/);
  });

  it("« Enregistrer une vente » ouvre l'écran de vente de la boutique, pas l'écran Stock", () => {
    expect(bot).toContain('{ text: "🛒 Enregistrer une vente", callback_data: "nav:sell:" + store.code }');
    expect(bot).toContain('{ text: "🛒 Enregistrer une vente", callback_data: "nav:sell" }');
    expect(bot).not.toMatch(/"🛒 Enregistrer une vente", callback_data: "nav:stocks/);
    expect(bot).toContain('screen = await screenSaleStart(staff, parts[2]);');
    expect(bot).toContain('`🛒 <b>Nouvelle vente</b> — ${escapeHtml(store.name)}');
  });

  it('écrit seulement pour la direction et seulement si la boutique change', () => {
    expect(bot).toContain('staff.rank < RANK_DIRECTION || staff.scope_store_code === storeCode) return;');
  });
});
