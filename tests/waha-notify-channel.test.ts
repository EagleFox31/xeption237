import { describe, expect, it, vi } from 'vitest';
import {
  createWahaChannel, safeWahaText, WAHA_DEFAULT_EVENT_TYPES
} from '../supabase/functions/_shared/staffNotifyChannels/waha';

const sample = {
  notification_id: '123e4567-e89b-12d3-a456-426614174000',
  event_type: 'stock_low',
  title: 'Stock bas - numéro +237600000000',
  message: 'John Doe — +237600000000 — john@example.com',
  link_to_tab: 'inventory',
  link_to_id: '123e4567-e89b-12d3-a456-426614174111'
};
const ctx = { siteUrl: 'https://www.xeptionetwork.shop' };
const goodEnv: Record<string, string> = {
  WAHA_ENABLED: 'true',
  WAHA_BASE_URL: 'https://waha-notify.example.com',
  WAHA_API_KEY: 'a'.repeat(64),
  WAHA_SESSION: 'trigenys-test',
  WAHA_STAFF_GROUP_ID: '123456789-987654321@g.us'
};
const reader = (values: Record<string,string>) => (key: string) => values[key];

describe('Xeption opt-in WAHA channel', () => {
  it('stays off by default and refuses invalid endpoints/group IDs', () => {
    expect(createWahaChannel(reader({...goodEnv, WAHA_ENABLED: 'false'}))).toBeNull();
    expect(createWahaChannel(reader({...goodEnv, WAHA_API_KEY: ''}))).toBeNull();
    expect(createWahaChannel(reader({...goodEnv, WAHA_BASE_URL: 'http://127.0.0.1:3000'}))).toBeNull();
    expect(createWahaChannel(reader({...goodEnv, WAHA_BASE_URL: 'https://admin:pass@example.com'}))).toBeNull();
    expect(createWahaChannel(reader({...goodEnv, WAHA_BASE_URL: 'https://example.com/private'}))).toBeNull();
    expect(createWahaChannel(reader({...goodEnv, WAHA_STAFF_GROUP_ID: '237600000000@c.us'}))).toBeNull();
    expect(createWahaChannel(reader({...goodEnv, WAHA_SESSION: '../foo'}))).toBeNull();
  });

  it('sends generic messages to the group, not raw customer records', async () => {
    const fake = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const json = JSON.parse(String(init?.body));
      expect(String(_url)).toBe('https://waha-notify.example.com/api/sendText');
      expect(init?.method).toBe('POST');
      expect(new Headers(init?.headers).get('X-Api-Key')).toBe(goodEnv.WAHA_API_KEY);
      expect(json.session).toBe('trigenys-test');
      expect(json.chatId).toBe(goodEnv.WAHA_STAFF_GROUP_ID);
      expect(json.linkPreview).toBe(false);
      expect(json.text).toContain('Alerte : stock faible');
      expect(json.text).toContain('https://www.xeptionetwork.shop/admin/inventory/');
      expect(json.text).not.toContain('John Doe');
      expect(json.text).not.toContain('+237');
      expect(json.text).not.toContain('john@example.com');
      return new Response('{}', {status: 201});
    });
    const channel = createWahaChannel(reader(goodEnv), fake as typeof fetch);
    expect(channel?.id).toBe('whatsapp_waha');
    expect(channel?.eventTypes).toEqual(WAHA_DEFAULT_EVENT_TYPES);
    expect(await channel?.send(sample, ctx)).toBeNull();
    expect(fake).toHaveBeenCalledTimes(1);
    expect(safeWahaText(sample, ctx)).not.toContain(sample.title);
  });

  it('returns redacted provider codes and does not expose response bodies', async () => {
    const failure = createWahaChannel(reader(goodEnv),
      vi.fn(async () => new Response('secret: +237 and API key', {status: 429})) as typeof fetch);
    expect(await failure?.send(sample, ctx)).toBe('waha_http_429');
    const network = createWahaChannel(reader(goodEnv),
      vi.fn(async () => {throw new Error('token and phone secret');}) as typeof fetch);
    expect(await network?.send(sample, ctx)).toBe('waha_network_error');
  });

  it('allows only templates already recognized by the channel', async () => {
    const requests: unknown[] = [];
    const fake = vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)));
      return new Response('{}', {status: 201});
    });
    const channel = createWahaChannel(reader({...goodEnv,
      WAHA_EVENT_TYPES: 'stock_out, event_not_allowed, marketplace_listed,stock_out'
    }), fake as typeof fetch);
    expect(channel?.eventTypes).toEqual(['stock_out', 'marketplace_listed']);
    await channel?.send({...sample,event_type:'event_not_allowed'},ctx);
    expect(JSON.stringify(requests)).not.toMatch(/John Doe|\+237|john@example/);
  });
});
