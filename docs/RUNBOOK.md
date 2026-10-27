# Runbook Operasional — Nyamnyambox POS

Panduan untuk hal-hal yang terjadi **setelah** aplikasi live: membaca log,
memantau kesehatan aplikasi, mencadangkan dan memulihkan database, serta
mengekspor transaksi untuk pembukuan.

- **Aplikasi:** https://nyamnyambox-pos.vercel.app
- **Supabase project:** `pnclljapcuobhskqrcux` (region `ap-southeast-1`, Singapore)
- **Terakhir diuji:** 2026-10-27 (restore drill + ekspor transaksi)

---

## 1. Observability (log terstruktur)

### 1.1 Format

Semua log aplikasi adalah **satu baris JSON** dengan bentuk:

```json
{
  "level": "error",
  "event": "request.error",
  "time": "2026-10-27T13:20:11.482Z",
  "service": "nyamnyambox-pos",
  "path": "/pos",
  "method": "GET",
  "routePath": "/app/(app)/pos/page",
  "routeType": "render",
  "error": {
    "name": "Error",
    "message": "failed to fetch",
    "stack": "Error: failed to fetch\n    at …"
  }
}
```

Implementasi: `lib/logging.ts` (penulis log), `lib/redact.ts` (redaksi PII),
`instrumentation.ts` (penangkap error server).

### 1.2 Event yang dikirim

| Event | Sumber | Kapan muncul |
| --- | --- | --- |
| `app.start` | `instrumentation.ts` → `register()` | Setiap instance server baru menyala (cold start). Berisi flag konfigurasi, **bukan** nilainya. |
| `request.error` | `instrumentation.ts` → `onRequestError` | Error tak tertangkap di Server Component, Route Handler, Server Action, atau Proxy. |
| `client.error` | `POST /api/log-error` | Error di browser: error boundary React, `window.onerror`, dan unhandled promise rejection. |

Field penting pada `request.error`: `path` (URL, query ikut), `method`,
`routerKind`, `routePath` (file route), `routeType` (`render` / `route` /
`action` / `proxy`). Field pada `client.error`: `kind` (`window.error`,
`unhandledrejection`, `error-boundary`, `global-error`), `url`, `digest`
(React error digest), `userAgent`, dan `ipHash`.

### 1.3 Melihat log

**Vercel dashboard** → project → **Logs** (Runtime Logs). Filter yang berguna:

- `"level":"error"` — semua kegagalan.
- `"event":"client.error"` — error dari browser kasir.
- `"routePath":"/app/(app)/pos/page"` — fokus ke satu halaman.
- `"commit":"8d91451"` — hanya deployment tertentu (field `commit` di `app.start`).

Retensi log mengikuti plan Vercel (Hobby sangat pendek, hitungan jam; Pro lebih
lama). Untuk investigasi lebih dari itu, andalkan backup + log eksternal.

Dari terminal (opsional, butuh Vercel CLI):

```bash
npx vercel logs https://nyamnyambox-pos.vercel.app --follow
```

### 1.4 Redaksi data pribadi

`lib/redact.ts` dijalankan **di server sebelum log ditulis**, dan juga di
browser sebelum laporan dikirim:

| Data | Perlakuan |
| --- | --- |
| Email | `[redacted-email]` |
| Nomor HP Indonesia (`08…`, `+62 8…`, `628…`) | `[redacted-phone]` |
| JWT, `Bearer …`, kunci `sb_secret_*` / `sb_publishable_*` | `[redacted-jwt]` / `[redacted-token]` / `[redacted-supabase-key]` |
| Connection string database | `[redacted-database-url]` |
| Field bernama `password`, `token`, `email`, `phone`, `cookie`, `authorization`, `session`, `username`, dll. | `[redacted]` (nilai tidak pernah ditulis) |
| Alamat IP | Hanya hash 6 byte (`ipHash`), bukan IP mentah |
| Stack trace | Dipotong 2000 karakter; pesan 500 karakter |

Tidak ada kode yang menulis cookie, header `authorization`, atau service-role
key ke log. Kalau menambah log baru, **selalu** lewat `logInfo` / `logWarn` /
`logError` — jangan `console.log` objek mentah.

### 1.5 Endpoint laporan error browser

`POST /api/log-error` menerima payload dari `lib/client-logging.ts`:

- Body maksimum **8 KB** (lebih dari itu → `413`), `message` wajib (`400` kalau kosong).
- Maksimum **30 laporan per IP per 10 menit**; kelebihannya dibuang diam-diam (`204`)
  supaya browser tidak mengulang.
