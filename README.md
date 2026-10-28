# Nyamnyambox POS

Mobile-first point-of-sale and order management app for **Nyamnyambox** (ricebowl & snacks). Built for fast counter service across Dine-In, Takeaway, GrabFood, ShopeeFood, and WhatsApp orders.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-149eca)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e)

---

## Features

### Point of Sale (`/pos`)
- Flat menu grid with product images and prices: 2 columns on phones, 3 on tablets, 4 on wide screens.
- Tap to add, adjust quantity, add per-item notes (spice level, requests).
- Floating cart bar with item count and running total on phones; from tablet up the cart is a persistent right panel.
- Checkout bottom sheet: channel, payment method, payment status, customer WhatsApp number.
- Promo items are ordinary menu entries prefixed with `[PROMO]`.
- Instant receipt modal after checkout with print and WhatsApp actions.

### Responsive layout
- **Phone (<768 px):** bottom tab bar, floating cart bar, bottom-sheet checkout.
- **Tablet (≥768 px):** sidebar collapses to an 80 px icon rail; the cart panel is always visible on `/pos` (no more unreachable cart between 768–1023 px); 3-column menu grid.
- **Desktop (≥1024 px):** full 256 px sidebar. At ≥1280 px the menu grid expands to 4 columns.

### Receipts & WhatsApp
- Browser-print receipt optimized for **58mm and 80mm** thermal paper / PDF export.
- Print size toggle (58mm / 80mm) is remembered per device.
- WhatsApp receipt template with order number, items, notes, total, payment status, and channel.
- Customer phone numbers are normalized to the `62…` format for `wa.me` links.

### Transaction History (`/history`)
- Today's orders by default; Owners can browse previous dates.
- Summary cards: transaction count, paid revenue, unpaid orders.
- Detail sheet with the full receipt.
- **Edit transactions**: change quantities, remove/add items, edit notes, change payment method/status and customer phone. Edited orders are flagged `is_edited` and show a **Diedit** badge.
- Reprint or resend the receipt after editing.
- **Monthly Excel export** (Owner only): pick a month/year and download `Nyamnyambox-YYYY-MM.xlsx` with three sheets — `Transaksi` (one row per order), `Item` (one row per line item with subtotal) and `Ringkasan` (totals, paid/unpaid split, per-channel revenue). Generated in the browser, so no data leaves Supabase for a third party.

### Dashboard (`/dashboard`, Owner only)
- Today's revenue, order count, and average order value.
- Monthly sales chart (last 6 months).
- Revenue breakdown by channel.
- Top-selling products.

### Menu Management (`/products`, Owner only)
- Create and edit products: name, price, image (upload or URL), active/inactive.
- Photos upload directly from the browser to Supabase Storage, resized to WebP ≤1200 px before sending (5 MB cap, JPG/PNG/WebP/AVIF only). Replacing a photo deletes the previous object after the menu saves.
- Inactive products disappear from the POS menu but remain in historical orders.
- Promo items managed as regular products with a `[PROMO]` name prefix.

### Employees (`/employees`, Owner only)
- Create cashier accounts with name, username, email, and password.
- Cashiers sign in with **username + password**; email stays required for the Supabase Auth account and password recovery.
- Deactivate/reactivate accounts. Deactivated staff cannot sign in or query data.
- Roles are assigned server-side, never trusted from the client.

### Account Security (`/settings/security`, Owner/Developer only)
- Owners and Developers can change their own password from the app — no more SQL editor round trip.
- The current password is re-verified before the change, so a stolen session alone cannot lock the real owner out.
- New password must be at least 8 characters, differ from the current one, and match its confirmation.
- Five wrong current-password attempts per user + IP are allowed per 15-minute window.
- Cashiers are redirected to `/pos`; they never see the page or the form.
- Demo mode keeps the password fixed, so the form is disabled there with an explanation.

