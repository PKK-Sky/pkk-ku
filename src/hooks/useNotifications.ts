import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@lib/supabase';
import {
  getRecentNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
} from '@services';
import type { NotificationInbox } from '@types';

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<NotificationInbox[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const [{ data }, { count }] = await Promise.all([
      getRecentNotifications(userId, 20),
      getUnreadNotificationCount(userId),
    ]);
    setNotifications(data ?? []);
    setUnreadCount(count);
    setIsLoading(false);
  }, [userId]);

  // Realtime: notification_inbox terdaftar di publication supabase_realtime,
  // jadi notifikasi baru muncul instan tanpa polling.
  const channelRef = useRef<ReturnType<typeof subscribeToNotifications> | null>(null);

  useEffect(() => {
    if (!userId) return;

    refetch();

    channelRef.current = subscribeToNotifications(userId, (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, refetch]);

  const markRead = useCallback(async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await markNotificationRead(notificationId);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
    await markAllNotificationsRead(userId);
  }, [userId]);

  return { notifications, unreadCount, isLoading, refetch, markRead, markAllRead };
}
