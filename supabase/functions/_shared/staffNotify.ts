/**
 * Notifications staff multi-canal : contrat commun aux adaptateurs (Telegram, WhatsApp…).
 * Module pur, sans API Deno : testé côté Vitest.
 *
 * Ajouter un canal = écrire un StaffNotifyChannel dans staffNotifyChannels/ et l'enregistrer
 * dans notify-staff/index.ts. Aucune migration : notification_deliveries est indexée par canal.
 */

export interface StaffNotification {
  notification_id: string;
  event_type: string;
  title: string;
  message: string;
  link_to_tab?: string | null;
  link_to_id?: string | null;
}

export interface StaffNotifyContext {
  /** URL de l'admin, ajoutée en lien au message. */
  adminUrl: string;
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
] as const;

const EVENT_ICONS: Record<string, string> = {
  troc_submitted: '🔄',
  troc_completed: '✅',
  troc_refused: '⛔',
  stock_low: '📉',
  stock_out: '🚨',
  marketplace_listed: '🛒',
  order_created: '🧾',
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

/** Texte brut commun (canaux sans mise en forme : SMS, WhatsApp texte…). */
export const formatPlainNotification = (n: StaffNotification, ctx?: StaffNotifyContext): string =>
  [`${eventIcon(n.event_type)} ${n.title}`, n.message, ctx?.adminUrl].filter(Boolean).join('\n');
