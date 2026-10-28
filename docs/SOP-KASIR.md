# SOP Kasir — Nyamnyambox POS

Panduan harian untuk kasir. Cetak/simpan di dekat meja kasir.

- **Alamat aplikasi:** https://nyamnyambox-pos.vercel.app
- **Masuk dengan:** username (bukan email) + password
- **Butuh bantuan:** hubungi Owner (lihat `docs/GO-LIVE.md` bagian kontak)

---

## 1. Sebelum buka toko (2 menit)

- [ ] HP/tablet terisi daya, tersambung internet (Wi‑Fi toko lebih stabil).
- [ ] Buka aplikasi di Chrome (Android) atau Safari (iPhone). Boleh disimpan
      ke layar utama supaya cepat dibuka.
- [ ] Printer thermal menyala, kertas 58 mm terpasang, dan sudah tersambung ke
      perangkat (Bluetooth/USB sesuai printer).
- [ ] Login berhasil dan layar **Kasir** menampilkan menu hari ini.

> Jangan memakai mode demo untuk transaksi nyata. Mode demo hanya untuk latihan;
> datanya tidak tersimpan di server.

---

## 2. Masuk (login)

1. Buka alamat aplikasi.
2. Isi **Username atau Email** dengan **username** Anda, contoh `rizky`.
   (Hanya Owner yang memakai email.)
3. Isi **Password**, lalu ketuk **Masuk**.
4. Anda akan diarahkan ke layar **Kasir**.

Kalau salah password 5 kali, akun dikunci sementara ±15 menit. Tunggu, atau
minta Owner mereset password. **Tidak ada tombol “lupa password”** untuk kasir.

---

## 3. Membuat pesanan

1. Ketuk kartu menu. Ketuk lagi untuk menambah jumlah.
2. Keranjang muncul di bawah. Ketuk **Checkout** (atau bar total) untuk membuka
   keranjang.

   > Di iPad/tablet (lebar ≥768 px), keranjang selalu tampil di panel kanan.
   > Ketuk **Lihat Pesanan** untuk membuka formulir checkout.

3. Di keranjang, periksa dan sesuaikan:
   - **Jumlah item:** tombol **−** / **+**.
   - **Hapus item:** ikon tempat sampah di baris item.
   - **Catatan per item:** tombol catatan → isi mis. “tanpa sambal” → **Simpan catatan**.
   - **Kanal Pesanan:** Dine‑In, Takeaway, GrabFood, ShopeeFood, atau WhatsApp.
   - **Metode Pembayaran:** Cash, Transfer, QRIS, atau E‑Wallet.
   - **Status Pembayaran:** Lunas atau Belum Lunas.
   - **Nomor WhatsApp Pelanggan** (opsional, untuk kirim nota).
4. **Baca ulang total dan item.** Setelah yakin, ketuk
   **Konfirmasi & Proses Pesanan** satu kali.
5. Nota transaksi muncul dengan nomor `NYB-YYYYMMDD-NNNN`. Nomor ini yang
   dipakai saat rekonsiliasi — jangan ditulis manual.

> Pesanan hanya tersimpan setelah tombol konfirmasi ditekan. Kalau ragu,
> batalkan dulu (tutup keranjang), jangan menekan konfirmasi dua kali.

---

## 4. Mencetak struk

1. Di jendela **Nota Transaksi**, pilih ukuran kertas: **58mm** (printer kecil)
   atau **80mm**.
2. Ketuk **Cetak**. Dialog cetak browser terbuka.
3. Pilih printer thermal → pastikan:
   - **Margins:** None / Minimum
   - **Scale:** 100% (jangan “Fit to page”)
   - **Headers and footers:** matikan
4. Cetak. Struk yang benar hanya berisi nota: nama toko, nomor, item, total,
   metode, status. Tidak ada tombol atau menu aplikasi.

**Kalau hasil cetak kosong / terpotong / ada tombol ikut tercetak:**

