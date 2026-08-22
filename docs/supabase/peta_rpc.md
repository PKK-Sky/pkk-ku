Peta RPC (Database Functions) — Project "PKK-Sky's Project"
Project ID: vmbqsogwiaqwqmjpobge · Ditarik langsung dari pg_proc/pg_trigger project aktif.
Dokumen ini melengkapi Peta_RLS.md dan Peta_backend-supabase.md: berisi semua database function di schema public, dipilah mana yang bisa dipanggil frontend via supabase.rpc(), mana yang helper RLS internal, mana yang server-only, dan mana yang trigger (jalan otomatis, tidak dipanggil manual). Beberapa fungsi di sini langsung menjawab pertanyaan terbuka yang ditandai di Peta_RLS (poin "perlu RPC/Edge Function tambahan").
1. RPC untuk Frontend (bisa dipanggil via supabase.rpc(...))
Ini fungsi yang grant-nya mencakup anon dan/atau authenticated DAN bukan trigger — artinya callable dari client.
Fungsi
Argumen
Return
Akses
Fungsi untuk apa
check_member_by_phone
p_phone text
jsonb
anon, authenticated
Cek nomor HP terdaftar di members sebelum proses OTP/registrasi
complete_member_registration
p_phone text, p_address text = null, p_avatar_url text = null
jsonb
anon, authenticated
Menyelesaikan alur self-registration — link members.user_id ke auth.uid() dan bikin row profiles
create_direct_chat
p_other_user_id uuid
uuid
authenticated
RPC "start conversation" — bikin/ambil chat_conversations + 2 row chat_members sekaligus
get_current_chairperson_name
—
text
anon, authenticated
Ambil nama Ketua aktif → auto-fill reports.chairperson_name
get_current_member_name
—
text
anon, authenticated
Ambil nama member yang login → auto-fill reports.creator_name
get_current_member_position
—
text
anon, authenticated
Ambil jabatan member yang login → auto-fill reports.creator_position
Detail per fungsi
check_member_by_phone(p_phone)
Validasi: nomor minimal 6 karakter, kalau tidak → error (22023).
Rate limit: maksimal 5 percobaan per 15 menit per nomor (dicatat di tabel phone_check_attempts), lewat batas → error 42901.
Kemungkinan hasil (semua dalam bentuk jsonb):
{"found": false, "message": "..."} — nomor tidak ada di members.
{"found": true, "already_registered": true, "message": "..."} — nomor sudah punya user_id, arahkan ke login.
{"found": true, "blocked": true, "message": "..."} — status blocked.
{"found": true, "already_registered": false, "blocked": false, "full_name": "...", "position_name": "..."} — siap lanjut OTP + complete_member_registration.
→ Frontend: panggil ini di layar awal "Daftar Anggota" sebelum kirim OTP, untuk tampilkan nama/jabatan dan cegah spam percobaan.
complete_member_registration(p_phone, p_address, p_avatar_url)
Ini jawaban untuk blocker di Peta_RLS #2: tidak perlu trigger on_auth_user_created — alurnya memang lewat RPC ini, dipanggil setelah user berhasil OTP (jadi auth.uid() sudah ada session-nya).
Wajib login dulu (auth.uid() tidak boleh null) — kalau belum, error 42501.
Cari row members by phone (pakai for update, jadi aman dari race condition).
Tolak kalau nomor sudah terhubung ke user lain, atau statusnya blocked.
Kalau lolos: update members (set user_id, address, avatar_url, registration_status = 'active'), lalu insert profiles (nama diambil dari members.full_name, on conflict do nothing).
Return {"success": true, "member_id": "..."}.
→ Frontend: dipanggil tepat setelah verifikasi OTP sukses, sebagai step terakhir alur "Daftar Anggota" — user isi alamat & avatar di step ini.
create_direct_chat(p_other_user_id)
Ini jawaban untuk blocker di Peta_RLS #5: RPC ini yang dipakai untuk mulai percakapan baru (client tidak insert langsung ke chat_conversations/chat_members, karena memang tidak ada policy INSERT di situ).
Tolak kalau salah satu pihak admin (pakai chat_is_non_admin — konsisten dengan aturan "chat khusus non-admin").
direct_key dibuat dari least()/greatest() dua user id → deterministik, jadi ON CONFLICT DO NOTHING mencegah percakapan duplikat kalau dipanggil dua kali (idempotent, aman untuk optimistic UI).
Insert 2 row chat_members sekaligus (kedua pihak).
Return conversation_id (uuid) — dipakai FE untuk langsung navigasi ke layar chat & subscribe Realtime.
→ Frontend: panggil ini saat user tap "Mulai Chat" dari profil member lain, baru redirect ke halaman chat pakai conversation_id hasil return.
get_current_chairperson_name() / get_current_member_name() / get_current_member_position()
Ketiganya stable, tanpa argumen, baca dari members/positions berdasarkan auth.uid() (kecuali chairperson yang ambil member dengan jabatan Ketua aktif, terlama).
→ Frontend: panggil saat buka form "Buat Laporan" untuk auto-fill creator_name, creator_position, chairperson_name — jadi FE tidak perlu query manual/join sendiri, tinggal isi field ini pakai hasil RPC lalu kirim bareng insert reports. Ini juga cocok dengan trigger populate_report_identity_trigger di tabel reports (lihat bagian 4) — kemungkinan trigger ini yang otomatis mengisi ulang di sisi DB, jadi FE bisa pakai RPC ini untuk preview di form sebelum submit.
2. Fungsi Helper RLS (dipanggil dari dalam policy, bukan untuk FE)
Sudah dibahas logikanya di Peta_RLS, di sini ditambahkan info akses & signature persis:
Fungsi
Argumen
Return
Akses
Dipakai di policy tabel
is_admin
—
boolean
anon, authenticated
Hampir semua tabel
is_active_member
—
boolean
anon, authenticated
posts, post_*, dll
can_create_report
—
boolean
anon, authenticated
reports (INSERT)
can_manage_announcements
—
boolean
anon, authenticated
announcements
chat_is_non_admin
p_user_id uuid
boolean
authenticated saja (tidak ada anon)
Semua tabel chat_*
is_post_active
p_post_id uuid
boolean
anon, authenticated
post_media, post_likes, dll
→ Secara teknis semua ini bisa dipanggil manual via rpc() (kecuali chat_is_non_admin butuh sesi login), tapi tidak ada gunanya untuk FE — hasilnya sama dengan yang otomatis dicek RLS saat query tabel. Cantumkan di sini hanya untuk referensi silang dengan Peta_RLS.
3. Fungsi Server-Only (tidak bisa dipanggil dari client)
Fungsi
Argumen
Return
Akses
Catatan
queue_user_push
p_user_id uuid, p_kind text, p_event_key text, p_title text, p_body text, p_data jsonb
void
hanya postgres/service_role
Dipanggil dari trigger notify_chat_message & notify_report_recipient (lihat bagian 4), mengisi push_queue sambil cek notification_preferences per kategori dan push_devices.enabled. Dedupe pakai kombinasi (device_id, event_key).
→ Frontend tidak perlu dan tidak bisa memanggil ini — proses push notifikasi sepenuhnya otomatis lewat trigger + pg_cron/pg_net (sesuai catatan extension di Peta_backend).
4. Trigger Functions (jalan otomatis, bukan RPC — untuk konteks alur data)
Trigger
Tabel
Event
Fungsi
Yang dilakukan (sesuai nama & posisi)
announcements_max_active
announcements
BEFORE INSERT/UPDATE
check_max_active_announcements
Batasi jumlah pengumuman aktif sekaligus
announcements_updated_at
announcements
BEFORE UPDATE
update_announcements_updated_at
Auto-update updated_at
chat_messages_broadcast_insert_trg
chat_messages
AFTER INSERT
chat_messages_broadcast_insert
Broadcast pesan baru (kemungkinan ke Realtime channel khusus)
chat_refresh_preview_trigger
chat_messages
AFTER INSERT/UPDATE OF body,deleted_at
chat_refresh_conversation_preview
Update chat_conversations.last_message_*
chat_validate_message_trigger
chat_messages
BEFORE INSERT/UPDATE
chat_validate_message
Validasi isi pesan (panjang body, dll)
notify_chat_message_trigger
chat_messages
AFTER INSERT
notify_chat_message
Panggil queue_user_push untuk lawan chat
enforce_position_capacity
members
BEFORE INSERT/UPDATE OF position_id,registration_status
check_position_capacity
Batasi kuota jabatan tertentu (mis. hanya 1 Ketua aktif)
notification_preferences_updated_at_trigger
notification_preferences
BEFORE UPDATE
notifications_touch_updated_at
Auto-update updated_at
post_comments_updated_at
post_comments
BEFORE UPDATE
update_post_comments_updated_at
Auto-update updated_at
post_comments_validate_parent
post_comments
BEFORE INSERT
validate_post_comment_parent
Validasi parent_comment_id (kalau diisi) harus milik post_id yang sama — reply ke komentar dari post lain ditolak
post_comments_notify_trigger
post_comments
AFTER INSERT
notify_post_comment
Insert ke notification_inbox (kind social_activity) + queue_user_push untuk: (1) pemilik post, kalau commenter bukan pemilik sendiri; (2) pemilik komentar yang dibalas, kalau ini reply dan bukan diri sendiri/bukan orang yang sama dengan pemilik post (anti notif dobel)
post_media_validate
post_media
BEFORE INSERT/UPDATE
validate_post_media
Validasi media (tipe, urutan, dll — selaras batas di Peta_backend)
posts_updated_at
posts
BEFORE UPDATE
update_posts_updated_at
Auto-update updated_at
posts_validate_expiration
posts
BEFORE INSERT/UPDATE
validate_post_expiration
Enforce expires_at maks 48 jam dari created_at
ensure_notification_preferences_trigger
profiles
AFTER INSERT
ensure_notification_preferences
Auto-buat row default notification_preferences untuk profile baru — jadi FE tidak perlu insert manual ke tabel ini setelah registrasi
push_devices_updated_at_trigger
push_devices
BEFORE UPDATE
notifications_touch_updated_at
Auto-update updated_at
validate_report_media_trigger
report_media
BEFORE INSERT
validate_report_media
Validasi jumlah maks 2 gambar & media_order
notify_report_recipient_trigger
report_recipients
AFTER INSERT
notify_report_recipient
Panggil queue_user_push untuk recipient laporan
create_report_recipients_trigger
reports
AFTER INSERT
create_report_recipients
Ini jawaban blocker Peta_RLS #report_recipients — otomatis isi penerima laporan saat report dibuat, FE tidak perlu insert manual
populate_report_identity_trigger
reports
BEFORE INSERT
populate_report_identity
Kemungkinan auto-isi creator_name/creator_position/chairperson_name di sisi DB (paralel dengan RPC get_current_* di atas)
update_reports_updated_at_trigger
reports
BEFORE UPDATE
update_report_updated_at
Auto-update updated_at
validate_report_creator_trigger
reports
BEFORE INSERT
validate_report_creator
Validasi pembuat sesuai can_create_report()
Ringkasan: Menjawab Poin Terbuka di Peta_RLS
Pertanyaan di Peta_RLS
Jawaban dari Peta RPC ini
"Apakah ada trigger/RPC auto-provision profiles saat signup?"
Ada, lewat RPC complete_member_registration (bukan trigger auth) — dipanggil FE setelah OTP sukses
"Apakah ada RPC untuk 'start conversation' chat?"
Ada: create_direct_chat(p_other_user_id)
"Siapa yang isi report_recipients saat report dibuat?"
Trigger create_report_recipients_trigger (otomatis, bukan RPC/FE)
"Siapa yang provisioning notification_inbox/notification_preferences?"
Trigger ensure_notification_preferences_trigger (default row otomatis saat profiles dibuat)
Catatan Tambahan: Reply Komentar & Notifikasi (post_comments)
post_comments sekarang punya kolom parent_comment_id (uuid, nullable, FK ke post_comments.id, on delete set null) — dukung reply 1 level ke komentar lain di post yang sama.
Insert komentar biasa: parent_comment_id boleh null.
Insert reply: isi parent_comment_id dengan id komentar yang dibalas. Kalau id itu bukan milik post_id yang sama, insert ditolak oleh trigger post_comments_validate_parent.
Setiap insert (komentar biasa maupun reply) otomatis memicu notifikasi lewat trigger post_comments_notify_trigger:
Masuk ke notification_inbox dengan kind = 'social_activity' — tabel ini realtime-enabled (lihat peta-realtime.md), jadi FE yang subscribe langsung dapat event tanpa polling.
Diantre juga ke push_queue lewat queue_user_push, tapi hanya terkirim kalau notification_preferences.social_activity = true untuk user penerima.
→ Frontend: tidak perlu insert manual ke notification_inbox/push_queue untuk kasus ini — cukup insert ke post_comments dengan parent_comment_id terisi kalau reply, sisanya otomatis.
Catatan untuk Frontend
Semua RPC di Bagian 1 dipanggil via supabase.rpc('nama_fungsi', { ...args }) — perhatikan nama argumen persis (p_phone, p_other_user_id, dll, sesuai named parameter Postgres).
check_member_by_phone dan complete_member_registration di-grant ke anon juga — artinya bisa dipanggil sebelum login penuh (cocok untuk alur registrasi bertahap: cek nomor → OTP → lengkapi profil).
create_direct_chat butuh authenticated — pastikan sesi user aktif sebelum panggil.
Untuk form laporan, FE bisa pilih: panggil RPC get_current_* untuk preview/auto-fill di form, ATAU biarkan trigger populate_report_identity_trigger yang isi di sisi DB saat insert — sebaiknya cek dulu ke pemilik backend perilaku persis trigger ini (apakah override nilai yang dikirim FE atau hanya isi kalau kosong) sebelum menentukan pola integrasi form.
