import {describe,it,expect,vi} from 'vitest';
import {
  createWahaChannel,toNotifyEvent,WAHA_DEFAULT_EVENT_TYPES,
  NOTIFY_EVENT_ALIASES,withNotificationDates
} from '../supabase/functions/_shared/staffNotifyChannels/waha';

const sample={
  notification_id:'123e4567-e89b-12d3-a456-426614174000',
  created_at:'2026-10-21T10:19:36.056966+00:00',
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
  it('retains the product, remaining stock and known actor from the stored snapshot',()=>{
    const event=toNotifyEvent({...sample,
      message:'Dell XPS 14 9440 (2023) — 2 restant(s) — Par : Jennifer'},ctx);
    expect(event.facts).toEqual({subject:'Dell XPS 14 9440 (2023)',stockRemaining:2,actor:'Jennifer'});
    expect(event.resource.id).toBe(sample.link_to_id);
    expect(event.occurredAt).toBe('2026-10-21T10:19:36.056Z');
  });
  it('keeps timestamps and payloads identical across retries',async()=>{
    const read=vi.fn(async()=>[{id:sample.notification_id,created_at:sample.created_at}]);
    const [snapshot]=await withNotificationDates([{...sample,created_at:undefined}],read);
    const first=JSON.stringify(toNotifyEvent(snapshot,ctx));
    vi.useFakeTimers();
    try{
      vi.setSystemTime(new Date('2026-10-23T12:00:00Z'));
      expect(JSON.stringify(toNotifyEvent(snapshot,ctx))).toBe(first);
    }finally{vi.useRealTimers();}
    expect(read).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalledWith([sample.notification_id]);
    expect(()=>toNotifyEvent({...sample,created_at:undefined},ctx)).toThrow('NOTIFICATION_TIMESTAMP_REQUIRED');
  });
  it('keeps zero stock; excludes customer identity from a barter snapshot',()=>{
    expect(toNotifyEvent({...sample,event_type:'stock_out',message:'Tecno Spark 50 — 0 restant(s)'},ctx).facts)
      .toEqual({subject:'Tecno Spark 50',stockRemaining:0});
    const trade=toNotifyEvent({...sample,event_type:'troc_submitted',message:
      "Samsung Galaxy S23 — Client : John Doe (+237699999999) — État : Écran bon, Batterie 90% — Offre estimée : 45000 FCFA cash / 55000 FCFA bon d'achat — Cible : iPhone 15 — Par : Jennifer"},ctx);
    expect(trade.facts).toEqual({subject:'Samsung Galaxy S23',condition:'Écran bon, Batterie 90%',
      cashOfferXaf:45000,voucherOfferXaf:55000,target:'iPhone 15',actor:'Jennifer'});
    expect(JSON.stringify(trade)).not.toMatch(/John Doe|237699999999|Client/);
  });
  it('extracts marketplace business fields and ignores arbitrary text',()=>{
    const listing=toNotifyEvent({...sample,event_type:'marketplace_listed',
      message:'Samsung Galaxy S23 — 8 Go / 128 Go — grade A — 90000 à 100000 FCFA — Douala'},ctx);
    expect(listing.facts).toEqual({subject:'Samsung Galaxy S23',specification:'8 Go / 128 Go',grade:'A',
      priceMinXaf:90000,priceMaxXaf:100000,city:'Douala'});
    const dirty=toNotifyEvent({...sample,message:'Contact +237699999999 — https://evil.test — Par : john@example.com'},ctx);
    expect(dirty.facts).toBeUndefined();
  });
  it('extracts order_created business fields without customer PII',()=>{
    const order=toNotifyEvent({
      ...sample,
      event_type:'order_created',
      message:'150 000 FCFA — Douala — Livraison à domicile'
    },ctx);
    expect(order.type).toBe('order.created');
    expect(order.priority).toBe('critical');
    expect(order.resource.kind).toBe('order');
    expect(order.facts).toEqual({
      subject:'150 000 FCFA',
      orderTotalXaf:150000,
      city:'Douala',
      deliveryMode:'Livraison à domicile'
    });
  });
  it('extracts store_cash_report business fields and maps to cash_report.closed', () => {
    const report = toNotifyEvent({
      ...sample,
      event_type: 'store_cash_report',
      message: 'Solde soir : 150 000 FCFA — Entrées : 300 000 FCFA — Dépenses : 150 000 FCFA — Par : Stevy Akaa',
      link_to_tab: 'analytics',
      link_to_id: 'rep-12345'
    }, ctx);
    expect(report.type).toBe('cash_report.closed');
    expect(report.priority).toBe('high');
    expect(report.resource.kind).toBe('cash_report');
    expect(report.resource.id).toBe('rep-12345');
    expect(report.actionUrl).toBe('https://www.xeptionetwork.shop/admin/analytics');
    expect(report.facts).toEqual({
      subject: 'Solde soir : 150 000 FCFA',
      closingCashXaf: 150000,
      totalInflowXaf: 300000,
      totalOutflowXaf: 150000,
      actor: 'Stevy Akaa'
    });
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

