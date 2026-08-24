# FULL SCHEMA — Project `vmbqsogwiaqwqmjpobge` (verifikasi live, 24 Agustus 2026)

> Seluruh isi dokumen ini diambil **langsung dari database live** lewat `list_tables(verbose=true)`, `pg_policies`, `pg_proc`, `information_schema.triggers`, `storage.buckets`, `pg_publication_tables`, `pg_extension`, dan `cron.job` — bukan disalin dari `docs/supabase/full-schema.json` (yang merupakan snapshot SQL manual dan bisa saja sudah tidak 100% sinkron). Kalau ada perbedaan antara dokumen ini dan `docs/supabase/*.md`, **dokumen ini yang benar** karena sumbernya database itu sendiri, per saat dokumen ini dibuat.

Postgres `17.6.1.155`, region `ap-southeast-1`. Extensions aktif: `pg_cron`, `pg_net`, `pg_stat_statements`, `pgcrypto`, `pgmq`, `plpgsql`, `supabase_vault`, `uuid-ossp`.

---

## 1. Tabel — schema `public` (21 tabel, semua `rls_enabled: true`)

### 1.1 `profiles`
| Kolom | Tipe | Constraint |
|---|---|---|
| `id` (PK) | uuid | FK → `auth.users.id` |
| `name` | text | default `'User'` |
| `role` | text | default `'user'`, check `role IN ('admin','user')` |
| `created_at` / `updated_at` | timestamptz | default `now()` |

Trigger: `ensure_notification_preferences_trigger` (AFTER INSERT) → auto-buat baris `notification_preferences` untuk user baru.

### 1.2 `positions`
| Kolom | Tipe | Constraint |
|---|---|---|
| `id` (PK) | uuid | default `gen_random_uuid()` |
| `code` | text | unique |
| `name` | text | unique |
| `type` | text | check `type IN ('leadership','pokja')` |
| `sort_order` | integer | |
| `created_at` | timestamptz | default `now()` |

Kapasitas per posisi (ditegakkan trigger `check_position_capacity` di tabel `members`, bukan constraint tabel `positions` sendiri): `KETUA`=1, `WAKIL_KETUA`=1, `SEKRETARIS`=1, `BENDAHARA`=1, `POKJA_I..IV`=2 masing-masing.

### 1.3 `members`
| Kolom | Tipe | Constraint |
|---|---|---|
| `id` (PK) | uuid | default `gen_random_uuid()` |
| `user_id` | uuid | nullable, **unique**, FK → `auth.users.id` |
| `full_name` | text | |
| `phone` | text | **unique** |
| `position_id` | uuid | FK → `positions.id` |
| `address` | text | nullable |
| `avatar_url` | text | nullable |
| `registration_status` | text | default `'pending'`, check `IN ('pending','active','blocked')` |
| `created_at` / `updated_at` | timestamptz | default `now()` |

Trigger: `enforce_position_capacity` (BEFORE INSERT/UPDATE) → jalankan `check_position_capacity()`, menolak kalau posisi sudah penuh (lihat §1.2).

### 1.4 `announcements`
| Kolom | Tipe | Constraint |
|---|---|---|
| `id` (PK) | uuid | default `gen_random_uuid()` |
| `title` | text | nullable |
| `message` | text | check `length(trim(message)) > 0` |
| `created_by` | uuid | nullable, FK → `auth.users.id` |
| `is_active` | boolean | default `true` |
| `start_at` / `end_at` | timestamptz | nullable |
| `display_duration_seconds` | integer | default `10`, check `>= 1 AND <= 180` |
| `created_at` / `updated_at` | timestamptz | default `now()` |

Trigger: `announcements_max_active` (BEFORE INSERT/UPDATE) → **maks 3 pengumuman aktif sekaligus** (dalam jendela tayang saat ini), raise exception `'Maksimal 3 pengumuman aktif yang dapat ditampilkan'` kalau dilanggar. `announcements_updated_at` (BEFORE UPDATE) → auto-update `updated_at`. `announcements_notify_trigger` (AFTER INSERT) → kirim notifikasi lewat `notify_new_announcement()`.

