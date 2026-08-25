import { useState, useCallback } from 'react';
import { signInWithEmail, signOut } from '@services';
import { supabaseConfigError } from '@lib/supabase';
import { ADMIN_EMAIL } from '@constants/app';

function getAdminLoginErrorMessage(error: { message?: string; status?: number }) {
  const message = (error.message ?? '').toLowerCase();
  if (message.includes('invalid login credentials') || error.status === 400) return 'Kode akses admin salah.';
  if (message.includes('email not confirmed')) return 'Akun admin belum dikonfirmasi di Supabase.';
  if (message.includes('failed to fetch') || message.includes('network')) return 'Tidak dapat terhubung ke server login. Periksa koneksi internet.';
  return error.message || 'Login gagal. Silakan coba lagi.';
}

function getMemberLoginErrorMessage(error: { message?: string; status?: number }) {
  const message = (error.message ?? '').toLowerCase();
  if (message.includes('invalid login credentials') || error.status === 400) return 'Email atau password salah.';
  if (message.includes('email not confirmed')) return 'Email belum aktif. Selesaikan aktivasi akun terlebih dahulu.';
  if (message.includes('failed to fetch') || message.includes('network')) return 'Tidak dapat terhubung ke server login. Periksa koneksi internet.';
  return error.message || 'Login gagal. Silakan coba lagi.';
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Login admin — email (tetap, lihat ADMIN_EMAIL) + kode akses (password) */
  const login = useCallback(async (password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (supabaseConfigError) {
        setError(supabaseConfigError);
        return { success: false, error: supabaseConfigError };
      }
      const { data, error: signInError } = await signInWithEmail(ADMIN_EMAIL, password);
      if (signInError) {
        const message = getAdminLoginErrorMessage(signInError);
        setError(message);
        return { success: false, error: message };
      }
      if (!data.session) {
        const message = 'Login belum menghasilkan sesi. Silakan coba lagi.';
        setError(message);
        return { success: false, error: message };
      }
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login gagal';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Login anggota — Email (di-set saat aktivasi) + Password */
  const loginWithMemberEmail = useCallback(async (emailInput: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (supabaseConfigError) {
        setError(supabaseConfigError);
        return { success: false, error: supabaseConfigError };
      }

      const email = emailInput.trim().toLowerCase();
      if (!email) {
        const message = 'Email wajib diisi.';
        setError(message);
        return { success: false, error: message };
      }

      if (!password) {
        const message = 'Password wajib diisi.';
        setError(message);
        return { success: false, error: message };
      }

      const { data, error: signInError } = await signInWithEmail(email, password);
      if (signInError) {
        const message = getMemberLoginErrorMessage(signInError);
        setError(message);
        return { success: false, error: message };
      }
      if (!data.session) {
        const message = 'Login belum menghasilkan sesi. Silakan coba lagi.';
        setError(message);
        return { success: false, error: message };
      }
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login gagal';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error: signOutError } = await signOut();
      if (signOutError) return { success: false, error: signOutError.message };
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout gagal';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { login, loginWithMemberEmail, logout, isLoading, error };
}
