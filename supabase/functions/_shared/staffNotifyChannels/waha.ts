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

/** Canonical Trigenys Notify event. No freeform names, phone, email, title or message. */
export function toNotifyEvent(n:StaffNotification, _ctx:StaffNotifyContext) {
  const type=NOTIFY_EVENT_ALIASES[n.event_type];
  if(!type) throw new Error('UNSUPPORTED_NOTIFY_EVENT');
  const kind=type.startsWith('inventory.')?'inventory':
    type.startsWith('catalog.')?'catalog':
    type.startsWith('barter.')?'barter':'marketplace';
  return {
    version:1,project:'xeption',id:n.notification_id,type,
    occurredAt:new Date().toISOString(),
    priority:n.event_type==='stock_out'?'critical':
      n.event_type==='stock_low'?'high':'normal',
    resource:{kind,id:n.notification_id},
    audience:'staff',
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
        return 'notify_http_'+res.status;
      }catch{
        return 'notify_network_error';
      }
    }
  };
};
