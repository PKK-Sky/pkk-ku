# Status Backend Supabase — PKK-Ku

Dokumen ini adalah snapshot kontrak backend yang dipakai aplikasi pada branch `main`. Isinya disusun dari peta Supabase di repository, konfigurasi Expo/EAS, dan source code aplikasi. Nilai secret tidak pernah disimpan di repository.

## Identitas project

- Project ref: `vmbqsogwiaqwqmjpobge`
- URL project: `https://vmbqsogwiaqwqmjpobge.supabase.co`
- Region: `ap-southeast-1`
- Database: PostgreSQL 17
- Client aplikasi: `@supabase/supabase-js`
- Storage session mobile: `AsyncStorage`
- Aplikasi hanya memakai **anon key** di client. Service-role key tidak boleh dimasukkan ke APK.

## Konfigurasi runtime aplikasi

`app.config.js` mengambil konfigurasi dengan urutan berikut:

1. `EXPO_PUBLIC_SUPABASE_URL`, atau URL project sebagai fallback.
2. `EXPO_PUBLIC_SUPABASE_ANON_KEY`, atau `extra.supabaseAnonKey`.
3. Jika anon key kosong atau masih berupa placeholder, build/app config dihentikan dengan error yang jelas.

Profile EAS `preview`, `development`, dan `production` menggunakan URL project yang sama. Anon key disuplai melalui secret/environment EAS, bukan hardcode di source.

## Modul dan tabel backend

| Modul | Tabel utama | Perilaku penting |
|---|---|---|
| Auth & anggota | `profiles`, `members`, `positions` | `members.user_id` menghubungkan anggota dengan `auth.users`; status anggota `pending`, `active`, atau `blocked`. |
| Pengumuman | `announcements` | Ditampilkan berdasarkan `is_active` serta jendela `start_at`/`end_at`. |
| Feed sosial | `posts`, `post_media`, `post_likes`, `post_comments`, `post_saves` | Media dapat berupa image/video; komentar mendukung reply satu level melalui `parent_comment_id`. |
| Laporan | `reports`, `report_media`, `report_recipients` | Status laporan saat ini `sent`; maksimal 2 media dengan koordinat crop relatif 0–1. |
| Chat pribadi | `chat_conversations`, `chat_members`, `chat_messages`, `chat_attachments` | Percakapan 1:1 memakai `direct_key`; pesan mendukung idempotency, reply, soft delete, dan attachment. |
| Notifikasi & push | `notification_preferences`, `notification_inbox`, `push_devices`, `push_queue` | Push diproses melalui queue; preference dikontrol per user. |

## Realtime

Realtime aktif untuk:

- `chat_conversations`
- `chat_members`
- `chat_messages`
- `notification_inbox`

Feed, pengumuman, laporan, dan arsip tidak mengandalkan realtime berdasarkan kontrak saat ini; client perlu refetch atau refresh setelah perubahan.

## RPC dan otomatisasi database

RPC pra-registrasi yang dapat dipanggil sebelum sesi penuh:

- `check_member_by_phone`
- `complete_member_registration`

RPC authenticated yang digunakan untuk alur aplikasi antara lain:

- `create_direct_chat(p_other_user_id)`
- RPC identitas laporan (`get_current_*`)
- RPC terkait eligibility laporan sesuai peta backend

Otomatisasi penting:

- `create_report_recipients_trigger` mengisi penerima laporan saat laporan dibuat.
- `ensure_notification_preferences_trigger` membuat preference default untuk profil baru.
- Insert komentar dapat membuat `notification_inbox` dan queue push melalui trigger.
- `pg_cron` memanggil processor push setiap menit melalui `pg_net`.
- `cleanup-expired-posts` menangani postingan yang melewati `expires_at`.
- `generate-report-pdf` membuat PDF F4 dan mengembalikan signed URL yang berlaku terbatas.

## Storage

| Bucket | Akses | Isi | Konvensi |
|---|---|---|---|
| `report-media` | Public | Foto dokumentasi laporan | Path berasal dari `report_media.storage_path`. |
| `report-pdfs` | Private | PDF laporan hasil generate | Nama `{report_id}.pdf`; tulis melalui Edge Function dengan service role. |

Validasi attachment chat membatasi ukuran hingga 10 MB dan MIME type pada tipe media yang didukung backend. Client tetap wajib melakukan validasi awal, tetapi constraint backend adalah validasi final.

## Keamanan

- Semua tabel utama menggunakan RLS.
- Query dari APK harus memakai JWT session user melalui anon key.
- Hak akses dibatasi berdasarkan user, membership, recipient laporan, atau role admin sesuai policy.
- `send-push-notifications` tidak dipanggil langsung oleh client; processor dipanggil cron dengan secret di Supabase Vault.
- Jangan menaruh `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, atau token EAS di source, `app.json`, atau dokumentasi.

## Catatan verifikasi

Dokumen ini adalah kontrak yang ter-version-control bersama aplikasi. Untuk perubahan schema, RLS, RPC, trigger, bucket, Edge Function, atau publication realtime, update dokumen terkait pada commit yang sama.

Pada pemeriksaan environment build terakhir, endpoint Supabase menolak kredensial introspeksi yang tersedia dengan HTTP 401. Karena itu dokumen ini tidak mengklaim inventaris live yang baru diambil dari REST/Management API; detail backend di atas mengikuti peta Supabase yang sudah tersimpan di repository dan konfigurasi runtime aplikasi. Verifikasi live berikutnya perlu dilakukan menggunakan token Supabase yang valid dari dashboard/project owner.

Terakhir diperbarui: 23 Agustus 2026.
