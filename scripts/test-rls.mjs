/**
 * RLS / RPC regression test using PGlite (Postgres in WASM).
 *
 * It applies the real migrations to a throwaway database, creates Supabase-like
 * `anon` / `authenticated` roles and an `auth.uid()` shim, then verifies that:
 *   - clients cannot write orders/order_items directly,
 *   - all writes must go through create_order / update_order,
 *   - RLS still limits cashiers to today's orders,
 *   - owner/cashier/inactive/anon boundaries hold.
 *
 * Run with: npm run test:rls
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const OWNER_ID = "11111111-1111-1111-1111-111111111111";
const CASHIER_ID = "22222222-2222-2222-2222-222222222222";
const INACTIVE_ID = "33333333-3333-3333-3333-333333333333";
const DEVELOPER_ID = "44444444-4444-4444-4444-444444444444";

function migration(name) {
  return readFileSync(join(ROOT, "supabase", "migrations", name), "utf8").replace(
    /create extension if not exists pgcrypto;/i,
    "-- pgcrypto omitted: gen_random_uuid() is built in on PGlite",
  );
}

function log(message) {
  console.log(`  ✓ ${message}`);
}

const db = new PGlite();

async function runAs(role, userId, fn, { commit = false } = {}) {
  await db.exec("begin");
  try {
    if (role) await db.exec(`set local role ${role}`);
    if (userId) {
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    }
    const result = await fn();
    await db.exec(commit ? "commit" : "rollback");
    return result;
  } catch (error) {
    await db.exec("rollback").catch(() => {});
    throw error;
  }
}

async function expectError(label, fn, pattern) {
  let error;
  try {
    await fn();
  } catch (caught) {
    error = caught;
  }

  assert.ok(error, `${label}: expected an error, but the statement succeeded`);
  const message = String(error.message ?? error);
  if (pattern) {
    assert.match(message, pattern, `${label}: unexpected error message: ${message}`);
  }
  log(`${label} (${message.split("\n")[0]})`);
}

async function main() {
  console.log("\nApplying migrations to PGlite…");

  // Minimal Supabase auth surface used by the migrations.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;

    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text unique not null,
      raw_user_meta_data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    );

    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);

  await db.exec(migration("0001_init.sql"));
  await db.exec(migration("0002_username_login.sql"));

  // Supabase grants broad table/sequence/function privileges by default. Emulate
  // that here so migration 0003 is tested against the real starting point.
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant all on all tables in schema public to anon, authenticated;
    grant all on all sequences in schema public to anon, authenticated;
    grant execute on all functions in schema public to anon, authenticated;
  `);

  await db.exec(migration("0003_harden_order_writes.sql"));
  await db.exec(migration("0004_profile_privacy.sql"));
  await db.exec(migration("0005_daily_receipt_numbers.sql"));

  // Minimal Supabase Storage surface used by 0006. Supabase provides these in
  // the `storage` schema; PGlite has none, so mirror the columns the migration
  // touches plus the grants the platform gives to each role.
  await db.exec(`
    create schema storage;

    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );

    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text not null references storage.buckets (id),
      name text not null,
      owner uuid
    );

    alter table storage.objects enable row level security;

    grant usage on schema storage to anon, authenticated;
    grant select on storage.objects to anon, authenticated;
    grant insert, update, delete on storage.objects to authenticated;
  `);

  await db.exec(migration("0006_product_images_storage.sql"));
  await db.exec(migration("0007_developer_role.sql"));
  await db.exec(migration("0008_developer_policies.sql"));

  // --------------------------------------------------------------------------
  // Fixtures
  // --------------------------------------------------------------------------
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data)
     values
       ($1, 'owner@test.local', '{"name":"Owner Test","username":"owner"}'::jsonb),
       ($2, 'kasir@test.local', '{"name":"Kasir Test","username":"kasir"}'::jsonb),
       ($3, 'nonaktif@test.local', '{"name":"Nonaktif Test","username":"nonaktif"}'::jsonb)`,
    [OWNER_ID, CASHIER_ID, INACTIVE_ID],
  );

  await db.query(`update public.profiles set role = 'OWNER' where id = $1`, [OWNER_ID]);
  await db.query(`update public.profiles set is_active = false where id = $1`, [INACTIVE_ID]);

  const profiles = await db.query(
    `select id, username, role, is_active from public.profiles`,
  );
  assert.equal(profiles.rows.length, 3, "profile trigger should create 3 profiles");
  const byId = new Map(profiles.rows.map((row) => [row.id, row]));
  assert.equal(byId.get(OWNER_ID).username, "owner");
  assert.equal(byId.get(OWNER_ID).role, "OWNER");
  assert.equal(byId.get(CASHIER_ID).username, "kasir");
  assert.equal(byId.get(CASHIER_ID).role, "EMPLOYEE");
  assert.equal(byId.get(INACTIVE_ID).username, "nonaktif");
  assert.equal(byId.get(INACTIVE_ID).is_active, false);
  log("profile bootstrap trigger + usernames");

  const product = await db.query(
    `select id, price from public.products where name = 'Thai Basil Chicken'`,
  );
  assert.ok(product.rows[0], "seed menu should contain Thai Basil Chicken");
  const productId = product.rows[0].id;
  const productPrice = product.rows[0].price;

  const oldOrder = await db.query(
    `insert into public.orders
       (receipt_number, cashier_id, channel, payment_method, payment_status, total_amount, created_at)
     values ('NYB-TEST-OLD', $1, 'DINE_IN', 'CASH', 'LUNAS', $2, now() - interval '2 days')
     returning id`,
    [CASHIER_ID, productPrice],
  );
  const oldOrderId = oldOrder.rows[0].id;

  await db.query(
    `insert into public.order_items (order_id, product_id, quantity, price_at_transaction)
     values ($1, $2, 1, $3)`,
    [oldOrderId, productId, productPrice],
  );

  // --------------------------------------------------------------------------
  // Cashier: RPC is the only write path
  // --------------------------------------------------------------------------
  const created = await runAs(
    "authenticated",
    CASHIER_ID,
    async () => {
      const result = await db.query(
        `select * from public.create_order(
           'DINE_IN'::public.order_channel,
           'CASH'::public.payment_method,
           'LUNAS'::public.payment_status,
           null,
           $1::jsonb
         )`,
        [JSON.stringify([{ product_id: productId, quantity: 2, notes: "pedas" }])],
      );
      return result.rows[0];
    },
    { commit: true },
  );

  assert.equal(created.total_amount, productPrice * 2, "total must be priced server-side");
  assert.equal(created.cashier_id, CASHIER_ID);
  assert.equal(created.is_edited, false);
  const todayJakarta = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/-/g, "");
  assert.equal(
    created.receipt_number,
    `NYB-${todayJakarta}-0001`,
    "the first order of the business day should be 0001",
  );
  log("cashier create_order computes the total from DB prices");
  log("first order of the day gets receipt number 0001");

  const todayOrderId = created.id;

  await expectError(
    "cashier cannot INSERT orders directly",
    () =>
      runAs("authenticated", CASHIER_ID, () =>
        db.query(
          `insert into public.orders
             (receipt_number, cashier_id, channel, payment_method, payment_status, total_amount)
           values ('HACK-INSERT', $1, 'DINE_IN', 'CASH', 'LUNAS', 1)`,
          [CASHIER_ID],
        ),
      ),
    /permission denied/i,
  );

  await expectError(
    "cashier cannot UPDATE orders directly",
    () =>
      runAs("authenticated", CASHIER_ID, () =>
        db.query(`update public.orders set total_amount = 1`),
      ),
    /permission denied/i,
  );

  await expectError(
    "cashier cannot DELETE orders directly",
    () =>
      runAs("authenticated", CASHIER_ID, () => db.query(`delete from public.orders`)),
    /permission denied/i,
  );

  await expectError(
    "cashier cannot INSERT order_items directly",
    () =>
      runAs("authenticated", CASHIER_ID, () =>
        db.query(
          `insert into public.order_items
             (order_id, product_id, quantity, price_at_transaction)
           values ($1, $2, 1, 1)`,
          [todayOrderId, productId],
        ),
      ),
    /permission denied/i,
  );

  await expectError(
    "cashier cannot read receipt counters",
    () =>
      runAs("authenticated", CASHIER_ID, () =>
        db.query(`select * from public.receipt_counters`),
      ),
    /permission denied/i,
  );

  await expectError(
    "cashier cannot allocate receipt numbers directly",
    () =>
      runAs("authenticated", CASHIER_ID, () =>
        db.query(`select public.next_receipt_number(current_date)`),
      ),
    /permission denied/i,
  );

  await expectError(
    "cashier cannot call dashboard_summary",
    () =>
      runAs("authenticated", CASHIER_ID, () =>
        db.query(`select public.dashboard_summary()`),
      ),
    /Akses ditolak/i,
  );

  const updated = await runAs("authenticated", CASHIER_ID, async () => {
    const result = await db.query(
      `select * from public.update_order(
         $1::uuid,
         'QRIS'::public.payment_method,
         'LUNAS'::public.payment_status,
         '08123456789',
         $2::jsonb
       )`,
      [todayOrderId, JSON.stringify([{ product_id: productId, quantity: 3 }])],
    );
    return result.rows[0];
  });

  assert.equal(updated.total_amount, productPrice * 3);
  assert.equal(updated.payment_method, "QRIS");
  assert.equal(updated.customer_phone, "08123456789");
  assert.equal(updated.is_edited, true);
  log("cashier update_order reprices items and marks is_edited");

  await expectError(
    "cashier cannot edit yesterday's order",
    () =>
      runAs("authenticated", CASHIER_ID, () =>
        db.query(
          `select * from public.update_order(
             $1::uuid,
             'CASH'::public.payment_method,
             'LUNAS'::public.payment_status,
             null,
             $2::jsonb
           )`,
          [oldOrderId, JSON.stringify([{ product_id: productId, quantity: 1 }])],
        ),
      ),
    /hanya dapat diedit/i,
  );

  const cashierOrders = await runAs("authenticated", CASHIER_ID, () =>
    db.query(`select id, receipt_number from public.orders order by created_at`),
  );
  assert.equal(cashierOrders.rows.length, 1, "cashier should only see today's order");
  assert.equal(cashierOrders.rows[0].id, todayOrderId);
  log("cashier SELECT is limited to today's orders");

  const cashierItems = await runAs("authenticated", CASHIER_ID, () =>
    db.query(`select count(*)::int as count from public.order_items`),
  );
  assert.equal(cashierItems.rows[0].count, 1);
  log("cashier can read today's order items");

  const cashierOldItems = await runAs("authenticated", CASHIER_ID, () =>
    db.query(`select count(*)::int as count from public.order_items where order_id = $1`, [
      oldOrderId,
    ]),
  );
  assert.equal(cashierOldItems.rows[0].count, 0);
  log("cashier cannot read yesterday's order items");

  // --------------------------------------------------------------------------
  // Profile privacy
  // --------------------------------------------------------------------------
  const ownProfile = await runAs("authenticated", CASHIER_ID, () =>
    db.query(`select id, email from public.profiles`),
  );
  assert.equal(ownProfile.rows.length, 1);
  assert.equal(ownProfile.rows[0].id, CASHIER_ID);
  log("cashier can only read their own profile");

  const otherProfile = await runAs("authenticated", CASHIER_ID, () =>
    db.query(`select email from public.profiles where id = $1`, [OWNER_ID]),
  );
  assert.equal(otherProfile.rows.length, 0);
  log("cashier cannot read another staff email");

  const directory = await runAs("authenticated", CASHIER_ID, () =>
    db.query(`select id, name from public.staff_directory`),
  );
  assert.equal(directory.rows.length, 3);
  assert.deepEqual(Object.keys(directory.rows[0]).sort(), ["id", "name"]);
  log("cashier can read the minimal staff directory");

  const escalation = await runAs("authenticated", CASHIER_ID, () =>
    db.query(
      `update public.profiles
       set role = 'OWNER', is_active = true
       where id = $1
       returning role, is_active`,
      [CASHIER_ID],
    ),
  );
  assert.equal(escalation.rows[0].role, "EMPLOYEE");
  log("cashier cannot escalate their own role");

  // --------------------------------------------------------------------------
  // Inactive cashier
  // --------------------------------------------------------------------------
  await expectError(
    "inactive cashier cannot create an order",
    () =>
      runAs("authenticated", INACTIVE_ID, () =>
        db.query(
          `select public.create_order(
             'TAKEAWAY'::public.order_channel,
             'CASH'::public.payment_method,
             'LUNAS'::public.payment_status,
             null,
             $1::jsonb
           )`,
          [JSON.stringify([{ product_id: productId, quantity: 1 }])],
        ),
      ),
    /Akun tidak aktif/i,
  );

  const inactiveOrders = await runAs("authenticated", INACTIVE_ID, () =>
    db.query(`select count(*)::int as count from public.orders`),
  );
  assert.equal(inactiveOrders.rows[0].count, 0);
  log("inactive cashier sees no orders");

  // --------------------------------------------------------------------------
  // Anon
  // --------------------------------------------------------------------------
  await expectError(
    "anon cannot SELECT orders",
    () => runAs("anon", null, () => db.query(`select count(*) from public.orders`)),
    /permission denied/i,
  );

  await expectError(
    "anon cannot call create_order",
    () =>
      runAs("anon", null, () =>
        db.query(
          `select public.create_order(
             'DINE_IN'::public.order_channel,
             'CASH'::public.payment_method,
             'LUNAS'::public.payment_status,
             null,
             $1::jsonb
           )`,
          [JSON.stringify([{ product_id: productId, quantity: 1 }])],
        ),
      ),
    /permission denied/i,
  );

  // --------------------------------------------------------------------------
  // Owner
  // --------------------------------------------------------------------------
  const dashboard = await runAs("authenticated", OWNER_ID, () =>
    db.query(`select public.dashboard_summary() as summary`),
  );
  assert.ok(dashboard.rows[0].summary.today.orders >= 1);
  log("owner can call dashboard_summary");

  const ownerUpdated = await runAs("authenticated", OWNER_ID, async () => {
    const result = await db.query(
      `select * from public.update_order(
         $1::uuid,
         'TRANSFER'::public.payment_method,
         'LUNAS'::public.payment_status,
         null,
         $2::jsonb
       )`,
      [oldOrderId, JSON.stringify([{ product_id: productId, quantity: 1 }])],
    );
    return result.rows[0];
  });
  assert.equal(ownerUpdated.total_amount, productPrice);
  assert.equal(ownerUpdated.is_edited, true);
  log("owner can edit a previous day's order");

  const ownerOrders = await runAs("authenticated", OWNER_ID, () =>
    db.query(`select count(*)::int as count from public.orders`),
  );
  assert.equal(ownerOrders.rows[0].count, 2);
  log("owner sees all orders");

  const ownerProfiles = await runAs("authenticated", OWNER_ID, () =>
    db.query(`select count(*)::int as count from public.profiles`),
  );
  assert.equal(ownerProfiles.rows[0].count, 3);
  log("owner can read all profiles");

  await expectError(
    "owner also cannot INSERT orders directly",
    () =>
      runAs("authenticated", OWNER_ID, () =>
        db.query(
          `insert into public.orders
             (receipt_number, cashier_id, channel, payment_method, payment_status, total_amount)
           values ('HACK-OWNER', $1, 'DINE_IN', 'CASH', 'LUNAS', 1)`,
          [OWNER_ID],
        ),
      ),
    /permission denied/i,
  );

  // --------------------------------------------------------------------------
  // Receipt numbering: increments per day, restarts on a new day
  // --------------------------------------------------------------------------
  const secondOrder = await runAs(
    "authenticated",
    CASHIER_ID,
    async () => {
      const result = await db.query(
        `select * from public.create_order(
           'TAKEAWAY'::public.order_channel,
           'CASH'::public.payment_method,
           'LUNAS'::public.payment_status,
           null,
           $1::jsonb
         )`,
        [JSON.stringify([{ product_id: productId, quantity: 1 }])],
      );
      return result.rows[0];
    },
    { commit: true },
  );
  assert.equal(secondOrder.receipt_number, `NYB-${todayJakarta}-0002`);
  log("second order of the day increments to 0002");

  const todayCounter = await db.query(
    `select last_number from public.receipt_counters where business_date = (now() at time zone 'Asia/Jakarta')::date`,
  );
  assert.equal(todayCounter.rows[0].last_number, 2);
  log("today's counter is stored per business date");

  const pastDate = "2026-10-24";
  const pastFirst = await db.query(`select public.next_receipt_number($1::date) as n`, [
    pastDate,
  ]);
  const pastSecond = await db.query(`select public.next_receipt_number($1::date) as n`, [
    pastDate,
  ]);
  assert.equal(pastFirst.rows[0].n, 1);
  assert.equal(pastSecond.rows[0].n, 2);
  log("a different business date starts its own counter at 0001");

  // --------------------------------------------------------------------------
  // Owner lockout protection
  // --------------------------------------------------------------------------
  await expectError(
    "owner cannot deactivate their own account",
    () =>
      runAs("authenticated", OWNER_ID, () =>
        db.query(`update public.profiles set is_active = false where id = $1`, [OWNER_ID]),
      ),
    /tidak dapat menonaktifkan/i,
  );

  await expectError(
    "owner cannot demote their own role",
    () =>
      runAs("authenticated", OWNER_ID, () =>
        db.query(`update public.profiles set role = 'EMPLOYEE' where id = $1`, [OWNER_ID]),
      ),
    /tidak dapat menonaktifkan atau menurunkan/i,
  );

  await db.query(`update public.profiles set role = 'OWNER' where id = $1`, [CASHIER_ID]);

  const demoted = await runAs(
    "authenticated",
    OWNER_ID,
    () =>
      db.query(
        `update public.profiles set role = 'EMPLOYEE' where id = $1 returning role`,
        [CASHIER_ID],
      ),
    { commit: true },
  );
  assert.equal(demoted.rows[0].role, "EMPLOYEE");
  log("owner can demote another owner while an active owner remains");

  await expectError(
    "last active owner cannot be deactivated",
    () => db.query(`update public.profiles set is_active = false where id = $1`, [OWNER_ID]),
    /Minimal harus ada satu Owner aktif/i,
  );

  // --------------------------------------------------------------------------
  // Hidden developer (0007 + 0008)
  // --------------------------------------------------------------------------
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data)
     values ($1, 'developer@test.local', '{"name":"Developer Test","username":"developer"}'::jsonb)`,
    [DEVELOPER_ID],
  );
  await db.query(`update public.profiles set role = 'DEVELOPER' where id = $1`, [DEVELOPER_ID]);
  log("developer profile created");

  const ownerProfileCount = await runAs("authenticated", OWNER_ID, () =>
    db.query(`select count(*)::int as count from public.profiles`),
  );
  assert.equal(ownerProfileCount.rows[0].count, 3, "owner must not see the developer row");
  log("owner cannot see the developer profile");

  const ownerDeveloperRead = await runAs("authenticated", OWNER_ID, () =>
    db.query(`select email from public.profiles where id = $1`, [DEVELOPER_ID]),
  );
  assert.equal(ownerDeveloperRead.rows.length, 0);
  log("owner cannot read the developer email");

  const ownerDeveloperUpdate = await runAs("authenticated", OWNER_ID, () =>
    db.query(
      `update public.profiles set is_active = false where id = $1 returning id`,
      [DEVELOPER_ID],
    ),
  );
  assert.equal(ownerDeveloperUpdate.rows.length, 0);
  log("owner cannot deactivate the developer");

  await expectError(
    "owner cannot promote an employee to developer",
    () =>
      runAs("authenticated", OWNER_ID, () =>
        db.query(
          `update public.profiles set role = 'DEVELOPER' where id = $1 returning role`,
          [CASHIER_ID],
        ),
      ),
    /row-level security/i,
  );

  await expectError(
    "owner cannot promote themselves to developer",
    () =>
      runAs("authenticated", OWNER_ID, () =>
        db.query(
          `update public.profiles set role = 'DEVELOPER' where id = $1 returning role`,
          [OWNER_ID],
        ),
      ),
    /row-level security/i,
  );

  const developerProfiles = await runAs("authenticated", DEVELOPER_ID, () =>
    db.query(`select count(*)::int as count from public.profiles`),
  );
  assert.equal(developerProfiles.rows[0].count, 4);
  log("developer can read every profile");

  const developerOrders = await runAs("authenticated", DEVELOPER_ID, () =>
    db.query(`select count(*)::int as count from public.orders`),
  );
  const ownerOrdersNow = await runAs("authenticated", OWNER_ID, () =>
    db.query(`select count(*)::int as count from public.orders`),
  );
  assert.equal(developerOrders.rows[0].count, ownerOrdersNow.rows[0].count);
  assert.ok(developerOrders.rows[0].count >= 2);
  log("developer is treated as an owner for order access");

  const developerUpdate = await runAs("authenticated", DEVELOPER_ID, () =>
    db.query(
      `update public.profiles set name = 'Kasir Test (dev edit)' where id = $1 returning name`,
      [CASHIER_ID],
    ),
  );
  assert.equal(developerUpdate.rows[0].name, "Kasir Test (dev edit)");
  log("developer can manage owner/employee profiles");

  await expectError(
    "developer cannot demote their own role",
    () =>
      runAs("authenticated", DEVELOPER_ID, () =>
        db.query(`update public.profiles set role = 'EMPLOYEE' where id = $1`, [DEVELOPER_ID]),
      ),
    /tidak dapat menonaktifkan atau menurunkan/i,
  );

  const directoryAfterDeveloper = await runAs("authenticated", CASHIER_ID, () =>
    db.query(`select name from public.staff_directory order by name`),
  );
  assert.equal(directoryAfterDeveloper.rows.length, 3);
  assert.ok(!directoryAfterDeveloper.rows.some((row) => row.name === "Developer Test"));
  log("staff directory hides the developer name");

  // --------------------------------------------------------------------------
  // Schema-level assertions
  // --------------------------------------------------------------------------
  const grants = await db.query(
    `select table_name, privilege_type
     from information_schema.role_table_grants
     where grantee = 'authenticated'
       and table_name in ('orders', 'order_items')
     order by table_name, privilege_type`,
  );
  assert.deepEqual(
    grants.rows.map((row) => `${row.table_name}:${row.privilege_type}`),
    ["order_items:SELECT", "orders:SELECT"],
    "authenticated should only have SELECT on order tables",
  );
  log("authenticated grants are SELECT-only on orders/order_items");

  const anonGrants = await db.query(
    `select table_name, privilege_type
     from information_schema.role_table_grants
     where grantee = 'anon'
       and table_name in ('orders', 'order_items')`,
  );
  assert.equal(anonGrants.rows.length, 0);
  log("anon has no grants on order tables");

  const sequenceGone = await db.query(`select to_regclass('public.receipt_seq') as name`);
  assert.equal(sequenceGone.rows[0].name, null);
  log("the global receipt sequence is gone");

  const counterAccess = await db.query(
    `select
       has_table_privilege('authenticated', 'public.receipt_counters', 'SELECT') as sel,
       (select relrowsecurity from pg_class where oid = 'public.receipt_counters'::regclass) as rls`,
  );
  assert.equal(counterAccess.rows[0].sel, false);
  assert.equal(counterAccess.rows[0].rls, true);
  log("receipt counters are RLS-protected and not readable by clients");

  const policies = await db.query(
    `select c.relname, p.polname, p.polcmd
     from pg_policy p
     join pg_class c on c.oid = p.polrelid
     where c.relname in ('orders', 'order_items')
     order by c.relname, p.polname`,
  );
  assert.deepEqual(
    policies.rows.map((row) => `${row.relname}:${row.polname}:${row.polcmd}`),
    ["order_items:order_items_select:r", "orders:orders_select:r"],
    "only SELECT policies should remain on order tables",
  );
  log("only SELECT policies remain on orders/order_items");

  const functions = await db.query(
    `select proname, proconfig
     from pg_proc
     where proname in (
       'handle_new_user',
       'protect_profile_fields',
       'is_active_staff',
       'is_owner',
       'is_developer',
       'dashboard_summary',
       'create_order',
       'update_order',
       'next_receipt_number'
     )
     order by proname`,
  );
  assert.equal(functions.rows.length, 9);
  for (const row of functions.rows) {
    assert.ok(
      (row.proconfig ?? []).includes("search_path=public, pg_temp"),
      `${row.proname} should pin search_path to public, pg_temp (got ${JSON.stringify(row.proconfig)})`,
    );
  }
  log("all SECURITY DEFINER functions pin search_path");

  // --------------------------------------------------------------------------
  // Product image storage (0006)
  // --------------------------------------------------------------------------
  const bucket = await db.query(
    `select public, file_size_limit, allowed_mime_types
     from storage.buckets
     where id = 'product-images'`,
  );
  assert.equal(bucket.rows.length, 1);
  assert.equal(bucket.rows[0].public, true);
  assert.equal(Number(bucket.rows[0].file_size_limit), 5 * 1024 * 1024);
  assert.deepEqual(
    [...bucket.rows[0].allowed_mime_types].sort(),
    ["image/avif", "image/jpeg", "image/png", "image/webp"],
  );
  log("product-images bucket is public with a 5 MB MIME allow-list");

  await db.query(`insert into storage.buckets (id, name) values ('other-bucket', 'other-bucket')`);
  await db.query(
    `insert into storage.objects (bucket_id, name) values ('other-bucket', 'private.webp')`,
  );

  await runAs(
    "authenticated",
    OWNER_ID,
    () =>
      db.query(
        `insert into storage.objects (bucket_id, name) values ('product-images', 'owner.webp')`,
      ),
    { commit: true },
  );
  log("owner can upload a product image");

  await expectError(
    "cashier cannot upload a product image",
    () =>
      runAs("authenticated", CASHIER_ID, () =>
        db.query(
          `insert into storage.objects (bucket_id, name) values ('product-images', 'cashier.webp')`,
        ),
      ),
    /row-level security/i,
  );

  await expectError(
    "owner cannot write to another bucket",
    () =>
      runAs("authenticated", OWNER_ID, () =>
        db.query(
          `insert into storage.objects (bucket_id, name) values ('other-bucket', 'sneaky.webp')`,
        ),
      ),
    /row-level security/i,
  );

  const anonObjects = await runAs("anon", null, () =>
    db.query(`select bucket_id, name from storage.objects order by name`),
  );
  assert.deepEqual(
    anonObjects.rows.map((row) => `${row.bucket_id}:${row.name}`),
    ["product-images:owner.webp"],
  );
  log("anon can read product images but not other buckets");

  console.log("\nAll RLS/RPC checks passed.\n");
}

main()
  .then(() => db.close())
  .catch(async (error) => {
    console.error("\nRLS/RPC test failed:\n", error);
    await db.close().catch(() => {});
    process.exitCode = 1;
  });
