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

    // 2. Load member + position + profile
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select(`
        *,
        position:positions(*),
        profile:profiles(*)
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
 * Login dengan email dan password
 */
export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
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
