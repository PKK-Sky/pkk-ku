/**
 * Hook OTA Update (EAS Update).
 *
 * Kenapa tidak cukup pakai `checkAutomatically: "ON_LOAD"` bawaan Expo?
 * - ON_LOAD cuma cek sekali saat app cold-start, dan update yang berhasil
 *   didownload BARU aktif di cold-start BERIKUTNYA (butuh 2x buka app).
 * - Kalau user jarang benar-benar "menutup" app (cuma minimize), mereka
 *   bisa lama sekali baru dapat versi baru — inilah yang terasa seperti
 *   "update tidak masuk" / ketahan cache.
 *
 * Hook ini mengambil alih kontrol penuh:
 * 1. Cek update saat app pertama kali mount.
 * 2. Cek lagi setiap app kembali dari background (AppState -> 'active'),
 *    supaya user yang cuma switch app lalu balik lagi tetap kebagian update.
 * 3. TIDAK auto-reload diam-diam — status "update siap" diekspos ke UI
 *    supaya bisa ditampilkan tombol/banner, baru reload saat user tap
 *    (menghindari app tiba-tiba restart di tengah user mengisi form).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

export type OTAStatus =
  | 'idle'
  | 'checking'
  | 'up_to_date'
  | 'downloading'
  | 'ready'
  | 'error';

interface OTAState {
  status: OTAStatus;
  errorMessage: string | null;
}

// Jarak minimum antar pengecekan otomatis (hindari spam saat user gonta-ganti app dengan cepat)
const MIN_CHECK_INTERVAL_MS = 60_000;

export function useOTAUpdate() {
  const [state, setState] = useState<OTAState>({ status: 'idle', errorMessage: null });
  const lastCheckRef = useRef<number>(0);
  const inFlightRef = useRef(false);

  const checkAndDownload = useCallback(async (opts?: { force?: boolean }) => {
    // Di Expo Go / dev client, expo-updates tidak aktif — jangan lakukan apa-apa.
    if (!Updates.isEnabled) return;
    if (inFlightRef.current) return;

    const now = Date.now();
    if (!opts?.force && now - lastCheckRef.current < MIN_CHECK_INTERVAL_MS) return;
    lastCheckRef.current = now;

    inFlightRef.current = true;
    setState({ status: 'checking', errorMessage: null });

    try {
      const check = await Updates.checkForUpdateAsync();

      if (!check.isAvailable) {
        setState({ status: 'up_to_date', errorMessage: null });
        return;
      }

      setState({ status: 'downloading', errorMessage: null });
      await Updates.fetchUpdateAsync();
      setState({ status: 'ready', errorMessage: null });
    } catch (err) {
      setState({
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Gagal memeriksa pembaruan.',
      });
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch (err) {
      setState({
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Gagal menerapkan pembaruan.',
      });
    }
  }, []);

  useEffect(() => {
    // Cek saat pertama kali app dibuka
    checkAndDownload({ force: true });

    // Cek lagi setiap app kembali aktif dari background
    const handleAppStateChange = (next: AppStateStatus) => {
      if (next === 'active') {
        checkAndDownload();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [checkAndDownload]);

  return {
    status: state.status,
    errorMessage: state.errorMessage,
    isReady: state.status === 'ready',
    isChecking: state.status === 'checking' || state.status === 'downloading',
    applyUpdate,
    checkNow: () => checkAndDownload({ force: true }),
  };
}
