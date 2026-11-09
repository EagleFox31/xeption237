/**
 * Typed order snapshot for the « Nouvelle commande » staff alert.
 *
 * Exception to the no-customer-data rule, scoped to order_created only (Trigenys Notify ADR-002):
 * the staff must know who to call, what to prepare and where to deliver.
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
}

export const ORDER_SNAPSHOT_COLUMNS =
  'id,customer_name,customer_phone,customer_email,customer_city,delivery_mode,payment_method,total,items';

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

/**
 * Attach the order row to each order_created notification in one read.
 * A read error throws (the batch is retried later) so a retry never sends a poorer payload;
 * a deleted order falls back to the persisted message.
 */
export async function withOrderSnapshots(
  rows:StaffNotification[],
  read:(ids:string[])=>Promise<OrderNotificationSnapshot[]>
):Promise<StaffNotification[]>{
  const ids=[...new Set(rows.filter(r=>r.event_type==='order_created'&&r.link_to_id)
    .map(r=>r.link_to_id as string))];
  if(!ids.length)return rows;
  const orders=new Map((await read(ids)).map(o=>[o.id,o]));
  return rows.map(row=>row.event_type==='order_created'&&row.link_to_id&&orders.has(row.link_to_id)
    ?{...row,order:orders.get(row.link_to_id)}:row);
}
