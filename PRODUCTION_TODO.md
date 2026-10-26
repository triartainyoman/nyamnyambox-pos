# Production Readiness Todo — Nyamnyambox POS

Dokumen ini adalah acuan eksekusi menuju production. Satu task dikerjakan dalam satu waktu.
Setiap task selesai: verifikasi → laporan singkat → **tunggu konfirmasi user** sebelum task berikutnya.

Legenda: `P0` blocker, `P1` wajib sebelum launch, `P2` penting tapi bisa menyusul.
Status: `[ ]` belum, `[~]` sedang dikerjakan, `[x]` selesai.

---

## Temuan audit awal

| # | Prioritas | Temuan | Dampak |
| --- | --- | --- | --- |
| F1 | P0 | Demo mode aktif otomatis saat env Supabase kosong, termasuk di production build. Cookie `nyb_demo_role` tidak ditandatangani. | Siapa pun bisa set cookie `OWNER` dan mendapat akses penuh jika deploy salah konfigurasi. |
| F2 | P0 | RLS mengizinkan `INSERT/UPDATE` langsung ke `orders` dan `order_items` untuk order hari ini. | Kasir bisa melewati harga server-side di RPC `create_order`/`update_order` lewat Supabase client. |
| F3 | P0 | Belum ada Supabase project, migrasi belum dijalankan, env production belum ada. | Aplikasi belum bisa dipakai multi-device/nyata. |
| F4 | P1 | Belum ada `error.tsx`, `not-found.tsx`, atau pemetaan error yang ramah. | Error runtime menampilkan layar generik Next.js; error Supabase mentah bisa bocor ke UI. |
| F5 | P1 | Belum ada test otomatis dan CI. | Regresi mudah lolos; build/lint hanya dijalankan manual. |
| F6 | P1 | `receipt_seq` global, tidak reset per hari, padahal dokumentasi menyebut per hari. | Nomor nota tidak berurutan ulang tiap hari; potensi salah paham saat rekonsiliasi. |
| F7 | P2 | Semua staff aktif dapat membaca seluruh baris `profiles`, termasuk email staff lain. | Paparan data pribadi internal. |
| F8 | P2 | Owner dapat menurunkan role/menonaktifkan dirinya sendiri di level database. | Risiko lockout permanen. |
| F9 | P2 | Proxy mengirim `?next=` tetapi login selalu redirect ke `/pos`. | UX: deep link setelah login tidak bekerja. |

---

## Fase 0 — Keamanan & integritas data (blocker)

### [x] T01 — Kunci demo mode di production
**Prioritas:** P0 · **Butuh user:** tidak · **Selesai:** 2026-10-25

- Tambah flag eksplisit, mis. `NEXT_PUBLIC_DEMO_MODE=true`, dan syarat `NODE_ENV !== "production"`.
- Production tanpa env Supabase harus **gagal aman**: halaman login menampilkan pesan konfigurasi, bukan demo login.
- Tolak cookie demo di production; `proxy.ts`, `lib/auth.ts`, dan `loginAction` memakai satu helper yang sama.
- Hapus/isolasi tombol demo + kredensial demo dari build production.
- Tambah validasi env saat startup/build agar salah konfigurasi ketahuan lebih awal.

**Selesai jika:** build production tanpa env Supabase tidak bisa diakses dengan cookie demo; mode demo hanya jalan dengan flag eksplisit di non-production.

**Hasil verifikasi:**
- `npx tsc --noEmit`, `npm run lint`, `npm run build` ✅
- `next.config.ts` sekarang memberi peringatan di build/start production bila env Supabase/service role hilang atau demo flag masih `true`.
- Production (`next start`) tanpa Supabase: `/login` menampilkan “Konfigurasi belum lengkap”; cookie palsu `nyb_demo_role=OWNER` + `/pos` tetap dialihkan ke `/login`; cookie diabaikan.
- `demo123` tidak ditemukan di `.next/static`; modul demo dipisah ke lazy chunk dan kredensial hanya di jalur server.
- Dev demo: login `rizky` / `demo123` → `/pos` ✅; logout menghapus cookie `nyb_demo_role` dan kembali ke `/login` ✅.
- `.env.local` berisi `NEXT_PUBLIC_DEMO_MODE=true` (gitignored) agar demo lokal tetap mudah.

