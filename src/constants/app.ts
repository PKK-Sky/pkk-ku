/**
 * Konfigurasi aplikasi
 */
/**
 * Email akun admin di Supabase Auth. Modal "Akses Admin" hanya meminta kode/password
 * (bukan email) — email tetap ini di belakang layar karena akun admin cuma satu.
 */
export const ADMIN_EMAIL = 'admin@pkk.com';

export const APP_CONFIG = {
  NAME: 'PKK Laporan Kegiatan',
  VERSION: '1.0.0',
  ORGANIZATION: 'TP PKK Kelurahan Warakas',
  TIMEZONE: 'Asia/Jakarta',
  LOCALE: 'id-ID',
  DATE_FORMAT: 'DD MMMM YYYY',
  TIME_FORMAT: 'HH:mm',
  CURRENCY_FORMAT: 'id-ID',
} as const;

export const REPORT_CONFIG = {
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_PARTICIPANTS_LENGTH: 1000,
  MAX_ACTIVITY_NAME_LENGTH: 200,
  MAX_PLACE_LENGTH: 200,
  MAX_BASIS_LENGTH: 500,
} as const;
