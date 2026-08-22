Peta Realtime (Supabase Realtime Publication) — Project "PKK-Sky's Project"
Project ID: vmbqsogwiaqwqmjpobge · Ditarik langsung dari pg_publication_tables & pg_class.relreplident project aktif.
Dokumen ini melengkapi Peta_backend-supabase.md, Peta_RLS.md, dan Peta_RPC.md — mencakup bagian yang belum ada: tabel mana saja yang bisa di-subscribe Realtime dari client.
✅ Status: konfigurasi publication sudah aktif dan benar untuk 4 tabel di bawah — infrastrukturnya siap dipakai. Yang belum bisa dipastikan dari sisi database adalah apakah sudah ada client yang benar-benar subscribe (traffic realtime baru kelihatan dari sisi FE/dashboard, bukan dari SQL).
Tabel yang Realtime-Enabled
Tabel
Replica Identity
Artinya
chat_conversations
default (PK saja)
Bisa subscribe INSERT/UPDATE/DELETE. Payload UPDATE/DELETE hanya menyertakan kolom PK di old record — kalau butuh nilai lama kolom lain, harus di-query ulang manual, bukan mengandalkan payload event
chat_members
default (PK saja)
Sama seperti di atas
chat_messages
default (PK saja)
Sama seperti di atas — relevan untuk fitur edit/soft-delete (deleted_at), FE tidak otomatis dapat isi body sebelum di-edit dari payload event
notification_inbox
default (PK saja)
Sama seperti di atas
→ Hanya 4 tabel ini yang terdaftar di publication supabase_realtime. Kalau FE subscribe ke tabel lain (posts, post_comments, post_likes, announcements, dll), tidak akan menerima event apapun — walaupun query manual/RLS-nya tetap jalan normal.
Tabel yang TIDAK Realtime (perlu polling/refetch manual)
Semua tabel selain 4 di atas, termasuk yang sering dianggap butuh "live update":
Tabel
Kalau butuh live update, alternatifnya
posts, post_media, post_likes, post_comments, post_saves
Refetch manual (pull-to-refresh / polling interval) — feed sosial tidak realtime
announcements
Refetch saat buka halaman/app foreground — banner pengumuman tidak realtime
reports, report_media, report_recipients
Refetch manual — badge unread laporan tidak auto-update tanpa refresh
push_devices, push_queue, notification_preferences
Tidak relevan untuk realtime FE (internal/pengaturan)
→ Implikasi penting: badge "like" atau komentar baru di feed sosial tidak akan muncul otomatis kalau FE mengandalkan Supabase Realtime — perlu strategi refetch sendiri (mis. refetch saat scroll/focus, atau polling interval, atau invalidate query setelah aksi user sendiri).
⚠️ Jangan tertukar — dua hal berbeda untuk post_comments: tabel post_comments sendiri tidak realtime (komentar/reply baru tidak otomatis muncul di UI feed tanpa refetch), tapi trigger post_comments_notify_trigger (lihat peta-rpc.md) tetap insert row ke notification_inbox — dan tabel itu realtime. Jadi: notifikasi "Seseorang mengomentari postingan Anda" bisa muncul instan di lonceng notifikasi, sementara komentarnya sendiri di halaman feed baru kelihatan setelah FE refetch manual.
Yang Sudah Terverifikasi vs Yang Belum
✅ Terverifikasi dari database:
Publication supabase_realtime aktif dan mencakup 4 tabel di atas.
Replica identity tiap tabel = default, konfigurasi standar Supabase (tidak ada yang aneh/rusak).
❓ Belum bisa dipastikan dari sini (perlu dicek dari sisi lain):
Apakah ada client yang sudah pernah subscribe (traffic realtime) — cek dari dashboard Supabase → Realtime, bukan SQL.
Apakah Row Level Security ikut membatasi payload realtime sesuai RLS masing-masing tabel (perilaku standar Supabase: ya, RLS tetap berlaku untuk realtime) — sebaiknya dites langsung saat integrasi, terutama untuk chat_messages yang RLS-nya bergantung ke chat_is_non_admin() dan keanggotaan conversation.
Catatan untuk Frontend
Subscribe Realtime hanya untuk 4 tabel chat + notification_inbox. Untuk modul lain (feed, pengumuman, laporan), rencanakan strategi refetch manual dari awal — jangan asumsikan realtime otomatis tersedia.
Karena replica identity default, payload event UPDATE/DELETE tidak membawa nilai lama secara lengkap — kalau UI butuh "before/after" penuh (mis. animasi transisi), ambil dari state lokal FE sendiri, bukan dari payload.
Sebelum anggap fitur chat realtime "sudah pasti jalan mulus", tes langsung dengan 2 sesi berbeda (dua user login) — konfigurasi di level DB sudah benar, tapi ini belum tentu sama dengan pengujian end-to-end yang mencakup RLS + Realtime + client subscription sekaligus.8
