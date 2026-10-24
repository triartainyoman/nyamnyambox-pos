# Product Requirements Document (PRD)

## Project Overview

- **Project Name:** Nyamnyambox POS
- **Version:** 1.0.0 (MVP)
- **Target Client:** Nyamnyambox (UMKM F&B - Ricebowl & Snacks)
- **Core Focus:** Mobile-first, fast-checkout, responsive web application for retail and multi-channel order management.

---

## 1. Problem Statement & Objectives

- **Problem Statement:** Operasional pencatatan pesanan Nyamnyambox dari berbagai kanal (Dine-in, GrabFood, ShopeeFood, WhatsApp) masih dilakukan manual menggunakan nota kertas dan penghitungan manual. Hal ini rentan terhadap kesalahan input, memperlambat proses pelayanan, dan menyulitkan pelacakan omzet serta analitik penjualan harian maupun bulanan.
- **Objectives:**
  - Menyediakan aplikasi web POS yang dioptimalkan untuk perangkat seluler (_mobile-first_).
  - Mendigitalisasi pencatatan pesanan dari saluran penjualan langsung maupun ojek online/WhatsApp.
  - Memungkinkan konfirmasi status pembayaran manual secara fleksibel.
  - Menyediakan fitur cetak nota ke PDF dan kirim rincian nota langsung via pesan WhatsApp.
  - Memberikan ringkasan analitik dan grafik performa penjualan bulanan bagi Owner.
  - Menggunakan fondasi _tech stack_ gratis berstandar industri yang siap diskalakan (_scalable_).

---

## 2. Tech Stack Architecture

- **Framework:** Next.js (App Router, TypeScript)
- **Styling:** Tailwind CSS
- **UI Component Kit:** Shadcn UI (Radix Primitives) + Lucide React Icons
- **State Management:** Zustand (Client-side Cart & POS State)
- **Data Fetching:** TanStack Query (React Query)
- **Backend & Database:** Supabase (PostgreSQL with Row Level Security)
- **Authentication:** Supabase Auth (Email & Password)
- **Deployment Platform:** Vercel (Hobby / Free Tier)

---

## 3. User Roles & Access Control (RBAC)

### 3.1. Master Admin (Developer)

- Akses penuh ke seluruh konfigurasi sistem, database, dan pemeliharaan tenant multi-outlet di masa depan.

### 3.2. Owner (Admin Toko)

- Mengakses **Dashboard Analitik** (omzet harian, grafik bulanan, breakdown kanal).
- Mengelola katalog menu dan promo bundling (`/products`).
- Mengelola akun kasir/karyawan (`/employees`): menambah, memperbarui data, atau menonaktifkan akun kasir.
- Memantau dan mengakses seluruh histori transaksi.

### 3.3. Employee (Kasir)

- Login praktis dan cepat menggunakan **Username & Password**.
- Akses operasional layar POS (`/pos`) untuk mencatat pesanan harian.
- Mengakses histori transaksi hari ini (`/history`).
- Mengedit transaksi pesanan jika kasir melakukan kesalahan input.
- Mencetak nota via browser PDF atau mengirim rincian transaksi via WhatsApp.

---

## 4. Key Functional Requirements

### 4.1. Point of Sales Screen (`/pos` - Mobile First)

- **Tampilan Katalog Flat:** Karena jumlah menu berkisar 6–8 item, seluruh produk ditampilkan dalam satu layar grid 2 kolom tanpa tab kategori terpisah.
- **Card Produk Minimalis:** Berisi gambar/thumbnail produk rasio 1:1, nama menu ringkas, dan label harga.
- **Modifier / Notes:** Opsi catatan per item pesanan (contoh: Level Pedas: Sedang / Pedas / Ekstra Pedas).
- **Floating Cart Bar:** Bar mengambang di bawah layar menampilkan total item dan nominal. Mengetuk bar akan membuka _Bottom Sheet (Drawer)_ transaksi.
- **Bottom Sheet Checkout:**
  - Daftar ringkasan pesanan dengan tombol penyesuaian kuantitas (+, -, hapus item).
  - Pilihan **Kanal Pesanan (Order Channel):** `Dine-In`, `Takeaway`, `GrabFood`, `ShopeeFood`, `WhatsApp`.
  - Pilihan **Metode Pembayaran:** `Cash`, `Transfer`, `QRIS`, `E-Wallet`.
  - Toggle / Selector **Status Pembayaran:** `Lunas` / `Belum Lunas` (konfirmasi manual oleh kasir).
  - Kolom opsional: Nomor WhatsApp pelanggan.
  - Tombol aksi "Konfirmasi & Proses Pesanan".

### 4.2. Receipt & Integrasi WhatsApp

- **Export Nota PDF:** Menggunakan fungsi print browser (`window.print()`) dengan CSS print layout berukuran struk 58mm/80mm, dapat disimpan langsung menjadi PDF.
- **Template Struk WhatsApp:** Tombol aksi yang secara otomatis membuka format chat WhatsApp:

  ```text
  Halo Kak, terima kasih sudah memesan di *Nyamnyambox*! 🙏
  Berikut rincian pesanan Kakak:

  No. Nota: #{receipt_number}
  Tanggal: {created_at}
  Kasir: {cashier_name}

  Detail Pesanan:
  {daftar_item}
  --------------------------------
  Total: Rp {total_amount}
  Metode: {payment_method} ({payment_status})

  Pesanan sedang diproses. Selamat menikmati! 🍱
  ```

