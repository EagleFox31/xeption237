
import { useState, useCallback } from 'react';
import { AdminNotification } from '../../types';

export const useAdminNotifications = () => {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [currentToast, setCurrentToast] = useState<AdminNotification | null>(null);
    const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);

    const playNotificationSound = useCallback(() => {
        try {
            const audio = new Audio('https://res.cloudinary.com/dli0kdkg9/video/upload/v1709736806/notification_sound_b4qj3f.mp3'); 
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Audio play failed", e));
        } catch (e) {
            console.error("Audio error", e);
        }
    }, []);

    const addNotification = useCallback((notif: AdminNotification) => {
        setNotifications(prev => [notif, ...prev]);
        setCurrentToast(notif);
        playNotificationSound();
    }, [playNotificationSound]);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const closeToast = useCallback(() => setCurrentToast(null), []);
    const toggleDrawer = useCallback(() => setIsNotifDrawerOpen(prev => !prev), []);

    return {
        notifications,
        currentToast,
        isNotifDrawerOpen,
        setIsNotifDrawerOpen,
        addNotification,
        markAsRead,
        clearAll,
        closeToast,
        toggleDrawer,
        unreadCount: notifications.filter(n => !n.read).length
    };
};
