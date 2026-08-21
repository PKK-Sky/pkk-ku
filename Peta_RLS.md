# Peta RLS (Row Level Security) — Project "PKK-Sky's Project"

Semua policy pakai role `authenticated` (bukan `anon`) — artinya **wajib login** untuk akses apapun ke tabel-tabel ini dari client.

## Fungsi Helper (dasar semua aturan akses)

| Fungsi | Logika |
|---|---|
| `is_admin()` | `true` kalau `profiles.role = 'admin'` untuk user yang login |
| `is_active_member()` | `true` kalau ada row `members` milik user dengan `registration_status = 'active'` |
| `can_manage_announcements()` | `true` kalau admin, **atau** member aktif dengan jabatan kode `KETUA`/`WAKIL_KETUA` |
| `can_create_report()` | `true` kalau member aktif dengan jabatan nama `Bendahara`, `Sekretaris`, `Pokja I/II/III/IV` |
| `chat_is_non_admin(user_id)` | `true` kalau role user **bukan** `admin` (chat sengaja dikunci hanya untuk non-admin) |
| `is_post_active(post_id)` | `true` kalau `posts.expires_at > now()` |

Ini semua `SECURITY DEFINER` — jalan dengan hak akses fungsi, jadi aman dipakai di policy tanpa expose data lain.

---

## 1. Auth & Profil

**`profiles`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Diri sendiri (`id = auth.uid()`) atau admin (lihat semua) |
| INSERT | Hanya admin |
| UPDATE | Hanya admin |
| DELETE | Hanya admin |

→ **Frontend**: user biasa **tidak bisa** insert/update profil sendiri langsung — harus lewat proses admin (atau trigger otomatis saat signup, cek dulu apakah ada trigger `on_auth_user_created`). Kalau belum ada, ini blocker: perlu Edge Function/trigger server-side untuk auto-create `profiles` row saat signup.

**`members`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Admin (lihat semua) atau diri sendiri (`user_id = auth.uid()`) |
| INSERT | Hanya admin |
| UPDATE | Hanya admin |
| DELETE | Hanya admin |

→ **Frontend**: user **tidak bisa self-register** langsung ke tabel `members` dari client — admin yang input data anggota. Form "pendaftaran anggota" di FE berarti kirim ke admin (mis. lewat tabel lain / notifikasi), bukan insert langsung.

**`positions`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Semua user login |
| INSERT/UPDATE/DELETE | **Tidak ada policy** → tertutup total dari client (hanya lewat migration/SQL admin backend) |

---

## 2. Pengumuman

**`announcements`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Non-admin: hanya yang `is_active=true` dan dalam jendela `start_at`–`end_at`. **Admin tidak kena policy SELECT ini** (perlu dicek apakah admin punya akses baca lain — saat ini secara eksplisit, kondisi SELECT ini `NOT is_admin()`, artinya admin justru tidak bisa SELECT lewat policy ini) |
| INSERT | `can_manage_announcements()` (admin/ketua/wakil ketua), dan `created_by` harus `auth.uid()` |
| UPDATE/DELETE | `can_manage_announcements()` |

⚠️ **Perlu perhatian**: policy SELECT punya syarat `NOT is_admin()`, jadi kalau admin butuh lihat semua pengumuman (termasuk draft/nonaktif) di dashboard kelola, saat ini **tidak ada policy SELECT untuk admin** → perlu ditambahkan policy baru, atau admin pakai halaman kelola yang query lewat Edge Function/service role.

---

## 3. Feed Sosial

**`posts`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Member aktif, dan `expires_at > now()` (post yang sudah expired otomatis tidak muncul walau belum dihapus) |
| INSERT | Member aktif, `user_id = auth.uid()`, dan `expires_at` wajib antara `created_at` s.d. maksimal **48 jam** setelahnya |
| UPDATE | Pemilik post sendiri, dengan batas waktu expiry yang sama (maks 48 jam dari `created_at`) |
| DELETE | Pemilik post sendiri |
| Admin | Ada policy terpisah `ALL` untuk admin → admin bisa CRUD semua post |

→ **Frontend**: saat compose post, batasi/validasi durasi tayang maksimal 48 jam di UI (date picker expiry).

**`post_media`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Member aktif & post masih aktif |
| INSERT | Pemilik post, **dan** post belum expired saat insert |
| UPDATE/DELETE | Pemilik post |
| Admin | `ALL` |

**`post_likes` / `post_saves`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Likes: member aktif & post aktif (semua bisa lihat siapa like). Saves: **hanya lihat save milik sendiri** |
| INSERT | Diri sendiri, member aktif, post aktif |
| DELETE | Diri sendiri (unlike/unsave) |

→ **Frontend**: fitur "lihat siapa saja yang like" bisa ditampilkan publik ke sesama member, tapi "post tersimpan" bersifat privat per user.

**`post_comments`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Member aktif & post aktif |
| INSERT | Diri sendiri, member aktif, post aktif |
| UPDATE/DELETE | Pemilik komentar sendiri |
| Admin | `ALL` (bisa moderasi/hapus komentar siapapun) |

---

## 4. Laporan Kegiatan

