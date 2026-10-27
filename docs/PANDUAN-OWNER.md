# Panduan Owner — Nyamnyambox POS

Panduan untuk pemilik toko: mengelola menu, kasir, dan membaca laporan.
Untuk prosedur darurat (situs down, restore database, rotasi kunci) lihat
[`docs/RUNBOOK.md`](RUNBOOK.md). Untuk panduan kasir lihat
[`docs/SOP-KASIR.md`](SOP-KASIR.md).

- **Aplikasi:** https://nyamnyambox-pos.vercel.app
- **Masuk dengan:** email Owner + password (bukan username)
- **Hak akses Owner:** Kasir, Riwayat, Dashboard, Menu & Promo, Kelola Karyawan

---

## 1. Masuk sebagai Owner

1. Buka aplikasi, isi **Username atau Email** dengan **email** Anda.
2. Isi password, ketuk **Masuk**. Anda masuk ke **Dashboard**.
3. Kasir tidak bisa membuka Dashboard, Menu & Promo, atau Kelola Karyawan —
   halaman itu otomatis dialihkan.

> Owner **tidak bisa** login memakai username. Ini disengaja: username hanya
> untuk kasir, sehingga akun pemilik tidak bisa ditebak dari nama panggilan.

---

## 2. Dashboard

| Bagian | Artinya |
| --- | --- |
| **Omzet Hari Ini** | Total nilai transaksi **Lunas** hari ini (WIB). Transaksi belum lunas tidak dihitung. |
| **Transaksi Hari Ini** | Jumlah semua nota hari ini, semua kanal (termasuk yang belum lunas). |
| **Rata-rata / Order** | Omzet lunas hari ini ÷ jumlah transaksi lunas (AOV). |
| **Belum Lunas** | **Jumlah** nota hari ini yang statusnya belum dibayar — tindak lanjuti ke kasir. |
| **Grafik penjualan** | Tren omzet **6 bulan terakhir** (bulan ini + 5 bulan sebelumnya), hanya transaksi lunas. |
| **Produk Terlaris** | 5 menu paling banyak terjual **bulan ini**, diurutkan dari jumlah porsi. |
| **Transaksi Terakhir** | Nota-nota terbaru hari ini beserta kanal dan nilainya. |

Angka dihitung dari data server, jadi antar-perangkat akan sama. Kalau grafik
kosong, berarti belum ada transaksi lunas pada rentang itu.

---

## 3. Menu & Promo

### Menambah menu

1. Buka **Menu & Promo** → **Tambah Menu**.
2. Isi **Nama Menu**, **Harga (Rp)** (angka saja, tanpa titik), dan **URL
   Gambar** (opsional).
3. Simpan. Menu langsung muncul di layar kasir.

### Mengubah harga / nama / gambar

Ketuk ikon **pensil** pada kartu menu, ubah, lalu simpan.

> Perubahan harga **hanya berlaku untuk transaksi baru**. Nota lama tetap
> memakai harga saat transaksi dibuat. Pengecualian: kalau sebuah transaksi
> **diedit**, totalnya dihitung ulang memakai harga menu **saat ini** — jadi
> hindari mengedit nota lama setelah menaikkan harga.

### Menonaktifkan menu (bukan menghapus)

Gunakan tombol **switch** di kartu menu. Nonaktif = tidak muncul di layar kasir,
tetapi tetap tersimpan untuk laporan dan nota lama.

Tidak ada tombol hapus menu. Ini disengaja: nota lama harus tetap bisa
menunjuk menu yang pernah dijual.

### Membuat promo

Beri nama menu dengan awalan `[PROMO]`, contoh:

```
[PROMO] Thai Basil + Free Es Teh
```

Awalan itu membuat badge **PROMO** muncul di layar kasir dan teks `[PROMO]`
disembunyikan dari kartu menu. Nama lengkap (termasuk `[PROMO]`) tetap tercetak
di nota dan pesan WhatsApp, jadi tulis nama yang enak dibaca pelanggan. Harga
promo diisi seperti harga biasa.

---

## 4. Kelola Karyawan (akun kasir)

### Menambah kasir

1. Buka **Kelola Karyawan** → **Tambah Kasir**.
2. Isi **Nama**, **Username**, **Email**, dan **Password Awal** (minimal 6
   karakter).
3. Ketuk **Buat Akun**. Kasir bisa langsung login memakai username tersebut.

Aturan username: 3–30 karakter, huruf kecil, angka, titik, garis bawah, atau
strip; diawali dan diakhiri huruf/angka. Contoh: `rizky`, `sari.pagi`,
`kasir_2`.

