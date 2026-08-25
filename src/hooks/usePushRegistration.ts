import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@lib/supabase';

/**
 * Tanpa hook ini, tabel push_devices SELALU KOSONG — akibatnya seluruh
 * pipeline push notification backend (trigger queue_user_push -> push_queue
 * -> cron send-push-notifications-every-minute -> Edge Function -> Expo Push
 * API) tidak pernah punya device tujuan untuk dikirimi apapun, walau
 * backend-nya sendiri sudah lengkap dan berfungsi.
 *
 * Cara kerja:
 * 1. Minta izin notifikasi ke OS (kalau belum ada).
 * 2. Ambil Expo Push Token perangkat ini (butuh EAS projectId dari app.json).
 * 3. Upsert ke public.push_devices, key konflik (provider, device_token) —
 *    supaya device yang sama, walau ganti akun, otomatis terhubung ke akun
 *    yang sedang login (bukan menumpuk baris duplikat).
 *
 * Dipanggil sekali per sesi login aktif (lihat AppNavigator.tsx).
 */

// Notifikasi tetap tampil (banner + suara) walau app sedang dibuka di depan.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushRegistration(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      try {
        // Push token tidak tersedia di simulator/emulator — jangan
        // dianggap error, cukup lewati diam-diam.
        if (!Device.isDevice) {
          return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.warn('[usePushRegistration] izin notifikasi tidak diberikan.');
          return;
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const projectId =
          (Constants.expoConfig?.extra as any)?.eas?.projectId ?? Constants.easConfig?.projectId;

        const tokenResponse = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        const token = tokenResponse.data;
        if (cancelled || !token) return;

        const platform: 'ios' | 'android' | 'web' =
          Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

        const { error } = await supabase.from('push_devices').upsert(
          {
            user_id: userId,
            provider: 'expo',
            platform,
            device_token: token,
            device_name: Device.modelName ?? null,
            app_version: Constants.expoConfig?.version ?? null,
            last_seen_at: new Date().toISOString(),
            enabled: true,
          },
          { onConflict: 'provider,device_token' }
        );

        if (error) {
          console.error('[usePushRegistration] gagal mendaftarkan push token:', error.message);
        }
      } catch (err) {
        console.error('[usePushRegistration] registrasi push token gagal:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
