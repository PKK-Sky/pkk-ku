module.exports = ({ config }) => {
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    config.extra?.supabaseUrl ||
    'https://vmbqsogwiaqwqmjpobge.supabase.co';
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    config.extra?.supabaseAnonKey ||
    '';

  // Jangan menghentikan expo config saat key hanya tersedia di tahap EAS build.
  // Client akan menampilkan konfigurasi error jika key benar-benar kosong.
  if (!supabaseAnonKey || supabaseAnonKey.startsWith(String.fromCharCode(36) + '{')) {
    console.warn('EXPO_PUBLIC_SUPABASE_ANON_KEY belum tersedia pada tahap config.');
  }

  return {
    ...config,
    extra: { ...config.extra, supabaseUrl, supabaseAnonKey },
  };
};
