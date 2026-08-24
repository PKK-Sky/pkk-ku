# My PKK Warakas (pkk-ku) — Spesifikasi Fitur & Peta Kerja

Aplikasi mobile (Expo / React Native) untuk pengelolaan kegiatan PKK Warakas. Backend: Supabase (project `PKK-Sky's Project`, ref `vmbqsogwiaqwqmjpobge`).

## Cara Pakai Dokumen Ini (WAJIB dibaca sebelum kerja apa pun)

Dokumen ini adalah **acuan utama & sumber pemahaman tunggal** untuk scope aplikasi — bukan catatan "status per tanggal sekian". Ini adalah **daftar kerja permanen**: berlaku sampai isinya diubah lewat commit, bukai sampai "kedaluwarsa" seiring waktu.

**Aturan untuk siapa pun/AI apa pun yang mengerjakan repo ini:**
1. Baca daftar fitur di §2 (Admin) dan §3 (Anggota) sebelum menambah/mengubah apa pun.
2. Kalau kamu mengimplementasikan sebuah fitur, **update status checkbox-nya di commit/PR yang sama** — ganti `🔲 BELUM` jadi `✅ SELESAI`, dan hapus baris "Arahan implementasi" yang sudah tidak relevan. Dokumen yang tidak di-update oleh pengerjanya adalah bug proses, bukan alasan untuk menulis dokumen status terpisah yang gampang basi.
3. Jangan buat file "STATUS.md" atau "PROGRESS.md" baru untuk mencatat progres — semua progres dicatat di sini, di baris fitur yang relevan.

**Legenda status:**
- `✅ SELESAI` — UI ada, tersambung ke backend, berfungsi end-to-end.
- `🔧 UI ADA, BELUM TERSAMBUNG` — kode layar sudah ditulis tapi tidak terdaftar di navigator / tidak dipanggil dari mana pun. Kerjanya tinggal menyambungkan, bukan menulis dari nol.
- `🔌 BACKEND SIAP, FE BELUM ADA` — tabel/RLS/RPC/Edge Function sudah lengkap dan aktif di Supabase (lihat `docs/supabase/`). Kerjanya murni membangun frontend mengikuti kontrak yang sudah ada.
- `⛔ DI LUAR SCOPE (permanen)` — sengaja tidak akan dibangun karena bertentangan dengan desain sistem. Jangan diimplementasikan tanpa mengubah desain backend terlebih dulu.

---

## 1. Arsitektur Peran & Auth

Dua jenis akun, login berbeda, kemampuan sepenuhnya terpisah. Tidak ada peran ketiga.

| | **Admin** | **Anggota PKK** |
|---|---|---|
| Login | Email + password (`signInWithEmail`) | Nomor HP (E.164) + password (`signInWithPhone`) |
| Disimpan sebagai | `profiles.role = 'admin'` | `members` row + `registration_status` |
| Akun dibuat lewat | Manual di Supabase Auth | Admin isi data minimal → anggota aktivasi mandiri via OTP |
| Layar setelah login | `AdminDashboard` | `Home` |

Status anggota: `pending` (didaftarkan admin, belum aktivasi) → `active` (sudah aktivasi, bisa pakai app) → `blocked` (dinonaktifkan admin manual).

---

## 2. Daftar Fitur Lengkap — ADMIN

### 2.1 Kelola Anggota
`✅ SELESAI`
Lihat semua anggota (semua status), daftarkan anggota baru (nama, HP, jabatan, alamat), blokir/buka blokir. Kapasitas per jabatan dijaga trigger DB (`check_position_capacity`), bukan kode FE.
Kode: `AdminDashboardScreen.tsx`, `adminService.ts` (`getAllMembers`, `registerMember`, `blockMember`, `unblockMember`).

### 2.2 Dashboard Statistik
`✅ SELESAI`
Ringkasan: anggota aktif/pending/blocked, total laporan, laporan belum dibaca admin, postingan aktif, pengumuman aktif.
Kode: `adminService.ts` (`getAdminDashboardStats`).

### 2.3 Kelola Pengumuman
`🔌 BACKEND SIAP, FE BELUM ADA`
Tabel `announcements`: title, message, is_active, start_at/end_at (jendela tayang), display_duration_seconds (1–180 detik, untuk carousel). RLS: admin insert/update/delete via `can_manage_announcements()`, admin SELECT via `is_admin()`.
**Arahan implementasi:** buat `AdminAnnouncementsScreen.tsx` (list + form create/edit + toggle aktif/nonaktif). Fungsi baca (`getAllAnnouncementsForAdmin`) **sudah ada** di `adminService.ts` — tinggal dipakai. Fungsi create/update/delete belum ada di service, perlu ditambahkan.

