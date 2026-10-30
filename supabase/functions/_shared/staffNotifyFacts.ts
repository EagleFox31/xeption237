/** Allowlisted business fields from the persisted notification, not live product state.
 * Customer/contact fragments and arbitrary notification titles never leave Xeption.
 */
import type {StaffNotification} from './staffNotify.ts';

const contact=/@|https?:\/\/|www\.|\+\s*\d(?:[\s().-]*\d){7,}|\b\d{9,15}\b|\b(?:237[\s.-]*)?[26]\d{2}(?:[\s.-]*\d{3}){2}\b/i;
const label=(raw:string|undefined,max:number):string|undefined=>{
  if(!raw)return undefined;
  const value=raw.normalize('NFC').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069*_~`]/g,' ')
    .replace(/\s+/g,' ').trim();
  return value&&value.length<=max&&!contact.test(value)?value:undefined;
};
const money=(raw:string):number|undefined=>{
  const value=Number(raw.replace(/[\s\u00a0\u202f]/g,''));
  return Number.isSafeInteger(value)&&value>=0&&value<=1_000_000_000_000?value:undefined;
};

export const extractNotificationFacts=(n:StaffNotification)=>{
  const parts=n.message.slice(0,4000).split(' — ').map(s=>s.trim()).filter(Boolean);
  const facts:Record<string,string|number>={};
  const subject=label(parts[0],160);if(subject)facts.subject=subject;
  const actor=label(parts.find(s=>/^Par\s*:/i.test(s))?.replace(/^Par\s*:\s*/i,''),80);
  if(actor)facts.actor=actor;
  if(n.event_type==='stock_low'||n.event_type==='stock_out'){
    const count=parts.map(s=>s.match(/^(\d+) restant\(s\)$/i)).find(Boolean);
    if(count){const value=Number(count[1]);if(Number.isSafeInteger(value)&&value<=1_000_000_000)facts.stockRemaining=value;}
  }else if(n.event_type==='troc_submitted'){
    const condition=label(parts.find(s=>s.startsWith('État : '))?.slice('État : '.length),180);
    const target=label(parts.find(s=>s.startsWith('Cible : '))?.slice('Cible : '.length),160);
    if(condition)facts.condition=condition;
    if(target)facts.target=target;
    const offers=parts.find(s=>s.startsWith('Offre estimée : '))??'';
    for(const match of offers.matchAll(/(\d[\d\s\u00a0\u202f]*(?:\.0+)?) FCFA (cash|bon d'achat)/g)){
      const value=money(match[1]);
      if(value!==undefined)facts[match[2]==='cash'?'cashOfferXaf':'voucherOfferXaf']=value;
    }
  }else if(n.event_type==='order_created'){
    const totalMatch=parts[0]?.match(/^([\d\s.]+)\s*FCFA$/i);
    if(totalMatch){
      const t=money(totalMatch[1]);
      if(t!==undefined)facts.orderTotalXaf=t;
    }
    const city=label(parts[1],80);
    if(city&&/^[\p{L}][\p{L} '\-]*$/u.test(city))facts.city=city;
    const delivery=label(parts[2],80);
    if(delivery)facts.deliveryMode=delivery;
  }else if(n.event_type==='order_paid'){
    const totalMatch=parts[0]?.match(/^([\d\s.]+)\s*FCFA$/i);
    if(totalMatch){
      const t=money(totalMatch[1]);
      if(t!==undefined)facts.amountPaidXaf=t;
    }
    const ch=label(parts[1],80);
    if(ch)facts.paymentChannel=ch;
    const st=label(parts[2],80);
    if(st)facts.paymentStatus=st;
  }else if(n.event_type==='marketplace_listed'){
    const specification=parts.find(s=>/^\d{1,4} Go(?: \/ \d{1,4} Go)?$/.test(s));
    if(specification)facts.specification=specification;
    const grade=parts.map(s=>s.match(/^grade ([A-F][+-]?)$/i)).find(Boolean);
    if(grade)facts.grade=grade[1].toUpperCase();
    const priceIndex=parts.findIndex(s=>/^[\d\s.]+ à [\d\s.]+ FCFA$/.test(s));
    if(priceIndex>=0){
      const price=parts[priceIndex].match(/^([\d\s.]+) à ([\d\s.]+) FCFA$/)!;
      const min=money(price[1]),max=money(price[2]);
      if(min!==undefined&&max!==undefined&&min<=max){facts.priceMinXaf=min;facts.priceMaxXaf=max;}
      const city=label(parts[priceIndex+1],80);
      if(city&&/^[\p{L}][\p{L} '\-]*$/u.test(city))facts.city=city;
    }
  }else if(n.event_type==='store_cash_report'){
    const closingMatch=parts.find(s=>s.startsWith('Solde soir : '))?.match(/Solde soir\s*:\s*([\d\s.]+)\s*FCFA/i);
    if(closingMatch){
      const c=money(closingMatch[1]);
      if(c!==undefined)facts.closingCashXaf=c;
    }
    const inflowMatch=parts.find(s=>s.startsWith('Entrées : '))?.match(/Entrées\s*:\s*([\d\s.]+)\s*FCFA/i);
    if(inflowMatch){
      const inf=money(inflowMatch[1]);
      if(inf!==undefined)facts.totalInflowXaf=inf;
    }
    const outflowMatch=parts.find(s=>s.startsWith('Dépenses : '))?.match(/Dépenses\s*:\s*([\d\s.]+)\s*FCFA/i);
    if(outflowMatch){
      const out=money(outflowMatch[1]);
      if(out!==undefined)facts.totalOutflowXaf=out;
    }
  }else if(n.event_type==='voucher_expiring'){
    const match=n.message.match(/^Bon\s+([A-Za-z0-9_-]+)\s*\(([^)]+)\)\s*expire\s+le\s+(.+)$/i);
    if(match){
      const voucherRef=label(match[1],40);
      const dev=label(match[2],80);
      const exp=label(match[3],40);
      if(voucherRef)facts.voucherReference=voucherRef;
      if(dev)facts.deviceModel=dev;
      if(exp)facts.expiresAtText=exp;
    }
  }
  return Object.keys(facts).length?facts:undefined;
};
