# Checklist Go-Live & Kontak Eskalasi — Nyamnyambox POS

Dokumen ini dipakai saat menyerahkan aplikasi ke toko dan saat ada masalah.
Isi bagian kontak sebelum dokumen dibagikan.

- **Production:** https://nyamnyambox-pos.vercel.app
- **Repo:** `triartainyoman/nyamnyambox-pos` (branch `main` dilindungi)
- **Status go-live:** live sejak 2026-10-27 (T16)
- **Dokumen terkait:** [`SOP-KASIR.md`](SOP-KASIR.md) ·
  [`PANDUAN-OWNER.md`](PANDUAN-OWNER.md) · [`RUNBOOK.md`](RUNBOOK.md) ·
  [`QA_MATRIX.md`](QA_MATRIX.md)

---

## 1. Checklist sebelum go-live

### Infrastruktur

- [x] Project Supabase dibuat (`pnclljapcuobhskqrcux`, `ap-southeast-1`).
- [x] Migrasi `0001`–`0005` dijalankan berurutan di production.
- [x] `supabase/verify.sql` dijalankan — semua baris `OK`.
- [x] Akun Owner dipromosikan (`role = OWNER`, `is_active = true`).
- [x] RLS diuji (`npm run test:rls`).
- [x] Project Vercel terhubung ke repo; function dikunci ke `sin1`
      (`vercel.json`).
- [x] Env production diisi: `NEXT_PUBLIC_SUPABASE_URL`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- [x] `NEXT_PUBLIC_DEMO_MODE` **tidak** diisi di production.
- [x] Site URL & Redirect URLs Supabase menunjuk ke domain production.
- [ ] Domain kustom (opsional, ditunda — Owner belum punya domain).

### Keamanan & operasi

- [x] Branch protection `main`: PR wajib, 3 check wajib, `strict`, force-push
      dan hapus branch diblokir, admin ikut terikat.
- [x] CI hijau di `main` (typecheck, lint, unit test, production build, E2E).
- [x] Security headers + nonce CSP aktif (dicek via `curl -sI`).
- [x] Login throttling aktif (5 percobaan → kunci sementara).
- [x] `GET /api/health` → `200` dan `commit` sama dengan commit production.
- [x] Workflow `Uptime check` aktif (jadwal tiap 30 menit; run pertama muncul
      pada jadwal berikutnya).
- [x] Workflow `Database backup` aktif di GitHub Actions.
- [ ] Backup manual pertama dijalankan: Actions → **Database backup** →
      *Run workflow*, untuk memastikan secret `SUPABASE_DB_URL` benar dan
      artifact dump muncul.
- [x] Restore drill PGlite lulus (`npm run drill:restore`).
- [ ] Restore drill ke project staging Supabase (opsional, butuh project uji).

### Uji terima (acceptance)

- [x] Smoke test production: login Owner, login kasir, buat order, cetak 58 mm,
      riwayat, logout, login Owner ulang — 0 error.
- [x] Lighthouse mobile: `/login` 99/100/100, `/pos` 100/100/100,
      `/dashboard` 100/100/100.
- [x] Data uji dihapus dari production setelah pengujian.
- [ ] Kasir mencoba sendiri alur utama di perangkat toko (lihat §4).
- [ ] Owner mencoba sendiri tambah menu + tambah kasir (lihat §4).

---

## 2. Langkah hari-H

1. **Bekukan perubahan kode.** Tidak merge PR baru sampai uji terima selesai.
2. **Pastikan health hijau:** `curl -s https://nyamnyambox-pos.vercel.app/api/health`.
3. **Siapkan akun:** satu Owner aktif + satu kasir per orang (username unik).
4. **Latih kasir 10 menit** memakai `docs/SOP-KASIR.md` §2–§6 di perangkat
   toko, dengan satu order uji bernilai kecil (catat nomor notanya).
5. **Uji cetak** di printer 58 mm dan 80 mm (atau Save as PDF bila printer belum
   siap). Simpan pengaturan cetak yang berhasil.
6. **Uji WhatsApp** dari HP yang dipakai kasir.
7. **Bagikan akses:** tautan aplikasi, username masing-masing, dan kontak
   eskalasi. Password dikirim pribadi, bukan di grup.
8. **Catat tanda tangan** di §6 setelah Owner menyetujui.

---

## 3. Kapan rollback

Rollback **kode** (Vercel → *Deployments* → **Promote to Production**) bila:

- halaman utama error/blank untuk semua orang,
- login gagal massal padahal Supabase sehat,
- ada kebocoran data atau header keamanan hilang.

Rollback **database** (restore dump) hanya bila data rusak/hilang dan di luar
jam operasional. Prosedur lengkap: `docs/RUNBOOK.md` §5.5 dan §3.7.

Jangan rollback untuk masalah satu perangkat (printer, WhatsApp, jaringan
toko) — itu masalah lokal.

---

## 4. Uji terima oleh Owner & kasir

Minta Owner menandai setelah dicoba di perangkat nyata:

| # | Siapa | Yang dicoba | Status |
| --- | --- | --- | --- |
| A1 | Kasir | Login username → buat order → cetak 58 mm | ⬜ |
| A2 | Kasir | Kirim nota lewat WhatsApp | ⬜ |
| A3 | Kasir | Edit transaksi hari ini (status/catatan) | ⬜ |
| A4 | Kasir | Logout, lalu buka `/pos` langsung → dialihkan ke login | ⬜ |
| A5 | Kasir | Double tap konfirmasi → tetap satu order | ⬜ |
| A6 | Owner | Login email → Dashboard menampilkan omzet hari ini | ⬜ |
| A7 | Owner | Tambah menu + nonaktifkan menu | ⬜ |
| A8 | Owner | Tambah kasir baru → kasir login | ⬜ |
| A9 | Owner | Nonaktifkan kasir → login ditolak | ⬜ |
| A10 | Owner | Edit transaksi kemarin (Owner boleh) | ⬜ |

---

## 5. Kontak eskalasi

Isi nomor/akun di bawah ini sebelum dokumen dibagikan ke kasir.

| Peran | Nama | Kontak | Untuk apa |
| --- | --- | --- | --- |
| **Owner toko** | Nyoman Triarta | `<isi nomor WA>` | Keputusan bisnis, reset password, koreksi transaksi |
| **Pendamping teknis** | — | `<isi kontak>` | Bug aplikasi, deploy, database |
| **Supabase** | — | https://status.supabase.com · dashboard | Database/auth down, reset user |
| **Vercel** | — | https://www.vercel-status.com · dashboard | Deploy gagal, rollback |
| **GitHub** | — | https://www.githubstatus.com | CI/backup/uptime workflow |

### Alur eskalasi

1. **Kasir** mencoba langkah di `docs/SOP-KASIR.md` §9.
2. Kalau tetap gagal → **Owner** (reset password, cek menu/akun, cek
   Dashboard).
3. Kalau aplikasi error untuk banyak orang → **Pendamping teknis** dengan
   informasi: waktu kejadian, halaman, pesan error, screenshot, nomor nota.
4. Kalau penyebabnya vendor → cek halaman status di atas, lalu ikuti
   `docs/RUNBOOK.md` §5.

**Jangan** mengirim password, service role key, atau isi `.env.local` lewat
chat. Cukup screenshot pesan errornya.

---

## 6. Tanda tangan serah terima

| Peran | Nama | Tanggal | Tanda tangan |
| --- | --- | --- | --- |
| Owner | | | |
| Pendamping teknis | | | |
| Perwakilan kasir | | | |

Setelah ditandatangani, T17 di `PRODUCTION_TODO.md` boleh ditutup.
