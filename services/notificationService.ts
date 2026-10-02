/**
 * Service unique de création de notifications admin — gère la dédup et l'audit.
 *
 * Deux chemins de création couverts côté client :
 *   • `createNotification(input)` — insert direct par un staff authentifié
 *     (RLS gère le gating). Utilisé pour les notifs manuelles (sync offline,
 *     feedback, actions UI).
 *   • Les notifs auto-générées par triggers DB (ex: `troc_submitted`) ne passent
 *     PAR CE SERVICE — elles sont créées côté Postgres via SECURITY DEFINER.
 *     Ce service ne les crée pas en doublon : la contrainte UNIQUE sur
 *     `dedup_key` protège de toute façon.
 *
 * Contrat non-régressif (issue #17) : la création d'une notif ne doit JAMAIS
 * casser le flow métier qui l'a déclenchée. En cas d'erreur, on log et on
 * swallow — jamais de throw.
 */

import { supabase } from './supabaseClient';
import type { AdminNotification } from '../types';

/** Types d'événements documentés dans docs/engineering/NOTIFICATIONS.md */
export type NotificationEventType =
  | 'troc_submitted'
  | 'troc_contacted'
  | 'troc_appointment'
  | 'troc_completed'
  | 'troc_refused'
  | 'order_created'
  | 'order_paid'
  | 'order_shipped'
  | 'sync_success'
  | 'sync_failure'
  | 'stock_alert'
  | 'security_alert'
  | 'manual';

export interface CreateNotificationInput {
  eventType: NotificationEventType;
  title: string;
  message: string;
  /** Dédup : si fourni, deux appels avec la même clé ne créent qu'une notif. */
  dedupKey?: string;
  /** Deep-link UI : onglet admin cible (ex: 'troc', 'orders'). */
  linkToTab?: string;
  /** Deep-link UI : ID de l'entité (request_id, order_id…) pour ouvrir le détail. */
  linkToId?: string;
  /** Null/omis = toute l'équipe staff. Sinon rôle requis (ex: 'direction'). */
  targetRole?: string | null;
}

export interface NotificationRow {
  id: string;
  dedup_key: string | null;
  event_type: string;
  title: string;
  message: string;
  link_to_tab: string | null;
  link_to_id: string | null;
  target_role: string | null;
  created_at: string;
  read_at: string | null;
  created_by: string;
}

/** Convertit une ligne DB en `AdminNotification` consommable par l'UI legacy. */
export const rowToNotification = (row: NotificationRow): AdminNotification => ({
  id: row.id,
  type: mapEventTypeToUiType(row.event_type),
  title: row.title,
  message: row.message,
  timestamp: new Date(row.created_at),
  read: row.read_at !== null,
  linkToTab: row.link_to_tab ?? undefined,
});

/** Mappe un `event_type` DB vers l'énum de couleur UI legacy. */
const mapEventTypeToUiType = (eventType: string): AdminNotification['type'] => {
  if (eventType.startsWith('troc_')) return 'ticket';
  if (eventType.startsWith('order_')) return 'order';
  return 'alert';
};

/**
 * Crée une notification. Retourne la ligne créée, `null` si dédup l'a bloquée
 * ou si une erreur est survenue (loggée en warn).
 */
export const createNotification = async (
  input: CreateNotificationInput,
): Promise<NotificationRow | null> => {
  const payload = {
    dedup_key: input.dedupKey ?? null,
    event_type: input.eventType,
    title: input.title,
    message: input.message,
    link_to_tab: input.linkToTab ?? null,
    link_to_id: input.linkToId ?? null,
    target_role: input.targetRole ?? null,
  };

  const { data, error } = await supabase
    .from('admin_notifications')
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) {
    // Code 23505 = unique_violation sur dedup_key → silencieux (c'est l'effet voulu)
    if (error.code === '23505') return null;
    console.warn('[notificationService] createNotification error:', error.message);
    return null;
  }
  return data as NotificationRow | null;
};

/** Marque une notification comme lue. Idempotent. */
export const markNotificationRead = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);

  if (error) {
    console.warn('[notificationService] markNotificationRead error:', error.message);
    return false;
  }
  return true;
};

/** Marque TOUTES les notifications visibles comme lues. */
export const markAllNotificationsRead = async (): Promise<boolean> => {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);

  if (error) {
    console.warn('[notificationService] markAllNotificationsRead error:', error.message);
    return false;
  }
  return true;
};

/**
 * Génère une clé de dédup stable pour un événement SMART TROC — même convention
 * que le trigger DB (`notify_trade_in_status_change`) pour éviter la collision
 * entre un trigger auto et un rejeu manuel.
 */
export const trocDedupKey = (
  status: 'submitted' | 'contacted' | 'appointment' | 'completed' | 'refused',
  requestId: string,
): string => `troc.${status}.${requestId}`;

/**
 * Fetch les N dernières notifications visibles par le staff authentifié (RLS).
 */
export const fetchNotifications = async (limit: number = 50): Promise<NotificationRow[]> => {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[notificationService] fetchNotifications error:', error.message);
    return [];
  }
  return (data ?? []) as NotificationRow[];
};