### 2.4 Semua Laporan Masuk (sisi Admin)
`🔧 UI ADA, BELUM TERSAMBUNG` — **plus 1 bug tambahan yang harus diperbaiki dulu**
Layar `AdminReportsScreen.tsx` sudah lengkap tapi: (a) tidak didaftarkan ke `AppNavigator.tsx`/`RootStackParamList`, (b) tombol di dashboard masih `handleComingSoon('Semua Laporan Masuk')`, dan (c) layar ini meng-import `getAllReportsForAdmin` dari `@services` — **fungsi ini tidak ada di mana pun di repo**, akan gagal compile begitu disambungkan.
**Arahan implementasi:** (1) tulis fungsi `getAllReportsForAdmin` di `reportService.ts` (query `reports` + join `report_recipients` untuk admin, sesuai pola fungsi lain di file itu), (2) daftarkan layar ke navigator, (3) ganti `handleComingSoon` jadi `navigation.navigate('AdminReports')`.

### 2.5 Moderasi Postingan
`🔧 UI ADA, BELUM TERSAMBUNG`
Layar `AdminPostsScreen.tsx` sudah lengkap, sama seperti §2.4: belum didaftarkan ke navigator, tombol dashboard masih `handleComingSoon('Moderasi Postingan')`.
**Arahan implementasi:** cek dulu fungsi yang di-import di file ini benar-benar ada di service (ulangi pengecekan yang sama seperti §2.4 sebelum asumsi tinggal sambung kabel).

### 2.6 Notifikasi & Push (sisi Admin)
`🔌 BACKEND SIAP, FE BELUM ADA`
Admin menerima notifikasi laporan baru (`report_recipients` recipient_type = admin) via `notification_inbox` (realtime-enabled) dan push (`push_devices`/`push_queue`, otomatis lewat trigger — FE tidak pernah insert manual ke `push_queue`).
**Arahan implementasi:** (1) daftarkan Expo Push Token ke `push_devices` (provider: `'expo'`) saat admin login, (2) subscribe Realtime ke `notification_inbox` untuk badge/list in-app, (3) halaman pengaturan toggle kategori notifikasi (`notification_preferences`). **Jangan** pernah memanggil Edge Function `send-push-notifications` langsung dari FE — itu server-only, jalan otomatis lewat pg_cron tiap menit.

---

## 3. Daftar Fitur Lengkap — ANGGOTA PKK

### 3.1 Aktivasi Akun Mandiri (OTP)
`✅ SELESAI` (kecuali upload foto profil — lihat catatan)
Alur 4 langkah di `MemberActivationScreen.tsx`, dipicu dari tautan "Aktivasi akun" di `LoginScreen`: (1) cek nomor HP via RPC `check_member_by_phone`, (2) kirim & verifikasi OTP via Supabase Auth Phone, (3) lengkapi alamat + RPC `complete_member_registration`, (4) set password via `supabase.auth.updateUser`.
**Penanganan khusus:** begitu OTP terverifikasi, Supabase langsung membuat session aktif dan `AppNavigator` akan mengganti seluruh stack navigasi. Ini ditangani lewat state `needsActivation` di `AuthContext` (true kalau user login tapi `members.user_id` belum terhubung) — `AppNavigator` memaksa tetap di `MemberActivationScreen` (lanjut ke step lengkapi profil) sampai aktivasi benar-benar selesai, tidak akan "bocor" ke Home dengan akun setengah jadi.
⚠️ **Upload foto profil (`avatar_url`) sengaja belum diimplementasikan** — `docs/supabase/peta-storage.md` menyatakan belum ada bucket storage yang dikonfirmasi untuk avatar (perlu klarifikasi ke pemilik backend dulu). Saat ini `p_avatar_url` selalu dikirim `null`; anggota bisa lengkapi foto profil menyusul lewat fitur terpisah begitu bucket-nya jelas.

### 3.2 Login (Nomor HP + Password)
`✅ SELESAI` (mekanismenya ada; secara praktik tidak berguna sampai §3.1 selesai karena belum ada anggota yang bisa sampai ke tahap set password)

### 3.3 Buat Laporan Kegiatan
`✅ SELESAI`
Hanya untuk anggota `active` dengan jabatan: **Bendahara, Sekretaris, Pokja I–IV** (lihat `ELIGIBLE_POSITIONS` di `src/constants/positions.ts` — Ketua/Wakil Ketua sengaja tidak termasuk, konfirmasi ke pemilik produk kalau ini perlu diubah). Dicek berlapis: `checkReportEligibility()` di FE **dan** RLS `can_create_report()` di DB — tidak bisa dilewati dari client.
⚠️ **Bug diketahui:** batas panjang karakter di FE (`REPORT_CONFIG`, `src/constants/app.ts`) lebih longgar dari CHECK constraint DB (mis. `activity_description` 5000 vs DB 800). Perbaiki `REPORT_CONFIG` supaya sinkron persis dengan constraint DB, atau submit panjang akan gagal dengan error mentah Postgres.

