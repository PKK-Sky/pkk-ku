/**
 * Service khusus dashboard & aksi admin.
 * Semua query di sini HANYA akan mengembalikan data jika user yang login
 * punya profiles.role = 'admin' (dicek lewat RLS function is_admin()).
 *
 * ── Alur pendaftaran anggota (PENTING, jangan diubah tanpa cek backend) ──
 * Admin TIDAK melakukan "approval". Admin hanya mendaftarkan data minimal
 * (full_name, phone, position_id) → baris tersimpan dengan registration_status
 * = 'pending' dan user_id = null. Anggota lalu mengaktivasi akunnya sendiri:
 *   1. RPC check_member_by_phone(phone) — verifikasi nomor terdaftar.
 *   2. Verifikasi OTP via Supabase Auth (phone) → dapat sesi.
 *   3. RPC complete_member_registration(phone, address?, avatar_url?) — ini yang
 *      men-set registration_status = 'active' dan menghubungkan user_id, TANPA
 *      keterlibatan admin sama sekali.
 * Satu-satunya aksi status yang memang dilakukan admin secara manual adalah
 * blokir/buka blokir (registration_status = 'blocked').
 *
 * ── Kapasitas jabatan (trigger check_position_capacity) ──
 * KETUA/WAKIL_KETUA/SEKRETARIS/BENDAHARA maksimal 1 anggota (non-blocked).
 * POKJA_I..IV maksimal 2 anggota (non-blocked). Insert yang melebihi kapasitas
 * akan ditolak database dengan pesan error yang sudah manusiawi.
 *
 * ── Catatan integrasi backend lain ──
 * - `announcements`: awalnya tidak ada policy SELECT untuk admin (hanya
 *   insert/update/delete lewat can_manage_announcements()). Sudah ditambahkan
 *   migration "admin_can_select_announcements" agar admin bisa membaca kembali
 *   data yang dia kelola.
 * - `chat_*` sengaja tidak disertakan di dashboard admin — skema backend
 *   menandai chat sebagai "private 1:1 conversations for non-admin users"
 *   (lihat chat_is_non_admin()), admin bukan partisipan.
 * - `reports.status` constraint aktual hanya mengizinkan 'sent' (belum ada
 *   workflow approve/reject), jadi dashboard menampilkan total & belum-dibaca.
 */
import { supabase } from '@lib/supabase';
import type { Member, MemberWithPosition, Announcement, Position, RegistrationStatus } from '@types';
import { normalizePhoneToE164 } from '@utils/phone';

export interface AdminDashboardStats {
  membersActive: number;
  membersPending: number;
  membersBlocked: number;
  reportsTotal: number;
  reportsUnreadForAdmin: number;
  postsActive: number;
  announcementsActive: number;
}

/**
 * Ambil seluruh angka ringkasan untuk kartu statistik dashboard admin.
 * Dijalankan paralel; jika salah satu query gagal, angka itu dikembalikan
 * sebagai 0 dan errornya dicatat, supaya satu kegagalan tidak menggagalkan
 * seluruh dashboard.
 */
export async function getAdminDashboardStats(): Promise<{
  data: AdminDashboardStats | null;
  error: Error | null;
}> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const adminUserId = sessionData.session?.user.id;
    if (!adminUserId) {
      return { data: null, error: new Error('Sesi admin tidak ditemukan.') };
    }

    const safeCount = async (
      label: string,
      query: PromiseLike<{ count: number | null; error: { message: string } | null }>
    ): Promise<number> => {
      const { count, error } = await query;
      if (error) {
        console.error(`[adminService] Gagal menghitung ${label}:`, error.message);
        return 0;
      }
      return count ?? 0;
    };

    const [
      membersActive,
      membersPending,
      membersBlocked,
      reportsTotal,
      reportsUnreadForAdmin,
      postsActive,
      announcementsActive,
    ] = await Promise.all([
      safeCount(
        'anggota aktif',
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('registration_status', 'active')
      ),
      safeCount(
        'anggota pending',
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('registration_status', 'pending')
      ),
      safeCount(
        'anggota blocked',
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('registration_status', 'blocked')
      ),
      safeCount('total laporan', supabase.from('reports').select('id', { count: 'exact', head: true })),
      safeCount(
        'laporan belum dibaca admin',
        supabase
          .from('report_recipients')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_user_id', adminUserId)
          .eq('is_read', false)
      ),
      safeCount(
        'postingan aktif',
        supabase.from('posts').select('id', { count: 'exact', head: true }).gt('expires_at', new Date().toISOString())
      ),
      safeCount(
        'pengumuman aktif',
        supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('is_active', true)
      ),
    ]);

    return {
      data: {
        membersActive,
        membersPending,
        membersBlocked,
        reportsTotal,
        reportsUnreadForAdmin,
        postsActive,
        announcementsActive,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Gagal memuat statistik dashboard.'),
    };
  }
}