### Auth & RBAC
- **Owner** signs in with **email + password** (username login is blocked for owner roles).
- **Cashier** signs in with **username + password** (or email as a fallback).
- Supabase email/password auth with cookie-based sessions.
- Route protection via `proxy.ts` (Next.js 16 middleware).
- Roles: `MASTER_ADMIN`, `OWNER`, `DEVELOPER` (hidden), `EMPLOYEE` (Kasir).
- Business dates use `Asia/Jakarta` (WIB, UTC+7).

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions) |
| UI | React 19, Tailwind CSS v4, shadcn-style Radix primitives |
| State | Zustand (persisted cart) |
| Data fetching | TanStack Query |
| Backend | Supabase (Postgres, Auth, RLS, RPC) + server-side username→email resolution |
| Charts | Recharts |
| Forms/validation | React 19 actions, Zod |
| Notifications | Sonner |

---

## Quick start (Demo Mode)

Demo Mode lets you explore the entire app **without a Supabase project**. It is opt-in and only runs outside production builds.

```bash
cp .env.example .env.local   # includes NEXT_PUBLIC_DEMO_MODE=true
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You can use the one-click **Owner** / **Kasir** buttons, or sign in with the demo credentials:

| Role | Login | Password |
| --- | --- | --- |
| Kasir | `rizky` (username) | `demo123` |
| Kasir | `sari` (username) | `demo123` |
| Owner | `owner@nyamnyambox.demo` (email) | `demo123` |

- Demo mode requires `NEXT_PUBLIC_DEMO_MODE=true`.
- It is **ignored when Supabase is configured** and **hard-disabled in production builds**.
- Demo data lives in `localStorage` under `nyb-demo-db-v2` (seed orders, products, employees).
- The cart persists under `nyb-cart-v1`.
- Demo role cookie: `nyb_demo_role` (unsigned, local-only).
- To reset demo data: open DevTools → Application → Local Storage → delete both keys, then reload.
- Demo data is per browser/device and is **not** shared between users.

> **Production safety:** if Supabase env vars are missing in a production build, the app shows a configuration notice and does **not** offer demo login or accept the demo cookie. This prevents a misconfigured deployment from becoming an unauthenticated demo.

> Demo Mode is for evaluation only. Cashier accounts created in Demo Mode are data-only and cannot sign in; use the seeded accounts above. Employee account creation and multi-device data require Supabase.

---

## Supabase setup

### 1. Create a project

Create a project at [supabase.com](https://supabase.com).

### 2. Run the schema

Open **SQL Editor** and run the migrations in order:

```text
supabase/migrations/0001_init.sql
supabase/migrations/0002_username_login.sql
supabase/migrations/0003_harden_order_writes.sql
supabase/migrations/0004_profile_privacy.sql
supabase/migrations/0005_daily_receipt_numbers.sql
supabase/migrations/0006_product_images_storage.sql
```

`0001_init.sql` creates:

- Enums: `user_role`, `order_channel`, `payment_method`, `payment_status`
- Tables: `profiles`, `products`, `orders`, `order_items`
- Profile bootstrap trigger on `auth.users`
- Row Level Security policies
- RPCs: `create_order`, `update_order`, `dashboard_summary`
- Seed menu (only when `products` is empty)

`0002_username_login.sql` adds `profiles.username`, backfills existing rows, and keeps the bootstrap trigger in sync.

`0003_harden_order_writes.sql` makes `orders`/`order_items` read-only for clients and pins `search_path` on every `SECURITY DEFINER` function. Order writes then only work through the RPCs.

`0004_profile_privacy.sql` limits staff to reading their own profile, adds a minimal `staff_directory` view (`id`, `name`) for order display, and prevents owners from deactivating/demoting themselves or removing the last active owner.

`0005_daily_receipt_numbers.sql` replaces the global receipt sequence with a per-business-day `receipt_counters` table. Numbers restart at `0001` every Jakarta day and are allocated atomically with `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`.

`0006_product_images_storage.sql` creates the public `product-images` bucket (5 MB, JPG/PNG/WebP/AVIF only) and four Storage policies: public read, owner-only insert/update/delete. SVG is rejected on purpose because it is active content.

`supabase/seed.sql` can be run separately to re-seed the menu.

After the migrations, run `supabase/verify.sql` in the SQL Editor. Every row should show `OK`. The `active owner exists` check is expected to show `FAIL` until you promote the first Owner in step 4. Also run `supabase/verify-storage.sql` to check the bucket and its policies (it is separate because the restore drill has no `storage` schema).

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where to find it | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (secret) | Employee creation + cashier username login |
| `NEXT_PUBLIC_DEMO_MODE` | Local `.env.local` only | No — set `true` for local demo mode |

> Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or commit it. It is only used inside server actions (`app/actions/employees.ts` and `app/actions/auth.ts`).

> New Supabase projects can use the publishable key (`sb_publishable_...`) as `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the secret key (`sb_secret_...`) as `SUPABASE_SERVICE_ROLE_KEY`. Legacy `anon` / `service_role` JWT keys also work if they are still enabled. Do not paste secret keys into logs or chat; rotate or disable them if exposed.

