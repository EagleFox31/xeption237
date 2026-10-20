import { describe, expect, it, vi } from 'vitest';
import {
  createTelegramChannel, telegramReplyMarkup,
} from '../supabase/functions/_shared/staffNotifyChannels/telegram.ts';
import type { StaffNotification, StaffNotifyContext } from '../supabase/functions/_shared/staffNotify.ts';

const notification: StaffNotification = {
  notification_id: '123',
  event_type: 'troc_submitted',
  title: 'Nouveau dossier troc',
  message: 'iPhone 13 — Client : Awa (+237600000000) — Offre : 65000 FCFA',
  link_to_tab: 'troc',
  link_to_id: '123',
};
const context: StaffNotifyContext = { siteUrl: 'https://www.xeptionetwork.shop' };

describe('Existing Xeption Telegram bot → Mini App integration', () => {
  const MINI_APP = 'https://t.me/XeptionStaffBot/operations';
  const urls = (markup: { inline_keyboard: { url: string }[][] }) => markup.inline_keyboard[0].map((b) => b.url);

  it('keeps only the direct Xeption link when no Mini App is configured', () => {
    expect(urls(telegramReplyMarkup(notification, context))).toEqual([
      'https://www.xeptionetwork.shop/admin/troc/123',
    ]);
  });

  it('shows the direct link and the trusted Mini App side by side', () => {
    expect(urls(telegramReplyMarkup(notification, context, MINI_APP))).toEqual([
      'https://www.xeptionetwork.shop/admin/troc/123',
      MINI_APP,
    ]);
  });

  it('ignores an untrusted Mini App link', () => {
    expect(urls(telegramReplyMarkup(notification, context, 'https://evil.example/phishing'))).toEqual([
      'https://www.xeptionetwork.shop/admin/troc/123',
    ]);
  });

  it("accepts the bot's main Mini App link", () => {
    expect(urls(telegramReplyMarkup(notification, context, 'https://t.me/Xeption_bot?startapp'))).toEqual([
      'https://www.xeptionetwork.shop/admin/troc/123',
      'https://t.me/Xeption_bot?startapp',
    ]);
  });

  it('rejects a t.me link with a nested path', () => {
    expect(urls(telegramReplyMarkup(notification, context, 'https://t.me/a/b/c'))).toEqual([
      'https://www.xeptionetwork.shop/admin/troc/123',
    ]);
  });

  it('reuses the configured bot and keeps full troc details for the staff group', async () => {
    const sent: Array<Record<string, unknown>> = [];
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;

    const env = (key: string) => ({
      TELEGRAM_BOT_TOKEN: '123:fake',
      TELEGRAM_CHAT_ID: '-10012345',
      TELEGRAM_MINIAPP_LINK: MINI_APP,
    })[key as 'TELEGRAM_BOT_TOKEN' | 'TELEGRAM_CHAT_ID' | 'TELEGRAM_MINIAPP_LINK'];

    const channel = createTelegramChannel(env, fetchImpl);
    expect(channel).not.toBeNull();
    expect(await channel!.send(notification, context)).toBeNull();
    expect(String(sent[0].text)).toContain('+237600000000');
    expect(JSON.stringify(sent[0].reply_markup)).toContain('t.me/XeptionStaffBot/operations');
    expect(JSON.stringify(sent[0].reply_markup)).toContain('/admin/troc/123');
  });
});
