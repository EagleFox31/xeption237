/**
 * API Conversions Meta — logique pure (normalisation, hachage, payload).
 *
 * Aucune dépendance Deno : testée côté Vitest (tests/unit/metaCapi.test.ts).
 * L'Edge Function `meta-capi` s'occupe de l'I/O (base, headers, appel Graph).
 *
 * Déduplication : `event_id` = `purchase_<orderId>`, identique à l'`eventID`
 * de la balise GTM « Meta - Purchase ». Meta fusionne les deux s'ils arrivent.
 */

export const META_GRAPH_VERSION = 'v21.0';

export interface OrderRow {
  id: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_city?: string | null;
  total: number | string;
  items?: unknown;
}

export interface RequestContext {
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  eventSourceUrl?: string | null;
  eventTime?: number;
}

const toHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

export async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  return toHex(await crypto.subtle.digest('SHA-256', data));
}

export function normalizeEmail(email?: string | null): string | null {
  const e = (email ?? '').trim().toLowerCase();
  return e.includes('@') ? e : null;
}

/** Chiffres seuls, indicatif pays 237 ajouté aux numéros camerounais à 9 chiffres. */
export function normalizePhone(phone?: string | null): string | null {
  let digits = (phone ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9) digits = `237${digits}`;
  return digits.length >= 8 ? digits : null;
}

/** Minuscules, sans accents ni espaces ni ponctuation (format Meta `ct`). */
export function normalizeCity(city?: string | null): string | null {
  const c = (city ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return c && c !== 'retraitboutique' ? c : null;
}

interface CartLine {
  id: string;
  quantity: number;
  item_price: number;
}

export function toContents(items: unknown): CartLine[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((raw) => {
      const it = (raw ?? {}) as Record<string, unknown>;
      return {
        id: String(it.id ?? ''),
        quantity: Number(it.quantity ?? 1) || 1,
        item_price: Number(it.price ?? 0) || 0,
      };
    })
    .filter((c) => c.id);
}

export async function buildPurchaseEvent(order: OrderRow, ctx: RequestContext) {
  const email = normalizeEmail(order.customer_email);
  const phone = normalizePhone(order.customer_phone);
  const city = normalizeCity(order.customer_city);
  const contents = toContents(order.items);

  const user_data: Record<string, unknown> = { country: [await sha256('cm')] };
  if (email) user_data.em = [await sha256(email)];
  if (phone) user_data.ph = [await sha256(phone)];
  if (city) user_data.ct = [await sha256(city)];
  if (ctx.clientIp) user_data.client_ip_address = ctx.clientIp;
  if (ctx.userAgent) user_data.client_user_agent = ctx.userAgent;
  if (ctx.fbp) user_data.fbp = ctx.fbp;
  if (ctx.fbc) user_data.fbc = ctx.fbc;

  const event: Record<string, unknown> = {
    event_name: 'Purchase',
    event_time: ctx.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: `purchase_${order.id}`,
    action_source: 'website',
    user_data,
    custom_data: {
      currency: 'XAF',
      value: Number(order.total) || 0,
      order_id: order.id,
      content_type: 'product',
      content_ids: contents.map((c) => c.id),
      contents,
      num_items: contents.reduce((n, c) => n + c.quantity, 0),
    },
  };
  if (ctx.eventSourceUrl) event.event_source_url = ctx.eventSourceUrl;
  return event;
}

/** Première IP de x-forwarded-for (client réel derrière le proxy Supabase). */
export function clientIpFrom(headers: Headers): string | null {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim() || null;
  return headers.get('cf-connecting-ip') ?? headers.get('x-real-ip');
}
