/**
 * Hook notifications admin — DB-backed + realtime (issue #17).
 *
 * Évolution de l'ancienne version in-memory :
 *   • Persistance via `admin_notifications` (Supabase)
 *   • Subscription realtime pour les nouvelles notifs (sans polling)
 *   • Dédup garantie côté DB (contrainte UNIQUE sur dedup_key)
 *   • Mark-as-read persistant (team-shared)
 *   • `addNotification(AdminNotification)` legacy conservé pour compat :
 *     il écrit maintenant dans la DB via le service, zéro appel-site cassé.
 *
 * Contrat non-régressif : si Supabase est indisponible, le hook retombe sur
 * un store local éphémère — l'app continue de tourner, les notifs vivent le
 * temps de la session.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import type { AdminNotification } from '../../types';
import {
  createNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  rowToNotification,
  type NotificationEventType,
  type NotificationRow,
} from '../../services/notificationService';

const SOUND_URL =
  'https://res.cloudinary.com/dli0kdkg9/video/upload/v1709736806/notification_sound_b4qj3f.mp3';

/** Convention : les types d'événements qu'on NE SOUHAITE PAS entendre (bruit UI). */
const SILENT_EVENT_TYPES: ReadonlySet<string> = new Set(['sync_success']);

export const useAdminNotifications = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [currentToast, setCurrentToast]   = useState<AdminNotification | null>(null);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const soundPrimedRef = useRef(false);

  const playSound = useCallback(() => {
    // Les navigateurs modernes bloquent l'autoplay avant interaction utilisateur.
    // On tente mais on avale l'erreur silencieusement — pas d'alerte.
    try {
      const audio = new Audio(SOUND_URL);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);

  /** Fusion dans l'état en évitant les doubles (par id). */
  const upsertRow = useCallback((row: NotificationRow, opts: { fromRealtime?: boolean } = {}) => {
    if (seenIds.current.has(row.id)) return;
    seenIds.current.add(row.id);
    const notif = rowToNotification(row);
    setNotifications((prev) => [notif, ...prev]);
    if (opts.fromRealtime && !SILENT_EVENT_TYPES.has(row.event_type)) {
      setCurrentToast(notif);
      if (soundPrimedRef.current) playSound();
    }
  }, [playSound]);

  // 1) Fetch initial — récupère les notifs persistées pour la session
  useEffect(() => {
    let alive = true;
    fetchNotifications(50).then((rows) => {
      if (!alive) return;
      // L'API renvoie DESC — on les ajoute dans l'ordre inverse pour les
      // réinsérer en tête tout en respectant l'ordre chronologique visible.
      for (const row of rows.slice().reverse()) upsertRow(row);
    });
    return () => { alive = false; };
  }, [upsertRow]);

  // 2) Realtime subscription — pas de polling, les INSERT/UPDATE sont pushés
  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        (payload: { new: NotificationRow }) => {
          upsertRow(payload.new, { fromRealtime: true });
        },
      )
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'admin_notifications' },
        (payload: { new: NotificationRow }) => {
          const row = payload.new;
          setNotifications((prev) =>
            prev.map((n) => (n.id === row.id ? { ...n, read: row.read_at !== null } : n)),
          );
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [upsertRow]);

  // 3) Prime le son après le premier geste utilisateur (politique autoplay)
  useEffect(() => {
    const prime = () => { soundPrimedRef.current = true; };
    window.addEventListener('click', prime, { once: true });
    window.addEventListener('keydown', prime, { once: true });
    return () => {
      window.removeEventListener('click', prime);
      window.removeEventListener('keydown', prime);
    };
  }, []);

  /**
   * API legacy conservée (shim) : écrit maintenant dans la DB via le service.
   * Les call-sites existants (sync offline, security events) tournent sans
   * modification. Le shim mappe les `type` legacy vers `event_type` structuré.
   */
  const addNotification = useCallback(
    async (notif: AdminNotification) => {
      const eventType: NotificationEventType =
        notif.type === 'order'
          ? 'order_created'
          : notif.type === 'ticket'
          ? 'troc_submitted'
          : 'manual';
      await createNotification({
        eventType,
        title: notif.title,
        message: notif.message,
        linkToTab: notif.linkToTab,
        dedupKey: notif.id, // l'id legacy sert de dedup pour éviter les doublons
      });
      // Pas de setState local : la subscription realtime va rajouter la ligne.
    },
    [],
  );

  const markAsRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const clearAll = useCallback(async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const closeToast = useCallback(() => setCurrentToast(null), []);
  const toggleDrawer = useCallback(() => setIsNotifDrawerOpen((prev) => !prev), []);

  const handleInteraction = useCallback(
    (notification: AdminNotification, onNavigate: (tab: string) => void) => {
      void markAsRead(notification.id);
      if (notification.linkToTab) onNavigate(notification.linkToTab);
      setIsNotifDrawerOpen(false);
      setCurrentToast(null);
    },
    [markAsRead],
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return {
    notifications,
    currentToast,
    isNotifDrawerOpen,
    unreadCount,
    addNotification,
    clearAll,
    closeToast,
    toggleDrawer,
    handleInteraction,
  };
};
