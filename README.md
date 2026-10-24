# Nyamnyambox POS

Mobile-first point-of-sale and order management app for **Nyamnyambox** (ricebowl & snacks). Built for fast counter service across Dine-In, Takeaway, GrabFood, ShopeeFood, and WhatsApp orders.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-149eca)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ecf8e)

---

## Features

### Point of Sale (`/pos`)
- Flat, 2-column mobile menu with product images and prices.
- Tap to add, adjust quantity, add per-item notes (spice level, requests).
- Floating cart bar with item count and running total.
- Checkout bottom sheet: channel, payment method, payment status, customer WhatsApp number.
- Promo items are ordinary menu entries prefixed with `[PROMO]`.
- Instant receipt modal after checkout with print and WhatsApp actions.

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

### Dashboard (`/dashboard`, Owner only)
- Today's revenue, order count, and average order value.
- Monthly sales chart (last 6 months).
- Revenue breakdown by channel.
- Top-selling products.

### Menu Management (`/products`, Owner only)
- Create and edit products: name, price, image URL, active/inactive.
- Inactive products disappear from the POS menu but remain in historical orders.
- Promo items managed as regular products with a `[PROMO]` name prefix.

### Employees (`/employees`, Owner only)
- Create cashier accounts with name, username, email, and password.
- Cashiers sign in with **username + password**; email stays required for the Supabase Auth account and password recovery.
- Deactivate/reactivate accounts. Deactivated staff cannot sign in or query data.
- Roles are assigned server-side, never trusted from the client.

### Auth & RBAC
- **Owner** signs in with **email + password** (username login is blocked for owner roles).
- **Cashier** signs in with **username + password** (or email as a fallback).
- Supabase email/password auth with cookie-based sessions.
- Route protection via `proxy.ts` (Next.js 16 middleware).
- Roles: `MASTER_ADMIN`, `OWNER`, `EMPLOYEE` (Kasir).
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

`supabase/seed.sql` can be run separately to re-seed the menu.

After the migrations, run `supabase/verify.sql` in the SQL Editor. Every row should show `OK`. The `active owner exists` check is expected to show `FAIL` until you promote the first Owner in step 4.

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

| Page | MASTER_ADMIN / OWNER | EMPLOYEE (Kasir) |
| --- | --- | --- |
| `/pos` | ✅ | ✅ |
| `/history` | ✅ All dates | ✅ Today only |
| `/dashboard` | ✅ | Redirected to `/pos` |
| `/products` | ✅ | Redirected to `/pos` |
| `/employees` | ✅ | Redirected to `/pos` |

After login, Owner/Master Admin land on `/dashboard`; cashiers land on `/pos`.

RLS enforces the same boundaries at the database level. Employees can only read orders from the current Jakarta business day, while Owners can read all orders. Deactivated profiles (`is_active = false`) fail the `is_active_staff()` check and cannot read or write data.

---

## Database design notes

- **Server-side pricing** — `create_order` and `update_order` look up product prices in the database. The client never sends the total.
- **RPC-only order writes** — clients have `SELECT` only on `orders`/`order_items`. `INSERT`/`UPDATE`/`DELETE` are revoked, so a cashier cannot bypass pricing or validation by calling PostgREST directly. All mutations go through `create_order` / `update_order`.
- **Atomic writes** — order + items are written in one transaction inside the RPCs.
- **Receipt numbers** — generated as `NYB-YYYYMMDD-NNNN` from a per-day counter. Each Jakarta business day starts at `0001`; the counter row is updated atomically so parallel checkouts cannot duplicate a number.
- **`is_edited`** — set automatically by `update_order`, displayed on receipts and history.
- **Analytics** — `dashboard_summary` aggregates today's metrics, 6-month sales, channel revenue, and top products in one call.
- **Profile privacy** — staff can read only their own `profiles` row; owners can read all. Order history uses the minimal `staff_directory` view (`id`, `name`) so cashier names stay visible without exposing emails.
- **Owner lockout protection** — an owner cannot deactivate or demote their own account, and the last active owner cannot be removed.
- **Profile protection** — a trigger prevents non-owners from changing their own `role`, `is_active`, or `email`.
- **No hard deletes** — products are deactivated instead of deleted so historical receipts stay intact.
- **Pinned `search_path`** — every `SECURITY DEFINER` function uses `public, pg_temp` to prevent schema-shadowing attacks.

