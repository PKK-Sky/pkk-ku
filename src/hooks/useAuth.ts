import { useState, useCallback } from 'react';
import { signInWithEmail, signOut } from '@services';
import { supabaseConfigError } from '@lib/supabase';

function getLoginErrorMessage(error: { message?: string; status?: number }) {
  const message = (error.message ?? '').toLowerCase();
  if (message.includes('invalid login credentials') || error.status === 400) return 'Email admin atau password salah.';
  if (message.includes('email not confirmed')) return 'Email admin belum dikonfirmasi di Supabase.';
  if (message.includes('failed to fetch') || message.includes('network')) return 'Tidak dapat terhubung ke server login. Periksa koneksi internet.';
  return error.message || 'Login gagal. Silakan coba lagi.';
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (supabaseConfigError) {
        setError(supabaseConfigError);
        return { success: false, error: supabaseConfigError };
      }
      const normalizedEmail = email.trim().toLowerCase();
      // Jangan trim password: spasi bisa menjadi bagian password yang valid.
      const { data, error: signInError } = await signInWithEmail(normalizedEmail, password);
      if (signInError) {
        const message = getLoginErrorMessage(signInError);
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
    } finally { setIsLoading(false); }
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
    } finally { setIsLoading(false); }
  }, []);

  return { login, logout, isLoading, error };
}
