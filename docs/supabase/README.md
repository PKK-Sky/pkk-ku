Dokumentasi Backend Supabase — "PKK-Sky's Project"
Project ID: vmbqsogwiaqwqmjpobge · Region: ap-southeast-1 · Postgres 17
Kumpulan dokumen hasil mapping backend Supabase, dibuat untuk memandu tim frontend supaya tidak menebak-nebak struktur data, hak akses, atau perilaku otomatis di database. Semua ditarik langsung dari project aktif (bukan asumsi), jadi kalau ada perubahan skema di kemudian hari, dokumen ini yang perlu diupdate duluan.
Urutan Baca yang Disarankan
peta-backend-supabase.md — Mulai dari sini. Peta semua tabel, kolom penting, dan modul fitur (Auth, Pengumuman, Feed Sosial, Laporan, Chat, Notifikasi/Push).
peta-rls.md — Siapa boleh apa di setiap tabel (SELECT/INSERT/UPDATE/DELETE). Wajib dibaca sebelum bikin form atau tombol aksi apapun — beberapa insert akan ditolak DB kalau role/status usernya tidak sesuai.
peta-rpc.md — Daftar database function yang bisa dipanggil lewat supabase.rpc(), termasuk yang menjawab alur "self-registration" dan "start chat" yang tidak kelihatan dari RLS saja. Juga daftar trigger otomatis (isi tabel tertentu tanpa perlu insert manual dari FE).
peta-storage.md — Bucket file (post, laporan, chat), batas ukuran/tipe, dan konvensi path upload.
peta-realtime.md — Tabel mana yang realtime (bisa di-subscribe) dan mana yang wajib refetch manual/polling.
Ringkasan Cepat (kalau cuma sempat baca satu hal)
Tidak ada anonymous access untuk data utama — hampir semua fitur wajib login (kecuali 2 RPC pra-registrasi: check_member_by_phone, complete_member_registration).
Realtime cuma jalan di 4 tabel: chat_conversations, chat_members, chat_messages, notification_inbox. Fitur lain (feed, pengumuman, laporan) butuh refetch manual.
Storage sudah dikonfigurasi tapi belum pernah diuji (0 file di semua bucket per pengecekan terakhir) — anggap ini area yang paling butuh testing end-to-end.
Reply komentar (post_comments.parent_comment_id) sudah didukung, lengkap dengan notifikasi otomatis realtime + push ke pemilik post/komentar (lihat peta-rpc.md).
Migration Terkait
SQL migration untuk fitur di atas ada di luar folder ini, di supabase/migrations/:
add_post_comment_replies_and_notifications.sql — kolom parent_comment_id + trigger validasi & notifikasi.
Cara Menjaga Dokumen Ini Tetap Akurat
Setiap kali ada migration baru yang mengubah tabel, RLS policy, function/RPC, bucket storage, atau publication realtime — update file yang relevan di folder ini di commit yang sama dengan migration-nya. Jangan biarkan dokumentasi menyusul belakangan; FE akan mengacu ke sini sebagai sumber kebenaran struktur backend.