- Pastikan ukuran di aplikasi sama dengan lebar kertas (58 mm vs 80 mm).
- Matikan “Headers and footers” dan set margin None.
- Muat ulang halaman, buka nota lagi dari **Riwayat**, lalu cetak ulang.
- Kalau tetap gagal, kirim nota lewat WhatsApp (§5) dan catat nomor nota untuk
  Owner.

---

## 5. Mengirim nota lewat WhatsApp

1. Di jendela nota, ketuk **Kirim WA**.
2. WhatsApp terbuka dengan pesan nota yang sudah terisi.
3. Pilih pelanggan (atau ketik nomornya), lalu kirim.

Kalau nomor pelanggan diisi saat checkout, nomor itu otomatis dipakai. Kalau
tidak, pilih kontak secara manual. Pengiriman tetap dilakukan dari WhatsApp
Anda — aplikasi hanya menyiapkan pesannya.

---

## 6. Transaksi berikutnya

- Ketuk **Pesanan Baru** untuk mengosongkan keranjang dan mulai order
  selanjutnya.
- Nota lama tetap bisa dibuka dari **Riwayat**.

---

## 7. Riwayat & koreksi transaksi

1. Buka menu **Riwayat**.
2. Kasir hanya melihat transaksi **hari ini**. Owner bisa memilih **Hari ini**,
   **Kemarin**, atau tanggal lain lewat pemilih tanggal.
3. Ketuk kartu transaksi untuk membuka detail.
4. Ketuk **Edit** untuk mengubah:
   - jumlah / item (tambah atau hapus),
   - catatan item,
   - metode & status pembayaran,
   - nomor WhatsApp pelanggan.
5. Ketuk **Simpan Perubahan**. Nota bertanda “Transaksi telah diedit”.

**Aturan penting:** kasir hanya bisa mengedit transaksi **hari ini**. Transaksi
hari sebelumnya akan ditolak dengan pesan “Transaksi hanya dapat diedit pada
hari yang sama” — hubungi Owner.

Tidak ada tombol hapus transaksi. Kalau salah input dan sudah lewat hari,
laporkan nomor notanya ke Owner; jangan membuat transaksi palsu sebagai
penyeimbang.

---

## 8. Keluar (logout)

Ketuk ikon **Keluar** — di kanan atas pada HP, atau di bagian bawah menu samping
pada desktop. Selalu logout kalau perangkat ditinggalkan atau dipakai bergantian
shift.

---

## 9. Kalau ada masalah

| Gejala | Yang dilakukan |
| --- | --- |
| “Username atau password salah.” | Periksa huruf besar/kecil dan spasi. Pastikan memakai **username**, bukan email. |
| “Terlalu banyak percobaan masuk. Coba lagi dalam … menit.” | Tunggu sesuai waktu yang tertera (±15 menit), atau minta Owner mereset password. |
| Lupa password | Hubungi Owner. Hanya Owner yang bisa mereset lewat dashboard Supabase. |
| Menu tidak muncul | Tarik halaman ke bawah untuk muat ulang. Kalau tetap kosong, Owner mungkin menonaktifkan menu tersebut. |
| Nota tidak muncul setelah konfirmasi | Buka **Riwayat** dan cari nomor terakhir. Jangan mengulang order sebelum dicek — bisa dobel. |
| Halaman putih / error | Muat ulang. Kalau tetap, logout lalu login lagi, dan catat waktu kejadian untuk Owner. |
| Internet putus saat checkout | Setelah internet kembali, buka **Riwayat** dulu. Kalau order sudah tercatat, jangan ulangi. |
| Printer tidak mencetak | Cek kabel/Bluetooth, kertas, dan pilihan printer di dialog cetak. |

---

## 10. Aturan yang tidak boleh dilanggar

1. **Satu password, satu orang.** Jangan berbagi akun kasir.
2. **Konfirmasi sekali.** Periksa item dan total sebelum menekan konfirmasi.
3. **Jangan memalsukan transaksi** untuk menutupi selisih kas.
4. **Jangan mengubah menu/harga** — itu wewenang Owner.
5. **Jangan memakai mode demo** untuk transaksi nyata.
6. **Selalu logout** di akhir shift.