/** Daftar jabatan (positions), diurutkan sesuai sort_order backend. */
export async function getPositions() {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .order('sort_order', { ascending: true, nullsFirst: false });

  return { data: data as Position[] | null, error };
}

/** Ambil seluruh anggota (semua status) beserta jabatannya, terbaru dulu. */
export async function getAllMembers() {
  const { data, error } = await supabase
    .from('members')
    .select('*, position:positions(*)')
    .order('created_at', { ascending: false });

  return { data: data as MemberWithPosition[] | null, error };
}

export interface RegisterMemberInput {
  fullName: string;
  phoneInput: string; // format lokal apa saja, akan dinormalisasi ke E.164
  positionId: string;
  address?: string;
}

/**
 * Daftarkan anggota baru dengan data minimal. registration_status otomatis
 * 'pending' (default kolom) — anggota akan mengaktivasi sendiri via OTP.
 * Kapasitas jabatan divalidasi oleh trigger database (check_position_capacity);
 * pesan error trigger sudah ramah dan langsung diteruskan.
 */
export async function registerMember(input: RegisterMemberInput) {
  const phoneE164 = normalizePhoneToE164(input.phoneInput);
  if (!phoneE164) {
    return { data: null, error: new Error('Nomor HP tidak valid.') };
  }
  if (!input.fullName.trim()) {
    return { data: null, error: new Error('Nama lengkap wajib diisi.') };
  }
  if (!input.positionId) {
    return { data: null, error: new Error('Jabatan wajib dipilih.') };
  }

  const { data, error } = await supabase
    .from('members')
    .insert({
      full_name: input.fullName.trim(),
      phone: phoneE164,
      position_id: input.positionId,
      address: input.address?.trim() || null,
    })
    .select('*, position:positions(*)')
    .single();

  return { data: data as MemberWithPosition | null, error };
}

/**
 * Blokir atau buka blokir anggota. Ini satu-satunya perubahan status yang
 * memang dilakukan admin secara manual (lihat catatan alur di atas file ini).
 * - blockMember: set 'blocked'.
 * - unblockMember: kembalikan ke 'active' jika sudah pernah aktivasi
 *   (user_id terisi), atau 'pending' jika belum pernah aktivasi.
 */
export async function blockMember(memberId: string) {
  return setMemberStatus(memberId, 'blocked');
}

export async function unblockMember(member: Pick<Member, 'id' | 'user_id'>) {
  return setMemberStatus(member.id, member.user_id ? 'active' : 'pending');
}

async function setMemberStatus(memberId: string, status: RegistrationStatus) {
  const { data, error } = await supabase
    .from('members')
    .update({ registration_status: status })
    .eq('id', memberId)
    .select('*, position:positions(*)')
    .single();

  return { data: data as MemberWithPosition | null, error };
}

/**
 * Ambil pengumuman terbaru yang dikelola admin (aktif maupun tidak),
 * memakai policy "admin can read all announcements" (is_admin()).
 */
export async function getAllAnnouncementsForAdmin() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  return { data: data as Announcement[] | null, error };
}
