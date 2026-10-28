# QA Matrix — Nyamnyambox POS

Checklist untuk T12 di `PRODUCTION_TODO.md`. Bagian otomatis sudah dijalankan;
bagian manual butuh perangkat nyata (printer thermal, HP, Safari iOS).

- **Terakhir dijalankan:** 2026-10-28
- **Lingkungan otomatis:** Chromium (Playwright), dev server demo mode `127.0.0.1:3210`
- **Data:** demo (localStorage), bukan project Supabase production
- **Pipeline lokal:** `npm run ci` (typecheck, lint, 210 unit test, production build) dan `npm run test:e2e` (18 skenario) hijau pada commit yang sama.

## Menjalankan ulang bagian otomatis

```bash
# Terminal 1 — server demo terpisah dari dev server harian
NEXT_DIST_DIR=.next-qa NEXT_PUBLIC_DEMO_MODE=true \
NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= SUPABASE_SERVICE_ROLE_KEY= \
npm run dev -- --port 3210 --hostname 127.0.0.1

# Terminal 2
npm run qa:check
```

Screenshot hasil ada di `qa-artifacts/` (tidak di-commit). Script keluar dengan
kode 1 kalau ada temuan, jadi bisa dipakai sebagai gate manual. Screenshot
dashboard menunggu animasi Recharts selesai, dan screenshot nota menunggu
transisi `visibility` selesai, supaya hasilnya tidak menyesatkan.

## 1. Layout responsif — otomatis ✅

Tidak ada horizontal scroll (`scrollWidth > clientWidth`) dan tidak ada error
console di semua kombinasi:

