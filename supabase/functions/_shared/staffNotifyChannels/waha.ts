/**
 * Optional WAHA NOWEB channel for Xeption staff notifications.
 *
 * WAHA is running on Trigenys Notify's OVH VPS. The VPS currently binds its
 * API to 127.0.0.1:3000, so this channel is DISABLED until a secured HTTPS
 * ingress exists and server-side WAHA secrets have been configured.
 *
 * Never send free-form notification content, names, phone numbers or messages
 * to a WhatsApp group; the existing admin UI provides authorized details.
 */
import {
  notificationLink,
  type EnvReader,
  type StaffNotification,
  type StaffNotifyChannel,
  type StaffNotifyContext,
} from '../staffNotify.ts';

const SAFE_TEMPLATES: Record<string, string> = {
  troc_submitted: '🔄 Nouveau dossier de troc à examiner',
  troc_completed: '✅ Un dossier de troc a été clôturé',
  troc_refused: '⛔ Un dossier de troc a été refusé',
  stock_low: '📦 Alerte : stock faible',
  stock_out: '🚨 Alerte : rupture de stock',
  marketplace_listed: '🛍️ Nouvelle annonce marketplace',
  order_created: '🧾 Nouvelle commande',
  product_missing_image: '🖼️ Photo de produit manquante',
};

export const WAHA_DEFAULT_EVENT_TYPES = ['stock_low', 'stock_out', 'product_missing_image'];

export function safeWahaText(notification: StaffNotification, ctx: StaffNotifyContext): string {
  const header = Object.hasOwn(SAFE_TEMPLATES, notification.event_type)
    ? SAFE_TEMPLATES[notification.event_type]
    : '🔔 Nouvelle alerte du personnel';
  const link = notificationLink(notification, ctx).url;
  // The URL may contain a source-generated item ID; never copy customer details.
  return [header, 'Consultez Xeption pour les détails.', link].join('\n');
}

function trustedEndpoint(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.port || url.search || url.hash || url.pathname !== '/' ||
        !/^[a-z0-9.-]+$/i.test(url.hostname)) return null;
    return url.origin + '/api/sendText';
  } catch { return null; }
}

/**
 * Fully opt-in: WAHA_ENABLED must be true and every credential present.
 * Fail-closed validation NEVER disrupts the existing Telegram channel.
 */
export const createWahaChannel = (
  env: EnvReader, fetchImpl: typeof fetch = fetch,
): StaffNotifyChannel | null => {
  if (env('WAHA_ENABLED') !== 'true') return null;
  const endpoint = trustedEndpoint(env('WAHA_BASE_URL') ?? '');
  const apiKey = env('WAHA_API_KEY') ?? '';
  const session = env('WAHA_SESSION') ?? '';
  const groupId = env('WAHA_STAFF_GROUP_ID') ?? '';
  if (!endpoint || apiKey.length < 32 ||
      !/^[a-zA-Z0-9_-]{1,48}$/.test(session) ||
      !/^[0-9-]+@g\.us$/.test(groupId)) return null;

  const types = (env('WAHA_EVENT_TYPES') || WAHA_DEFAULT_EVENT_TYPES.join(','))
    .split(',').map(s => s.trim()).filter(s => Object.hasOwn(SAFE_TEMPLATES, s));
  if (!types.length) return null;

  return {
    id: 'whatsapp_waha', // Separate durable outbox from channel 'telegram'.
    eventTypes: [...new Set(types)],
    async send(notification, ctx) {
      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Api-Key': apiKey,
          },
          body: JSON.stringify({
            session,
            chatId: groupId,
            text: safeWahaText(notification, ctx),
            linkPreview: false,
          }),
          signal: AbortSignal.timeout(12_000),
        });
        // Do not leak upstream response bodies, phone numbers, chat IDs or keys.
        // HTTP 2xx indicates WAHA accepted the request, not user delivery.
        if (response.ok) return null;
        return `waha_http_${response.status}`;
      } catch {
        return 'waha_network_error';
      }
    },
  };
};
