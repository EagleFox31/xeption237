import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  SALE_BACK_FLAG, baseToken, isSaleToken, parseSaleSearchTag, saleBackCb, saleSearchCb,
  saleSearchPrompt, saleSearchTag, withSaleMode
} from '../supabase/functions/_shared/telegramSaleMode';
import { saleStartCb } from '../supabase/functions/_shared/telegramSale';

const bot = readFileSync('supabase/functions/telegram-bot-entry/index.ts', 'utf8').replace(/\r\n/g, '\n');
const PRODUCT_ID = '0f5c2a9e-1b7d-4c3e-9a8f-2d6e4b1c7a90';
const TELEGRAM_CALLBACK_MAX_BYTES = 64;

describe('Bot Telegram : mode vente (catalogue sans outils stock)', () => {
  it('marque et démarque un jeton de catégorie sans le doubler', () => {
    expect(withSaleMode('android.3', true)).toBe('$android.3');
    expect(withSaleMode('$android.3', true)).toBe('$android.3');
    expect(withSaleMode('$search', false)).toBe('search');
    expect(isSaleToken('$apple')).toBe(true);
    expect(isSaleToken('apple')).toBe(false);
    expect(baseToken('$pc.2')).toBe('pc.2');
    expect(baseToken('stocks')).toBe('stocks');
  });

  it('le jeton reste compatible avec le découpage des callbacks (pas de « : »)', () => {
    const cb = `nav:p:${PRODUCT_ID}:${withSaleMode('android.10', true)}:siege`;
    expect(cb.split(':')).toHaveLength(5);
    expect(Buffer.byteLength(cb)).toBeLessThanOrEqual(TELEGRAM_CALLBACK_MAX_BYTES);
    expect(Buffer.byteLength(saleStartCb(PRODUCT_ID, '$android.10'))).toBeLessThanOrEqual(TELEGRAM_CALLBACK_MAX_BYTES);
  });

  it('retour vers l’écran de vente sans renvoyer l’invite de recherche', () => {
    expect(saleBackCb('siege')).toBe(`nav:sell:siege:${SALE_BACK_FLAG}`);
    expect(saleSearchCb('siege')).toBe('nav:sellq:siege');
  });

  it('tag ForceReply de recherche : aller-retour et rejet des intrus', () => {
    expect(parseSaleSearchTag(saleSearchPrompt('Siège', 'siege'))).toEqual({ storeCode: 'siege' });
    expect(parseSaleSearchTag(`texte\n${saleSearchTag('akwa_2')}  `)).toEqual({ storeCode: 'akwa_2' });
    expect(parseSaleSearchTag('#SELLQ:')).toBeNull();
    expect(parseSaleSearchTag('#SELLQ:a:b')).toBeNull();
    expect(parseSaleSearchTag('#STK:R:abc:siege')).toBeNull();
  });

  it('« Enregistrer une vente » ouvre les catégories en mode vente et l’invite de recherche', () => {
    expect(bot).toContain('const [apple, android, pc] = categoryButtons(scopeSuffix(store), true);');
    expect(bot).toContain('if (parts[3] !== SALE_BACK_FLAG) {');
    expect(bot).toContain('await actionSaleSearchPrompt(staff, parts[2] || staff.store?.code || "", chatId);');
  });

  it('une réponse à l’invite cherche en mode vente', () => {
    expect(bot).toContain('parseSaleSearchTag(String(reply?.text ?? ""))');
    expect(bot).toContain('await screenSearchResults(staff, rawText, saleSearch.storeCode, true)');
  });

  it('la fiche produit en mode vente ne propose que la vente', () => {
    const detail = bot.slice(bot.indexOf('async function screenProductDetail'), bot.indexOf('// ── Stock : réception'));
    const saleBranch = detail.slice(detail.indexOf('if (sale) {'), detail.indexOf('// A transfer request'));
    expect(saleBranch).toContain('return { text: "🛒 Vente — " + head + why');
    expect(saleBranch).not.toMatch(/Demander transfert|Réception|Corriger le stock|Répartir|Examiner/);
  });
});
