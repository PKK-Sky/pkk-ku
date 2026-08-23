import { useState, useCallback } from 'react';
import { signInWithEmail, signInWithPhone, signOut } from '@services';
import { supabaseConfigError } from '@lib/supabase';
import { normalizePhoneToE164 } from '@utils/phone';
import { ADMIN_EMAIL } from '@constants/app';

function getAdminLoginErrorMessage(error: { message?: string; status?: number }) {
  const message = (error.message ?? '').toLowerCase();
  if (message.includes('invalid login credentials') || error.status === 400) return 'Kode akses admin salah.';
  if (message.includes('email not confirmed')) return 'Akun admin belum dikonfirmasi di Supabase.';
  if (message.includes('failed to fetch') || message.includes('network')) return 'Tidak dapat terhubung ke server login. Periksa koneksi internet.';
  return error.message || 'Login gagal. Silakan coba lagi.';
}

function getPhoneLoginErrorMessage(error: { message?: string; status?: number }) {
  const message = (error.message ?? '').toLowerCase();
  if (message.includes('invalid login credentials') || error.status === 400) return 'Nomor HP atau password salah.';
  if (message.includes('phone not confirmed')) return 'Nomor HP belum aktif. Selesaikan aktivasi akun terlebih dahulu.';
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

  /** Login anggota — Nomor HP (format lokal, akan dinormalisasi) + Password */
  const loginWithPhone = useCallback(async (phoneInput: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (supabaseConfigError) {
        setError(supabaseConfigError);
        return { success: false, error: supabaseConfigError };
      }

      const phoneE164 = normalizePhoneToE164(phoneInput);
      if (!phoneE164) {
        const message = 'Nomor HP tidak valid.';
        setError(message);
        return { success: false, error: message };
      }

      if (!password) {
        const message = 'Password wajib diisi.';
        setError(message);
        return { success: false, error: message };
      }

      const { data, error: signInError } = await signInWithPhone(phoneE164, password);
      if (signInError) {
        const message = getPhoneLoginErrorMessage(signInError);
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

  return { login, loginWithPhone, logout, isLoading, error };
}