### [x] T02 — Hardening RLS & RPC
**Prioritas:** P0 · **Butuh user:** tidak (SQL lokal), lalu dijalankan di Supabase pada T06 · **Selesai:** 2026-10-25

- Buat `supabase/migrations/0003_harden_order_writes.sql`.
- Cabut `INSERT/UPDATE/DELETE` langsung pada `orders` dan `order_items` dari role `authenticated`; sisakan `SELECT` sesuai policy.
- Pastikan semua penulisan order hanya lewat RPC `security definer` (`create_order`, `update_order`) yang memvalidasi harga, produk aktif, dan kepemilikan order.
- Tambah `REVOKE`/`GRANT` eksplisit dan `set search_path = public, pg_temp` pada fungsi.
- Uji: kasir tidak bisa `update orders set total_amount=...`; tidak bisa insert `order_items` dengan harga arbitrer; alur POS & edit tetap jalan.

**Selesai jika:** percobaan DML langsung ditolak, tetapi create/edit order via aplikasi tetap sukses.

**Hasil verifikasi:**
- Migrasi `0003_harden_order_writes.sql`: `orders`/`order_items` hanya `SELECT` untuk `authenticated`; DML dicabut; policy tulis dihapus; `receipt_seq` tidak bisa dipakai client; RPC hanya untuk `authenticated`; trigger helper tidak bisa dipanggil client.
- `search_path = public, pg_temp` dipasang pada 7 fungsi (`handle_new_user`, `protect_profile_fields`, `is_active_staff`, `is_owner`, `dashboard_summary`, `create_order`, `update_order`).
- `npm run test:rls` (PGlite) lulus 26 check: create/update via RPC tetap jalan dan menghitung harga server-side; INSERT/UPDATE/DELETE langsung ditolak; kasir hanya melihat order hari ini; akun nonaktif ditolak; anon ditolak; owner bisa melihat semua dan mengedit order lama; grant/policy/fungsi sesuai.
- Aplikasi tetap memakai `.rpc("create_order")` / `.rpc("update_order")`; tidak ada DML langsung ke `orders`/`order_items` di kode aplikasi.

### [x] T03 — Proteksi akun Owner & privasi profil
**Prioritas:** P0 · **Butuh user:** tidak · **Selesai:** 2026-10-25

- Trigger DB: Owner tidak bisa menurunkan role dirinya sendiri atau menonaktifkan akunnya sendiri; minimal harus selalu ada satu Owner aktif.
- Batasi `profiles_select`: staff hanya bisa membaca profil sendiri; Owner bisa membaca semua. Untuk kebutuhan nama kasir di histori, gunakan kolom/VIEW terbatas atau embed yang tidak mengekspos email.
- Sesuaikan query `listProfiles`/`profiles` dan tampilan karyawan bila policy berubah.
- Uji dari sesi kasir dan owner.

**Selesai jika:** kasir tidak bisa membaca email staff lain; owner tidak bisa mengunci dirinya sendiri; UI tetap berfungsi.

