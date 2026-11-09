/**
 * Notifications staff multi-canal : contrat commun aux adaptateurs (Telegram, WhatsApp…).
 * Module pur, sans API Deno : testé côté Vitest.
 *
 * Ajouter un canal = écrire un StaffNotifyChannel dans staffNotifyChannels/ et l'enregistrer
 * dans notify-staff/index.ts. Aucune migration : notification_deliveries est indexée par canal.
 */

import type { OrderNotificationSnapshot } from './staffNotifyOrder.ts';

export interface StaffNotification {
  notification_id: string;
  /** Persisted event time, hydrated for the canonical WhatsApp envelope. */
  created_at?: string;
  event_type: string;
  title: string;
  message: string;
  link_to_tab?: string | null;
  link_to_id?: string | null;
  /** order_created only, hydrated for the WhatsApp alert (staffNotifyOrder.ts). */
  order?: OrderNotificationSnapshot;
}

export interface StaffNotifyContext {
  /** URL publique du site (sans / final) : base des liens directs. */
  siteUrl: string;
}

export interface StaffNotifyChannel {
  /** Identifiant stable stocké dans notification_deliveries.channel (minuscules). */
  id: string;
  /** Événements relayés par ce canal. */
  eventTypes: string[];
  /** Envoie une notification ; renvoie un message d'erreur, ou null si c'est envoyé. */
  send(notification: StaffNotification, ctx: StaffNotifyContext): Promise<string | null>;
}

/** Lecture d'une variable d'environnement, injectée pour rester testable hors Deno. */
export type EnvReader = (name: string) => string | undefined;

/** Événements relayés par défaut (surchargeable par canal, ex. TELEGRAM_EVENT_TYPES). */
export const DEFAULT_STAFF_EVENT_TYPES = [
  'troc_submitted',
  'troc_completed',
  'troc_refused',
  'stock_low',
  'stock_out',
  'marketplace_listed',
  'order_created',
  'order_paid',
  'pos_sale',
  'product_missing_image',
  'stock_correction',
  'store_cash_report',
  'troc_stale',
  'voucher_expiring',
  'debt_overdue',
  'daily_digest',
  'order_delivered',
  'order_cancelled',
  'order_unreachable',
  'order_stale',
] as const;

/** Bilan journalier par boutique (notify_daily_digest, pg_cron) : format dédié multi-lignes. */
export const DAILY_DIGEST_EVENT_TYPE = 'daily_digest';

const EVENT_ICONS: Record<string, string> = {
  troc_submitted: '🔄',
  troc_completed: '✅',
  troc_refused: '⛔',
  stock_low: '📉',
  stock_out: '🚨',
  marketplace_listed: '🛒',
  order_created: '🧾',
  order_paid: '💳',
  pos_sale: '💰',
  product_missing_image: '🖼️',
  stock_correction: '✏️',
  store_cash_report: '📊',
  troc_stale: '⏱️',
  voucher_expiring: '⏳',
  debt_overdue: '📋',
  daily_digest: '📅',
  order_delivered: '✅',
  order_cancelled: '❌',
  order_unreachable: '📵',
  order_stale: '⏰',
};
const DEFAULT_ICON = '🔔';

export const eventIcon = (eventType: string): string => EVENT_ICONS[eventType] ?? DEFAULT_ICON;

