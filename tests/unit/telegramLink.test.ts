import { describe, expect, it } from 'vitest';
import { buildTelegramLinkUrl } from '../../utils/telegramLink';

const CODE = '0123456789abcdef0123456789abcdef';

describe('buildTelegramLinkUrl', () => {
  it("sets the code on the bot's main Mini App link", () => {
    expect(buildTelegramLinkUrl('https://t.me/Xeption_bot?startapp', CODE))
      .toBe(`https://t.me/Xeption_bot?startapp=${CODE}`);
  });

  it('sets the code on a named Mini App link', () => {
    expect(buildTelegramLinkUrl('https://t.me/Xeption_bot/staff', CODE))
      .toBe(`https://t.me/Xeption_bot/staff?startapp=${CODE}`);
  });

  it('refuses a non-Telegram or non-https base', () => {
    expect(buildTelegramLinkUrl('https://evil.example/x?startapp', CODE)).toBeNull();
    expect(buildTelegramLinkUrl('http://t.me/Xeption_bot', CODE)).toBeNull();
    expect(buildTelegramLinkUrl('not a url', CODE)).toBeNull();
  });

  it('refuses a code outside the startapp charset', () => {
    expect(buildTelegramLinkUrl('https://t.me/Xeption_bot', 'a b')).toBeNull();
    expect(buildTelegramLinkUrl('https://t.me/Xeption_bot', '')).toBeNull();
  });
});