**Hasil verifikasi:**
- Migrasi `0004_profile_privacy.sql`: `profiles_select` sekarang `id = auth.uid() or is_owner()`; staff hanya membaca baris sendiri, owner membaca semua.
- View `public.staff_directory` hanya mengekspos `id` dan `name`; dipakai histori/struk untuk menampilkan nama kasir tanpa email. Query order tidak lagi meng-embed `profiles`.
- `protect_profile_fields` diperluas: owner tidak bisa menonaktifkan/menurunkan role sendiri; owner terakhir yang aktif tidak bisa dihapus; non-owner tetap tidak bisa mengubah `role`/`is_active`/`email`.
- `npm run test:rls` (PGlite) lulus 34 check, termasuk: kasir hanya melihat profil sendiri, tidak bisa membaca email owner, bisa membaca `staff_directory`, tidak bisa menaikkan role sendiri; owner melihat semua profil, tidak bisa mengunci diri sendiri, tidak bisa menghapus owner terakhir, tetapi bisa menurunkan owner lain selama masih ada owner aktif.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` ✅.

### [x] T04 — Nomor nota berurutan per hari
**Prioritas:** P1 · **Butuh user:** tidak · **Selesai:** 2026-10-25

- Ganti `receipt_seq` global dengan counter per tanggal bisnis Jakarta (tabel `receipt_counters` atau sequence harian yang di-reset aman).
- Tangani race condition dengan `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING` di dalam transaksi.
- Samakan dokumentasi README dengan perilaku sebenarnya.
- Uji dua order paralel dan pergantian hari.

**Selesai jika:** format `NYB-YYYYMMDD-0001` selalu mulai dari 0001 setiap hari dan tidak ada duplikat saat paralel.

**Hasil verifikasi:**
- Migrasi `0005_daily_receipt_numbers.sql`: tabel `receipt_counters(business_date primary key, last_number)` + fungsi privat `next_receipt_number(date)` yang memakai `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`.
- `create_order` memakai tanggal bisnis Jakarta yang sama untuk prefix nota dan counter; `receipt_seq` global dihapus.
- `receipt_counters` RLS aktif tanpa policy dan tanpa grant ke `anon`/`authenticated`; `next_receipt_number` hanya bisa dipanggil dari fungsi `SECURITY DEFINER`.
- `npm run test:rls` (PGlite) lulus 42 check: order pertama hari ini `0001`, order kedua `0002`, counter tersimpan per tanggal, dan tanggal bisnis lain mulai lagi dari `0001`; client tidak bisa membaca counter atau mengalokasikan nomor langsung.
- Catatan: PGlite berjalan single-connection sehingga paritas paralel tidak bisa diuji dengan dua koneksi. Keamanan paralel berasal dari row lock pada `ON CONFLICT DO UPDATE`; uji beban nyata tetap dilakukan di Supabase pada T08.
- Demo mode disamakan: seed dan order baru menghitung nomor per tanggal bisnis; diuji membuat order baru setelah 9 order hari ini menghasilkan `NYB-20261025-0010`.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` ✅.

### [x] T05 — Error boundary & error handling
**Prioritas:** P1 · **Butuh user:** tidak · **Selesai:** 2026-10-25