### 3.4 Daftar & Detail Laporan Saya
`✅ SELESAI`
`ReportListScreen` (`getMyReports`), `ReportDetailScreen` (`getReportById`).

### 3.5 Preview & PDF Laporan
`✅ SELESAI`, tapi dengan **konflik arsitektur yang perlu diputuskan**:
FE generate PDF client-side (`expo-print`). Backend punya Edge Function `generate-report-pdf` (dipanggil via `supabase.functions.invoke`, bukan `fetch()` manual) yang generate PDF F4 sesuai template resmi + watermark, simpan ke bucket privat `report-pdfs`, dan return signed URL 1 jam — **tidak dipakai sama sekali** oleh FE saat ini.
**Arahan:** tentukan satu sumber kebenaran. Kalau pindah ke Edge Function (disarankan, karena hasilnya konsisten lintas device dan sesuai template resmi): ganti `pdfService.ts` untuk memanggil `generate-report-pdf`, hapus logic `expo-print` untuk laporan (boleh tetap dipakai untuk kebutuhan lain kalau ada), gunakan signed URL hasilnya untuk download/share WhatsApp.

### 3.6 Edit & Hapus Laporan Sendiri
`🔌 BACKEND SIAP, FE BELUM ADA` (service function sudah ada, UI belum)
`reportService.ts` sudah punya `updateReport` dan `deleteReport` (RLS membatasi hanya baris milik sendiri), tapi tidak ada tombol yang memanggilnya di `ReportDetailScreen.tsx` maupun layar lain.
**Arahan implementasi:** tambahkan tombol Edit (buka `ReportCreate` dalam mode edit, atau layar form terpisah) dan Hapus (dengan konfirmasi) di `ReportDetailScreen.tsx`.

### 3.7 Laporan Diterima (sebagai Recipient)
`🔌 BACKEND SIAP, FE BELUM ADA` (service function sudah ada, UI belum)
`reportService.ts` punya `getRecipientReports` dan `markAsRead` — untuk anggota berperan sebagai penerima laporan (mis. Ketua/Wakil Ketua menerima laporan dari Pokja). Tidak dipanggil dari layar mana pun saat ini.
**Arahan implementasi:** tambahkan tab/section "Laporan Masuk" di `ReportListScreen.tsx` atau layar terpisah, pakai `getRecipientReports`, tandai dibaca via `markAsRead` saat dibuka.

### 3.8 Feed Sosial (Postingan, Like, Komentar)
`🔌 BACKEND SIAP, FE BELUM ADA`
Tabel `posts` → `post_media` (1:N, image/video) → `post_likes`/`post_saves` (toggle insert/delete) → `post_comments` (dengan `parent_comment_id` untuk reply 1 level, divalidasi trigger harus post yang sama). `posts.expires_at` maks 48 jam dari `created_at` (divalidasi trigger), dibersihkan otomatis oleh Edge Function `cleanup-expired-posts` via pg_cron.
**Arahan implementasi:** feed infinite scroll, upload multi-media per post, tombol like/save, komentar + reply, tampilkan countdown/label expired. Insert ke `post_comments` **otomatis** memicu notifikasi lewat trigger — jangan insert manual ke `notification_inbox`/`push_queue`.

### 3.9 Chat Pribadi 1:1
`🔌 BACKEND SIAP, FE BELUM ADA`
Tabel `chat_conversations` (`direct_key` unik cegah duplikat), `chat_members` (composite PK, `last_read_at`, `muted_until`), `chat_messages` (`body` 1–4000 char, `client_message_id` untuk idempotency, `reply_to_id`, soft delete via `deleted_at`), `chat_attachments` (maks 10MB, tipe dibatasi: jpeg/png/webp/pdf/mp4/mpeg/ogg/webm). **Admin bukan partisipan** (`chat_is_non_admin()` — desain permanen, lihat §4).
**Arahan implementasi:** mulai percakapan HARUS lewat RPC `create_direct_chat(p_other_user_id)` (client **tidak** insert langsung ke `chat_conversations`/`chat_members`, tidak ada policy INSERT di situ). Kirim pesan sertakan `client_message_id` dari FE untuk dedupe saat retry/optimistic UI. Subscribe Supabase Realtime per `conversation_id` untuk pesan masuk.

### 3.10 Notifikasi & Push (sisi Anggota)
`🔌 BACKEND SIAP, FE BELUM ADA`
Sama seperti §2.6 dari sisi anggota: `notification_inbox` (realtime), `notification_preferences` (toggle per kategori: chat_messages, report_received, announcements, social_activity — default semua `false`), `push_devices` (registrasi token saat login).
**Arahan implementasi:** sama seperti §2.6 — registrasi token Expo saat login, subscribe realtime untuk in-app, halaman toggle preferensi. Jangan panggil Edge Function push manapun langsung dari FE.