Email tetap wajib karena dipakai Supabase untuk identitas akun dan pemulihan.
Kasir tidak perlu tahu/memakai emailnya untuk login.

### Menonaktifkan kasir

Matikan switch **Aktif** pada kartu kasir. Akun langsung tidak bisa login dan
tidak bisa membuat transaksi; riwayatnya tetap ada.

- Switch untuk akun **Owner** dan akun **Anda sendiri** dikunci — mencegah
  lockout.
- Tidak ada tombol hapus akun. Menonaktifkan sudah cukup dan menjaga jejak
  audit.

### Mereset password kasir

Belum ada tombol reset di aplikasi. Langkahnya:

1. Buka Supabase → project `pnclljapcuobhskqrcux` → **Authentication → Users**.
2. Cari email kasir → menu `⋯` → **Reset password** (atau kirim *magic link*).
3. Berikan password baru ke kasir, minta segera menggantinya di tempat aman.

Kalau email kasir fiktif/tidak bisa diakses, buat akun kasir baru dan
nonaktifkan akun lama.

---

## 5. Riwayat & koreksi transaksi

1. Buka **Riwayat** → pilih **Hari ini**, **Kemarin**, atau tanggal tertentu.
2. Ketuk kartu transaksi untuk melihat nota.
3. **Edit** untuk mengubah item, jumlah, catatan, metode/status pembayaran, dan
   nomor WhatsApp. Owner bisa mengedit tanggal mana pun; kasir hanya hari ini.

Catatan:

- Setiap edit menandai nota “Transaksi telah diedit” dan menghitung ulang total
  dari harga menu saat ini.
- Tidak ada tombol hapus transaksi. Kalau perlu pembatalan, ubah status menjadi
  **Belum Lunas** dan catat alasannya di catatan item; koreksi level database
  hanya dilakukan lewat prosedur restore/backup di runbook.

---

## 6. Laporan & pembukuan

Ekspor CSV dijalankan dari laptop (bukan dari aplikasi):

```bash
npm run export:orders -- --month 2026-10
# atau rentang tertentu
npm run export:orders -- --from 2026-10-01 --to 2026-10-31
```

Hasilnya berisi waktu Asia/Jakarta, label kanal/metode bayar, total rupiah, dan
ringkasan item. Nomor HP pelanggan **tidak** diekspor. File CSV tidak di-commit
ke repo.

---

## 7. Rutinitas yang disarankan

**Harian**

- [ ] Cek **Belum Lunas** di Dashboard dan tindak lanjuti.
- [ ] Bandingkan omzet Dashboard dengan uang fisik/QRIS.
- [ ] Pastikan kasir logout di akhir shift.

**Mingguan**

- [ ] Cek `/api/health` (atau biarkan alert uptime bekerja).
- [ ] Pastikan backup mingguan berjalan (GitHub Actions → **Database backup**).
- [ ] Tinjau menu: nonaktifkan yang habis, perbarui harga bila perlu.

**Bulanan**

- [ ] Ekspor CSV bulan lalu untuk pembukuan.
- [ ] Tinjau daftar kasir: nonaktifkan akun yang sudah tidak bekerja.
- [ ] Ganti password Owner secara berkala.

---

## 8. Keamanan akun

- Pakai password manager; jangan pakai password yang sama dengan akun lain.
- Jangan pernah mengirim password lewat chat grup; gunakan pesan pribadi.
- Aktifkan 2FA di akun **Supabase**, **Vercel**, dan **GitHub** — tiga akun ini
  bisa mengubah atau menghapus data toko.
- Kunci rahasia (service role key, password database) hanya disimpan di
  `.env.local`/Vercel dan file di home directory, tidak di repo.
- Kalau ada tanda kebocoran, ikuti **rotasi kunci** di `README.md` §7 dan
  `docs/RUNBOOK.md` §5.7.

---

## 9. Batasan yang perlu diketahui

| Batasan | Dampak | Mitigasi |
| --- | --- | --- |
| Supabase free plan tanpa backup otomatis/PITR | Paling banyak kehilangan 7 hari data | Dump mingguan ke GitHub artifact; upgrade bila transaksi makin besar |
| Tidak ada reset password mandiri | Kasir harus lewat Owner | Owner reset via dashboard Supabase |
| Cetak lewat dialog browser | Perlu printer terpasang di perangkat | Simpan pengaturan cetak yang sudah terbukti |
| WhatsApp berupa tautan `wa.me` | Pesan dikirim manual dari WhatsApp | Kasir menekan **Kirim WA** lalu kirim |
| Tanpa domain kustom | Alamat masih `*.vercel.app` | Tambahkan domain di Vercel kapan saja, tanpa ubah kode |