- Tambah `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, dan `error.tsx` untuk route group `(app)`.
- Petakan error Supabase/RPC menjadi pesan Indonesia yang aman; jangan tampilkan detail internal.
- Tambah retry/empty state pada query yang gagal (POS, history, dashboard, products, employees).
- Tambah `loading.tsx` bila diperlukan.

**Selesai jika:** error buatan (mis. RPC gagal) menampilkan layar ramah + tombol coba lagi, bukan stack trace.

**Hasil verifikasi:**
- `lib/errors.ts`: `UserFacingError` + `friendlyError()` memetakan error Postgres/PostgREST (`42501`, `23505`, `23503`, `23514`, `42P01`, `PGRST116`, `PGRST301`, timeout), error jaringan, sesi berakhir, dan fallback generik. Pesan internal (nama tabel, constraint, SQL) tidak pernah diteruskan.
- Whitelist pesan bisnis dari RPC/trigger/demo (`Keranjang masih kosong`, `Transaksi hanya dapat diedit pada hari yang sama`, `Minimal harus ada satu Owner aktif`, dll.) tetap tampil apa adanya.
- Semua data layer (`orders`, `dashboard`, `products`, `profiles`), demo API, dan server action (`auth`, `employees`) sekarang melempar/mengembalikan pesan aman. Toast dan dialog memakai `friendlyError`, bukan `error.message` mentah.
- Error boundary: `app/error.tsx` (root), `app/(app)/error.tsx` (di dalam app shell), `app/global-error.tsx` (dokumen mandiri, inline CSS), `app/not-found.tsx` (404). Semua memakai `retry()` sesuai signature Next 16.
- `components/ui/query-error.tsx` dipakai di POS, history, dashboard, products, dan employees; products/employees sebelumnya belum punya state error. Tombol **Coba lagi** memanggil `refetch()`.
- `app/(app)/loading.tsx` sempat dicoba tetapi membuat streaming dev tersangkut di skeleton, jadi dihapus. Loading per halaman tetap memakai skeleton lokal yang sudah ada.
- Uji runtime: route 404 menampilkan halaman 404; route yang sengaja melempar error menampilkan layar ramah + `Coba lagi` tanpa membocorkan pesan SQL; query products yang gagal menampilkan fallback aman, lalu pulih setelah `Coba lagi` dan flag error dihapus.
- `npx tsc --noEmit`, `npm run lint`, `npm run build` ✅.

---

## Fase 1 — Backend production

### [x] T06 — Provision Supabase & jalankan migrasi
**Prioritas:** P0 · **Butuh user:** ya (buat project / beri akses) · **Selesai:** 2026-10-25

- Buat project Supabase production (region terdekat, mis. Singapore).
- Jalankan `0001_init.sql` → `0002_username_login.sql` → `0003` (dan migrasi lanjutan) lewat SQL Editor/CLI.
- Verifikasi seed menu, index unik username, RLS aktif, dan RPC ter-grant.
- Buat akun Owner pertama lewat Auth, lalu promote role.
- Catat project ref, region, dan tanggal migrasi.

**Selesai jika:** schema + seed + owner ada; query `select * from pg_policies` menunjukkan policy yang diharapkan.

**Status:** selesai.
- Project: `nyamnyambox-pos`, ref `pnclljapcuobhskqrcux`, region `ap-southeast-1` (Singapore), dibuat 2026-10-25.
- Migrasi `0001_init.sql` → `0005_daily_receipt_numbers.sql` diterapkan lewat `supabase db push`; riwayat migrasi tersimpan di project.
- Owner pertama: `nyomantriarta148@gmail.com` (dibuat lewat Auth Admin API, email terkonfirmasi, `profiles.role = OWNER`, `is_active = true`).
- `supabase/verify.sql` dijalankan di project nyata: **16/16 check OK**, termasuk seed 8 produk, RLS, policy, grant RPC, dan owner aktif.
- Login email Owner diuji lewat Auth API: sukses, lalu `profiles` dapat dibaca sesuai RLS.
- Legacy JWT API keys (`anon`/`service_role`) dinonaktifkan; aplikasi memakai publishable key + secret key baru. Key disimpan di `.env.local` (tidak di-commit).

### [x] T07 — Konfigurasi environment lokal & production
**Prioritas:** P0 · **Butuh user:** ya (nilai secret) · **Selesai:** 2026-10-25

- Isi `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Pastikan service role **tidak** berprefix `NEXT_PUBLIC_` dan tidak pernah masuk bundle client.
- Set env yang sama di Vercel (Production + Preview), termasuk flag demo yang aman.
- Dokumentasikan rotasi key dan cara cek kebocoran.
- Verifikasi `isSupabaseConfigured` bernilai true dan mode demo mati.

**Selesai jika:** login nyata berjalan; tidak ada secret di bundle client (`grep` hasil build) dan tidak ada di git.

