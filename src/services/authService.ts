/**
 * Service autentikasi & kelayakan pembuat laporan.
 * Sesuai kontrak backend §3.
 */
import { supabase } from '@lib/supabase';
import type { MemberWithPosition } from '@types';
import { isEligiblePosition } from '@constants';

export interface AuthCheckResult {
  isAuthenticated: boolean;
  isEligible: boolean;
  member: MemberWithPosition | null;
  userId: string | null;
  error: string | null;
}

/**
 * Verifikasi session dan kelayakan user untuk membuat laporan.
 * Langkah:
 * 1. Cek session Supabase authenticated
 * 2. Load member berdasarkan auth.uid()
 * 3. Load jabatan via members.position_id
 * 4. Pastikan registration_status = 'active'
 * 5. Pastikan jabatan termasuk eligible positions
 */
export async function checkReportEligibility(): Promise<AuthCheckResult> {
  try {
    // 1. Cek session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      return {
        isAuthenticated: false,
        isEligible: false,
        member: null,
        userId: null,
        error: 'Sesi tidak valid. Silakan login kembali.',
      };
    }

    const userId = sessionData.session.user.id;

    // 2. Load member + position
    //    Catatan: TIDAK melakukan embed `profile:profiles(*)` di sini — members dan profiles
    //    sama-sama mereferensi auth.users tapi tidak punya FK satu sama lain, sehingga
    //    PostgREST tidak bisa meng-embed relasi itu (query akan gagal). full_name sudah
    //    tersedia langsung di kolom members.full_name.
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select(`
        *,
        position:positions(*)
      `)
      .eq('user_id', userId)
      .single();

    if (memberError || !memberData) {
      return {
        isAuthenticated: true,
        isEligible: false,
        member: null,
        userId,
        error: 'Data anggota tidak ditemukan.',
      };
    }

    const member = memberData as MemberWithPosition;

    // 3. Cek registration_status
    if (member.registration_status !== 'active') {
      return {
        isAuthenticated: true,
        isEligible: false,
        member,
        userId,
        error: `Status anggota: ${member.registration_status}. Hanya anggota aktif yang dapat membuat laporan.`,
      };
    }

    // 4. Cek jabatan eligible
    const positionName = member.position?.name ?? null;
    if (!isEligiblePosition(positionName)) {
      return {
        isAuthenticated: true,
        isEligible: false,
        member,
        userId,
        error: `Jabatan "${positionName ?? 'Tidak diketahui'}" tidak memiliki hak membuat laporan.`,
      };
    }

    return {
      isAuthenticated: true,
      isEligible: true,
      member,
      userId,
      error: null,
    };
  } catch (err) {
    return {
      isAuthenticated: false,
      isEligible: false,
      member: null,
      userId: null,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui.',
    };
  }
}

/**
 * Login dengan email dan password — dipakai admin (lihat useAuth.login,
 * email tetap ADMIN_EMAIL) maupun anggota (lihat useAuth.loginWithMemberEmail,
 * email bebas sesuai yang di-set saat aktivasi).
 */
export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

// ────────────────────────────────────────────────────────────
// Alur Aktivasi Mandiri Anggota (OTP Email)
// Langkah: findMembersByName -> claimMemberEmail -> sendEmailOtp
//          -> verifyEmailOtp -> completeMemberRegistrationByEmail
//          -> setAccountPassword
// Sesuai RPC aktual di project Supabase (find_members_by_name,
// claim_member_email, complete_member_registration_by_email).
// ────────────────────────────────────────────────────────────

export interface MemberNameCandidate {
  id: string;
  full_name: string;
  position_name: string;
}

export interface FindMembersByNameResult {
  found: boolean;
  ambiguous?: boolean;
  member_id?: string;
  full_name?: string;
  position_name?: string;
  candidates?: MemberNameCandidate[];
  message?: string;
}

/**
 * Langkah 1: cek apakah nama lengkap terdaftar di `members` (oleh admin) dan
 * siap diaktivasi. Callable tanpa login (RPC di-grant ke anon). Rate limit
 * 5x/15 menit per nama, dijaga di sisi database (tabel name_check_attempts).
 * Kalau nama dipakai lebih dari satu anggota, hasilnya `ambiguous: true`
 * beserta daftar `candidates` untuk dipilih user.
 */
export async function findMembersByName(
  fullName: string
): Promise<{ data: FindMembersByNameResult | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('find_members_by_name', { p_full_name: fullName });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as FindMembersByNameResult, error: null };
}

/**
 * Langkah 2: simpan email yang akan dipakai anggota untuk login & OTP,
 * ditempel ke row `members` (by member_id) hasil langkah 1. Belum butuh
 * login — masih anon. Menolak kalau email sudah dipakai anggota lain.
 */
export async function claimMemberEmail(
  memberId: string,
  email: string
): Promise<{ data: { success: boolean; email: string } | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('claim_member_email', {
    p_member_id: memberId,
    p_email: email,
  });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { success: boolean; email: string }, error: null };
}

/** Langkah 3a: kirim kode OTP ke email. */
export async function sendEmailOtp(email: string) {
  return supabase.auth.signInWithOtp({ email });
}

/**
 * Langkah 3b: verifikasi kode OTP email. Sukses -> Supabase langsung membuat
 * session (isAuthenticated akan true). Registrasi member BELUM selesai di
 * titik ini — lanjut ke completeMemberRegistrationByEmail.
 */
export async function verifyEmailOtp(email: string, token: string) {
  return supabase.auth.verifyOtp({ email, token, type: 'email' });
}

/**
 * Langkah 4: selesaikan registrasi — link members.user_id ke auth.uid() dan
 * buat row profiles. Wajib sudah punya session (dari verifyEmailOtp).
 */
export async function completeMemberRegistrationByEmail(
  email: string,
  address?: string | null,
  avatarUrl?: string | null
): Promise<{ data: { success: boolean; member_id: string } | null; error: Error | null }> {
  const { data, error } = await supabase.rpc('complete_member_registration_by_email', {
    p_email: email,
    p_address: address ?? null,
    p_avatar_url: avatarUrl ?? null,
  });
  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as { success: boolean; member_id: string }, error: null };
}

/**
 * Langkah 5: set password akun, supaya selanjutnya anggota bisa login pakai
 * email + password (signInWithEmail), bukan OTP terus-menerus.
 */
export async function setAccountPassword(password: string) {
  return supabase.auth.updateUser({ password });
}

export interface MemberLinkStatus {
  /** True kalau user yang login sudah punya row `members` dengan user_id terhubung
   *  (artinya sudah pernah menyelesaikan completeMemberRegistration). */
  isLinked: boolean;
}

/**
 * Cek apakah user yang sedang login (session OTP baru atau lama) sudah pernah
 * menyelesaikan aktivasi (row members.user_id sudah terhubung). Dipakai
 * AuthContext untuk memutuskan apakah user perlu diarahkan lanjut ke langkah
 * "lengkapi profil & set password" alih-alih langsung ke Home.
 */
export async function getMemberLinkStatus(userId: string): Promise<MemberLinkStatus> {
  const { data, error } = await supabase
    .from('members')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[authService] Gagal cek status keterhubungan member:', error.message);
    // Fail-open ke "sudah linked" supaya error jaringan sementara tidak mengunci
    // user yang sebenarnya sudah aktif ke layar aktivasi berulang-ulang.
    return { isLinked: true };
  }

  return { isLinked: !!data };
}

/**
 * Logout
 */
export async function signOut() {
  return supabase.auth.signOut();
}

/**
 * Subscribe ke perubahan auth state
 */
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
