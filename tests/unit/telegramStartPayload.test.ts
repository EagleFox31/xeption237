import { describe, expect, it } from 'vitest';
import {
  botChatLink, buildStartPayload, parseStartPayload, resolveBotUsername,
} from '../../supabase/functions/_shared/telegramStartPayload.ts';
import { telegramReplyMarkup } from '../../supabase/functions/_shared/staffNotifyChannels/telegram.ts';

const UUID = '3f2b8c1e-5a7d-4e2f-9b1c-0d4e6f8a2b3c';

describe('payload /start du bot', () => {
  it('encode produit et troc, puis les relit', () => {
    expect(buildStartPayload('inventory', UUID)).toBe(`p_${UUID}`);
    expect(buildStartPayload(' troc ', ` ${UUID} `)).toBe(`t_${UUID}`);
    expect(parseStartPayload(`p_${UUID}`)).toEqual({ kind: 'product', id: UUID });
    expect(parseStartPayload(`t_${UUID}`)).toEqual({ kind: 'troc', id: UUID });
  });

  it("n'encode rien sans écran bot ou si l'id sort du format Telegram", () => {
    expect(buildStartPayload('orders', UUID)).toBeNull();
    expect(buildStartPayload('inventory', '')).toBeNull();
    expect(buildStartPayload('inventory', 'a b')).toBeNull();
    expect(buildStartPayload('inventory', 'x'.repeat(63))).toBeNull();
  });

  it('rejette un payload inconnu ou malformé', () => {
    for (const p of [undefined, '', 'p_', '_abc', 'z_abc', 'p_a/b', 'p_' + 'x'.repeat(63)]) {
      expect(parseStartPayload(p)).toBeNull();
    }
  });

  it('déduit le nom du bot du lien Mini App, sauf nom explicite', () => {
    expect(resolveBotUsername(undefined, 'https://t.me/XeptionStaffBot/operations')).toBe('XeptionStaffBot');
    expect(resolveBotUsername(undefined, 'https://t.me/Xeption_bot?startapp')).toBe('Xeption_bot');
    expect(resolveBotUsername('@Other_bot', 'https://t.me/XeptionStaffBot/operations')).toBe('Other_bot');
    expect(resolveBotUsername(undefined, 'https://evil.example/Bot')).toBeNull();
    expect(resolveBotUsername('bad name', undefined)).toBeNull();
    expect(resolveBotUsername(undefined, undefined)).toBeNull();
  });

  it('construit le lien de discussion', () => {
    expect(botChatLink('Xeption_bot', `p_${UUID}`)).toBe(`https://t.me/Xeption_bot?start=p_${UUID}`);
    expect(botChatLink('Xeption_bot', null)).toBe('https://t.me/Xeption_bot');
  });
});

describe('bouton « Gérer avec le bot » des notifications', () => {
  const ctx = { siteUrl: 'https://www.xeptionetwork.shop' };
  const base = { notification_id: '1', event_type: 'stock_low', title: 'Stock bas', message: 'X — 2 restant(s)' };

  it('ouvre la discussion du bot sur le produit, sur une seconde ligne', () => {
    const markup = telegramReplyMarkup({ ...base, link_to_tab: 'inventory', link_to_id: UUID }, ctx, undefined, 'Xeption_bot');
    expect(markup.inline_keyboard[1]).toEqual([
      { text: '💬 Gérer avec le bot', url: `https://t.me/Xeption_bot?start=p_${UUID}` },
    ]);
  });

  it("ouvre le menu du bot quand l'élément n'a pas d'écran bot", () => {
    const markup = telegramReplyMarkup({ ...base, link_to_tab: 'orders', link_to_id: '9' }, ctx, undefined, 'Xeption_bot');
    expect(markup.inline_keyboard[1][0].url).toBe('https://t.me/Xeption_bot');
  });

  it('reste absent sans nom de bot', () => {
    expect(telegramReplyMarkup({ ...base, link_to_tab: 'inventory', link_to_id: UUID }, ctx).inline_keyboard).toHaveLength(1);
  });
});