| Halaman | 360px | 390px | 768px | 820px | 1024px | 1180px | 1280px |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/login` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/pos` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/history` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/products` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/employees` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Screenshot: `qa-artifacts/{mobile-360,mobile-390,tablet-768,tablet-820,tablet-1024,laptop-1180,desktop-1280}/*.png`.

Tablet (≥768 px) punya pemeriksaan tambahan: panel keranjang **persisten**,
grid menu **3 kolom**, dan bottom bar tersembunyi. Di 1280 px grid menjadi
4 kolom. Perilaku ini dijaga `e2e/tablet.spec.ts` (tablet 820 px + phone 390 px).

## 2. Alur transaksi — otomatis ✅

| Kasus | Hasil |
| --- | --- |
| Tambah menu → cart → checkout → nota tampil | ✅ |
| Klik "Konfirmasi & Proses Pesanan" dua kali dalam tick yang sama | ✅ hanya 1 pesanan (sebelumnya 2 — lihat §5) |
| Nota 58mm | ✅ lebar 197px, `@page size: 58mm auto` |
| Nota 80mm | ✅ lebar 287px, `@page size: 80mm auto` |
| Tautan WhatsApp berisi nomor nota | ✅ `https://wa.me/?text=…` |
| Edit transaksi di riwayat (status, catatan, nomor WA) | ✅ (dijaga E2E `e2e/cashier.spec.ts`) |
| Cetak dari sheet detail riwayat: hanya struk yang tampil, tanpa tombol/kartu/`nyamnyambox.com` | ✅ (dijaga E2E `e2e/cashier.spec.ts`, media print) |
| Ekspor Excel bulanan (Owner): pilih bulan/tahun → `Nyamnyambox-YYYY-MM.xlsx` berisi 3 sheet, file > 1 KB, toast sukses | ✅ (dijaga E2E `e2e/export.spec.ts`) |
| Kasir tidak melihat kartu ekspor Excel di `/history` | ✅ (dijaga E2E `e2e/export.spec.ts`) |

## 3. Kondisi khusus — otomatis ✅

| Kasus | Hasil |
| --- | --- |
| Riwayat tanpa transaksi | ✅ empty state "Belum ada transaksi" |
| Dashboard tanpa transaksi | ✅ empty state "Belum ada transaksi hari ini." |
| Jaringan lambat (Slow 3G, latency 400ms) | ✅ halaman riwayat tampil < 1 s (data lokal) |
| Urutan Tab form login | ✅ identifier → password → tampilkan password → Masuk |
| Focus ring input | ✅ ring 2px terlihat saat keyboard focus |

## 4. Manual — butuh perangkat Anda ⬜

Centang setelah dicoba. Kalau ada yang gagal, catat langkah + screenshot.

| # | Kasus | Perangkat | Status |
| --- | --- | --- | --- |
| M1 | Login kasir + buat pesanan + cetak 58mm (hasil tidak terpotong, margin wajar) | Printer thermal 58mm + Chrome desktop | ⬜ |
| M2 | Cetak 80mm dari nota yang sama | Printer thermal 80mm / Save as PDF | ⬜ |
| M3 | Tombol "Kirim WA" membuka WhatsApp dengan pesan lengkap (nomor, item, total) | HP Android/iPhone | ⬜ |
| M4 | Login + checkout + edit transaksi di Safari iOS (tidak ada keyboard yang menutupi tombol) | iPhone | ⬜ |
| M5 | Layout 360px di HP nyata (tidak ada tombol terpotong di bawah) | HP kecil | ⬜ |
| M6 | Double tap checkout di HP nyata tetap menghasilkan satu pesanan | HP | ⬜ |
| M7 | Refresh saat di tengah checkout tidak menggandakan pesanan | HP/desktop | ⬜ |
| M8 | Dashboard Owner menampilkan grafik + top menu dengan data hari ini | desktop | ⬜ |
| M9 | Tambah/edit menu dan tambah kasir, lalu login dengan akun baru | desktop | ⬜ |
| M10 | Logout lalu buka `/pos` langsung → dialihkan ke login | HP/desktop | ⬜ |
| M11 | Upload foto menu dari galeri HP (JPG/PNG), ganti foto, lalu pastikan foto baru tampil di POS dan objek lama hilang dari bucket `product-images` | HP + desktop | ⬜ |
| M12 | iPad portrait (768–834 px): keranjang selalu terlihat, grid 3 kolom, tidak ada tombol terpotong, target sentuh nyaman | iPad | ⬜ |
| M13 | iPad landscape (1024–1180 px): sidebar penuh, keranjang di kanan, checkout + nota tampil utuh | iPad | ⬜ |

## 5. Bug yang ditemukan & diperbaiki

| # | Prioritas | Temuan | Perbaikan |
| --- | --- | --- | --- |
| Q1 | P1 | Dua klik "Konfirmasi & Proses Pesanan" dalam tick yang sama membuat **dua pesanan** (tombol baru disabled setelah React re-render). | Guard `useRef` di `components/pos/cart-sheet.tsx`; regresi E2E `e2e/checkout-guard.spec.ts`. Guard yang sama ditambahkan ke simpan-edit di `components/history/order-detail-sheet.tsx`. |
| Q2 | P2 | Saat mencetak dari sheet detail riwayat, tombol "Cetak/Edit/Kirim WA" dan kartu di belakangnya ikut tercetak. Penyebab: `transition-all` menahan properti diskret `visibility` selama transisi, jadi elemen masih `visible` ketika snapshot print diambil. | `@media print` mematikan `transition`/`animation` untuk semua elemen, ditambah `no-print` eksplisit di `SheetHeader`/`SheetBody`/`SheetFooter`. Regresi dicek di `e2e/cashier.spec.ts` (media print: 0 elemen terlihat di luar struk). |
| Q3 | P3 | Footer struk thermal mencetak `nyamnyambox.com` (nama website, bukan identitas toko). | Dihapus dari `components/receipt/receipt.tsx` (permintaan Owner, 2026-10-27). |
| Q4 | P1 | Di lebar 768–1023 px (iPad portrait) keranjang **tidak bisa dibuka sama sekali**: floating bar `md:hidden`, panel keranjang `hidden lg:block`. | Panel keranjang dipindah ke `md:block` dan sidebar menjadi icon rail 80 px; regresi dijaga `e2e/tablet.spec.ts` (820 px). |

## 6. Catatan terbuka (bukan blocker T12)

- Navigasi halaman di production terasa lambat (±2,3 s) karena function Vercel
  berjalan di `iad1` (US East) sementara Supabase di `ap-southeast-1`
  (Singapura), ditambah 2–3 round-trip auth per navigasi dan belum ada
  `loading.tsx`. Ini lingkup **T15**; perbaikannya: `regions: ["sin1"]`,
  `getClaims()` untuk verifikasi JWT lokal, dan loading skeleton per halaman.
- Tombol WhatsApp memakai `wa.me/?text=…` tanpa nomor kalau pelanggan tidak
  mengisi nomor HP; ini disengaja.
- Di 768–1023 px sidebar hanya menampilkan ikon; label muncul lagi di ≥1024 px
  (`title` + `aria-label` tetap ada untuk hover/screen reader). Ini keputusan
  desain Phase 2 — kalau kasir baru kesulitan, tambahkan label kecil di bawah
  ikon tanpa mengubah breakpoint lain.
