import { describe, expect, it, vi } from 'vitest';
import {
  createTelegramChannel, redactForStaffGroup, telegramReplyMarkup,
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
  it('removes customer data from group troc notifications', () => {
    const safe = redactForStaffGroup(notification);
    expect(safe.message).toContain('iPhone 13');
    expect(safe.message).not.toContain('Awa');
    expect(safe.message).not.toContain('+237');
    expect(notification.message).toContain('Awa');
  });

  it('uses the existing Xeption admin link unless a trusted Mini App deep link is set', () => {
    const fallback = telegramReplyMarkup(notification, context);
    expect(fallback.inline_keyboard[0][0].url).toBe('https://www.xeptionetwork.shop/admin/troc');

    const link = telegramReplyMarkup(notification, context, 'https://t.me/XeptionStaffBot/operations');
    expect(link.inline_keyboard[0][0].url).toBe('https://t.me/XeptionStaffBot/operations');

    const untrusted = telegramReplyMarkup(notification, context, 'https://evil.example/phishing');
    expect(untrusted.inline_keyboard[0][0].url).toBe(fallback.inline_keyboard[0][0].url);
  });

  it('reuses the configured bot and redacts group messages before sending', async () => {
    const sent: Array<Record<string, unknown>> = [];
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response('{}', { status: 200 });
    }) as unknown as typeof fetch;

    const env = (key: string) => ({
      TELEGRAM_BOT_TOKEN: '123:fake',
      TELEGRAM_CHAT_ID: '-10012345',
      TELEGRAM_MINIAPP_LINK: 'https://t.me/XeptionStaffBot/operations',
    })[key as 'TELEGRAM_BOT_TOKEN' | 'TELEGRAM_CHAT_ID' | 'TELEGRAM_MINIAPP_LINK'];

    const channel = createTelegramChannel(env, fetchImpl);
    expect(channel).not.toBeNull();
    expect(await channel!.send(notification, context)).toBeNull();
    expect(String(sent[0].text)).not.toContain('+237');
    expect(JSON.stringify(sent[0].reply_markup)).toContain('t.me/XeptionStaffBot/operations');
  });
});