> `NEXT_PUBLIC_DEMO_MODE` never enables demo mode in a production build. Production requires the Supabase URL and anon key; without them the login screen shows a configuration notice.

Restart the dev server after changing `.env.local`.

### 4. Create the first Owner

1. In Supabase, go to **Authentication → Users → Add user** and create an email/password account.
2. The database trigger creates a `profiles` row with role `EMPLOYEE` and a username derived from the email prefix.
3. Promote the account in the SQL Editor:

```sql
update public.profiles
set role = 'OWNER'
where email = 'owner@nyamnyambox.com';
```

4. Sign in at `/login` with the owner's **email** and password. Owner accounts cannot sign in with a username.

Additional cashiers can then be created from **Kelola Karyawan** (`/employees`). Enter their **username**, email, and initial password. This requires `SUPABASE_SERVICE_ROLE_KEY`; without it the app returns a clear configuration error.

### 5. Auth settings

For local development, Supabase Auth works with the default settings. For production:

- Set **Site URL** to your deployed URL.
- Add it to **Redirect URLs**.
- Email confirmation can stay enabled; the app signs in with email/password.

### 6. How cashier username login works

Supabase Auth is email-based, so the app maps a cashier username to its email server-side:

1. The login form sends the identifier to `loginAction`.
2. If it contains `@`, it is treated as an email (Owner / fallback).
3. Otherwise the server action looks up an **active `EMPLOYEE`** profile by username using the service role key.
4. The resolved email is passed to `signInWithPassword`.
5. Owner and Master Admin profiles are never resolved by username — they must use email.

Existing accounts are backfilled with a username from their email prefix by `0002_username_login.sql`. If two accounts share a prefix, a numeric suffix is added. The owner can see each cashier's username on `/employees`.

> If `SUPABASE_SERVICE_ROLE_KEY` is missing, cashier username login returns a configuration error. Owner email login still works.

### 7. Key rotation & leak checks

Use the new **publishable** and **secret** API keys when available. If the project still uses legacy JWT keys, keep them private and rotate them if they are ever exposed.

To rotate the server key:

1. In Supabase, open **Project Settings → API Keys** and create a new secret key.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and in Vercel (Production, Preview, Development).
3. Redeploy, verify login and employee creation, then delete the old secret key.
4. If a legacy JWT secret leaked, rotate/revoke it under **Project Settings → JWT Settings** or disable legacy API keys. Disabling them invalidates every existing legacy `anon` / `service_role` key.

Check that the secret key never reaches the browser bundle or git:

```bash
SERVICE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | cut -d= -f2-)

# Must print OK
if grep -rqF "$SERVICE_KEY" .next/static; then
  echo "LEAK: secret key found in client bundle"
else
  echo "OK: secret key not in client bundle"
fi

# Must print OK
if git grep -qF "$SERVICE_KEY" -- .; then
  echo "LEAK: secret key found in tracked files"
else
  echo "OK: secret key not in tracked files"
fi
```

