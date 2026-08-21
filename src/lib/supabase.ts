import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

type ExpoExtra = { supabaseUrl?: string; supabaseAnonKey?: string };
const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

export const supabaseUrl = extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const supabaseConfigError =
  !supabaseUrl || !supabaseAnonKey || supabaseAnonKey.startsWith(String.fromCharCode(36) + '{')
    ? 'Konfigurasi Supabase belum tersedia di aplikasi. Buat build baru dengan EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    : null;

if (supabaseConfigError) console.error('[Supabase]', supabaseConfigError);

/** HANYA menggunakan Anon Key — JANGAN memasukkan Service Role Key ke sini. */
export const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.local',
  supabaseAnonKey || 'missing-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export interface SupabaseResponse<T> { data: T | null; error: Error | null }