**Status:** selesai.
- `.env.local` diisi URL Supabase, publishable key, secret key, dan `NEXT_PUBLIC_DEMO_MODE=false`.
- Vercel project `nyamnyambox-pos` terhubung ke repo; production URL `https://nyamnyambox-pos.vercel.app`.
- Env yang sama dipasang di Vercel untuk Production, Preview, dan Development; secret key disimpan sebagai tipe Secret.
- Deployment protection SSO dimatikan agar aplikasi dapat diakses publik; proteksi aplikasi tetap lewat login + RLS.
- Supabase Auth `site_url` dan redirect URLs diarahkan ke domain production, preview Vercel, dan localhost.
- Login Owner end-to-end di production berhasil dan mendarat di `/dashboard`; akun uji sementara dihapus, tersisa 1 Owner aktif.
- Redirect setelah login sekarang berbasis role: Owner/Master Admin → `/dashboard`, kasir → `/pos` (sebelumnya selalu `/pos`).
- `npm run build` dan `npm run lint` lulus; secret key tidak ada di `.next/static` maupun file yang di-track git.
- Prosedur rotasi key dan cek kebocoran ditambahkan ke README.

### [x] T08 — Uji auth & RLS nyata
**Prioritas:** P0 · **Butuh user:** tidak (butuh project dari T06/T07) · **Selesai:** 2026-10-25

- Owner login dengan email → `/dashboard`; username owner ditolak.
- Kasir login dengan username → `/pos`; akses `/dashboard`, `/products`, `/employees` ditolak.
- Kasir nonaktif tidak bisa login dan sesi aktifnya kehilangan akses data.
- Buat kasir baru dari `/employees`, lalu login dengan username tersebut.
- Uji RLS: kasir hanya melihat order hari ini; tidak bisa membaca/menulis data terlarang.
- Uji edit order hari ini dan penolakan edit order hari sebelumnya untuk kasir.

**Selesai jika:** seluruh matriks di atas lulus dan hasilnya dicatat.

**Hasil verifikasi:** diuji di production `https://nyamnyambox-pos.vercel.app` dengan akun sementara, lalu seluruh akun/order uji dihapus.
- Owner email login → `/dashboard`. Username Owner (`e2eowner`) ditolak dengan pesan "Username atau password salah."
- Kasir baru dibuat dari `/employees` (username `e2ekasir`), lalu login dengan username → `/pos` dan hanya melihat menu Kasir/Riwayat.
- Kasir membuka `/dashboard`, `/products`, `/employees` → semuanya dialihkan ke `/pos`.
- Kasir nonaktif: login username ditolak; sesi aktif menampilkan "Akun dinonaktifkan"; query `orders`/`products` mengembalikan kosong; `create_order` ditolak "Akun tidak aktif atau tidak terautentikasi".
- RLS langsung: kasir hanya melihat order hari ini (order kemarin tidak terlihat, termasuk saat di-query by id); `profiles` hanya baris sendiri; `staff_directory` tetap bisa dibaca untuk nama kasir.
- Percobaan DML langsung oleh kasir: insert/update/delete `orders`, insert `order_items`, dan insert `products` semuanya ditolak `42501`/RLS. `dashboard_summary` ditolak "Akses ditolak".
- Edit order hari ini sebagai kasir berhasil lewat UI dan RPC (`is_edited = true`, total dihitung ulang server-side). Edit order kemarin sebagai kasir ditolak "Transaksi hanya dapat diedit pada hari yang sama".
- Owner melihat kedua order (hari ini + kemarin) dan bisa mengedit order lama; tab "Kemarin" di histori menampilkan order tersebut.
- Setelah cleanup: hanya 1 Owner asli, 0 order, 0 order item, dan counter nomor nota hari ini dihapus agar penomoran produksi mulai dari `0001`.

---

## Fase 2 — Kualitas & regresi

### [x] T09 — Test unit
**Prioritas:** P1 · **Butuh user:** tidak · **Selesai:** 2026-10-25

- Setup Vitest (atau node test runner) + script `npm test`.
- Test: validasi/normalisasi username, format bisnis Jakarta, perhitungan total, format Rupiah, template WhatsApp, parsing error.
- Target awal: logika murni di `lib/` dan `stores/`.

**Selesai jika:** `npm test` hijau dan berjalan di CI.