`NEXT_PUBLIC_*` values are public by design. Only put the Supabase URL and publishable/anon key there; never put the secret/service role key in a `NEXT_PUBLIC_*` variable.

---

## Roles & access

| Page | MASTER_ADMIN / OWNER / DEVELOPER | EMPLOYEE (Kasir) |
| --- | --- | --- |
| `/pos` | ✅ | ✅ |
| `/history` | ✅ All dates | ✅ Today only |
| `/dashboard` | ✅ | Redirected to `/pos` |
| `/products` | ✅ | Redirected to `/pos` |
| `/employees` | ✅ | Redirected to `/pos` |
| `/settings/security` | ✅ | Redirected to `/pos` |

After login, Owner/Master Admin/Developer land on `/dashboard`; cashiers land on `/pos`.

RLS enforces the same boundaries at the database level. Employees can only read orders from the current Jakarta business day, while Owners can read all orders. Deactivated profiles (`is_active = false`) fail the `is_active_staff()` check and cannot read or write data.

### Hidden DEVELOPER account

`DEVELOPER` is a maintenance super-owner. It is intentionally **not manageable from the app**:

- It never appears in `/employees` (the query filters `role != 'DEVELOPER'`), and the `staff_directory` view hides the name from order history/receipts.
- An Owner cannot read, update, deactivate, promote to, or delete the developer row — enforced by the `profiles` RLS policies and the `protect_profile_fields` trigger.
- Only the service role (SQL editor / admin key) or another developer can create or change it. Promote an existing Auth user with:

```sql
update public.profiles set role = 'DEVELOPER' where email = 'developer@example.com';
```

The developer signs in with **email + password**, like an Owner. To revoke access, set the role back to `EMPLOYEE` or `is_active = false` with the service role.

---

## Database design notes

- **Server-side pricing** — `create_order` and `update_order` look up product prices in the database. The client never sends the total.
- **RPC-only order writes** — clients have `SELECT` only on `orders`/`order_items`. `INSERT`/`UPDATE`/`DELETE` are revoked, so a cashier cannot bypass pricing or validation by calling PostgREST directly. All mutations go through `create_order` / `update_order`.
- **Atomic writes** — order + items are written in one transaction inside the RPCs.
- **Receipt numbers** — generated as `NYB-YYYYMMDD-NNNN` from a per-day counter. Each Jakarta business day starts at `0001`; the counter row is updated atomically so parallel checkouts cannot duplicate a number.
- **`is_edited`** — set automatically by `update_order`, displayed on receipts and history.
- **Analytics** — `dashboard_summary` aggregates today's metrics, 6-month sales, channel revenue, and top products in one call.
- **Profile privacy** — staff can read only their own `profiles` row; owners can read all non-developer rows, and only a developer can read developer rows. Order history uses the minimal `staff_directory` view (`id`, `name`) so cashier names stay visible without exposing emails; developer names are filtered out of that view too.
- **Owner lockout protection** — an owner/developer cannot deactivate or demote their own account, and at least one active privileged account (Owner, Master Admin or Developer) must remain.
- **Profile protection** — a trigger prevents non-owners from changing their own `role`, `is_active`, or `email`, and refuses any change to a `DEVELOPER` row unless the caller is a developer or the service role.
- **No hard deletes** — products are deactivated instead of deleted so historical receipts stay intact.
- **Pinned `search_path`** — every `SECURITY DEFINER` function uses `public, pg_temp` to prevent schema-shadowing attacks.

---

## Printing & WhatsApp

- Receipts use a dedicated print-only DOM node outside dialogs/sheets, so nothing is clipped by transforms or scroll containers.
- Print CSS hides the app UI and renders a 76mm (80mm paper) or 52mm (58mm paper) receipt with `@page` sizing.
- Use the browser print dialog to **Save as PDF** or send to a thermal printer.
- The WhatsApp button opens `wa.me` with a pre-filled receipt. If no customer phone is present, WhatsApp opens without a recipient so the cashier can pick one.