---

## Printing & WhatsApp

- Receipts use a dedicated print-only DOM node outside dialogs/sheets, so nothing is clipped by transforms or scroll containers.
- Print CSS hides the app UI and renders a 76mm (80mm paper) or 52mm (58mm paper) receipt with `@page` sizing.
- Use the browser print dialog to **Save as PDF** or send to a thermal printer.
- The WhatsApp button opens `wa.me` with a pre-filled receipt. If no customer phone is present, WhatsApp opens without a recipient so the cashier can pick one.

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
npm test        # unit tests (Vitest)
npm run test:watch # unit tests in watch mode
npm run test:rls # RLS/RPC regression test (PGlite)
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
- role landing paths and channel/payment labels.

The suite runs in CI on every push to `main` and every pull request via
`.github/workflows/unit-tests.yml`.

### RLS/RPC regression test

`npm run test:rls` applies the real migrations to an in-memory PGlite database and emulates Supabase's `anon` / `authenticated` roles. It verifies that:

- clients cannot `INSERT`/`UPDATE`/`DELETE` `orders` or `order_items` directly;
- `create_order` / `update_order` still work and compute prices server-side;
- cashiers only see today's orders, inactive accounts are locked out, and anonymous access is denied;
- cashiers can read only their own profile and see cashier names through the minimal `staff_directory` view;
- owners cannot deactivate/demote themselves, and the last active owner cannot be removed;
- receipt numbers increment per business day and a different day starts again at `0001`;
- only `SELECT` policies remain on order tables and every `SECURITY DEFINER` function pins `search_path`.

This is a fast local check. It does not replace testing against a real Supabase project (see T08 in `PRODUCTION_TODO.md`).

---

## Deploy to Vercel

1. Push the repository to GitHub/GitLab.
2. Import the project into [Vercel](https://vercel.com/new).
3. Add the same environment variables from `.env.local`.
4. Deploy.
5. Add the Vercel URL to Supabase **Authentication → URL Configuration**.
6. Run all migrations against the production Supabase project, in order:
   `0001_init.sql`, `0002_username_login.sql`, `0003_harden_order_writes.sql`, `0004_profile_privacy.sql`, then `0005_daily_receipt_numbers.sql`.
7. Run `supabase/verify.sql` and confirm every row shows `OK` (after the first Owner is promoted).

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
stores/useCartStore.ts     # persisted cart
supabase/
  migrations/0001_init.sql # schema, RLS, RPCs, seed
  migrations/0002_username_login.sql # username column, backfill, trigger
  migrations/0003_harden_order_writes.sql # RPC-only order writes, pinned search_path
  migrations/0004_profile_privacy.sql # self/owner profile reads, owner lockout guard
  migrations/0005_daily_receipt_numbers.sql # per-day receipt counters
  seed.sql                 # menu re-seed
  verify.sql               # production schema verification queries
scripts/test-rls.mjs       # PGlite RLS/RPC regression test
tests/unit/                # Vitest unit tests
vitest.config.mts          # Vitest config (alias @, node/jsdom environments)
proxy.ts                   # Next.js 16 auth middleware
```

---

## Known limitations

- No direct thermal-printer/Web Bluetooth integration; printing uses the browser dialog.
- Product images are URLs (seeded with local SVGs); there is no image upload bucket yet.
- Demo Mode is single-browser and not suitable for real operations.
- Customer WhatsApp delivery is a `wa.me` deep link, not an automated messaging API.