export const parseEventTypes = (raw: string | undefined | null): string[] => {
  const list = (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : [...DEFAULT_STAFF_EVENT_TYPES];
};

export interface NotificationLink {
  label: string;
  url: string;
}

/**
 * Destination d'une notification selon link_to_tab. Les onglets admin sont des chemins
 * (/admin/<onglet>, cf. utils/adminRoutes.ts) ; les annonces marketplace n'ont pas d'onglet
 * admin et ouvrent la page publique.
 */
const LINK_TARGETS: Record<string, NotificationLink> = {
  inventory: { label: 'Voir le stock', url: '/admin/inventory' },
  troc: { label: 'Voir les trocs', url: '/admin/troc' },
  orders: { label: 'Voir les commandes', url: '/admin/orders' },
  marketplace: { label: 'Voir la marketplace', url: '/marketplace' },
  analytics: { label: 'Voir les finances', url: '/admin/analytics' },
};

/**
 * Onglets admin capables d'ouvrir un élément depuis /admin/<onglet>/<id>
 * (cf. parseAdminItemIdFromPath dans utils/adminRoutes.ts).
 */
const ITEM_LINK_LABELS: Record<string, string> = {
  inventory: 'Ouvrir le produit',
  troc: 'Ouvrir le dossier',
  orders: 'Ouvrir la commande',
};

export const notificationLink = (n: StaffNotification, ctx: StaffNotifyContext): NotificationLink => {
  const tab = n.link_to_tab?.trim() ?? '';
  const id = n.link_to_id?.trim() ?? '';
  if (id && ITEM_LINK_LABELS[tab]) {
    return { label: ITEM_LINK_LABELS[tab], url: `${ctx.siteUrl}/admin/${tab}/${encodeURIComponent(id)}` };
  }
  const target = LINK_TARGETS[tab] ??
    (/^[a-zA-Z]+$/.test(tab) ? { label: "Ouvrir l'admin", url: `/admin/${tab}` } : { label: "Ouvrir l'admin", url: '/admin' });
  return { label: target.label, url: `${ctx.siteUrl}${target.url}` };
};

/** Séparateur des champs dans admin_notifications.message (triggers SQL). */
const MESSAGE_FIELD_SEPARATOR = ' — ';

/** 45000 → « 45 000 » dans les champs exprimés en FCFA. */
const formatAmounts = (field: string): string =>
  /FCFA/i.test(field) ? field.replace(/\d{4,}/g, (d) => d.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')) : field;

/** Vue structurée commune à tous les canaux : chaque adaptateur ne fait que la mise en forme. */
export interface StaffNotificationView {
  icon: string;
  heading: string;
  subject: string;
  details: string[];
}

export const cleanHeading = (title: string): string => {
  const stripped = title.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '').trim();
  return stripped || title.trim();
};

export const toNotificationView = (n: StaffNotification): StaffNotificationView => {
  const [subject = '', ...details] = n.message
    .split(MESSAGE_FIELD_SEPARATOR)
    .map((f) => formatAmounts(f.trim()))
    .filter(Boolean);
  return { icon: eventIcon(n.event_type), heading: cleanHeading(n.title), subject, details };
};

export const isDailyDigest = (n: Pick<StaffNotification, 'event_type'>): boolean =>
  n.event_type === DAILY_DIGEST_EVENT_TYPE;

/** Séparateur des lignes d'un digest (une ligne = un bloc : ventes, canaux, caisse…). */
const DIGEST_LINE_SEPARATOR = '\n';

/**
 * Lignes d'un bilan journalier, dans l'ordre produit par notify_daily_digest.
 * Le message n'est pas découpé sur « — » : le titre porte déjà la boutique.
 */
export const dailyDigestLines = (n: StaffNotification): string[] =>
  n.message
    .split(DIGEST_LINE_SEPARATOR)
    .map((line) => formatAmounts(line.trim()))
    .filter(Boolean);

/** Texte brut commun (canaux sans mise en forme : SMS, WhatsApp texte…). */
export const formatPlainNotification = (n: StaffNotification, ctx?: StaffNotifyContext): string => {
  if (isDailyDigest(n)) {
    return [`${eventIcon(n.event_type)} ${cleanHeading(n.title)}`, ...dailyDigestLines(n), ctx && notificationLink(n, ctx).url]
      .filter(Boolean)
      .join('\n');
  }
  const v = toNotificationView(n);
  return [`${v.icon} ${v.heading}`, v.subject, ...v.details.map((d) => `• ${d}`), ctx && notificationLink(n, ctx).url]
    .filter(Boolean)
    .join('\n');
};