- Browser sendiri membatasi **12 laporan unik per sesi** dan mengabaikan noise
  (`ResizeObserver loop`, `Script error.`).
- Endpoint ini publik (error bisa terjadi di halaman login), tidak menyimpan
  apa pun selain baris log.

### 1.6 Kalau butuh Sentry nanti

Semua pemanggilan sudah terpusat. Untuk pindah/menambah Sentry:

1. `npm i @sentry/nextjs`, buat `sentry.server.config.ts` + `sentry.client.config.ts`.
2. Di `instrumentation.ts`, panggil `Sentry.captureException(error)` **di samping**
   `logError` (jangan menghapus log JSON — itu tetap berguna saat Sentry down).
3. Di `lib/client-logging.ts`, tambahkan `Sentry.captureException` sebelum `send`.
4. Tambahkan `SENTRY_DSN` (server) dan `NEXT_PUBLIC_SENTRY_DSN` (browser) di Vercel.

---

## 2. Health check & uptime

### 2.1 Endpoint

```
GET https://nyamnyambox-pos.vercel.app/api/health
```

```json
{
  "status": "ok",
  "checks": {
    "app":      { "state": "ok", "latencyMs": 0 },
    "database": { "state": "ok", "status": 200, "latencyMs": 41, "detail": "postgrest" },
    "auth":     { "state": "ok", "status": 200, "latencyMs": 58, "detail": "auth" }
  },
  "commit": "8d91451",
  "environment": "production",
  "timestamp": "2026-10-27T13:21:00.000Z",
  "totalLatencyMs": 61
}
```

- **200** = app hidup dan Supabase (PostgREST + Auth) terjangkau.
- **503** = ada dependency yang mati, **atau** production kehilangan env Supabase
  (dianggap misconfiguration, bukan demo).
- `state` bisa `ok`, `down`, atau `not_configured` (hanya di dev/demo).
- `Cache-Control: no-store`; route ini melewati Proxy (tanpa sesi, tanpa CSP)
  supaya tetap cepat dan bisa dipanggil monitor.

Cek manual:

```bash
curl -s https://nyamnyambox-pos.vercel.app/api/health | jq .
curl -s -o /dev/null -w '%{http_code}\n' https://nyamnyambox-pos.vercel.app/api/health
```

### 2.2 Alert otomatis

`.github/workflows/uptime.yml` memanggil endpoint itu **setiap 30 menit**
(plus tombol *Run workflow* manual). Kalau HTTP ≠ 200 atau `status` ≠ `ok`, job
gagal dan GitHub mengirim email ke owner repository.

Batasan yang perlu diketahui:

- GitHub **menonaktifkan** scheduled workflow setelah 60 hari tanpa aktivitas
  repository. Kalau repo sepi, buka Actions → Uptime check → *Enable workflow*.
- Cron GitHub bisa terlambat beberapa menit saat antrean padat.
- URL production bisa diganti lewat repository variable `HEALTH_URL`
  (Settings → Secrets and variables → Actions → Variables).

Untuk pager yang serius, daftarkan monitor eksternal gratis (UptimeRobot /
Better Stack) ke URL yang sama, interval 5 menit, keyword `"status":"ok"`.
Itu juga menutup celah 60 hari tadi.

---

## 3. Backup & restore

### 3.1 Kondisi saat ini

| Hal | Status |
| --- | --- |
| Backup otomatis Supabase (free plan) | **Tidak ada**. PITR juga tidak tersedia. |
| Backup aplikasi | `.github/workflows/backup.yml` — `pg_dump` mingguan (Minggu 18:00 UTC = Senin 01:00 WIB), format custom, schema `public`. |
| Penyimpanan | GitHub Actions artifact, retensi **90 hari**. |
| Isi dump | Tabel aplikasi, RLS policy, grant, RPC, view, seed menu. |
| Tidak termasuk | `auth.users` (dikelola Supabase), objek Storage, role/ownership. |
| RPO (kehilangan data maksimum) | **7 hari** (mingguan). Upgrade ke Supabase Pro untuk backup harian. |

Kalau kehilangan 7 hari data tidak dapat diterima, upgrade project ke Supabase
Pro (backup harian, retensi 7 hari) atau tambah PITR — keduanya berbayar dan
diaktifkan dari dashboard Supabase, bukan dari repo ini.

### 3.2 Setup sekali saja

