PKK-Ku — Ruang Ngrumpi PKK
Aplikasi mobile untuk TP PKK Kelurahan Warakas: laporan kegiatan, pengumuman, feed sosial internal, chat, dan notifikasi.
Dibangun dengan Expo (React Native) dan terhubung ke Supabase.
✨ Fitur
Auth & Profil — login/registrasi anggota, approval keanggotaan, jabatan/struktur organisasi (Pokja)
Pengumuman — banner berjalan di halaman utama
Feed Sosial — post foto/video, like, komentar (dengan reply), save
Laporan Kegiatan — form laporan kegiatan → generate PDF (F4) otomatis via backend, download & share WhatsApp
Chat Pribadi — chat 1:1 realtime dengan lampiran media
Notifikasi & Push — in-app notification + push notification (Expo Push Service)
🚀 Setup
1. Clone & Install
Bash
2. Environment Variables
Bash
Isi file .env:
Kode
⚠️ JANGAN memasukkan SUPABASE_SERVICE_ROLE_KEY ke .env client.
3. Jalankan Development
Bash
4. Build dengan EAS
Bash
📁 Struktur Folder
Kode
🗄️ Backend
Backend sepenuhnya di Supabase (project vmbqsogwiaqwqmjpobge, region ap-southeast-1, Postgres 17). Semua tabel RLS aktif — frontend selalu query pakai session JWT user, tidak pernah pakai service role key.
Dokumentasi lengkap skema tabel, Edge Function, storage bucket, dan alur tiap modul: lihat docs/supabase/peta_backend-supabase.md.
Ringkasan modul & prioritas bangun:
Modul
Tabel Utama
Status Backend
Auth & Profil
profiles, members, positions
Siap
Pengumuman
announcements
Siap
Feed Sosial
posts, post_media, post_likes, post_comments, post_saves
Siap
Laporan Kegiatan
reports, report_media, report_recipients
Siap — termasuk Edge Function generate-report-pdf (PDF F4 otomatis)
Chat
chat_conversations, chat_members, chat_messages, chat_attachments
Siap
Notifikasi/Push
notification_preferences, notification_inbox, push_devices, push_queue
Siap — cron otomatis tiap 1 menit
🔐 Security Checklist
[ ] SUPABASE_SERVICE_ROLE_KEY tidak ada di client/bundle
[ ] EXPO_PUBLIC_SUPABASE_ANON_KEY hanya untuk RLS
[ ] Tidak ada hardcoded key di source code
[ ] GitHub Actions mengambil secret dari repository secrets
[ ] Build bersih setelah mengubah secret
📝 Catatan
UI/UX desain belum diimplementasikan (placeholder)
Semua screen menggunakan komponen dasar React Native
Siap untuk styling dengan library pilihan (NativeWind, Styled Components, dll)
Backend (skema, RLS, Edge Function) sudah lengkap untuk semua modul di atas — pengembangan frontend bisa langsung mengikuti kontrak di docs/supabase/
📄 License
Private — TP PKK Kelurahan Warakas
