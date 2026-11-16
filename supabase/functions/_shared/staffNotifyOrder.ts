/**
 * Typed order snapshot for staff order alerts.
 *
 * The staff must know who to call, what to prepare and where to deliver. The snapshot is attached
 * to every order event (new, delivered, cancelled, unreachable, stale) and shown in the internal
 * Telegram group. Toward Trigenys Notify (WhatsApp), the exception to the no-customer-data rule
 * stays scoped to order_created (ADR-002, staffNotifyFacts.ts).
 * Each field is dropped when it fails validation; the alert still goes out.
 */
import type {StaffNotification} from './staffNotify.ts';

export interface OrderNotificationSnapshot {
  id:string;
  customer_name?:string|null;
  customer_phone?:string|null;
  customer_email?:string|null;
  customer_city?:string|null;
  delivery_mode?:string|null;
  payment_method?:string|null;
  total?:number|string|null;
  items?:unknown;
  /** Current status: decides whether the Telegram alert carries action buttons. */
  status?:string|null;
}

export const ORDER_SNAPSHOT_COLUMNS =
  'id,customer_name,customer_phone,customer_email,customer_city,delivery_mode,payment_method,total,items,status';

/** Must stay within Trigenys Notify's limits (10 items, 4096-byte body). */
const MAX_ITEMS=10;
const ITEM_NAME_MAX=80;
const XAF_MAX=1_000_000_000_000;
const contact=/@|https?:\/\/|www\.|\+\s*\d(?:[\s().-]*\d){7,}|\b\d{9,15}\b|\b(?:237[\s.-]*)?[26]\d{2}(?:[\s.-]*\d{3}){2}\b/i;
const email=/^[^\s@<>()"',;:]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const DELIVERY_LABELS:Record<string,string>={delivery:'Livraison à domicile',pickup:'Retrait en boutique'};

const clean=(raw:unknown,max:number,{allowContact=false,truncate=false}={}):string|undefined=>{
  if(typeof raw!=='string')return undefined;
  let value=raw.normalize('NFC').replace(/[\u0000-\u001f\u007f‪-‮⁦-⁩*_~`]/g,' ')
    .replace(/\s+/g,' ').trim();
  if(truncate&&value.length>max)value=value.slice(0,max-1).trimEnd()+'…';
  if(!value||value.length>max||(!allowContact&&contact.test(value)))return undefined;
  return value;
};
const xaf=(raw:unknown):number|undefined=>{
  const value=typeof raw==='string'?Number(raw):raw;
  if(typeof value!=='number'||!Number.isFinite(value))return undefined;
  const rounded=Math.round(value);
  return rounded>=0&&rounded<=XAF_MAX?rounded:undefined;
};

/** Digits only, Cameroon numbers prefixed with +237 so WhatsApp makes them tappable. */
export const formatOrderPhone=(raw:unknown):string|undefined=>{
  if(typeof raw!=='string')return undefined;
  const digits=raw.replace(/\D/g,'');
  const national=digits.replace(/^00/,'');
  const full=/^[26]\d{8}$/.test(national)?'237'+national:national;
  return /^\d{8,15}$/.test(full)?'+'+full:undefined;
};

/**
 * wa.me link to the customer, with a short prefilled greeting (order number only, no amount).
 * Internal Telegram group only: never sent to Trigenys Notify.
 */
export const customerWhatsAppLink=(order:OrderNotificationSnapshot,shopName?:string):string|undefined=>{
  const phone=formatOrderPhone(order.customer_phone);
  if(!phone||!/^[A-Za-z0-9_-]{1,40}$/.test(order.id))return undefined;
  const name=clean(order.customer_name,80)?.split(' ')[0];
  const shop=clean(shopName,60);
  const text=`Bonjour${name?' '+name:''}, ici ${shop??'la boutique'} au sujet de votre commande #${order.id}.`;
  return `https://wa.me/${phone.slice(1)}?text=${encodeURIComponent(text)}`;
};

export function orderSnapshotFacts(order:OrderNotificationSnapshot):Record<string,unknown>{
  const facts:Record<string,unknown>={};
  const name=clean(order.customer_name,80);if(name)facts.customerName=name;
  const phone=formatOrderPhone(order.customer_phone);if(phone)facts.customerPhone=phone;
  const mail=typeof order.customer_email==='string'?order.customer_email.trim().toLowerCase():'';
  if(mail.length<=254&&email.test(mail))facts.customerEmail=mail;
  const items=Array.isArray(order.items)?order.items.flatMap(raw=>{
    if(!raw||typeof raw!=='object')return [];
    const item=raw as Record<string,unknown>;
    const itemName=clean(item.name,ITEM_NAME_MAX,{truncate:true});
    const quantity=Number(item.quantity??1);
    if(!itemName||!Number.isSafeInteger(quantity)||quantity<1||quantity>999)return [];
    const unitPriceXaf=xaf(item.price);
    return [{name:itemName,quantity,...(unitPriceXaf!==undefined?{unitPriceXaf}:{})}];
  }).slice(0,MAX_ITEMS):[];
  if(items.length)facts.items=items;
  const total=xaf(order.total);if(total!==undefined)facts.orderTotalXaf=total;
  const payment=clean(order.payment_method,80);if(payment)facts.paymentMethod=payment;
  const mode=typeof order.delivery_mode==='string'?order.delivery_mode.trim():'';
  const delivery=DELIVERY_LABELS[mode]??clean(mode,80);if(delivery)facts.deliveryMode=delivery;
  // Checkout stores « Ville (Région), Quartier » in customer_city; pickup stores a fixed label.
  if(mode!=='pickup'){
    const [cityPart,...rest]=(typeof order.customer_city==='string'?order.customer_city:'').split(',');
    const city=clean(cityPart,80);if(city)facts.city=city;
    const address=clean(rest.join(','),160);if(address)facts.deliveryAddress=address;
  }
  return facts;
}

/** Order events whose link_to_id is the order id: their alert carries the order snapshot. */
export const ORDER_SNAPSHOT_EVENT_TYPES:ReadonlySet<string>=new Set([
  'order_created','order_delivered','order_cancelled','order_unreachable','order_stale',
]);

const groupThousands=(value:number):string=>String(value).replace(/\B(?=(\d{3})+(?!\d))/g,' ');

/**
 * Human-readable lines (who, what, where, how to pay) for text channels.
 * Built from the validated facts, so a malformed field is dropped rather than shown.
 */
export function orderDetailLines(order:OrderNotificationSnapshot):string[]{
  const f=orderSnapshotFacts(order);
  const lines:string[]=[];
  const contactLine=[f.customerName,f.customerPhone??f.customerEmail].filter(Boolean).join(' · ');
  if(contactLine)lines.push(`👤 ${contactLine}`);
  for(const item of (f.items as Array<{name:string;quantity:number;unitPriceXaf?:number}>|undefined)??[]){
    const price=item.unitPriceXaf!==undefined?` — ${groupThousands(item.unitPriceXaf)} FCFA`:'';
    lines.push(`🛒 ${item.quantity} × ${item.name}${price}`);
  }
  const place=[f.city,f.deliveryAddress].filter(Boolean).join(', ');
  if(f.deliveryMode||place)lines.push(`🚚 ${[f.deliveryMode,place].filter(Boolean).join(' — ')}`);
  if(f.paymentMethod)lines.push(`💳 ${f.paymentMethod}`);
  return lines;
}

/**
 * Attach the order row to each order notification (ORDER_SNAPSHOT_EVENT_TYPES) in one read.
 * A read error throws (the batch is retried later) so a retry never sends a poorer payload;
 * a deleted order falls back to the persisted message.
 */
export async function withOrderSnapshots(
  rows:StaffNotification[],
  read:(ids:string[])=>Promise<OrderNotificationSnapshot[]>
):Promise<StaffNotification[]>{
  const wanted=(r:StaffNotification)=>ORDER_SNAPSHOT_EVENT_TYPES.has(r.event_type)&&!!r.link_to_id;
  const ids=[...new Set(rows.filter(wanted).map(r=>r.link_to_id as string))];
  if(!ids.length)return rows;
  const orders=new Map((await read(ids)).map(o=>[o.id,o]));
  return rows.map(row=>wanted(row)&&orders.has(row.link_to_id as string)
    ?{...row,order:orders.get(row.link_to_id as string)}:row);
}