1. Ambil connection string **session pooler** (port `5432`) dari Supabase
   dashboard → *Project Settings* → *Database* → *Connection string* → *URI*.
   Password database tersimpan lokal di `~/.nyb-supabase-db-password`.
2. GitHub → repo → *Settings* → *Secrets and variables* → *Actions* →
   **New repository secret**: nama `SUPABASE_DB_URL`, isi URI lengkap
   (termasuk password). Jangan pernah commit URI ini.
3. Jalankan `.github/workflows/backup.yml` manual sekali untuk memastikan
   artifact muncul. Tanpa secret, workflow hanya memberi warning dan skip.
4. Unduh artifact-nya, simpan di tempat terenkripsi (1Password / disk
   terenkripsi). Artifact GitHub bukan arsip jangka panjang.

### 3.3 Backup manual dari laptop

```bash
brew install libpq                 # sekali saja (pg_dump 17)
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

export PGPASSWORD="$(cat ~/.nyb-supabase-db-password)"
pg_dump "postgresql://postgres.pnclljapcuobhskqrcux@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres" \
  --schema=public --no-owner --format=custom \
  --file "nyb-public-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

Password lewat `PGPASSWORD`, **bukan** di dalam URL/argumen, supaya tidak
tercatat di history shell atau daftar proses.

### 3.4 Restore drill (sudah diuji, jalankan ulang kapan saja)

```bash
# Langsung dari database production (butuh pg_dump 17 di PATH)
npm run drill:restore -- --from-db "$SUPABASE_DB_URL" --include-products

# Atau dari file dump yang sudah ada (plain SQL maupun custom format)
npm run drill:restore -- --dump nyb-public-20261027.dump
```

Yang dilakukan script (`scripts/restore-drill.mjs`):

1. Menjalankan `pg_dump --schema-only` (opsional: data `products`).
2. Menyalakan Postgres sementara di memori (PGlite) dan membuat permukaan
   Supabase minimal: role `anon` / `authenticated` / `service_role` /
   `supabase_admin`, skema `auth`, tabel `auth.users`, fungsi `auth.uid()`.
3. Menerapkan dump.
4. Menjalankan `supabase/verify.sql` dan mencetak hasilnya.

**Hasil drill 2026-10-27** (dump production, schema + data menu):
`15/16 checks OK · 1 dilewati`. Yang dilewati hanya `active owner exists`,
karena dump sengaja tidak memuat data `profiles` (PII). Semua tabel, enum, RLS
policy, grant, RPC, `search_path`, dan view `staff_directory` pulih dengan benar.

### 3.5 Drill penuh ke project staging

Ini yang membuktikan restore **end-to-end** (termasuk login dan UI):

1. Buat project Supabase baru khusus uji (free plan cukup), beri nama `nyb-restore-test`.
2. Ambil connection string **session pooler** project baru itu.
3. Restore dump ke sana:

   ```bash
   pg_restore --clean --if-exists --no-owner --schema=public \
     -d "postgresql://postgres.<ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres" \
     nyb-public-20261027.dump
   ```

   `--clean` menghapus objek yang sudah ada. **Jangan pernah** menjalankan ini
   ke project production.

4. Buka SQL Editor project staging, jalankan isi `supabase/verify.sql`.
   Semua baris harus `OK`, kecuali `active owner exists` sampai Anda
   mempromosikan satu akun Owner.
5. Uji aplikasi: isi `.env.local` sementara dengan URL + anon key staging,
   `npm run dev`, login sebagai Owner, buat satu order, buka dashboard.
6. Hapus project staging setelah selesai.

Catat hasilnya di tabel drill di bagian 6.

### 3.6 Retensi & rotasi

- Artifact GitHub: 90 hari. Unduh **sebulan sekali**.
- Simpan 3 backup bulanan terakhir + 1 backup akhir tahun.
- Simpan juga ekspor CSV bulanan (bagian 4) bersama backup — kalau schema
  berubah, CSV tetap terbaca.

### 3.7 Kalau data hilang / rusak

| Gejala | Tindakan |
| --- | --- |
| Order hari ini hilang | Cek `/history` sebagai Owner (kasir hanya melihat hari ini). Query `select * from orders where created_at >= now() - interval '1 day'`. |
| Tabel terhapus / data korup | Restore dump terakhir ke **project staging**, verifikasi, lalu salin data yang hilang dengan `INSERT … SELECT`. Jangan restore langsung ke production kecuali terpaksa. |
| Butuh rollback total | Restore dump ke production di luar jam operasional, lalu jalankan `supabase/verify.sql`. |

---

## 4. Ekspor transaksi untuk pembukuan

```bash
# Satu bulan penuh (Asia/Jakarta)
npm run export:orders -- --month 2026-10