---

## Security

- **Headers.** `next.config.ts` adds `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy` to every response (see `lib/security.ts`).
- **CSP.** `proxy.ts` builds a per-request policy with a fresh nonce. Production uses `script-src 'self' 'nonce-…' 'strict-dynamic'`; Next.js reads the nonce from the request header and attaches it to its own scripts. `style-src` keeps `'unsafe-inline'` because Radix and Recharts set inline `style` attributes, and `connect-src` is limited to the app plus the Supabase REST/realtime origins. Development uses a looser policy so Turbopack HMR keeps working. `upgrade-insecure-requests` is only sent when the document itself is HTTPS.
- **Login throttling.** `lib/rate-limit.ts` counts failed logins per identifier (5) and per IP (20) in a fixed 15-minute window; a successful login clears both. Blocked attempts get a generic retry message and never reach Supabase Auth. The same module also caps wrong current-password attempts on `/settings/security` at 5 per user + IP / 15 minutes. The counter is in-memory (per serverless instance) — swap it for Upstash if a shared counter is ever needed.
- **Secrets.** Only `NEXT_PUBLIC_*` values reach the browser; the service-role key stays server-side and is never logged. `npm audit` reports zero known vulnerabilities.

To check the headers yourself:

```bash
curl -sD - -o /dev/null https://nyamnyambox-pos.vercel.app/login | grep -iE "content-security-policy|strict-transport|x-content-type|x-frame|referrer-policy"
```

---

## Observability & operations

- **Structured logs.** `lib/logging.ts` writes one JSON line per event (`app.start`, `request.error`, `client.error`). `instrumentation.ts` hooks Next.js `onRequestError`, so uncaught server errors are logged with route, method and router context. Browser errors (React boundaries, `window.onerror`, unhandled rejections) are POSTed to `/api/log-error` by `lib/client-logging.ts`.
- **PII redaction.** `lib/redact.ts` blanks sensitive field names and scrubs e-mails, Indonesian phone numbers, JWTs, bearer tokens, Supabase keys and database URLs — on the client before sending, and again on the server before writing. IPs are logged as a 6-byte hash only.
- **Health check.** `GET /api/health` returns `200` when the app and Supabase (PostgREST + Auth) are reachable and `503` when a dependency is down or production is missing its Supabase env. It bypasses the Proxy, so it is fast and needs no session.
- **Uptime.** `.github/workflows/uptime.yml` pings `/api/health` every 30 minutes; a failed run e-mails the repository owner.
- **Backups.** `.github/workflows/backup.yml` runs a weekly `pg_dump` of the `public` schema to a 90-day GitHub artifact (the Supabase free plan has no automatic backups). `npm run drill:restore` restores a dump into a throwaway Postgres and runs `supabase/verify.sql` against it.
- **Bookkeeping export.** Owners download a multi-sheet `.xlsx` (transactions, line items, summary) straight from `/history` for any month. For scripting, `npm run export:orders -- --month 2026-10` writes a CSV of transactions (Asia/Jakarta timestamps, human-readable labels, no customer phone numbers).

