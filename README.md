# PKK Laporan Kegiatan

Aplikasi mobile untuk pembuatan laporan kegiatan TP PKK Kelurahan Warakas.
Dibangun dengan Expo (React Native) dan terhubung ke Supabase.

## 🚀 Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd pkk-laporan-kegiatan
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Isi file `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://vmbqsogwiaqwqmjpobge.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> ⚠️ **JANGAN** memasukkan `SUPABASE_SERVICE_ROLE_KEY` ke `.env` client.

### 3. Jalankan Development

```bash
npx expo start
```

### 4. Build dengan EAS

```bash
# Preview (APK)
npx eas build --profile preview

# Production
npx eas build --profile production
```

## 📁 Struktur Folder

```
src/
  components/     # UI Components (kosong, siap diisi desain)
  constants/      # App constants & config
  context/        # React Context (Auth)
  hooks/          # Custom hooks
  lib/            # External lib config (Supabase)
  navigation/     # React Navigation
  screens/        # App screens
  services/       # Business logic & API calls
  types/          # TypeScript types
  utils/          # Helper functions
assets/
  images/         # App images
  fonts/          # Custom fonts
```

## 🔐 Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` tidak ada di client/bundle
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` hanya untuk RLS
- [ ] Tidak ada hardcoded key di source code
- [ ] GitHub Actions mengambil secret dari repository secrets
- [ ] Build bersih setelah mengubah secret

## 📋 Kontrak Backend

Lihat `backend_contract.md` untuk spesifikasi lengkap:
- Schema tabel `reports`, `report_media`, `report_recipients`
- Alur pengiriman laporan
- RLS policies
- Template PDF V3

## 📝 Catatan

- UI/UX desain belum diimplementasikan (placeholder)
- Semua screen menggunakan komponen dasar React Native
- Siap untuk styling dengan library pilihan (NativeWind, Styled Components, dll)

## 📄 License

Private — TP PKK Kelurahan Warakas
