Peta Storage (Supabase Storage Buckets) — Project "PKK-Sky's Project"
Project ID: vmbqsogwiaqwqmjpobge · Ditarik langsung dari storage.buckets & pg_policies project aktif.
Dokumen ini melengkapi Peta_backend-supabase.md, Peta_RLS.md, dan Peta_RPC.md — mencakup bagian yang belum ada di ketiganya: file/media storage.
⚠️ Status saat ini: ketiga bucket kosong — 0 file di semua bucket per pengecekan terakhir. Konfigurasi (bucket + policy) sudah siap, tapi belum pernah ada upload nyata. Kalau FE mulai integrasi fitur upload, ini jalur yang paling perlu diuji dari nol (belum ada preseden data asli untuk dijadikan acuan).
Daftar Bucket
Bucket
Public?
Batas Ukuran
MIME Type Diizinkan
post-media
Public
Tidak ada limit eksplisit di level bucket
Tidak dibatasi di level bucket
report-media
Public
Tidak ada limit eksplisit di level bucket
Tidak dibatasi di level bucket
chat-media
Private
10 MB
image/jpeg, image/png, image/webp, application/pdf, video/mp4, audio/mpeg, audio/ogg, audio/webm
→ Untuk post-media dan report-media, batas ukuran/tipe file yang disebut di Peta_backend-supabase.md (mis. maks 2 gambar report, tipe image/video post) divalidasi di level tabel (validate_post_media, validate_report_media — lihat Peta_RPC.md bagian trigger), bukan di level bucket. Jadi FE tetap wajib validasi sendiri sebelum upload — bucket tidak akan menolak file besar/tipe aneh secara otomatis untuk dua bucket ini.
⚠️ Tidak ada bucket untuk members.avatar_url. Perlu klarifikasi ke pemilik backend: apakah avatar dititip ke salah satu bucket di atas (folder terpisah?) atau memang diisi URL eksternal (mis. dari provider auth/OAuth).
Policy per Bucket
post-media (public)
Aksi
Siapa boleh
Path rule
SELECT
Semua authenticated
—
INSERT
Diri sendiri
Folder pertama di path harus {auth.uid()}
UPDATE
Pemilik file (owner_id = auth.uid())
—
DELETE
Pemilik file
—
ALL (admin)
Admin (is_admin())
Bisa kelola semua file di bucket ini
report-media (public)
Aksi
Siapa boleh
Path rule
SELECT
Semua authenticated
—
INSERT
Diri sendiri
Folder pertama di path harus {auth.uid()}
UPDATE/DELETE
Pemilik (folder pertama = auth.uid()) atau admin
—
chat-media (private)
Aksi
Siapa boleh
Path rule
SELECT
Non-admin (chat_is_non_admin), dan harus jadi member dari conversation tempat attachment itu terkirim (dicek lewat join chat_messages → chat_members → chat_attachments.storage_path)
—
INSERT
Non-admin
Folder pertama di path harus {auth.uid()}
UPDATE/DELETE
Pemilik file (owner_id = auth.uid())
—
Admin
Tidak ada akses — konsisten dengan aturan "chat khusus non-admin" di Peta_RLS

Konvensi Path yang Wajib Diikuti FE
Semua bucket pakai pola yang sama: folder pertama di path harus {auth.uid()}, misal:
Kode
→ Kalau FE upload dengan path yang folder pertamanya bukan UUID user yang login, insert akan ditolak RLS (bukan error validasi biasa — pesan error dari Supabase Storage API, bukan dari tabel).
Untuk chat-media, path file yang diupload lalu dicatat manual di chat_attachments.storage_path (lihat Peta_backend-supabase.md) — read access-nya dicek ulang lewat relasi ke chat_messages/chat_members, bukan cuma lewat kepemilikan file.
Catatan untuk Frontend
Belum ada data uji — semua bucket kosong. Sebelum FE anggap alur upload "sudah terbukti jalan", perlu dites manual end-to-end (upload → baca kembali → hapus) untuk masing-masing bucket.
Untuk post-media/report-media, validasi ukuran & tipe file wajib dilakukan di FE sendiri sebelum upload — bucket tidak menolaknya otomatis, hanya trigger tabel yang cek metadata setelah row-nya ada.
Path upload wajib diawali {auth.uid()}/... untuk ketiga bucket — hardcode helper path builder ini satu tempat di FE agar konsisten.
Klarifikasi ke pemilik backend soal bucket avatar sebelum bangun fitur upload foto profil di form registrasi (complete_member_registration menerima p_avatar_url sebagai string — kemungkinan FE upload dulu ke salah satu bucket lalu kirim URL-nya ke RPC ini).
