/**
 * Service notification_inbox.
 * Tabel ini REALTIME-enabled (lihat docs/supabase/peta-realtime.md) — gunakan
 * subscribeToNotifications untuk update instan, bukan cuma polling.
 */
import { supabase } from '@lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { NotificationInboxItem } from '@types';

/**
 * Ambil notifikasi terbaru milik user yang sedang login.
 */
export async function getRecentNotifications(limit: number = 20) {
  const { data, error } = await supabase
    .from('notification_inbox')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: data as NotificationInboxItem[] | null, error };
}

/**
 * Hitung jumlah notifikasi belum dibaca milik user yang sedang login.
 */
export async function getUnreadNotificationCount() {
  const { count, error } = await supabase
    .from('notification_inbox')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null);

  return { count: count ?? 0, error };
}

/**
 * Tandai satu notifikasi sebagai sudah dibaca.
 */
export async function markNotificationRead(notificationId: string) {
  const { data, error } = await supabase
    .from('notification_inbox')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select('*')
    .single();

  return { data: data as NotificationInboxItem | null, error };
}

/**
 * Tandai semua notifikasi milik user sebagai sudah dibaca.
 */
export async function markAllNotificationsRead() {
  return supabase
    .from('notification_inbox')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
}

/**
 * Subscribe realtime ke notification_inbox milik userId tertentu.
 * RLS tetap berlaku untuk realtime — user cuma akan menerima event untuk row miliknya sendiri,
 * tapi filter di sini tetap disertakan supaya server tidak mengirim payload yang tidak relevan.
 * Jangan lupa panggil supabase.removeChannel(channel) saat unmount.
 */
export function subscribeToNotifications(
  userId: string,
  onInsert: (notification: NotificationInboxItem) => void
): RealtimeChannel {
  return supabase
    .channel(`notification_inbox:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notification_inbox',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onInsert(payload.new as NotificationInboxItem);
      }
    )
    .subscribe();
}
