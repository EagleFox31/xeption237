import {describe,it,expect,vi} from 'vitest';
import {
  createWahaChannel,toNotifyEvent,WAHA_DEFAULT_EVENT_TYPES,
  NOTIFY_EVENT_ALIASES
} from '../supabase/functions/_shared/staffNotifyChannels/waha';

const sample={
  notification_id:'123e4567-e89b-12d3-a456-426614174000',
  event_type:'stock_low',
  title:'John Doe +237600000000',
  message:'+237600000000 — john@example.com',
  link_to_tab:'inventory',
  link_to_id:'123e4567-e89b-12d3-a456-426614174111'
};
const ctx={siteUrl:'https://www.xeptionetwork.shop'};
const env={WAHA_ENABLED:'true',XEPTION_NOTIFY_INGEST_KEY:'I'.repeat(48)};
const reader=(values:Record<string,string>)=>(name:string)=>values[name];

describe('Xeption producer -> Trigenys Notify',()=>{
  it('requires opt-in and a dedicated ingest key, not WAHA credentials',()=>{
    expect(createWahaChannel(reader({...env,WAHA_ENABLED:'false'}))).toBeNull();
    expect(createWahaChannel(reader({...env,XEPTION_NOTIFY_INGEST_KEY:''}))).toBeNull();
    expect(createWahaChannel(reader({...env,XEPTION_NOTIFY_INGEST_KEY:'x'}))).toBeNull();
    expect(createWahaChannel(reader(env))?.eventTypes).toEqual(WAHA_DEFAULT_EVENT_TYPES);
  });
  it('normalizes Xeption event without private content or provider destinations',async()=>{
    const fetcher=vi.fn(async(input:RequestInfo|URL,init?:RequestInit)=>{
      expect(String(input)).toBe('https://trigenys-notify-staging-api.lawrynnjennifer.workers.dev/v1/dispatch/xeption/whatsapp');
      expect(new Headers(init?.headers).get('x-notify-auth')).toBe(env.XEPTION_NOTIFY_INGEST_KEY);
      expect(new Headers(init?.headers).has('X-Api-Key')).toBe(false);
      const p=JSON.parse(String(init?.body));
      expect(p.project).toBe('xeption');
      expect(p.type).toBe('inventory.stock_low');
      expect(p.priority).toBe('high');
      expect(p.actionUrl).toContain('https://www.xeptionetwork.shop/admin/inventory/');
      expect(JSON.stringify(p)).not.toMatch(/John Doe|john@example.com|\+237/);
      expect(JSON.stringify(p)).not.toMatch(/trigenys-test|@g.us|WAHA_API_KEY/);
      return new Response('{}',{status:202});
    });
    const channel=createWahaChannel(reader(env),fetcher as typeof fetch);
    expect(channel?.id).toBe('whatsapp_waha');
    expect(await channel?.send(sample,ctx)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(toNotifyEvent(sample,ctx).id).toBe(sample.notification_id);
  });
  it('supports only types the platform has mapped',()=>{
    const channel=createWahaChannel(reader({...env,
      WAHA_EVENT_TYPES:'stock_out,not_supported,marketplace_listed,stock_out'
    }));
    expect(channel?.eventTypes).toEqual(['stock_out','marketplace_listed']);
    expect(Object.keys(NOTIFY_EVENT_ALIASES)).toContain('stock_low');
    expect(()=>toNotifyEvent({...sample,event_type:'not_supported'},ctx)).toThrow();
  });
  it('preserves retry failures but does not leak upstream bodies',async()=>{
    const remote=createWahaChannel(reader(env),vi.fn(async()=>new Response('secret +237',{status:503})) as typeof fetch);
    expect(await remote?.send(sample,ctx)).toBe('notify_http_503');
    const configured = createWahaChannel(reader(env),
      vi.fn(async()=>new Response(JSON.stringify({error:'WAHA_NOT_CONFIGURED'}),{
        status:503,headers:{'content-type':'application/json'}
      })) as typeof fetch);
    expect(await configured?.send(sample,ctx)).toBe('notify_http_503_WAHA_NOT_CONFIGURED');
    const attacker = createWahaChannel(reader(env),
      vi.fn(async()=>new Response(JSON.stringify({error:'SECRET_leak_key'}),{status:503})) as typeof fetch);
    expect(await attacker?.send(sample,ctx)).toBe('notify_http_503');
    const failed=createWahaChannel(reader(env),
      vi.fn(async()=>{throw Error('access token secret');}) as typeof fetch);
    expect(await failed?.send(sample,ctx)).toBe('notify_network_error');
  });
});
