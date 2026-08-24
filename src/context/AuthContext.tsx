import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@lib/supabase';
import { getMemberLinkStatus } from '@services';
import type { ProfileRole } from '@types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  /** Role dari public.profiles */
  role: ProfileRole | null;

  /** True jika role user adalah admin */
  isAdmin: boolean;

  /** True selama role sedang dimuat */
  isRoleLoading: boolean;

  /** True jika user biasa belum menyelesaikan aktivasi anggota */
  needsActivation: boolean;

  /** True selama status aktivasi sedang diperiksa */
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

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [role, setRole] = useState<ProfileRole | null>(null);

  const [isRoleLoading, setIsRoleLoading] = useState(true);

  const [needsActivation, setNeedsActivation] = useState(false);

  const [isActivationStatusLoading, setIsActivationStatusLoading] =
    useState(false);

  /**
   * ID request terakhir.
   *
   * Berguna untuk mencegah hasil request lama
   * menimpa state login terbaru.
   */
  const roleRequestRef = useRef(0);

  /**
   * Menandakan session awal sudah diproses.
   *
   * Supaya INITIAL_SESSION tidak memanggil
   * loadRole() dua kali.
   */
  const initializedRef = useRef(false);

  /**
   * Memuat role user dari public.profiles.
   */
  const loadRole = useCallback(async (userId?: string) => {
    const requestId = ++roleRequestRef.current;

    /**
     * Tidak ada user.
     */
    if (!userId) {
      setRole(null);
      setIsRoleLoading(false);

      setNeedsActivation(false);
      setIsActivationStatusLoading(false);

      return null;
    }

    setIsRoleLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      /**
       * Kalau ada request baru setelah request ini,
       * abaikan hasil request lama.
       */
      if (requestId !== roleRequestRef.current) {
        return null;
      }

      let resolvedRole: ProfileRole | null = null;

      if (error) {
        console.error(
          '[AuthContext] Gagal memuat role profil:',
          error.message
        );
      } else if (data?.role) {
        resolvedRole = data.role as ProfileRole;
      } else {
        console.error(
          '[AuthContext] Profile ditemukan tetapi role kosong.'
        );
      }

      setRole(resolvedRole);
      setIsRoleLoading(false);

      /**
       * =====================================================
       * ADMIN
       * =====================================================
       *
       * Admin tidak perlu melalui proses aktivasi anggota.
       *
       * Ini penting agar dashboard admin tidak tertahan
       * oleh getMemberLinkStatus().
       */
      if (resolvedRole === 'admin') {
        setNeedsActivation(false);
        setIsActivationStatusLoading(false);

        return resolvedRole;
      }

      /**
       * =====================================================
       * USER BIASA
       * =====================================================
       *
       * Hanya user biasa yang perlu dicek status aktivasi.
       */
      setIsActivationStatusLoading(true);

      try {
        const { isLinked } = await getMemberLinkStatus(userId);

        if (requestId !== roleRequestRef.current) {
          return resolvedRole;
        }

        setNeedsActivation(!isLinked);
      } catch (activationError) {
        console.error(
          '[AuthContext] Gagal memuat status aktivasi:',
          activationError
        );

        /**
         * Jika pengecekan gagal, jangan membuat
         * aplikasi terjebak loading selamanya.
         */
        if (requestId === roleRequestRef.current) {
          setNeedsActivation(false);
        }
      } finally {
        if (requestId === roleRequestRef.current) {
          setIsActivationStatusLoading(false);
        }
      }

      return resolvedRole;
    } catch (error) {
      console.error(
        '[AuthContext] Unexpected error ketika memuat role:',
        error
      );

      if (requestId === roleRequestRef.current) {
        setRole(null);
        setIsRoleLoading(false);
        setNeedsActivation(false);
        setIsActivationStatusLoading(false);
      }

      return null;
    }
  }, []);

  /**
   * =====================================================
   * INITIAL AUTH INITIALIZATION
   * =====================================================
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(
            '[AuthContext] Gagal mendapatkan session:',
            error.message
          );

          setSession(null);
          setRole(null);

          setIsRoleLoading(false);
          setIsLoading(false);

          setNeedsActivation(false);
          setIsActivationStatusLoading(false);

          initializedRef.current = true;

          return;
        }

        /**
         * Simpan session.
         */
        setSession(currentSession);

        /**
         * Session sudah selesai diperiksa.
         */
        setIsLoading(false);

        /**
         * Kalau user sudah login,
         * load role.
         */
        if (currentSession?.user?.id) {
          await loadRole(currentSession.user.id);
        } else {
          setRole(null);
          setIsRoleLoading(false);

          setNeedsActivation(false);
          setIsActivationStatusLoading(false);
        }

        initializedRef.current = true;
      } catch (error) {
        console.error(
          '[AuthContext] Error saat initialize:',
          error
        );

        if (!mounted) {
          return;
        }

        setSession(null);
        setRole(null);

        setIsLoading(false);
        setIsRoleLoading(false);

        setNeedsActivation(false);
        setIsActivationStatusLoading(false);

        initializedRef.current = true;
      }
    };

    initialize();

    /**
     * =====================================================
     * AUTH STATE LISTENER
     * =====================================================
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!mounted) {
          return;
        }

        setSession(nextSession);
        setIsLoading(false);

        /**
         * INITIAL_SESSION biasanya sudah ditangani
         * oleh initialize().
         *
         * Jangan loadRole dua kali.
         */
        if (
          event === 'INITIAL_SESSION' &&
          !initializedRef.current
        ) {
          return;
        }

        /**
         * User login / token berubah.
         */
        if (nextSession?.user?.id) {
          void loadRole(nextSession.user.id);
        } else {
          /**
           * User logout.
           *
           * Naikkan request ID supaya request lama
           * tidak bisa mengembalikan role lagi.
           */
          roleRequestRef.current += 1;

          setRole(null);
          setIsRoleLoading(false);

          setNeedsActivation(false);
          setIsActivationStatusLoading(false);
        }
      }
    );

    /**
     * Cleanup.
     */
    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, [loadRole]);

  /**
   * Nilai yang diberikan ke seluruh aplikasi.
   */
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

/**
 * Hook untuk mengakses AuthContext.
 */
export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuthContext harus digunakan di dalam AuthProvider'
    );
  }

  return context;
}