### 4.3. Koreksi Transaksi (Edit Order)

- Kasir dapat membuka detail pesanan di halaman `/history`.
- Tombol **"Edit Transaksi"** memungkinkan perubahan item, catatan, kuantitas, atau metode pembayaran jika terdapat kekeliruan saat input.
- Transaksi yang direvisi akan memiliki penanda `is_edited = true`.

### 4.4. Dashboard Analitik (`/dashboard` - Owner View)

- Kartu metrik: Total Omzet Hari Ini, Total Transaksi, Rata-rata Nilai Pesanan (AOV).
- **Grafik Penjualan Bulanan:** Bar chart atau Line chart yang memvisualisasikan tren pendapatan per bulan.
- **Breakdown Kanal Penjualan:** Perbandingan kontribusi penjualan dari Dine-In, Ojek Online, dan WhatsApp.
- **Top Products:** Daftar peringkat produk terlaris berdasarkan kuantitas penjualan.

### 4.5. Manajemen Produk & Menu Promo Bundling

- Pengelolaan menu: Tambah menu, edit harga, ubah gambar, dan toggle status ketersediaan (`is_active`).
- **Implementasi Promo Bundling:** Menu promo (misalnya: _Promo Oktober: Thai Basil Free Es Teh_) didaftarkan sebagai item menu tersendiri (misal: `[PROMO] Thai Basil + Free Es Teh` seharga Rp 20.000) dan dapat diaktifkan/dinonaktifkan oleh Owner tanpa rules engine rumit.

---

## 5. Database Schema (Supabase / PostgreSQL)

```sql
-- 1. ENUM TYPES
CREATE TYPE user_role AS ENUM ('MASTER_ADMIN', 'OWNER', 'EMPLOYEE');
CREATE TYPE order_channel AS ENUM ('DINE_IN', 'TAKEAWAY', 'GRABFOOD', 'SHOPEEFOOD', 'WHATSAPP');
CREATE TYPE payment_method AS ENUM ('CASH', 'TRANSFER', 'QRIS', 'E_WALLET');
CREATE TYPE payment_status AS ENUM ('LUNAS', 'BELUM_LUNAS');

-- 2. PROFILES TABLE (Terkoneksi ke auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'EMPLOYEE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCTS TABLE
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price INT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDERS TABLE
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  cashier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  channel order_channel NOT NULL,
  payment_method payment_method NOT NULL,
  payment_status payment_status DEFAULT 'LUNAS',
  total_amount INT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  price_at_transaction INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. DUMMY / INITIAL SEED DATA (Menu Nyamnyambox)
INSERT INTO products (name, price, image_url, is_active) VALUES
('Thai Basil Chicken', 20000, '/images/thai-basil.jpg', true),
('Chicken Salted Egg', 20000, '/images/salted-egg.jpg', true),
('Chicken BBQ Cheese', 23000, '/images/bbq-cheese.jpg', true),
('Mac & Cheese Ball', 15000, '/images/mac-cheese.jpg', true),
('Kentang & Sosis', 15000, '/images/kentang-sosis.jpg', true),
('Chicken Popcorn', 15000, '/images/popcorn.jpg', true),
('Es Teh Manis', 4000, '/images/es-teh.jpg', true),
('[PROMO] Thai Basil + Free Es Teh', 20000, '/images/promo-thai-basil.jpg', true);
```

---

## 6. Project Directory Structure

```text
nyamnyambox-pos/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx               # Login screen
│   ├── (pos)/
│   │   ├── pos/
│   │   │   └── page.tsx               # Mobile POS Cashier screen
│   │   └── history/
│   │       └── page.tsx               # Transaksi harian, edit order, export PDF, kirim WA
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx               # Owner Analytics Dashboard
│   │   ├── products/
│   │   │   └── page.tsx               # CRUD Menu Produk & Promo Bundling
│   │   └── employees/
│   │       └── page.tsx               # Manajemen Akun Kasir (Owner only)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                            # Shadcn UI primitives (Button, Dialog, Sheet, etc.)
│   ├── pos/
│   │   ├── ProductCard.tsx            # Card produk minimalis
│   │   ├── CartSheet.tsx              # Bottom sheet keranjang & checkout form
│   │   └── ReceiptModal.tsx           # Modal struk (Print PDF & WhatsApp trigger)
│   └── dashboard/
│       └── MonthlySalesChart.tsx      # Grafik tren penjualan bulanan (Recharts)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # Supabase client helper
│   │   └── server.ts                  # Supabase server client helper
│   ├── utils.ts                       # Format Rupiah & string helpers
│   └── whatsapp.ts                    # Generator URL & template teks struk WhatsApp
└── stores/
    └── useCartStore.ts                # Zustand store keranjang pesanan
```

---

## 7. Future Scalability Roadmap (Post-MVP)

- **Multi-Outlet Expansion:** Menambahkan tabel `outlets` dan atribut relasi `outlet_id` pada tabel `orders` dan `profiles`.
- **Kategori Menu:** Mengaktifkan tabel `categories` jika variasi item berkembang di atas 20 SKU.
- **Inventori & COGS:** Menghubungkan pesanan ke tabel resep dan stok bahan baku untuk otomatisasi pemotongan stok.
- **Integrasi Hardware:** Koneksi langsung ke thermal printer via Web Bluetooth / USB API.
