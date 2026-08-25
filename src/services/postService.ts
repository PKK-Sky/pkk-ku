/**
 * Service pendukung untuk fitur Feed/Post.
 * - getMembersByUserIds: resolve nama asli anggota dari auth user_id (posts.user_id,
 *   post_comments.user_id, dll mereferensi auth.users.id, bukan members.id, dan
 *   auth.users tidak bisa di-join langsung lewat PostgREST — jadi harus query terpisah
 *   ke tabel `members` yang punya kolom user_id).
 * - getPublicMediaUrl: bangun public URL untuk file di bucket Supabase Storage yang publik
 *   (post-media, report-media).
 */
import { supabase } from '@lib/supabase';
import { Member } from '@types';

export type MemberLookup = Pick<Member, 'user_id' | 'full_name' | 'avatar_url'>;

/**
 * Ambil profil anggota (nama, avatar) untuk sekumpulan auth user_id sekaligus,
 * dikembalikan sebagai Map<user_id, profil> supaya lookup di UI O(1).
 * ID yang tidak ditemukan (mis. akun sudah dihapus) cukup diabaikan oleh pemanggil
 * dengan fallback nama default.
 */
export async function getMembersByUserIds(
  userIds: Array<string | null | undefined>
): Promise<Map<string, MemberLookup>> {
  const uniqueIds = Array.from(new Set(userIds.filter((id): id is string => !!id)));
  const map = new Map<string, MemberLookup>();
  if (uniqueIds.length === 0) return map;

  const { data, error } = await supabase
    .from('members')
    .select('user_id, full_name, avatar_url')
    .in('user_id', uniqueIds);

  if (error) {
    console.error('[postService] gagal memuat profil anggota:', error.message);
    return map;
  }

  (data || []).forEach(row => {
    if (row.user_id) map.set(row.user_id, row as MemberLookup);
  });
  return map;
}

/**
 * Bangun public URL untuk file di bucket storage publik (post-media/report-media).
 * Urutan argumen: (bucket, path) — konsisten dengan supabase.storage.from(bucket).
 */
export function getPublicMediaUrl(bucket: string, path: string): string {
  if (!path) return '';
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