Full procedures — where to find logs, how to run a restore drill against a staging project, incident checklists — live in [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

---

## Error handling

- `lib/errors.ts` is the single place that turns Supabase/PostgREST/network failures into short Indonesian messages. Internal details (table names, constraints, SQL, stack traces) never reach the UI.
- Business rules raised by the RPCs/triggers are whitelisted, so messages like “Transaksi hanya dapat diedit pada hari yang sama” still appear.
- Failed queries show a retry card (`components/ui/query-error.tsx`) on POS, history, dashboard, products, and employees.
- Route-level fallbacks live in `app/error.tsx`, `app/(app)/error.tsx`, `app/global-error.tsx`, and `app/not-found.tsx`. They use Next.js 16's `retry()` to refetch and re-render.

---

## Scripts

```bash
npm run dev     # start development server
npm run build   # production build
npm run start   # run the production build
npm run lint    # ESLint
npm run typecheck # generate route types + TypeScript, no emit
npm test        # unit tests (Vitest)
npm run test:watch # unit tests in watch mode
npm run test:e2e # E2E smoke tests (Playwright, demo mode)
npm run test:rls # RLS/RPC regression test (PGlite)
npm run qa:check # automated QA matrix (needs the demo server on :3210)
npm run drill:restore -- --from-db "$SUPABASE_DB_URL" # restore a dump into a scratch DB
npm run export:orders -- --month 2026-10 # bookkeeping CSV export
npm run ci      # typecheck + lint + unit tests + build (what CI runs first)
```

Requires **Node.js 22.12+** (Vitest 5 and Next.js 16).

### Unit tests

`npm test` runs the Vitest suite in `tests/unit/`:

- username normalization/validation rules;
- Rupiah/number/initials/phone formatting;
- `Asia/Jakarta` business-date ranges and date labels;
- cart quantities, notes, totals, and persistence;
- WhatsApp receipt text and `wa.me` phone normalization;
- error mapping/whitelisting (raw Postgres details never leak);
- password-change rules (minimum length, different from current, confirmation);
- role landing paths and channel/payment labels.

The suite runs in CI on every push to `main` and every pull request via
`.github/workflows/ci.yml`.

### E2E smoke test

`npm run test:e2e` runs Playwright against a dedicated `next dev` server in **demo mode** (`http://127.0.0.1:3210`). Supabase env vars are blanked for the test server, so the suite never touches production data.

Covered flows:

- cashier: login → add menu + notes → checkout (Takeaway/QRIS/phone) → receipt → edit the order in history → `Diedit` badge;
- double submit: two clicks on "Konfirmasi & Proses Pesanan" in the same tick still create exactly one order (`e2e/checkout-guard.spec.ts`);
- owner: email login → dashboard → add a menu → add a cashier → open **Keamanan Akun**;
- negative: owner username login rejected; cashier redirected from owner pages (including `/settings/security`); protected routes redirect to `/login` without a session.

First-time setup: `npx playwright install chromium`. The E2E server uses `.next-e2e/` so it can run beside your normal dev server. CI runs it via `.github/workflows/ci.yml` and uploads traces/screenshots on failure.

### Automated QA matrix

`npm run qa:check` runs `scripts/qa-check.mjs` against the demo server and covers the automated half of `docs/QA_MATRIX.md`: layout at seven widths (360/390/768/820/1024/1180/1280 px, no horizontal overflow, no console errors), empty states, checkout/double-submit, receipt print widths for 58 mm and 80 mm, the `wa.me` link, Slow 3G, and keyboard/focus order (81 checks). Screenshots land in `qa-artifacts/` (git-ignored). It exits non-zero on any finding, so it can be used as a manual gate. Physical checks (thermal printer, WhatsApp app, Safari iOS) stay in `docs/QA_MATRIX.md` §4.

### CI and branch protection

`.github/workflows/ci.yml` runs on every push to `main` and every pull request. A new push to the same branch cancels the previous run.

| Job | Runs | Checks |
| --- | --- | --- |
| `Typecheck, lint, unit tests` | first | `npm run typecheck`, `npm run lint`, `npm test` |
| `Production build` | after the first job | `npm run build` with Supabase env blanked, so the fail-safe path is covered |
| `E2E (demo mode)` | after the first job | `npx playwright install --with-deps chromium` + `npm run test:e2e` |

Dependencies are cached through `actions/setup-node`; the Next.js build cache (`.next/cache`) is cached in the build job. The build and E2E jobs only start once the cheap checks pass, which keeps a red run short.

These checks are **required on `main`** and the branch is protected: direct pushes are rejected, and every change must land through a pull request whose checks are green (no approvals needed, so a solo owner can still merge). Force-pushes and deleting `main` are blocked.

The protection was applied with `scripts/setup-branch-protection.mjs`; run it again only if the CI job names change:

```bash
GITHUB_TOKEN=... node scripts/setup-branch-protection.mjs --require-pr
```

Use `--dry-run` to inspect the payload first, or omit `--require-pr` to keep direct pushes allowed with advisory checks.

Daily flow:

```bash
git checkout -b feat/my-change
npm run ci        # typecheck + lint + unit tests + build
git push -u origin feat/my-change
# open a PR, wait for CI, merge
```

### RLS/RPC regression test

`npm run test:rls` applies the real migrations to an in-memory PGlite database and emulates Supabase's `anon` / `authenticated` roles. It verifies that:

- clients cannot `INSERT`/`UPDATE`/`DELETE` `orders` or `order_items` directly;
- `create_order` / `update_order` still work and compute prices server-side;
- cashiers only see today's orders, inactive accounts are locked out, and anonymous access is denied;
- cashiers can read only their own profile and see cashier names through the minimal `staff_directory` view;
- owners cannot deactivate/demote themselves, and the last active owner cannot be removed;
- the hidden developer row is invisible/immutable to owners, developer names are filtered from `staff_directory`, and only a developer can read or change it;
- receipt numbers increment per business day and a different day starts again at `0001`;
- only `SELECT` policies remain on order tables and every `SECURITY DEFINER` function pins `search_path`.

This is a fast local check. It does not replace testing against a real Supabase project (see T08 in `PRODUCTION_TODO.md`).

---

## Deploy to Vercel

1. Push the repository to GitHub/GitLab.
2. Import the project into [Vercel](https://vercel.com/new).
3. Add the same environment variables from `.env.local`.
4. Deploy. `vercel.json` pins functions to `sin1` (Singapore) so they sit next to the Supabase `ap-southeast-1` project; change it if the database moves. Verify with `curl -sI https://<domain>/login | grep -i x-vercel-id`.
5. Add the Vercel URL to Supabase **Authentication → URL Configuration**.
6. Run all migrations against the production Supabase project, in order:
   `0001_init.sql`, `0002_username_login.sql`, `0003_harden_order_writes.sql`, `0004_profile_privacy.sql`, `0005_daily_receipt_numbers.sql`, `0006_product_images_storage.sql`, `0007_developer_role.sql`, then `0008_developer_policies.sql`.
7. Run `supabase/verify.sql` and confirm every row shows `OK` (after the first Owner is promoted), then `supabase/verify-storage.sql` for the `product-images` bucket.
8. Optional custom domain: Vercel → *Domains* → add the domain and point DNS, then update Supabase **Site URL / Redirect URLs**. The current production runs on the `*.vercel.app` subdomain with automatic HTTPS; no code change is needed when a domain is added. Rollback steps are in `docs/RUNBOOK.md` §5.5.

---

## Project structure

```text
app/
  (auth)/login/            # login + demo entry
  (app)/pos/               # cashier screen
  (app)/history/           # transaction list
  (app)/dashboard/         # owner analytics
  (app)/products/          # menu management
  (app)/employees/         # staff management
  actions/                 # server actions (auth, employees)
components/
  pos/                     # menu, cart, checkout
  receipt/                 # receipt layout + print modal
  history/                 # order list + detail/edit sheet
  dashboard/               # metrics, chart, breakdowns
  products/ employees/     # owner CRUD UIs
  ui/                      # shadcn-style primitives
lib/
  data/                    # Supabase queries + demo switch
  demo/                    # localStorage-backed demo backend
  hooks/                   # TanStack Query hooks
  supabase/                # browser/server clients, admin client + DB types
  username.ts              # username normalization + validation rules
  whatsapp.ts              # receipt message + wa.me URL builder
  security.ts              # security headers + CSP builder
  rate-limit.ts            # in-memory login + client-error throttling
  logging.ts               # structured JSON logging
  redact.ts                # PII redaction for logs
  client-logging.ts        # browser error reporter
stores/useCartStore.ts     # persisted cart
instrumentation.ts         # startup log + onRequestError hook
supabase/
  migrations/0001_init.sql # schema, RLS, RPCs, seed
  migrations/0002_username_login.sql # username column, backfill, trigger
  migrations/0003_harden_order_writes.sql # RPC-only order writes, pinned search_path
  migrations/0004_profile_privacy.sql # self/owner profile reads, owner lockout guard
  migrations/0005_daily_receipt_numbers.sql # per-day receipt counters
  migrations/0006_product_images_storage.sql # product-images bucket + storage policies
  migrations/0007_developer_role.sql # DEVELOPER enum value (own migration)
  migrations/0008_developer_policies.sql # hidden developer: helpers, RLS, trigger
  seed.sql                 # menu re-seed
  verify.sql               # production schema verification queries
  verify-storage.sql       # product-images bucket + policy checks
scripts/test-rls.mjs       # PGlite RLS/RPC regression test
scripts/qa-check.mjs       # automated QA matrix (screenshots -> qa-artifacts/)
scripts/restore-drill.mjs  # restore a dump into PGlite + run verify.sql
scripts/export-orders.mjs  # bookkeeping CSV export
scripts/lib/csv.mjs        # CSV formatting helpers
app/api/health/            # liveness + Supabase health for uptime monitors
app/api/log-error/         # client error sink
docs/QA_MATRIX.md          # QA checklist: automated results + manual device items
docs/RUNBOOK.md            # logging, uptime, backup/restore, bookkeeping export
docs/SOP-KASIR.md          # cashier SOP: login, order, print, WhatsApp, edit, logout
docs/PANDUAN-OWNER.md      # owner guide: menu, promos, cashiers, dashboard, limits
docs/GO-LIVE.md            # go-live checklist, acceptance tests, escalation contacts
tests/unit/                # Vitest unit tests
e2e/                       # Playwright smoke tests (demo mode)
vitest.config.mts          # Vitest config (alias @, node/jsdom environments)
playwright.config.ts       # Playwright config + demo-mode web server
proxy.ts                   # Next.js 16 auth middleware
```

---

## Handover & training

Three documents cover day-to-day use and launch:

| Document | Audience | Contents |
| --- | --- | --- |
| [`docs/SOP-KASIR.md`](docs/SOP-KASIR.md) | Cashier | Login, build an order, print 58/80 mm, send via WhatsApp, edit same-day orders, logout, troubleshooting table |
| [`docs/PANDUAN-OWNER.md`](docs/PANDUAN-OWNER.md) | Owner | Dashboard metrics, menu/promo management, cashier accounts and password resets, reporting export, security routine, plan limits |
| [`docs/GO-LIVE.md`](docs/GO-LIVE.md) | Owner + technical | Pre-launch checklist, go-live steps, rollback triggers, acceptance tests, escalation contacts, sign-off |

Operational procedures (logs, health, backup/restore, key rotation, incidents)
stay in [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

---

## Known limitations

- No direct thermal-printer/Web Bluetooth integration; printing uses the browser dialog.
- Product images are uploaded by the Owner to the public Supabase Storage bucket `product-images`; seeded products still use local SVG paths and the URL field still accepts external hosts. Images render as plain lazy `<img>` inside a fixed aspect box, so the Next.js image optimizer is not used (owner-supplied hosts + SVG would require opening `remotePatterns`/`dangerouslyAllowSVG`).
- The weekly `pg_dump` covers only the `public` schema, so Storage objects (product photos) are **not** in the backup. Keep originals on the phone/SD card, or upgrade to a plan with Storage backups. See `docs/RUNBOOK.md` §3.8.
- Demo Mode is single-browser and not suitable for real operations.
- Customer WhatsApp delivery is a `wa.me` deep link, not an automated messaging API.
- Login throttling is in-memory per serverless instance; a distributed brute force across many instances is only slowed, not fully blocked.
- The Supabase free plan has no automated backups or PITR; the weekly GitHub Actions dump gives a 7-day RPO. Server logs are JSON lines in Vercel with plan-dependent retention — no external log store yet (Sentry can be added without changing call sites).
