import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@lib/supabase';
import { getMemberLinkStatus } from '@services';
import type { ProfileRole } from '@types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Role dari tabel profiles (public.profiles.role). Null selama masih dimuat / belum ada profil. */
  role: ProfileRole | null;
  /** True hanya setelah role berhasil dimuat DAN bernilai 'admin'. */
  isAdmin: boolean;
  /** True setelah proses pengambilan role selesai (berhasil atau gagal). */
  isRoleLoading: boolean;
  /**
   * True kalau user sudah login (biasanya lewat verifikasi OTP) TAPI belum
   * pernah menyelesaikan alur aktivasi (completeMemberRegistration belum
   * dipanggil, jadi members.user_id belum terhubung). Dipakai AppNavigator
   * untuk mengarahkan ke lanjutan layar aktivasi, bukan langsung ke Home.
   * Selalu false untuk admin.
   */
  needsActivation: boolean;
  /** True selama status needsActivation masih dicek. */
  isActivationStatusLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  role: null,
  isAdmin: false,
  isRoleLoading: true,
  needsActivation: false,
  isActivationStatusLoading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<ProfileRole | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const [needsActivation, setNeedsActivation] = useState(false);
  const [isActivationStatusLoading, setIsActivationStatusLoading] = useState(true);

  const loadRole = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setRole(null);
      setIsRoleLoading(false);
      return;
    }
    setIsRoleLoading(true);
    // profiles_select RLS: id = auth.uid() or is_admin() -> user selalu bisa baca baris miliknya sendiri.
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[AuthContext] Gagal memuat role profil:', error.message);
      setRole(null);
    } else {
      // Tidak ada baris profiles untuk user ini (mis. akun anggota tanpa profil admin) -> anggap 'user'.
      setRole((data?.role as ProfileRole | undefined) ?? 'user');
    }
    setIsRoleLoading(false);
  }, []);

  const loadActivationStatus = useCallback(async (userId: string | undefined, currentRole: ProfileRole | null) => {
    if (!userId || currentRole === 'admin') {
      // Admin tidak pernah melalui alur aktivasi anggota.
      setNeedsActivation(false);
      setIsActivationStatusLoading(false);
      return;
    }
    setIsActivationStatusLoading(true);
    const { isLinked } = await getMemberLinkStatus(userId);
    setNeedsActivation(!isLinked);
    setIsActivationStatusLoading(false);
  }, []);

  useEffect(() => {
    // Cek session saat mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      await loadRole(session?.user?.id);
    });

    // Subscribe perubahan auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setIsLoading(false);
        await loadRole(session?.user?.id);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadRole]);

  // Cek status aktivasi setiap kali role selesai dimuat ulang (mis. setelah login/OTP baru).
  useEffect(() => {
    if (isRoleLoading) return;
    loadActivationStatus(session?.user?.id, role);
  }, [session?.user?.id, role, isRoleLoading, loadActivationStatus]);

  const value: AuthContextType = {
    session,
    user: session?.user ?? null,
    isLoading,
    isAuthenticated: !!session?.user,
    role,
    isAdmin: role === 'admin',
    isRoleLoading,
    needsActivation,
    isActivationStatusLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext harus digunakan di dalam AuthProvider');
  }
  return context;
}