### 1.5 `posts`
| Kolom | Tipe | Constraint |
|---|---|---|
| `id` (PK) | uuid | default `gen_random_uuid()` |
| `user_id` | uuid | FK → `auth.users.id` (**bukan** ke `profiles`) |
| `content` | text | nullable, check `content IS NULL OR length(trim(content)) > 0` |
| `expires_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | default `now()` |

Trigger: `posts_validate_expiration` (BEFORE INSERT/UPDATE) → `validate_post_expiration()`. `posts_updated_at` (BEFORE UPDATE). Constraint jendela expiry ditegakkan lewat **RLS `with_check`**, bukan trigger: `expires_at > created_at AND expires_at <= created_at + interval '48:00:00'` (maks 48 jam).

### 1.6 `post_media`
| Kolom | Tipe | Constraint |
|---|---|---|
| `id` (PK) | uuid | default `gen_random_uuid()` |
| `post_id` | uuid | FK → `posts.id` |
| `media_type` | text | check `IN ('image','video')` |
| `storage_path` | text | |
| `media_order` | integer | default `1`, check `>= 1` (**tidak ada batas atas** di level constraint — beda dengan `report_media` yang dibatasi ≤2) |
| `duration_seconds` | integer | nullable, check `IS NULL OR >= 0` |
| `created_at` | timestamptz | default `now()` |

Trigger: `post_media_validate` (BEFORE INSERT/UPDATE) → `validate_post_media()`.

### 1.7 `post_likes`
PK komposit `(post_id, user_id)`. FK `post_id → posts.id`, `user_id → auth.users.id`. Tidak ada kolom lain selain `created_at`.

### 1.8 `post_comments`
| Kolom | Tipe | Constraint |
|---|---|---|
| `id` (PK) | uuid | default `gen_random_uuid()` |
| `post_id` | uuid | FK → `posts.id` |
| `user_id` | uuid | FK → `auth.users.id` |
| `content` | text | check `length(trim(content)) > 0` |
| `parent_comment_id` | uuid | nullable, FK → `post_comments.id` (self-reference, untuk reply berjenjang) |
| `created_at` / `updated_at` | timestamptz | default `now()` |

Trigger: `post_comments_validate_parent` (BEFORE INSERT) → `validate_post_comment_parent()`. `post_comments_updated_at`. `post_comments_notify_trigger` (AFTER INSERT) → `notify_post_comment()`.

### 1.9 `post_saves`
PK komposit `(post_id, user_id)`. FK sama pola dengan `post_likes`.

### 1.10 `reports`
| Kolom | Tipe | Constraint |
|---|---|---|
| `id` (PK) | uuid | default `gen_random_uuid()` |
| `created_by` | uuid | FK → `auth.users.id` |
| `creator_name` | text | diisi trigger, **jangan dikirim dari client** |
| `creator_position` | text | diisi trigger |
| `chairperson_name` | text | diisi trigger |
| `activity_basis` | text | check `char_length <= 150` |
| `activity_date` | date | |
| `activity_time` | time | |
| `activity_place` | text | check `char_length <= 100` |
| `activity_name` | text | check `char_length <= 150` |
| `participants` | text | check `char_length <= 250` |
| `activity_description` | text | check `char_length <= 800` |
| `status` | text | default `'sent'`, check **`status = 'sent'`** (hardcoded, tidak ada state lain — belum ada workflow draft/approve) |
| `created_at` / `updated_at` | timestamptz | default `now()` |

Comment tabel (dari DB): *"One-page A4 portrait activity report. Content limits are enforced in database constraints."*

Trigger (urutan BEFORE INSERT penting): `validate_report_creator_trigger` → cek `can_create_report()` (raise `'User tidak memiliki jabatan yang diperbolehkan membuat laporan.'` kalau gagal) → `populate_report_identity_trigger` → isi `created_by`/`creator_name`/`creator_position`/`chairperson_name` dari `auth.uid()` dan RPC internal (raise exception spesifik kalau salah satu data tidak ditemukan, mis. `'Ketua TP PKK belum ditemukan.'`). AFTER INSERT: `create_report_recipients_trigger` → auto-insert baris `report_recipients` untuk **semua admin** + **Ketua aktif** + **Wakil Ketua aktif** (kalau ada). `update_reports_updated_at_trigger` (BEFORE UPDATE).

### 1.11 `report_media`
| Kolom | Tipe | Constraint |
|---|---|---|
| `id` (PK) | uuid | default `gen_random_uuid()` |
| `report_id` | uuid | FK → `reports.id` |
| `storage_path` | text | |
| `media_order` | integer | check **`>= 1 AND <= 2`**, comment: *"Fixed template frame position: 1 = left, 2 = right."* |
| `crop_x` / `crop_y` / `crop_width` / `crop_height` | numeric | nullable, **tidak ada check constraint numerik** — comment: *"Frontend crop metadata; preserve the value used to reproduce the preview in the PDF."* |
| `created_at` | timestamptz | default `now()` |

Trigger: `validate_report_media_trigger` (BEFORE INSERT) → `validate_report_media()`, menghitung baris existing untuk `report_id` yang sama dan **menolak kalau sudah ≥2** (raise `'Maksimal 2 foto dokumentasi untuk satu laporan.'`). **Catatan penting**: karena `crop_x/y/width/height` **tidak** punya check constraint di database, kesalahan mengirim nilai pixel (bukan fraksi 0–1) **tidak akan pernah ditolak oleh database** — akan lolos insert dengan tenang lalu menghasilkan crop yang salah di PDF. Kebenaran nilai ini murni tanggung jawab frontend, ditegakkan sebagai kontrak konvensi, bukan constraint DB.

### 1.12 `report_recipients`
| Kolom | Tipe | Constraint |
|---|---|---|
| `id` (PK) | uuid | default `gen_random_uuid()` |
| `report_id` | uuid | FK → `reports.id` |
| `recipient_user_id` | uuid | FK → `auth.users.id` |
| `recipient_type` | text | check `IN ('admin','ketua','wakil_ketua')` |
| `is_read` | boolean | default `false` |
| `read_at` | timestamptz | nullable |
| `created_at` | timestamptz | default `now()` |

Diisi otomatis lewat trigger `create_report_recipients` di `reports` (§1.10) — **tidak pernah di-insert manual dari client**.

### 1.13 `chat_conversations`
Comment: *"Private 1:1 direct chat conversations for non-admin users."* Kolom: `id` (PK), `direct_key` (unique, check `length > 0`), `created_by` (FK auth.users), `created_at`, `last_message_at`, `last_message_preview` (check `<= 160` char), `last_message_sender_id` (FK auth.users). Di-update otomatis oleh trigger `chat_refresh_preview_trigger` setiap ada pesan baru.

### 1.14 `chat_members`
Comment: *"The two non-admin participants of a direct conversation and read state."* PK komposit `(conversation_id, user_id)`. Kolom tambahan: `joined_at`, `last_read_at`, `muted_until`.

### 1.15 `chat_messages`
Comment: *"Realtime chat messages with idempotency, reply, edit, and soft-delete support."* Kolom kunci: `body` (check `length(btrim(body))` antara 1–4000), `client_message_id` (untuk idempotency dari client), `reply_to_id` (self-FK), `edited_at`, `deleted_at` (soft-delete, bukan hard delete). Trigger: `chat_validate_message_trigger`, `chat_refresh_preview_trigger`, `chat_messages_broadcast_insert_trg`, `notify_chat_message_trigger`.

### 1.16 `chat_attachments`
Comment: *"Private chat attachments limited to 10 MB and approved MIME types."* Check `mime_type IN ('image/jpeg','image/png','image/webp','application/pdf','video/mp4','audio/mpeg','audio/ogg','audio/webm')`, `file_size > 0 AND <= 10485760` (10MB, **sama persis** dengan `STORAGE_CONFIG.MAX_FILE_SIZE_MB` yang dipakai FE untuk report media — koinsiden konvensi, bukan shared constraint).

### 1.17–1.20 `push_devices`, `notification_preferences`, `notification_inbox`, `push_queue`
Infrastruktur push notification, semua sudah lengkap dan aktif diproses cron `send-push-notifications-every-minute` (§4). `notification_inbox.kind` dan `push_queue.kind` sama-sama check `IN ('chat_message','report_received','announcement','social_activity','system')`.

### 1.21 `phone_check_attempts`
Tabel sederhana `(id, phone, attempted_at)` — rate-limiting untuk RPC `check_member_by_phone`, dibersihkan otomatis oleh cron harian (§4).

---

## 2. Foreign key yang **TIDAK** boleh diasumsikan (rangkuman final)

Tidak ada satupun tabel di atas yang punya FK langsung ke `profiles`, KECUALI `profiles.id → auth.users.id` itu sendiri. Artinya untuk SEMUA tabel berikut, PostgREST **tidak bisa** meng-embed `profiles` secara langsung — wajib query terpisah + join manual di client:
`members.user_id`, `announcements.created_by`, `posts.user_id`, `post_likes.user_id`, `post_comments.user_id`, `post_saves.user_id`, `reports.created_by`, `report_recipients.recipient_user_id`, `chat_conversations.created_by`/`last_message_sender_id`, `chat_members.user_id`, `chat_messages.sender_id`, `push_devices.user_id`, `notification_preferences.user_id`, `notification_inbox.user_id`, `push_queue.user_id` — **semuanya** mereferensi `auth.users.id`, bukan `profiles.id`.

---

## 3. RLS Policy — ringkasan per tabel (hasil query `pg_policies` langsung, bukan interpretasi)

Fungsi helper yang dipakai berulang di banyak policy (semua `SECURITY DEFINER`, `STABLE`):
- `is_admin()` — `profiles.role = 'admin'` untuk `auth.uid()`.
- `is_active_member()` — ada baris `members` dengan `user_id = auth.uid()` dan `registration_status = 'active'`.
- `can_create_report()` — member aktif DENGAN jabatan salah satu dari `Bendahara`, `Sekretaris`, `Pokja I`, `Pokja II`, `Pokja III`, `Pokja IV` (persis 6 nama ini, case-sensitive terhadap `positions.name`).
- `can_manage_announcements()` — `is_admin()` **ATAU** member aktif dengan `positions.code IN ('KETUA','WAKIL_KETUA')`.
- `is_post_active(post_id)` — `posts.expires_at > now()` untuk id tsb.
- `chat_is_non_admin(user_id)` — kebalikan `is_admin()`, dipakai untuk membatasi fitur chat **hanya untuk non-admin** (admin memang secara desain tidak berpartisipasi di direct chat member).

| Tabel | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | diri sendiri ATAU admin | admin saja | admin saja | admin saja |
| `positions` | semua authenticated | — | — | — |
| `members` | admin ATAU diri sendiri (`user_id=auth.uid()`) | admin saja | admin saja | admin saja |
| `announcements` | admin ATAU (aktif & dalam jendela tayang) | `can_manage_announcements()` + `created_by=auth.uid()` | `can_manage_announcements()` | `can_manage_announcements()` |
| `posts` | admin ATAU (member aktif & `expires_at>now()`) | admin ATAU (member aktif, `user_id=auth.uid()`, jendela ≤48 jam) | pemilik ATAU admin (jendela ≤48 jam tetap ditegakkan utk non-admin) | pemilik ATAU admin |
| `post_media` | admin ATAU (member aktif & post induk aktif) | admin ATAU pemilik post (post induk masih `expires_at>now()`) | admin ATAU pemilik post induk | admin ATAU pemilik post induk |
| `post_likes` | member aktif & post aktif | member aktif & post aktif, `user_id=auth.uid()` | — (tidak ada UPDATE) | pemilik sendiri |
| `post_saves` | pemilik sendiri saja | member aktif & post aktif, `user_id=auth.uid()` | — | pemilik sendiri |
| `post_comments` | admin ATAU (member aktif & post aktif) | admin ATAU (member aktif, post aktif, `user_id=auth.uid()`) | pemilik ATAU admin | pemilik ATAU admin |
| `reports` | pembuat ATAU admin ATAU recipient | `created_by=auth.uid()` + `can_create_report()` | **hanya pembuat** (`created_by=auth.uid()` — admin TIDAK termasuk klausa update ini) | pembuat ATAU admin |
| `report_media` | pembuat/admin/recipient laporan induk | pembuat laporan induk saja (**admin TIDAK termasuk** klausa insert ini) | — (tidak ada UPDATE) | pembuat laporan induk ATAU admin |
| `report_recipients` | diri sendiri (`recipient_user_id=auth.uid()`) ATAU admin | — (hanya lewat trigger, tidak ada policy INSERT manual) | hanya diri sendiri (utk mark-as-read) | — |
| `chat_conversations` | member percakapan (non-admin) | — (hanya lewat RPC `create_direct_chat`) | — | — |
| `chat_members` | member percakapan (non-admin) | — (hanya lewat RPC) | diri sendiri (read state), non-admin | — |
| `chat_messages` | member percakapan (non-admin) | pengirim=diri sendiri, non-admin, harus member percakapan | pengirim sendiri, non-admin (edit/soft-delete) | — |
| `chat_attachments` | member percakapan terkait pesan (non-admin) | pengirim pesan terkait (non-admin) | — | — |
| `push_devices` / `notification_preferences` / `notification_inbox` | diri sendiri saja (semua) | diri sendiri saja | diri sendiri saja | diri sendiri saja (push_devices) |

**Temuan penting untuk `ReportDetailScreen`/`ReportPreviewScreen`**: policy `UPDATE` pada `reports` **hanya mengizinkan pembuat laporan** (`created_by = auth.uid()`), **admin TIDAK termasuk**. Jadi kalau ada rencana fitur "admin edit laporan", itu akan **ditolak RLS** sampai ada migration baru yang menambahkan klausa `OR is_admin()` — sama seperti yang sudah dilakukan migration #18 untuk policy DELETE. Demikian pula `report_media` INSERT hanya untuk pembuat laporan (bukan admin) — relevan kalau ada fitur "admin tambah foto ke laporan orang lain", saat ini **tidak didukung**.

---

## 4. RPC (function) yang bisa dipanggil dari client (`supabase.rpc(...)`)

| Fungsi | Parameter | Return | Dipakai di halaman mana |
|---|---|---|---|
| `get_current_member_name()` | – | text | ReportCreateScreen (identity card) |
| `get_current_member_position()` | – | text | ReportCreateScreen |
| `get_current_chairperson_name()` | – | text | ReportCreateScreen |
| `check_member_by_phone(p_phone text)` | nomor telepon | jsonb | Alur pra-registrasi (di luar scope 11 halaman ini) |
| `complete_member_registration(p_phone, p_address, p_avatar_url)` | | jsonb | Alur pra-registrasi |
| `create_direct_chat(p_other_user_id uuid)` | user tujuan | uuid (conversation_id) | Fitur chat (belum ada UI) |
| `get_member_report_performance(p_start_date date, p_end_date date)` | rentang tanggal | record (set) | Belum dipakai screen manapun — kandidat statistik admin lanjutan |

Fungsi lain di atas (`is_admin`, `can_create_report`, dst.) adalah **helper internal RLS**, tidak dipanggil langsung dari client kecuali via query yang menyentuh tabel yang policy-nya memakainya.

---

## 5. Storage — bucket & policy (hasil query `storage.buckets` + `pg_policies` schema `storage`)

| Bucket | Public | Limit ukuran | Mime whitelist | Policy INSERT |
|---|---|---|---|---|
| `report-media` | ya | — (tidak diset di level bucket; batas 10MB & jpeg/png ditegakkan **hanya di FE**, `STORAGE_CONFIG`) | — | `authenticated`, wajib `(storage.foldername(name))[1] = auth.uid()::text` |
| `report-pdfs` | **tidak** | — | — | Tidak ada policy INSERT eksplisit untuk role biasa yang terlihat di daftar ini — kemungkinan hanya diisi lewat Edge Function dengan service role. `SELECT` dibatasi ke pembuat/recipient laporan terkait lewat pencocokan nama file dengan UUID laporan (`split_part(name,'.',1)`). |
| `post-media` | ya | — | — | `authenticated`, wajib folder pertama = `auth.uid()`; ATAU `admin` (bebas, semua path); ATAU `anon` **khusus 2 nama file tetap** (`mypkk-welcome.png`, `mypkk-warakas.png`) |
| `chat-media` | **tidak** | 10 MB (level tabel `chat_attachments`, bukan bucket) | image/jpeg, image/png, image/webp, application/pdf, video/mp4, audio/mpeg, audio/ogg, audio/webm (level tabel) | `authenticated`, non-admin (`chat_is_non_admin`), wajib folder pertama = `auth.uid()` |
| `images` | ya | — | — | `anon` bebas insert — bucket asset umum aplikasi, bukan untuk data personal user |

**Konfirmasi eksplisit untuk §0.5 bug #1 di `ACUAN-BUILD-UI-FRONTEND.md`**: policy `"users can upload report media"` (`storage.objects`, bucket `report-media`) berbunyi persis:
```sql
(bucket_id = 'report-media' AND (storage.foldername(name))[1] = auth.uid()::text)
```
`storage.foldername(name)` memecah path berdasarkan `/` dan mengembalikan array folder (indeks 1 = folder pertama). Path lama `reports/{userId}/{reportId}/{order}.jpg` menghasilkan `foldername(name)[1] = 'reports'`, **bukan** `auth.uid()` — kalau ada baris data lama yang sempat coba diupload dengan path ini, insert akan **selalu ditolak** dengan `403 / row-level security policy violation`, bukan error lain yang lebih membingungkan. Path yang sudah diperbaiki (`{userId}/reports/{reportId}/{order}.jpg`) sudah dikonfirmasi benar terhadap policy nyata ini.

---

## 6. Realtime — publication `supabase_realtime`

Hanya **4 tabel** terdaftar (dikonfirmasi langsung dari `pg_publication_tables`):
```
chat_conversations, chat_members, chat_messages, notification_inbox
```
Tidak ada tabel lain (termasuk `reports`, `posts`, `announcements`, `members`) yang mengirim event realtime — konsisten dengan `docs/supabase/peta-realtime.md` dan §0.1 poin 5 di `ACUAN-BUILD-UI-FRONTEND.md`. Jangan pasang subscription realtime untuk tabel di luar 4 ini.

---

## 7. Cron job aktif (`pg_cron`)

| Job | Jadwal | Efek |
|---|---|---|
| `cleanup-expired-posts` | tiap jam (`0 * * * *`) | Menghapus **fisik** baris `posts` (dan cascade `post_media`, dst.) yang `expires_at` sudah lewat — bukan sekadar disembunyikan RLS. |
| `cleanup-phone-check-attempts` | tiap hari jam 03:00 (`0 3 * * *`) | Membersihkan tabel rate-limit `phone_check_attempts`. |
| `send-push-notifications-every-minute` | tiap menit (`* * * * *`) | Memproses antrian `push_queue` dan mengirim push notification lewat provider terkait. |

---

## 8. Ringkasan koreksi terhadap dokumen lama (`docs/supabase/*.md`) di repo

Perbandingan hasil live-query di atas terhadap dokumen statis yang ada di repo menemukan hal berikut yang **wajib dianggap sudah usang** di dokumen lama:

1. `peta_backend-supabase.md` menyebut "gabungan dari 9 migration" — kenyataannya **18 migration** sudah diterapkan (9 migration tambahan setelah dokumen itu ditulis, lihat `DOKUMENTASI-MIGRATION.md`).
2. Tidak ditemukan bukti bahwa `crop_x/y/width/height` punya check constraint numerik apapun di database — kontrak "harus fraksi 0–1" adalah **konvensi antara FE dan Edge Function**, bukan dijamin database. Dokumentasi manapun yang menyiratkan ini "divalidasi backend" perlu diluruskan: backend hanya menyimpan angka apa adanya.
3. Policy `reports` UPDATE dan `report_media` INSERT **tidak mengikutsertakan admin** — kalau ada asumsi "admin bisa mengedit/menambah lampiran laporan siapapun", itu **tidak didukung** RLS saat ini.

---

*Sumber seluruh isi dokumen: query langsung ke project `vmbqsogwiaqwqmjpobge` lewat Supabase MCP (`list_tables`, `execute_sql` terhadap `pg_policies`/`pg_proc`/`information_schema.triggers`/`storage.buckets`/`pg_publication_tables`/`pg_extension`/`cron.job`) pada saat dokumen ini dibuat. Kalau ada migration baru diterapkan setelahnya, dokumen ini perlu di-refresh dengan query yang sama.*
