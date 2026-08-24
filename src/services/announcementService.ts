/**
 * Service pengumuman (announcements).
 * announcements TIDAK realtime-enabled (lihat docs/supabase/peta-realtime.md) —
 * gunakan refetch manual (mis. pull-to-refresh), bukan subscription.
 */
import { supabase } from '@lib/supabase';
import type { Announcement } from '@types';

/**
 * Ambil pengumuman yang sedang aktif, terbaru duluan.
 */
export async function getActiveAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return { data: data as Announcement[] | null, error };
}
