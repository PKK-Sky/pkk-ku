/**
 * Mekanisme penanganan error terpusat.
 *
 * Kenapa dibutuhkan: sebelum ini, tiap screen menerjemahkan error sendiri-
 * sendiri lewat `err.message` mentah dari Supabase — hasilnya pesan bahasa
 * Inggris teknis ("Token has expired or is invalid", "Invalid login
 * credentials", "Network request failed") langsung terpampang ke user tanpa
 * konteks apa yang harus dilakukan.
 *
 * `getFriendlyError()` menerjemahkan pesan mentah itu ke Bahasa Indonesia
 * yang jelas, dan mengkategorikannya (`ErrorCategory`) supaya UI bisa
 * memberi aksi yang tepat — misal tombol "Coba Lagi" untuk error jaringan,
 * vs cuma info diam untuk error validasi.
 */

export type ErrorCategory =
  | 'network'      // Tidak ada koneksi / request gagal terkirim — bisa retry
  | 'auth'         // Kredensial salah / sesi habis — user perlu login ulang
  | 'otp'          // Kode OTP salah/kedaluwarsa — bisa minta kirim ulang
  | 'validation'   // Input user tidak valid — user perlu perbaiki isian
  | 'permission'   // RLS/akses ditolak — user tidak berhak melakukan aksi ini
  | 'rate_limit'   // Terlalu banyak percobaan — user perlu tunggu
  | 'conflict'     // Data sudah ada / duplikat — bukan error "kegagalan" murni
  | 'server'       // Error di sisi database/server — bukan salah user
  | 'unknown';     // Tidak dikenali — tampilkan pesan asli sebagai fallback

export interface FriendlyError {
  category: ErrorCategory;
  /** Pesan yang aman ditampilkan langsung ke user (Bahasa Indonesia). */
  message: string;
  /** True kalau aksi ini masuk akal untuk di-retry oleh user (mis. tombol "Coba Lagi"). */
  retryable: boolean;
}

/**
 * Daftar pola pesan error mentah -> terjemahan.
 * Dicek berurutan dari atas — pola lebih spesifik ditaruh lebih dulu.
 */
const ERROR_PATTERNS: Array<{
  test: (raw: string) => boolean;
  category: ErrorCategory;
  message: string;
  retryable: boolean;
}> = [
  // ── OTP / Aktivasi ──
  {
    test: (m) => /token has expired or is invalid/i.test(m),
    category: 'otp',
    message: 'Kode OTP sudah tidak berlaku. Tap "Kirim Ulang OTP" untuk minta kode baru.',
    retryable: true,
  },
  {
    test: (m) => /otp.*(expired|invalid)|invalid.*otp/i.test(m),
    category: 'otp',
    message: 'Kode OTP salah atau sudah kedaluwarsa. Coba masukkan ulang atau minta kode baru.',
    retryable: true,
  },

  // ── Auth ──
  {
    test: (m) => /invalid login credentials/i.test(m),
    category: 'auth',
    message: 'Email/nomor HP atau password salah. Coba periksa lagi.',
    retryable: true,
  },
  {
    test: (m) => /email not confirmed/i.test(m),
    category: 'auth',
    message: 'Akun belum aktif. Selesaikan proses aktivasi terlebih dahulu.',
    retryable: false,
  },
  {
    test: (m) => /user already registered|already been registered/i.test(m),
    category: 'conflict',
    message: 'Email ini sudah pernah didaftarkan. Coba langsung login, atau hubungi admin kalau lupa password.',
    retryable: false,
  },
  {
    test: (m) => /jwt expired|session.*(expired|missing)|refresh_token/i.test(m),
    category: 'auth',
    message: 'Sesi login sudah habis. Silakan login ulang.',
    retryable: false,
  },

  // ── Rate limit ──
  {
    test: (m) => /rate limit|too many requests|429/i.test(m),
    category: 'rate_limit',
    message: 'Terlalu banyak percobaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.',
    retryable: true,
  },

  // ── Permission / RLS ──
  {
    test: (m) => /row-level security|permission denied|42501|not authorized|hanya admin/i.test(m),
    category: 'permission',
    message: 'Anda tidak memiliki akses untuk melakukan aksi ini.',
    retryable: false,
  },

  // ── Konflik data ──
  {
    test: (m) => /duplicate key|already exists|23505/i.test(m),
    category: 'conflict',
    message: 'Data ini sudah ada sebelumnya.',
    retryable: false,
  },
  {
    test: (m) => /foreign key|23503/i.test(m),
    category: 'conflict',
    message: 'Data terkait tidak ditemukan atau sudah dihapus. Muat ulang halaman dan coba lagi.',
    retryable: true,
  },

  // ── Network ──
  {
    test: (m) => /network request failed|fetch failed|failed to fetch/i.test(m),
    category: 'network',
    message: 'Tidak ada koneksi internet, atau jaringan tidak stabil. Periksa koneksi Anda dan coba lagi.',
    retryable: true,
  },
  {
    test: (m) => /timeout|timed out/i.test(m),
    category: 'network',
    message: 'Koneksi terlalu lama merespons. Coba lagi.',
    retryable: true,
  },

  // ── Server / database ──
  {
    test: (m) => /5\d\d|internal server error|unexpected_failure/i.test(m),
    category: 'server',
    message: 'Terjadi gangguan di server. Coba lagi dalam beberapa saat, atau hubungi admin kalau berlanjut.',
    retryable: true,
  },
];

/**
 * Terjemahkan error mentah (dari Supabase, fetch, atau exception biasa)
 * jadi pesan yang aman ditampilkan ke user + kategorinya.
 *
 * Selalu return sesuatu yang valid — kalau tidak ada pola yang cocok,
 * fallback ke pesan asli (dipotong supaya tidak terlalu teknis/panjang)
 * dengan kategori 'unknown'.
 */
export function getFriendlyError(error: unknown): FriendlyError {
  const raw = extractRawMessage(error);

  for (const pattern of ERROR_PATTERNS) {
    if (pattern.test(raw)) {
      return { category: pattern.category, message: pattern.message, retryable: pattern.retryable };
    }
  }

  return {
    category: 'unknown',
    message: raw || 'Terjadi kesalahan yang tidak diketahui. Coba lagi atau hubungi admin.',
    retryable: true,
  };
}

function extractRawMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in (error as any)) {
    return String((error as any).message ?? '');
  }
  return String(error);
}

/**
 * Shortcut untuk dipakai langsung di `Alert.alert()` — kembalikan judul +
 * pesan siap pakai. Contoh:
 *   const { title, message } = toAlertContent(err);
 *   Alert.alert(title, message);
 */
export function toAlertContent(error: unknown): { title: string; message: string } {
  const friendly = getFriendlyError(error);
  const titles: Record<ErrorCategory, string> = {
    network: 'Masalah Koneksi',
    auth: 'Gagal Masuk',
    otp: 'Verifikasi Gagal',
    validation: 'Periksa Kembali',
    permission: 'Akses Ditolak',
    rate_limit: 'Terlalu Cepat',
    conflict: 'Data Sudah Ada',
    server: 'Gangguan Server',
    unknown: 'Terjadi Kesalahan',
  };
  return { title: titles[friendly.category], message: friendly.message };
}
