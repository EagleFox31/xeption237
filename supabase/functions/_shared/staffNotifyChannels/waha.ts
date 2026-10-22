/**
 * Xeption is an EVENT PRODUCER, never a direct WAHA provider client.
 *
 * Its existing durable outbox/cron sends a versioned event to Trigenys Notify.
 * Trigenys Notify owns the WAHA credentials, WhatsApp session and group.
 *
 * The WhatsApp channel remains disabled until WAHA_ENABLED=true and the
 * separate server-to-server ingress key has been configured.
 */
import {
  notificationLink,
  type EnvReader,
  type StaffNotification,
  type StaffNotifyChannel,
  type StaffNotifyContext,
} from '../staffNotify.ts';
import {extractNotificationFacts} from '../staffNotifyFacts.ts';

export const WAHA_DEFAULT_EVENT_TYPES = [
  'stock_low', 'stock_out', 'product_missing_image'
];

export const NOTIFY_EVENT_ALIASES: Record<string,string> = {
  stock_low:'inventory.stock_low',
  stock_out:'inventory.stock_out',
  product_missing_image:'catalog.product_missing_image',
  troc_submitted:'barter.requested',
  marketplace_listed:'marketplace.listing_created'
};

const DISPATCH_URL =
  'https://trigenys-notify-staging-api.lawrynnjennifer.workers.dev/v1/dispatch/xeption/whatsapp';

/** Hydrate only persisted timestamps in one read; never invent a time on retry. */
export async function withNotificationDates(
  rows:StaffNotification[],
  read:(ids:string[])=>Promise<Array<{id:string;created_at:string}>>
):Promise<StaffNotification[]>{
  if(!rows.length)return rows;
  const dates=new Map((await read([...new Set(rows.map(r=>r.notification_id))]))
    .map(r=>[r.id,r.created_at]));
  return rows.map(row=>{
    const created_at=dates.get(row.notification_id);
    if(!created_at)throw Error('NOTIFICATION_SNAPSHOT_MISSING');
    return {...row,created_at};
  });
}

/** Canonical envelope with allowlisted business facts, never raw title/message/contact data. */
export function toNotifyEvent(n:StaffNotification, _ctx:StaffNotifyContext) {
  const type=NOTIFY_EVENT_ALIASES[n.event_type];
  if(!type) throw new Error('UNSUPPORTED_NOTIFY_EVENT');
  const kind=type.startsWith('inventory.')?'inventory':
    type.startsWith('catalog.')?'catalog':
    type.startsWith('barter.')?'barter':'marketplace';
  if(!n.created_at||!Number.isFinite(Date.parse(n.created_at)))
    throw new Error('NOTIFICATION_TIMESTAMP_REQUIRED');
  const facts=extractNotificationFacts(n);
  const resourceId=n.link_to_id&&/^[a-zA-Z0-9._:-]{1,128}$/.test(n.link_to_id)
    ?n.link_to_id:n.notification_id;
  return {
    version:1,project:'xeption',id:n.notification_id,type,
    occurredAt:new Date(n.created_at).toISOString(),
    priority:n.event_type==='stock_out'?'critical':
      n.event_type==='stock_low'?'high':'normal',
    resource:{kind,id:resourceId},
    audience:'staff',
    ...(facts?{facts}:{}),
    // Do not use a client-controlled origin from message or source settings.
    actionUrl:notificationLink(n,{siteUrl:'https://www.xeptionetwork.shop'}).url
  };
}

/** This ID is stable to preserve Xeption's (notification_id, channel) outbox. */
export const createWahaChannel = (
  env:EnvReader,fetchImpl:typeof fetch=fetch
):StaffNotifyChannel|null => {
  if(env('WAHA_ENABLED')!=='true') return null;
  const ingestKey=env('XEPTION_NOTIFY_INGEST_KEY')??'';
  if(ingestKey.length<32)return null;
  const types=(env('WAHA_EVENT_TYPES')??WAHA_DEFAULT_EVENT_TYPES.join(','))
    .split(',').map(s=>s.trim()).filter(s=>Object.hasOwn(NOTIFY_EVENT_ALIASES,s));
  if(!types.length)return null;
  return {
    id:'whatsapp_waha',
    eventTypes:[...new Set(types)],
    async send(notification,ctx) {
      try {
        const event=toNotifyEvent(notification,ctx);
        const res=await fetchImpl(DISPATCH_URL,{
          method:'POST',
          headers:{
            'Content-Type':'application/json',
            'Accept':'application/json',
            'x-notify-auth':ingestKey
          },
          body:JSON.stringify(event),
          signal:AbortSignal.timeout(12000)
        });
        // HTTP 202 is acceptance by Trigenys Notify's WAHA provider.
        // No provider credential nor WhatsApp group ID exists in Xeption.
        if(res.status===202)return null;
        // Trigenys Notify publishes a narrow error-code contract.
        // Record ONLY allowlisted values; never log response bodies,
        // credentials, chat IDs, phone numbers or customer data.
        const knownCodes = new Set([
          'CHANNEL_DISABLED', 'WAHA_NOT_CONFIGURED',
          'WAHA_INVALID_CONFIG', 'INGEST_NOT_CONFIGURED',
          'UNAUTHORIZED', 'NETWORK_ERROR', 'PROVIDER_UNAVAILABLE',
          'PROVIDER_REJECTED', 'RATE_LIMITED', 'INVALID_EVENT'
        ]);
        let detail = '';
        if(res.status===503 || res.status===502) {
          try {
            const body = await res.json() as {error?:unknown};
            if(typeof body?.error === 'string' && knownCodes.has(body.error)) {
              detail = '_' + body.error;
            }
          }catch { /* do not inspect provider content */ }
        }
        return 'notify_http_'+res.status+detail;
      }catch{
        return 'notify_network_error';
      }
    }
  };
};