### 3.11 Lihat Pengumuman
`🔌 BACKEND SIAP, FE BELUM ADA`
Baca `announcements` filter `is_active = true` dan dalam rentang `start_at`–`end_at`, tampilkan sebagai banner/marquee di halaman utama, durasi tampil per item pakai `display_duration_seconds`.
**Arahan implementasi:** komponen carousel/marquee di `HomeScreen.tsx`, query read-only (RLS sudah izinkan semua user baca pengumuman aktif — cek `docs/supabase/peta_rls.md` untuk detail policy persis sebelum implementasi).

---

## 4. Batasan Desain Permanen (⛔ — jangan diimplementasikan)

Ini bukan "belum sempat dikerjakan" — ini keputusan desain yang sengaja, dijaga di level database (RLS/trigger), bukan cuma UI:

- **Admin tidak melakukan "approval" pendaftaran anggota.** Tidak ada state itu di skema — begitu anggota aktivasi mandiri (§3.1), status langsung `active`. Jangan bikin tombol/fitur approve.
- **Admin tidak bisa membuat laporan kegiatan.** Dijaga `can_create_report()` di RLS.
- **Admin tidak bisa mengubah/menghapus laporan milik anggota.** RLS report hanya izinkan pemilik.
- **Admin bukan partisipan chat.** `chat_is_non_admin()` mengecualikan admin dari semua tabel `chat_*` secara desain.
- **`reports.status` terkunci ke `'sent'`** — belum ada (dan belum direncanakan) workflow approve/reject di level manapun.
- **Anggota dengan jabatan di luar `ELIGIBLE_POSITIONS`** (termasuk Ketua, Wakil Ketua, anggota biasa) **tidak bisa membuat laporan** — dijaga RLS, bukan cuma UI.
- **Anggota tidak bisa mendaftarkan diri dari nol.** Baris `members` awal wajib dibuat admin dulu; anggota hanya mengaktivasi baris yang sudah ada.

---

## 5. Alur Kunci yang Sering Disalahpahami

1. Kapasitas jabatan (mis. maks 1 Ketua aktif, maks 2 Pokja per divisi) dijaga trigger DB (`check_position_capacity`) — jangan duplikasi validasi ini di FE, cukup tangani pesan error yang sudah manusiawi dari trigger.
2. `report_recipients` terisi **otomatis** lewat trigger `create_report_recipients_trigger` saat laporan dibuat — FE tidak pernah insert manual ke tabel ini.
3. Notifikasi (in-app & push) sepenuhnya otomatis lewat trigger + `queue_user_push` (server-only). FE cukup insert ke tabel utama (`post_comments`, `chat_messages`, dll), sisanya otomatis.
4. `members` dan `profiles` **tidak punya foreign key satu sama lain** — keduanya sama-sama mereferensi `auth.users`. Jangan coba embed `profile:profiles(*)` di query `members`, PostgREST akan gagal.
5. Identitas pembuat laporan (`creator_name`, `creator_position`, `chairperson_name`) bisa diisi lewat RPC `get_current_member_name`/`get_current_member_position`/`get_current_chairperson_name` untuk preview form, **atau** otomatis lewat trigger `populate_report_identity_trigger` saat insert — cek dulu perilaku persis trigger ini (override atau isi-kalau-kosong) sebelum menentukan pola integrasi form.
6. Environment variable Supabase di build harus di-set lewat `eas env:create` (atau `.env` lokal untuk `expo start`), **bukan** sintaks `${VAR}` di field `env` milik `eas.json` — itu tidak di-substitusi oleh EAS dan menyebabkan error "Konfigurasi Supabase belum tersedia" walau build sukses.

---

## 6. Struktur Kode Singkat

```
src/
  screens/     — satu file per layar (lihat AppNavigator.tsx untuk peta rute terdaftar)
  services/    — satu file per domain: authService, adminService, reportService, storageService
  hooks/       — useAuth, dll
  context/     — AuthContext (session & role user yang sedang login)
  constants/   — app.ts (batas validasi — WAJIB sinkron dgn CHECK constraint DB), positions.ts, storage.ts
  types/       — database.ts (tipe tabel — sinkronkan manual tiap ada migration baru), navigation.ts
docs/
  supabase/    — kontrak backend presisi: skema tabel (full-schema.json), RLS (peta_rls.md), RPC & trigger (peta_rpc.md), storage (peta-storage.md), realtime (peta-realtime.md). Rujukan wajib sebelum menulis query/RPC baru.
```

Urutan rujukan kalau ragu soal suatu fitur: **README ini** (scope & arahan) → `docs/supabase/` (kontrak backend presisi per tabel/RPC/RLS).