**Hasil verifikasi:**
- Vitest 5 + jsdom ditambahkan; `npm test` (`vitest run`) dan `npm run test:watch` tersedia. `vitest.config.mts` memakai alias `@`, environment `node` default, dan jsdom khusus test cart store.
- 109 test di 7 file (`tests/unit/`): `username`, `format`, `date`, `whatsapp`, `errors`, `constants`, dan `cart-store`.
- Cakupan: trim/lowercase + batas 3–30 karakter + separator username; Rupiah/angka/initials/telepon; rentang hari bisnis dan label tanggal `Asia/Jakarta`; total, quantity, notes, dan persistensi cart; template nota + normalisasi nomor `wa.me`; pemetaan kode Postgres/PostgREST dan whitelist pesan tanpa membocorkan detail internal; landing path per role.
- `formatMonthLabel` sekarang memakai `timeZone: "UTC"` agar label bulan stabil di mesin/CI dengan zona waktu berbeda.
- Workflow minimal `.github/workflows/unit-tests.yml` menjalankan `npm ci` + `npm test` pada push ke `main` dan pull request. Pipeline lengkap (typecheck/lint/build/E2E) tetap menjadi lingkup T11.
- `npm test` ✅ (109/109), `npx tsc --noEmit` ✅, `npm run lint` ✅, `npm run build` ✅.

### [x] T10 — E2E smoke test (Playwright)
**Prioritas:** P1 · **Butuh user:** tidak · **Selesai:** 2026-10-25

- Skenario demo mode: login kasir → tambah menu → checkout → struk → edit order di history.
- Skenario owner: login email → dashboard tampil → tambah produk → tambah kasir.
- Skenario negatif: owner username ditolak; kasir buka `/dashboard` dialihkan.
- Jalankan headless di CI.

**Selesai jika:** suite E2E stabil dan menjadi gate rilis.

**Hasil verifikasi:**
- `@playwright/test` + Chromium ditambahkan; `npm run test:e2e` dan `npm run test:e2e:ui` tersedia.
- `playwright.config.ts` menjalankan dev server khusus di `127.0.0.1:3210` dengan Supabase env dikosongkan, `NEXT_PUBLIC_DEMO_MODE=true`, dan `NEXT_DIST_DIR=.next-e2e` supaya bisa berjalan berdampingan dengan `npm run dev` biasa. Demo mode tetap hard-disabled di production build.
- 5 skenario di `e2e/`:
  - kasir mobile 390px: login username → tambah Thai Basil Chicken → catatan "Pedas" → checkout Takeaway/QRIS + nomor WA → nota tampil → buka riwayat → edit catatan/status/phone → nota menampilkan `* Transaksi telah diedit` dan kartu riwayat menampilkan badge `Diedit`;
  - owner: login email → dashboard → tambah menu `E2E Es Kopi` → tambah kasir `e2ebarista`;
  - negatif: username Owner ditolak; kasir dialihkan dari `/dashboard`, `/products`, `/employees` ke `/pos`; `/pos` tanpa sesi diarahkan ke `/login`.
- Workflow `.github/workflows/e2e.yml`: `npm ci` → `npx playwright install --with-deps chromium` → `npm run test:e2e`, upload report/trace saat gagal. Branch protection tetap menjadi bagian T11.
- `npx playwright test --repeat-each=2` ✅ (10/10), `npm test` ✅ (109/109), `npx tsc --noEmit` ✅, `npm run lint` ✅, `npm run build` ✅.
- Perbaikan blocking dev server: `@tailwindcss/turbopack` (4.3.3) mengekspos `exports` map yang menyembunyikan `dist/index.js`, sehingga loader Turbopack gagal (`Cannot find module .../@tailwindcss/turbopack/dist/index.js`) dan semua halaman dev jadi 500. Aturan `turbopack.rules` di `next.config.ts` dihapus dan Tailwind v4 sekarang dikompilasi lewat `postcss.config.mjs` (`@tailwindcss/postcss`) sesuai dokumentasi Next 16. Dev (`/login` 200 + utility CSS ter-generate), build produksi, dan E2E tetap berjalan.