# Rentang bebas
npm run export:orders -- --from 2026-10-01 --to 2026-10-31 --out oktober.csv
```

Membaca `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` dari
environment atau `.env.local`. Kolom CSV:

| Kolom | Isi |
| --- | --- |
| `receipt_number` | Nomor nota, mis. `NYB-20261025-0001` |
| `created_at_local` | Waktu Asia/Jakarta, `YYYY-MM-DD HH:mm` |
| `channel` | `Dine-in`, `Takeaway`, `GrabFood`, `ShopeeFood`, `WhatsApp` |
| `payment_method` | `Cash`, `Transfer`, `QRIS`, `E-Wallet` |
| `payment_status` | `Lunas` / `Belum Lunas` |
| `total_amount` | Rupiah, bilangan bulat (tanpa titik/pemisah) |
| `cashier` | Nama kasir |
| `items` | `2x Thai Basil Chicken (Pedas); 1x Es Teh Manis` |
| `is_edited` | `YA` / `TIDAK` |

File memakai BOM UTF-8 + CRLF supaya rapi di Excel. Nomor HP pelanggan
**tidak** diekspor. Ringkasan (jumlah transaksi, total omzet, hitungan per
metode bayar) dicetak ke terminal, bukan ke dalam CSV.

Rutinitas tutup buku bulanan:

1. `npm run export:orders -- --month <YYYY-MM>`
2. Cocokkan total CSV dengan uang tunai + mutasi QRIS/transfer.
3. Arsipkan CSV bersama backup bulan itu.
4. Simpan file di folder pembukuan; jangan commit ke repo (sudah di-`.gitignore`).

---

## 5. Insiden

### 5.1 Situs tidak bisa dibuka / 503

1. `curl -s https://nyamnyambox-pos.vercel.app/api/health` — lihat `checks`.
2. Kalau `database`/`auth` = `down`: cek https://status.supabase.com.
3. Kalau `app` = `down` tapi health tidak merespons sama sekali: Vercel →
   *Deployments*, lihat build/runtime error, atau rollback ke deployment hijau
   sebelumnya.
4. Kalau `environment`/`commit` tidak sesuai: env var Vercel berubah — cek
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`.

### 5.2 Semua kasir gagal login

1. Cek `request.error` / `client.error` di log Vercel.
2. Pastikan bukan throttle: pesan “Terlalu banyak percobaan masuk” hilang
   sendiri setelah 15 menit, atau login sukses dari akun lain mereset counter
   untuk identifier tersebut.
3. Login username butuh `SUPABASE_SERVICE_ROLE_KEY`; kalau env itu hilang,
   kasir tidak bisa masuk (Owner via email masih bisa).
4. Cek Supabase → *Authentication* → *Users*: akun masih aktif?

### 5.3 Nota / nomor transaksi aneh

Nomor nota dibuat RPC `next_receipt_number` per hari bisnis Jakarta
(`NYB-YYYYMMDD-NNNN`). Kalau lompat atau duplikat, cek tabel
`receipt_counters` dan zona waktu server; jangan mengedit manual tanpa backup.

### 5.4 Akses & kontak

| Hal | Di mana |
| --- | --- |
| Supabase project | `pnclljapcuobhskqrcux`, region `ap-southeast-1` |
| Vercel project | `nyamnyambox-pos` |
| Password database | `~/.nyb-supabase-db-password` (lokal, jangan commit) |
| Password Owner | `~/.nyb-owner-password` (lokal) |
| Kunci Supabase | `~/.nyb-supabase-keys.json` (lokal) |
| Secret backup | GitHub Actions secret `SUPABASE_DB_URL` |

### 5.5 Rollback rilis

Dua lapis, pakai sesuai jenis masalah:

**A. Kode salah / build rusak (paling sering) — ±1 menit, tanpa rebuild**

1. Buka Vercel → project `nyamnyambox-pos` → tab *Deployments*.
2. Cari deployment hijau terakhir (badge *Ready*, commit yang dikenal).
3. Menu `⋯` → **Promote to Production**.
4. Verifikasi: `curl -s https://nyamnyambox-pos.vercel.app/api/health`
   → `commit` harus sama dengan commit deployment yang dipromosikan.
5. Catat insidennya di laporan; perbaiki di branch lalu PR seperti biasa.

