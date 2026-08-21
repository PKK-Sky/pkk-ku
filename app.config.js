module.exports = ({ config }) => {
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    config.extra?.supabaseUrl ||
    'https://vmbqsogwiaqwqmjpobge.supabase.co';
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    config.extra?.supabaseAnonKey ||
    '';

  if (!supabaseAnonKey || supabaseAnonKey.startsWith(String.fromCharCode(36) + '{')) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_ANON_KEY belum tersedia. Tambahkan secret tersebut ke environment EAS sebelum build.'
    );
  }

  return {
    ...config,
    extra: { ...config.extra, supabaseUrl, supabaseAnonKey },
  };
};
