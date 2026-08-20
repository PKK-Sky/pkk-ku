import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl 
  ?? process.env.EXPO_PUBLIC_SUPABASE_URL 
  ?? '';

const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey 
  ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY 
  ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] URL atau Anon Key tidak ditemukan. ' +
    'Pastikan EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_ANON_KEY sudah diatur.'
  );
}

/**
 * Supabase client dengan session persistence menggunakan AsyncStorage.
 * HANYA menggunakan Anon Key — JANGAN memasukkan Service Role Key ke sini.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Tipe untuk response Supabase yang terstandarisasi
 */
export interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
}
