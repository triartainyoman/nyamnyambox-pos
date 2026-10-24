-- ============================================================================
-- Nyamnyambox POS — production schema verification
--
-- Run this in the Supabase SQL Editor AFTER applying:
--   0001_init.sql
--   0002_username_login.sql
--   0003_harden_order_writes.sql
--   0004_profile_privacy.sql
--   0005_daily_receipt_numbers.sql
--
-- Every row should show OK. The only expected FAIL before the first Owner is
-- promoted is "active owner exists".
-- ============================================================================

with checks as (
  -- Tables ------------------------------------------------------------------
  select
    'tables exist' as check_name,
    count(*) = 5 as ok,
    coalesce(string_agg(table_name, ', ' order by table_name), '-') as detail
  from information_schema.tables
  where table_schema = 'public'
    and table_name in ('profiles', 'products', 'orders', 'order_items', 'receipt_counters')

  union all

  -- Enums -------------------------------------------------------------------
  select
    'enums exist',
    count(*) = 4,
    coalesce(string_agg(t.typname, ', ' order by t.typname), '-')
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and t.typname in ('user_role', 'order_channel', 'payment_method', 'payment_status')

  union all

  -- Seed menu ---------------------------------------------------------------
  select
    'seed menu present',
    count(*) >= 8,
    count(*)::text || ' products'
  from public.products

  union all

  -- Username uniqueness -----------------------------------------------------
  select
    'username unique index',
    exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = 'profiles'
        and indexname = 'profiles_username_key'
    ),
    'profiles_username_key'

  union all

  -- RLS ---------------------------------------------------------------------
  select
    'RLS enabled',
    count(*) = 5,
    coalesce(string_agg(c.relname, ', ' order by c.relname), '-')
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('profiles', 'products', 'orders', 'order_items', 'receipt_counters')
    and c.relrowsecurity

  union all

  -- Expected policies -------------------------------------------------------
  select
    'expected policies present',
    count(*) = 7,
    coalesce(string_agg(p.polname, ', ' order by p.polname), '-')
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and p.polname in (
      'profiles_select',
      'profiles_update',
      'products_select',
      'products_insert',
      'products_update',
      'orders_select',
      'order_items_select'
    )

  union all

  -- Direct write policies must be gone --------------------------------------
  select
    'no direct order write policies',
    count(*) = 0,
    coalesce(string_agg(p.polname, ', ' order by p.polname), 'none')
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and p.polname in ('orders_insert', 'orders_update', 'order_items_write')

  union all

  -- Functions ---------------------------------------------------------------
  select
    'functions exist',
    count(*) = 8,
    coalesce(string_agg(p.proname, ', ' order by p.proname), '-')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'handle_new_user',
      'protect_profile_fields',
      'is_active_staff',
      'is_owner',
      'dashboard_summary',
      'create_order',
      'update_order',
      'next_receipt_number'
    )

  union all

  -- search_path pinned on every SECURITY DEFINER function -------------------
  select
    'security definer search_path',
    count(*) = 8,
    coalesce(string_agg(p.proname, ', ' order by p.proname), '-')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and p.proname in (
      'handle_new_user',
      'protect_profile_fields',
      'is_active_staff',
      'is_owner',
      'dashboard_summary',
      'create_order',
      'update_order',
      'next_receipt_number'
    )
    and 'search_path=public, pg_temp' = any (coalesce(p.proconfig, array[]::text[]))

  union all

  -- Order tables are SELECT-only for authenticated -------------------------
  select
    'authenticated order grants',
    count(*) = 2
      and count(*) filter (where g.privilege_type <> 'SELECT') = 0,
    coalesce(string_agg(g.table_name || ':' || g.privilege_type, ', ' order by g.table_name), '-')
  from information_schema.role_table_grants g
  where g.grantee = 'authenticated'
    and g.table_schema = 'public'
    and g.table_name in ('orders', 'order_items')

  union all

  -- Receipt sequence removed ------------------------------------------------
  select
    'global receipt sequence removed',
    to_regclass('public.receipt_seq') is null,
    'receipt_seq'

  union all

  -- Receipt counters are private -------------------------------------------
  select
    'receipt counters private',
    has_table_privilege('authenticated', 'public.receipt_counters', 'SELECT') = false,
    'receipt_counters'

  union all

  -- Staff directory view ----------------------------------------------------
  select
    'staff_directory view',
    (
      select count(*) = 2
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'staff_directory'
        and column_name in ('id', 'name')
    ),
    'id, name'

  union all

  -- RPC grants --------------------------------------------------------------
  select
    'authenticated can execute RPCs',
    count(*) = 3,
    coalesce(string_agg(p.proname, ', ' order by p.proname), '-')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('create_order', 'update_order', 'dashboard_summary')
    and has_function_privilege('authenticated', p.oid, 'EXECUTE')

  union all

  -- Anonymous access must be denied ----------------------------------------
  select
    'anon cannot execute RPCs',
    count(*) = 3,
    coalesce(string_agg(p.proname, ', ' order by p.proname), '-')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('create_order', 'update_order', 'dashboard_summary')
    and not has_function_privilege('anon', p.oid, 'EXECUTE')

  union all

  -- First Owner (run after promoting the owner account) ---------------------
  select
    'active owner exists',
    count(*) >= 1,
    count(*)::text || ' active owner/master admin'
  from public.profiles
  where role in ('OWNER', 'MASTER_ADMIN')
    and is_active
)
select
  check_name,
  case when ok then 'OK' else 'FAIL' end as status,
  detail
from checks
order by ok, check_name;
