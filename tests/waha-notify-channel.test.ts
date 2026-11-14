import {describe,it,expect,vi} from 'vitest';
import {
  createWahaChannel,toNotifyEvent,WAHA_DEFAULT_EVENT_TYPES,
  NOTIFY_EVENT_ALIASES,withNotificationDates,WAHA_EXCLUDED_EVENT_TYPES
} from '../supabase/functions/_shared/staffNotifyChannels/waha';
import {DEFAULT_STAFF_EVENT_TYPES} from '../supabase/functions/_shared/staffNotify';
import {formatOrderPhone,orderSnapshotFacts,withOrderSnapshots} from '../supabase/functions/_shared/staffNotifyOrder';

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
  it('order_created fallback parses a comma-grouped total and a « Ville (Région), Quartier » city',()=>{
    const order=toNotifyEvent({...sample,event_type:'order_created',
      message:'90,000 FCFA — Yaoundé (Centre), Nsimeyong — delivery'},ctx);
    expect(order.facts).toMatchObject({orderTotalXaf:90000,city:'Yaoundé (Centre)',deliveryMode:'delivery'});
    expect(JSON.stringify(order)).not.toMatch(/Nsimeyong/);
  });
  const orderRow={
    id:'ORD-3MR8-G6XF',customer_name:'Jean Mbarga',customer_phone:'699 99 99 99',
    customer_email:' Jean.Mbarga@Example.com ',customer_city:'Yaoundé (Centre), Nsimeyong',
    delivery_mode:'delivery',payment_method:'Cash à la livraison',total:'180000',
    items:[{id:'p1',name:'Samsung Galaxy A16 128 Go',price:90000,quantity:2,description:'long text',specs:{}}]
  };
  const orderNotification={...sample,event_type:'order_created',link_to_tab:'orders',
    link_to_id:orderRow.id,message:'180,000 FCFA — Yaoundé (Centre), Nsimeyong — delivery'};
  it('order_created sends the typed order snapshot the staff needs to call and deliver',async()=>{
    const read=vi.fn(async(ids:string[])=>ids.includes(orderRow.id)?[orderRow]:[]);
    const rows=await withOrderSnapshots([orderNotification,sample],read);
    expect(read).toHaveBeenCalledWith([orderRow.id]);
    expect(rows[1]).toBe(sample);
    const event=toNotifyEvent(rows[0],ctx);
    expect(event.facts).toEqual({
      customerName:'Jean Mbarga',customerPhone:'+237699999999',customerEmail:'jean.mbarga@example.com',
      items:[{name:'Samsung Galaxy A16 128 Go',quantity:2,unitPriceXaf:90000}],
      orderTotalXaf:180000,paymentMethod:'Cash à la livraison',deliveryMode:'Livraison à domicile',
      city:'Yaoundé (Centre)',deliveryAddress:'Nsimeyong'
    });
    expect(JSON.stringify(event)).not.toMatch(/long text|description/);
    expect(JSON.stringify(toNotifyEvent(rows[0],ctx))).toBe(JSON.stringify(event));
  });
  it('order snapshot drops invalid fields, pickup address and stays under the 4096-byte limit',()=>{
    const pickup=orderSnapshotFacts({...orderRow,delivery_mode:'pickup',customer_city:'Retrait Boutique',
      customer_phone:'appelez-moi',customer_email:'pas-un-mail',
      items:[{name:'Produit *promo*',quantity:0},{name:'Coque',price:'x'}]});
    expect(pickup).toEqual({customerName:'Jean Mbarga',items:[{name:'Coque',quantity:1}],orderTotalXaf:180000,
      paymentMethod:'Cash à la livraison',deliveryMode:'Retrait en boutique'});
    const items=Array.from({length:30},(_,i)=>({name:`Écran tactile démonstration très long numéro ${i} `.repeat(4),quantity:999,price:999999}));
    const event=toNotifyEvent({...orderNotification,order:{...orderRow,items}},ctx);
    expect(new TextEncoder().encode(JSON.stringify(event)).length).toBeLessThanOrEqual(4000);
    const sent=event.facts?.items as Array<{name:string}>;
    expect(sent.length).toBeGreaterThan(0);
    expect(sent.length).toBeLessThanOrEqual(10);
    expect(sent[0].name.length).toBeLessThanOrEqual(80);
    expect(formatOrderPhone('+237 6 99 99 99 99')).toBe('+237699999999');
    expect(formatOrderPhone('00 33 6 12 34 56 78')).toBe('+33612345678');
    expect(formatOrderPhone('12')).toBeUndefined();
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
  it('extracts voucher_expiring business fields and maps to barter.voucher_expiring without customer PII', () => {
    const voucher = toNotifyEvent({
      ...sample,
      event_type: 'voucher_expiring',
      message: 'Bon TRC-94021 (iPhone 13 128 Go) expire le 29/10 à 18h00',
      link_to_tab: 'troc',
      link_to_id: 'req-98765'
    }, ctx);
    expect(voucher.type).toBe('barter.voucher_expiring');
    expect(voucher.priority).toBe('high');
    expect(voucher.resource.kind).toBe('barter');
    expect(voucher.resource.id).toBe('req-98765');
    expect(voucher.actionUrl).toBe('https://www.xeptionetwork.shop/admin/troc/req-98765');
    expect(voucher.facts).toEqual({
      subject: 'Bon TRC-94021 (iPhone 13 128 Go) expire le 29/10 à 18h00',
      voucherReference: 'TRC-94021',
      deviceModel: 'iPhone 13 128 Go',
      expiresAtText: '29/10 à 18h00'
    });
    expect(JSON.stringify(voucher)).not.toMatch(/John Doe|\+237|client/i);
  });
  it('maps debt_overdue to finance.debt_overdue with store aggregates only', () => {
    expect(WAHA_DEFAULT_EVENT_TYPES).toContain('debt_overdue');
    const debt = toNotifyEvent({
      ...sample,
      event_type: 'debt_overdue',
      title: '📋 Dettes en attente — Boutique Test',
      message: '3 dette(s) de plus de 7 j — 125 000 FCFA restants',
      link_to_tab: null,
      link_to_id: null
    }, ctx);
    expect(debt.type).toBe('finance.debt_overdue');
    expect(debt.resource).toEqual({ kind: 'finance', id: sample.notification_id });
    expect(debt.facts).toEqual({ subject: 'Boutique Test', debtCount: 3, debtOutstandingXaf: 125000 });
  });
  it('every default type is accepted by Trigenys Notify (mirror of its ALLOWED_TYPES)', () => {
    // Mirror of trigenys-notify src/core/dispatch.ts ALLOWED_TYPES (PR Trigenys/trigenys-notify#59,
    // order.delivered/cancelled/unreachable/stale: PR feat/order-outcome-events).
    // Adding an alias here without adding it there = silent HTTP 400 (ERRORS_LOG 2026-11-02).
    const NOTIFY_ALLOWED_TYPES = new Set([
      'inventory.stock_low', 'inventory.stock_out', 'catalog.product_missing_image',
      'barter.requested', 'marketplace.listing_created',
      'order.created', 'order.paid', 'barter.voucher_expiring', 'cash_report.closed', 'finance.debt_overdue',
      'order.delivered', 'order.cancelled', 'order.unreachable', 'order.stale'
    ]);
    for (const t of WAHA_DEFAULT_EVENT_TYPES) expect(NOTIFY_ALLOWED_TYPES.has(NOTIFY_EVENT_ALIASES[t])).toBe(true);
    for (const alias of Object.values(NOTIFY_EVENT_ALIASES)) expect(NOTIFY_ALLOWED_TYPES.has(alias)).toBe(true);
  });
  it('every alias type is a dotted type Trigenys Notify can validate', () => {
    for (const type of Object.values(NOTIFY_EVENT_ALIASES))
      expect(type).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,3}$/);
    for (const t of WAHA_DEFAULT_EVENT_TYPES) expect(NOTIFY_EVENT_ALIASES[t]).toBeDefined();
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


describe('alignement staff -> WhatsApp (ERRORS_LOG 2026-11-09 troc_stale)',()=>{
  it('every staff event is either aliased or explicitly excluded, never both',()=>{
    for(const t of DEFAULT_STAFF_EVENT_TYPES){
      const aliased=t in NOTIFY_EVENT_ALIASES,excluded=t in WAHA_EXCLUDED_EVENT_TYPES;
      expect({t,covered:aliased!==excluded}).toEqual({t,covered:true});
    }
    for(const reason of Object.values(WAHA_EXCLUDED_EVENT_TYPES))expect(reason.length).toBeGreaterThan(10);
  });
});

describe('order outcome events (20261110_001)',()=>{
  const order=(event_type:string,message:string)=>({
    ...sample,event_type,title:'Commande',message,link_to_tab:'orders',link_to_id:'ORD-3MR8-G6XF'
  });
  it('relays the 4 types by default with order resource and deep link',()=>{
    for(const t of ['order_delivered','order_cancelled','order_unreachable','order_stale'])
      expect(WAHA_DEFAULT_EVENT_TYPES).toContain(t);
    const e=toNotifyEvent(order('order_delivered','#ORD-3MR8-G6XF — 90,000 FCFA — Par : Awa'),ctx);
    expect(e.type).toBe('order.delivered');
    expect(e.priority).toBe('normal');
    expect(e.resource).toEqual({kind:'order',id:'ORD-3MR8-G6XF'});
    expect(e.actionUrl).toBe('https://www.xeptionetwork.shop/admin/orders/ORD-3MR8-G6XF');
    expect(e.facts).toEqual({subject:'#ORD-3MR8-G6XF',actor:'Awa',orderTotalXaf:90000});
  });
  it('keeps the closed-list reason of a cancellation',()=>{
    const e=toNotifyEvent(order('order_cancelled','#ORD-1 — 15 000 FCFA — Motif : Rupture de stock — Par : Awa'),ctx);
    expect(e.type).toBe('order.cancelled');
    expect(e.facts).toMatchObject({orderTotalXaf:15000,outcomeReason:'Rupture de stock',actor:'Awa'});
  });
  it('sends unreachable and stale as high priority with bounded counters',()=>{
    const u=toNotifyEvent(order('order_unreachable','#ORD-1 — 15 000 FCFA — tentative n°2'),ctx);
    expect(u).toMatchObject({type:'order.unreachable',priority:'high',facts:{attemptCount:2,orderTotalXaf:15000}});
    const s=toNotifyEvent(order('order_stale','#ORD-1 — 15 000 FCFA — en attente depuis 49 h — injoignable ×3'),ctx);
    expect(s).toMatchObject({type:'order.stale',priority:'high',facts:{waitingHours:49,attemptCount:3}});
    const plain=toNotifyEvent(order('order_stale','#ORD-1 — 15 000 FCFA — en attente depuis 170 h'),ctx);
    expect(plain.facts).not.toHaveProperty('attemptCount');
  });
  it('never relays a phone number slipped into the message',()=>{
    const e=toNotifyEvent(order('order_cancelled','#ORD-1 — 15 000 FCFA — Motif : +237 699 99 99 99'),ctx);
    expect(JSON.stringify(e)).not.toMatch(/699/);
  });
});