**B. Data rusak / migrasi salah — di luar jam operasional**

1. Hentikan pemakaian: minta kasir berhenti membuat order.
2. Ambil dump terbaru dari artifact `backup.yml` (atau jalankan perintah di
   §3.3) dan simpan salinan sebelum menyentuh apa pun.
3. Ikuti `docs/RUNBOOK.md` §3.7 untuk restore ke production.
4. Jalankan `supabase/verify.sql` — semua baris harus OK.
5. Cek `orders`/`order_items` terakhir, lalu `curl /api/health`.
6. Baru izinkan kasir kembali; catat di §6.

**Yang tidak boleh**: force-push `main`, menghapus deployment lama sebelum yakin
deployment baru sehat, atau restore DB tanpa dump pengaman.

### 5.6 Data tidak muncul / halaman kosong

Urutkan dari yang paling sering:

1. **Menu kosong di `/pos`** — cek `/products`: apakah semua menu berstatus
   *Nonaktif*? Aktifkan lewat switch. Menu nonaktif memang tidak muncul di POS.
2. **Riwayat kosong padahal kasir baru membuat order** — pastikan filter tanggal
   di halaman Riwayat menunjuk hari yang benar (zona bisnis **Asia/Jakarta**;
   order lewat tengah malam WIB masuk ke tanggal berikutnya).
3. **Dashboard kosong** — dashboard hanya menghitung hari ini (WIB). Kalau
   transaksi terjadi kemarin, angka hari ini wajar nol. Cek grafik/top produk
   untuk rentang bulan.
4. **Kasir melihat data beda dengan Owner** — kasir hanya melihat **hari ini**;
   Owner bisa memilih tanggal mana pun lewat filter.
5. **Semua halaman kosong / 500** — cek `/api/health`. Kalau `database` atau
   `auth` = `down`, ikuti §5.1. Kalau `app` = `down`, rollback (§5.5).
6. **Baru restore database** — jalankan `supabase/verify.sql`; kalau ada baris
   bukan `OK`, restore belum lengkap.
7. **Masih ragu** — cek log Vercel untuk `request.error` pada waktu kejadian,
   lalu cocokkan dengan nomor nota.

### 5.7 Rotasi kunci

Lakukan kalau ada kecurigaan kebocoran (key ter-paste di chat, laptop hilang,
commit tidak sengaja) atau sebagai rutinitas tahunan.

**A. Service role / secret key (paling sering)**

1. Supabase → **Project Settings → API Keys** → buat secret key baru.
2. Perbarui `SUPABASE_SERVICE_ROLE_KEY` di `.env.local` **dan** di Vercel
   (Production, Preview, Development).
3. Redeploy production.
4. Verifikasi: login kasir (username) berhasil, tambah kasir berhasil,
   `/api/health` `ok`.
5. Hapus key lama di Supabase.

**B. Password database (untuk `pg_dump` / restore)**

1. Supabase → **Project Settings → Database** → **Reset database password**.
2. Simpan password baru ke `~/.nyb-supabase-db-password` (izin `600`).
3. Perbarui GitHub Actions secret `SUPABASE_DB_URL` dengan password baru.
4. Jalankan workflow **Database backup** secara manual (*Run workflow*) untuk
   memastikan dump masih bisa dibuat.

**C. Password Owner**

1. Supabase → **Authentication → Users** → cari email Owner → **Reset
   password**.
2. Simpan password baru di password manager dan `~/.nyb-owner-password`
   (lokal, izin `600`).
3. Login ulang di production untuk memastikan berhasil.

**D. Anon / publishable key**

Aman dipublikasikan (memang dipakai browser), tetapi tetap bisa dirotasi:
ganti `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.local` + Vercel, redeploy,
lalu hapus key lama. Rotasi ini memutus sesi yang sedang berjalan.

Setelah rotasi apa pun: catat tanggal + alasan di laporan insiden, dan pastikan
tidak ada key baru yang masuk ke git (`git log -p | grep -i 'service_role'`
harus kosong).

---

## 6. Log drill restore

| Tanggal | Sumber dump | Target | Hasil | Oleh |
| --- | --- | --- | --- | --- |
| 2026-10-27 | Production `pnclljapcuobhskqrcux` (schema + `products`) | PGlite (in-memory) | 15/16 OK, 1 skip (`active owner exists`, tanpa data profil) | Agent + `scripts/restore-drill.mjs` |
| — | — | Project staging | Belum dijalankan | — |