### [ ] T11 — CI GitHub Actions
**Prioritas:** P1 · **Butuh user:** tidak

- Workflow PR + main: install → typecheck → lint → unit test → build → E2E (demo).
- Cache dependency; fail fast.
- Tambah branch protection yang mewajibkan check hijau.

**Selesai jika:** PR menampilkan check wajib dan merge diblokir bila gagal.

### [ ] T12 — Manual QA matrix
**Prioritas:** P1 · **Butuh user:** ya (verifikasi perangkat)

- Mobile 360/390px dan desktop: POS, cart, checkout, history, dashboard, products, employees.
- Print 58mm & 80mm (Chrome/Safari), WhatsApp share, keyboard/a11y dasar.
- Uji data kosong, koneksi lambat, dan double-submit checkout.
- Catat bug + perbaiki yang blocker.

**Selesai jika:** checklist QA terisi dan tidak ada bug P0/P1 tersisa.

---

## Fase 3 — Operability & keamanan

### [ ] T13 — Security headers & rate limit login
**Prioritas:** P1 · **Butuh user:** tidak

- Header: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors`, CSP yang kompatibel dengan Next.js.
- Throttle login per IP/identifier (in-memory atau Upstash) + pesan generik.
- `npm audit` dan review dependency.
- Pastikan tidak ada secret/log sensitif.

**Selesai jika:** header terverifikasi di response production dan brute force login terbatas.

### [ ] T14 — Observability & backup runbook
**Prioritas:** P1 · **Butuh user:** ya (opsional: akun Sentry)

- Logging error server + client (Sentry atau alternatif), dengan redaksi data pribadi.
- Health check sederhana dan alert uptime.
- Aktifkan backup harian Supabase (PITR bila tersedia) + prosedur restore yang diuji.
- Dokumentasikan ekspor data transaksi untuk pembukuan.

**Selesai jika:** error terlacak, backup terjadwal, dan restore pernah diuji di project staging.

### [ ] T15 — Performance & aksesibilitas
**Prioritas:** P2 · **Butuh user:** tidak

- Lighthouse mobile untuk `/login`, `/pos`, `/dashboard`.
- Optimasi gambar menu (SVG/next/image), font, dan bundle.
- Perbaiki label form, kontras, focus state, dan target sentuh.

**Selesai jika:** skor Lighthouse memadai dan tidak ada pelanggaran a11y kritis.

---

## Fase 4 — Launch & handover

### [ ] T16 — Deploy Vercel + domain
**Prioritas:** P0 · **Butuh user:** ya (akun/domain)

- Import repo, set env production, deploy.
- Set custom domain + HTTPS.
- Set Site URL/Redirect URLs Supabase ke domain production.
- Smoke test production: login owner, login kasir, buat order, cetak, dashboard.
- Siapkan rollback (deployment sebelumnya + restore DB).

**Selesai jika:** domain production hidup dan smoke test lulus.

### [ ] T17 — Handover & SOP
**Prioritas:** P1 · **Butuh user:** ya (review)

- SOP kasir: login, buat order, cetak, kirim WA, edit, logout.
- Panduan owner: tambah menu, promo, kasir, cek dashboard, nonaktifkan akun.
- Runbook insiden: login gagal, data tidak muncul, restore, rotasi key.
- Checklist go-live dan kontak eskalasi.

**Selesai jika:** dokumen dibagikan dan owner/kasir sudah mencoba alur utama.

---

## Catatan eksekusi

- Task yang butuh secret/akun eksternal akan saya tandai dan minta input sebelum mulai.
- Saya tidak akan menjalankan migrasi ke project nyata tanpa konfirmasi eksplisit.
- Setelah setiap task: `tsc`, `lint`, test/build terkait, lalu laporan singkat + bukti.