**`reports`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Pembuat laporan, admin, atau user yang jadi `report_recipients` untuk laporan itu |
| INSERT | `created_by = auth.uid()` **dan** `can_create_report()` — jadi **hanya Bendahara, Sekretaris, Pokja I–IV** yang boleh buat laporan (bukan semua anggota, bukan admin/ketua) |
| UPDATE | Hanya pembuat laporan sendiri |
| DELETE | Pembuat laporan atau admin |

→ **Frontend penting**: sembunyikan/nonaktifkan menu "Buat Laporan" untuk role selain Bendahara/Sekretaris/Pokja I-IV, karena insert akan ditolak DB kalau dipaksakan.

**`report_media`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Pembuat laporan, admin, atau recipient laporan tsb |
| INSERT | Pembuat laporan saja |
| DELETE | Pembuat laporan atau admin |
| UPDATE | **Tidak ada policy** → media laporan tidak bisa diedit setelah insert, hanya insert/delete. Kalau butuh "ganti gambar", FE harus delete lalu insert baru. |

**`report_recipients`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Recipient itu sendiri, atau admin |
| UPDATE | Recipient sendiri (dipakai untuk update `is_read`/`read_at`) |
| INSERT/DELETE | **Tidak ada policy** → penentuan siapa penerima laporan hanya bisa lewat backend (trigger otomatis saat report dibuat, atau Edge Function), bukan dari client. |

---

## 5. Chat

Catatan besar: semua policy chat pakai `chat_is_non_admin()` → **fitur chat ini murni untuk sesama anggota biasa, admin dikecualikan/tidak berpartisipasi lewat jalur ini.**

**`chat_conversations`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Non-admin yang jadi member percakapan itu |
| INSERT/UPDATE/DELETE | **Tidak ada policy langsung** → membuat percakapan baru sepertinya harus lewat RPC/Edge Function (yang jalan sebagai SECURITY DEFINER) untuk menjamin `direct_key` unik dan insert row `chat_members` sekaligus. Cek apakah ada RPC function untuk "start conversation" sebelum mulai coding FE. |

**`chat_members`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Non-admin yang juga anggota percakapan tsb |
| UPDATE | Diri sendiri saja (untuk `last_read_at`, `muted_until`) |
| INSERT/DELETE | Tidak ada policy → sama seperti di atas, kemungkinan lewat RPC saat membuat conversation. |

**`chat_messages`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Non-admin, member dari conversation tsb |
| INSERT | Diri sendiri sebagai `sender_id`, non-admin, dan harus anggota conversation |
| UPDATE | Pengirim pesan sendiri (untuk edit/soft-delete via `deleted_at`) |
| DELETE | **Tidak ada policy** → hard delete tidak diizinkan, gunakan `deleted_at` (soft delete) via UPDATE. |

**`chat_attachments`**
| Aksi | Siapa boleh |
|---|---|
| SELECT | Non-admin yang jadi member conversation dari pesan terkait |
| INSERT | Non-admin, dan hanya untuk message yang dia kirim sendiri |
| UPDATE/DELETE | Tidak ada policy → attachment tidak bisa diedit/dihapus dari client setelah terkirim. |

---

## 6. Notifikasi & Push

**`notification_preferences`**
| Aksi | Siapa boleh |
|---|---|
| SELECT/INSERT/UPDATE | Diri sendiri saja (`user_id = auth.uid()`) |
| DELETE | Tidak ada policy |

**`notification_inbox`**
| Aksi | Siapa boleh |
|---|---|
| SELECT/UPDATE | Diri sendiri saja (update dipakai untuk tandai `read_at`) |
| INSERT/DELETE | Tidak ada policy → notifikasi hanya dibuat dari server (trigger/Edge Function), tidak dari client. |

**`push_devices`**
| Aksi | Siapa boleh |
|---|---|
| SELECT/INSERT/UPDATE/DELETE | Diri sendiri saja — full CRUD device token milik sendiri |

**`push_queue`**
| Aksi | Siapa boleh |
|---|---|
| Semua aksi | **Tidak ada policy sama sekali** → tabel ini tertutup total dari client (RLS aktif tapi 0 policy = default deny semua). Murni internal, diisi/diproses backend saja. |

---

## Ringkasan Implikasi untuk Frontend

1. **Tidak ada anonymous access** — semua fitur wajib user login duluan.
2. **Self-registration anggota tidak langsung** — insert ke `members`/`profiles` hanya lewat admin. Perlu klarifikasi ke pemilik project: apakah ada trigger/RPC untuk auto-provision saat signup, atau alurnya benar-benar manual approval oleh admin.
3. **Role "Bendahara/Sekretaris/Pokja I-IV"** adalah role khusus by `positions.name` untuk hak buat laporan — pastikan data `positions` sudah pakai nama persis itu (case-sensitive) karena dicek via `p.name in (...)`.
4. **Chat eksklusif non-admin** — jangan tampilkan menu chat untuk user dengan `profiles.role = 'admin'`.
5. **Beberapa tabel butuh RPC/Edge Function tambahan** yang belum terlihat dari policy saja: mulai percakapan chat baru, insert `report_recipients` saat report dibuat, provisioning `profiles`/`notification_inbox`. Sebaiknya cek dulu ke pemilik backend apakah RPC ini sudah ada sebelum FE mulai integrasi fitur-fitur tsb.
6. **Admin punya akses SELECT yang perlu dicek ulang** di `announcements` (saat ini kondisinya malah mengecualikan admin).
