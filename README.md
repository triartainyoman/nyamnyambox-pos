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
- Create cashier accounts with name, email, and password.
- Deactivate/reactivate accounts. Deactivated staff cannot sign in or query data.
- Roles are assigned server-side, never trusted from the client.

### Auth & RBAC
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
| Backend | Supabase (Postgres, Auth, RLS, RPC) |
| Charts | Recharts |
| Forms/validation | React 19 actions, Zod |
| Notifications | Sonner |

---

## Quick start (Demo Mode)

Demo Mode lets you explore the entire app **without a Supabase project**. It activates automatically when Supabase environment variables are missing.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and choose **Owner** or **Kasir** on the login screen.

- Demo data lives in `localStorage` under `nyb-demo-db-v2` (seed orders, products, employees).
- The cart persists under `nyb-cart-v1`.
- Demo role cookie: `nyb_demo_role`.
- To reset demo data: open DevTools → Application → Local Storage → delete both keys, then reload.
- Demo data is per browser/device and is **not** shared between users.

> Demo Mode is for evaluation only. Employee account creation and multi-device data require Supabase.

---

## Supabase setup

### 1. Create a project

Create a project at [supabase.com](https://supabase.com).

### 2. Run the schema

Open **SQL Editor** and run the full migration:

```text
supabase/migrations/0001_init.sql
```

It creates:

- Enums: `user_role`, `order_channel`, `payment_method`, `payment_status`
- Tables: `profiles`, `products`, `orders`, `order_items`
- Profile bootstrap trigger on `auth.users`
- Row Level Security policies
- RPCs: `create_order`, `update_order`, `dashboard_summary`
- Seed menu (only when `products` is empty)

`supabase/seed.sql` can be run separately to re-seed the menu.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where to find it | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (secret) | Only for creating employees |

> Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or commit it. It is only used inside the server action in `app/actions/employees.ts`.

Restart the dev server after changing `.env.local`.

### 4. Create the first Owner

1. In Supabase, go to **Authentication → Users → Add user** and create an email/password account.
2. The database trigger creates a `profiles` row with role `EMPLOYEE`.
3. Promote the account in the SQL Editor:

```sql
update public.profiles
set role = 'OWNER'
where email = 'owner@nyamnyambox.com';
```

4. Sign in at `/login`.

Additional cashiers can then be created from **Kelola Karyawan** (`/employees`). This requires `SUPABASE_SERVICE_ROLE_KEY`; without it the app returns a clear configuration error.

### 5. Auth settings

For local development, Supabase Auth works with the default settings. For production:

- Set **Site URL** to your deployed URL.
- Add it to **Redirect URLs**.
- Email confirmation can stay enabled; the app signs in with email/password.

---

## Roles & access

| Page | MASTER_ADMIN / OWNER | EMPLOYEE (Kasir) |
| --- | --- | --- |
| `/pos` | ✅ | ✅ |
| `/history` | ✅ All dates | ✅ Today only |
| `/dashboard` | ✅ | Redirected to `/pos` |
| `/products` | ✅ | Redirected to `/pos` |
| `/employees` | ✅ | Redirected to `/pos` |

RLS enforces the same boundaries at the database level. Employees can only read orders from the current Jakarta business day, while Owners can read all orders. Deactivated profiles (`is_active = false`) fail the `is_active_staff()` check and cannot read or write data.

---

## Database design notes

- **Server-side pricing** — `create_order` and `update_order` look up product prices in the database. The client never sends the total.
- **Atomic writes** — order + items are written in one transaction inside the RPCs.
- **Receipt numbers** — generated as `NYB-YYYYMMDD-NNNN` per Jakarta business day.
- **`is_edited`** — set automatically by `update_order`, displayed on receipts and history.
- **Analytics** — `dashboard_summary` aggregates today's metrics, 6-month sales, channel revenue, and top products in one call.
- **Profile protection** — a trigger prevents non-owners from changing their own `role`, `is_active`, or `email`.
- **No hard deletes** — products are deactivated instead of deleted so historical receipts stay intact.

---

## Printing & WhatsApp

- Receipts use a dedicated print-only DOM node outside dialogs/sheets, so nothing is clipped by transforms or scroll containers.
- Print CSS hides the app UI and renders a 76mm (80mm paper) or 52mm (58mm paper) receipt with `@page` sizing.
- Use the browser print dialog to **Save as PDF** or send to a thermal printer.
- The WhatsApp button opens `wa.me` with a pre-filled receipt. If no customer phone is present, WhatsApp opens without a recipient so the cashier can pick one.

---

## Scripts

```bash
npm run dev     # start development server
npm run build   # production build
npm run start   # run the production build
npm run lint    # ESLint
```

Requires **Node.js 20.9+**.

---

## Deploy to Vercel

1. Push the repository to GitHub/GitLab.
2. Import the project into [Vercel](https://vercel.com/new).
3. Add the same environment variables from `.env.local`.
4. Deploy.
5. Add the Vercel URL to Supabase **Authentication → URL Configuration**.
6. Run `supabase/migrations/0001_init.sql` against the production Supabase project (if not already done).

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
  supabase/                # browser/server clients + DB types
  whatsapp.ts              # receipt message + wa.me URL builder
stores/useCartStore.ts     # persisted cart
supabase/
  migrations/0001_init.sql # schema, RLS, RPCs, seed
  seed.sql                 # menu re-seed
proxy.ts                   # Next.js 16 auth middleware
```

---

## Known limitations

- No direct thermal-printer/Web Bluetooth integration; printing uses the browser dialog.
- Product images are URLs (seeded with local SVGs); there is no image upload bucket yet.
- Demo Mode is single-browser and not suitable for real operations.
- Customer WhatsApp delivery is a `wa.me` deep link, not an automated messaging API.
