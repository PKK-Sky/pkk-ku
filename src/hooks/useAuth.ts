import { useState, useCallback } from 'react';
import { signInWithEmail, signOut } from '@services';

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await signInWithEmail(email, password);
      if (signInError) {
        setError(signInError.message);
        return { success: false, error: signInError.message };
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
      await signOut();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout gagal';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { login, logout, isLoading, error };
}
