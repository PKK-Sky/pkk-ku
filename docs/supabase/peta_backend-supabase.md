Peta Backend Supabase — Project "PKK-Sky's Project"
Project ID: vmbqsogwiaqwqmjpobge · Region: ap-southeast-1 · Postgres 17 · Status: ACTIVE_HEALTHY
Semua tabel di bawah sudah RLS (Row Level Security) aktif — jadi frontend wajib pakai auth session Supabase (JWT user) saat query, bukan service role key.
1. Autentikasi & Profil Pengguna
Tabel: profiles
Terhubung 1:1 ke auth.users (id sama dengan user auth).
Kolom: name, role (admin / user), created_at, updated_at.
Frontend: setelah signup/login via Supabase Auth, buat/lihat row profiles untuk tahu role user (tampilkan menu admin atau bukan).
Tabel: members
Data keanggotaan organisasi: user_id (nullable, unique — bisa exist sebelum user register), full_name, phone (unique), position_id, address, avatar_url.
registration_status: pending / active / blocked — dipakai untuk approval alur pendaftaran anggota baru.
Frontend: form registrasi anggota → status default pending → admin approve jadi active. Blokir akses fitur kalau status bukan active.
Tabel: positions
Master data jabatan: code, name, type (leadership / pokja), sort_order.
Frontend: dropdown pilihan jabatan saat isi profil anggota; urutkan pakai sort_order untuk struktur organisasi.
2. Pengumuman
Tabel: announcements
title, message, created_by, is_active, start_at/end_at (jendela tayang), display_duration_seconds (1–180 detik).
Frontend: banner/marquee pengumuman berjalan di halaman utama, filter is_active = true dan dalam rentang start_at–end_at, gunakan display_duration_seconds untuk durasi tampil per pengumuman (mirip carousel).
3. Media Sosial Internal (Feed)
Tabel: posts → post_media (1:N) → post_likes / post_comments / post_saves
posts.expires_at — postingan otomatis kadaluarsa (dibersihkan oleh Edge Function, lihat bagian 6).
post_media.media_type: image/video, punya media_order dan duration_seconds (untuk video).
post_likes, post_saves: composite PK (post_id, user_id) — pola like/save standar.
post_comments: komentar dengan content, plus parent_comment_id (uuid, nullable, FK ke post_comments.id) — dukung reply 1 level ke komentar lain di post yang sama. Isi null untuk komentar biasa, isi id komentar induk untuk reply (divalidasi harus post yang sama, lihat Peta_RPC.md).
Insert ke post_comments otomatis memicu notifikasi (realtime + push) ke pemilik post dan/atau pemilik komentar yang dibalas — lihat Peta_RPC.md bagian trigger post_comments_notify_trigger.
Frontend: feed dengan infinite scroll, upload multi-media per post, tombol like/save (toggle insert/delete row), komentar (dengan opsi reply berjenjang 1 level), dan tampilkan countdown/label jika post akan expired.
4. Laporan Kegiatan (Activity Report — PDF A4)
Tabel: reports
Form laporan kegiatan satu halaman A4: creator_name, creator_position, chairperson_name, activity_basis (≤150 char), activity_date, activity_time, activity_place (≤100), activity_name (≤150), participants (≤250), activity_description (≤800).
status saat ini terkunci ke 'sent' (constraint check).
Frontend: form terstruktur dengan character-count/limit sesuai constraint di atas (validasi FE harus sama persis dengan constraint DB agar tidak gagal insert). Setelah submit, generate/preview PDF A4.
Tabel: report_media
Maks. 2 gambar dokumentasi per laporan (media_order 1=kiri, 2=kanan — constraint 1–2).
Kolom crop (crop_x/y/width/height) disimpan agar preview crop dari FE bisa direproduksi ulang saat generate PDF.
Frontend: komponen crop gambar sebelum upload, simpan koordinat crop persis ke kolom ini supaya hasil PDF konsisten dengan preview.
Tabel: report_recipients
Penerima laporan: recipient_type (admin/ketua/wakil_ketua), is_read, read_at.
Frontend: inbox laporan per role penerima, badge unread berdasarkan is_read.
5. Chat Pribadi (1:1 Realtime)
Tabel: chat_conversations
direct_key unik (biasanya gabungan dua user_id) untuk mencegah duplikat percakapan 1:1.
last_message_at, last_message_preview (≤160 char), last_message_sender_id — untuk list percakapan tanpa join berat.
Tabel: chat_members
Composite PK (conversation_id, user_id), last_read_at, muted_until.
Frontend: badge unread pakai last_read_at vs chat_messages.created_at; fitur mute notifikasi pakai muted_until.
Tabel: chat_messages
body (1–4000 char), client_message_id (untuk idempotency/optimistic UI saat kirim), reply_to_id (reply), edited_at, deleted_at (soft delete).
Frontend: pakai Supabase Realtime subscribe ke tabel ini per conversation_id; kirim client_message_id dari FE agar bisa dedupe kalau retry.
Tabel: chat_attachments
Maks 10 MB, MIME type dibatasi ke: jpeg/png/webp/pdf/mp4/mpeg/ogg/webm audio.
Punya width/height/duration_seconds untuk preview media.
Frontend: validasi ukuran & tipe file di client SEBELUM upload (biar UX cepat), tapi constraint DB tetap jadi validasi akhir.
6. Notifikasi & Push
Tabel: notification_preferences
Toggle per user: chat_messages, report_received, announcements, social_activity (default false).
Frontend: halaman pengaturan notifikasi per kategori.
Tabel: notification_inbox
In-app notification list: kind, title, body, data (jsonb — payload custom untuk deep-link), read_at.
Tabel: push_devices
Registrasi device untuk push: provider (fcm/apns/expo/webpush), platform, device_token, enabled.
Frontend: saat user login di app/web, register token device ke tabel ini (integrasi FCM/Expo/WebPush sesuai platform).
Tabel: push_queue
Antrian pengiriman push: status (pending/processing/sent/failed/cancelled), attempts, available_at, event_key (dedupe).
Ini biasanya diisi oleh trigger/Edge Function backend, bukan langsung dari FE.
6b. Edge Function
cleanup-expired-posts (status ACTIVE, verify_jwt: true) — kemungkinan besar menghapus/menandai posts yang expires_at-nya sudah lewat. Kemungkinan dijalankan terjadwal via pg_cron (extension ini terpasang dan aktif di project).
6c. Extension Aktif yang Relevan untuk Fitur
pg_cron — job terjadwal (kemungkinan trigger cleanup-expired-posts / push_queue processor).
pg_net — HTTP async dari dalam Postgres (kemungkinan dipakai kirim push notification dari trigger/cron).
pgmq — message queue di Postgres (bisa jadi dasar mekanisme push_queue).
pgcrypto, uuid-ossp — generate UUID/hash, dipakai default value id.
supabase_vault — penyimpanan secret terenkripsi (API key provider push, dll).
Ringkasan Modul untuk Roadmap Frontend
Modul
Tabel Utama
Prioritas Bangun
Auth & Profil
profiles, members, positions
Fondasi — bangun duluan
Pengumuman
announcements
Mudah, tampilan statis-dinamis
Feed Sosial
posts, post_media, post_likes, post_comments, post_saves
Menengah
Laporan Kegiatan
reports, report_media, report_recipients
Kompleks (form + crop + PDF)
Chat
chat_conversations, chat_members, chat_messages, chat_attachments
Kompleks (realtime)
Notifikasi/Push
notification_preferences, notification_inbox, push_devices, push_queue
Terakhir (butuh modul lain jalan dulu)
Semua tabel RLS aktif — sebelum mulai coding tiap modul, sebaiknya cek dulu isi policy RLS masing-masing tabel (belum saya tarik di sini) agar tahu persis siapa boleh insert/select/update apa.
