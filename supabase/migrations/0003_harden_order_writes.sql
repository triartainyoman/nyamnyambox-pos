-- ============================================================================
-- Nyamnyambox POS — lock down direct order writes
--
-- Before this migration the `authenticated` role could INSERT/UPDATE/DELETE
-- `orders` and `order_items` directly (RLS only limited *which rows*). That
-- let a cashier bypass the server-side pricing/validation in the RPCs by
-- calling PostgREST directly, e.g. setting `total_amount` or inserting an
-- `order_items` row with an arbitrary `price_at_transaction`.
--
-- From now on all order mutations must go through the SECURITY DEFINER RPCs:
--   * public.create_order(...)
--   * public.update_order(...)
-- Reads stay available through the existing SELECT policies.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Orders and order items: read-only for clients
-- ----------------------------------------------------------------------------
revoke all on table public.orders from public;
revoke all on table public.orders from anon, authenticated;
grant select on table public.orders to authenticated;

revoke all on table public.order_items from public;
revoke all on table public.order_items from anon, authenticated;
grant select on table public.order_items to authenticated;

-- The receipt sequence is an implementation detail of create_order(). Clients
-- must not be able to consume/drain it with nextval().
revoke all on sequence public.receipt_seq from public;
revoke all on sequence public.receipt_seq from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Remove write policies that are no longer reachable
-- ----------------------------------------------------------------------------
drop policy if exists orders_insert on public.orders;
drop policy if exists orders_update on public.orders;
drop policy if exists order_items_write on public.order_items;

-- Keep RLS enabled even though privileges above already block writes.
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- ----------------------------------------------------------------------------
-- 3. RPC execution is explicit: authenticated only
-- ----------------------------------------------------------------------------
revoke all on function public.create_order(
  public.order_channel,
  public.payment_method,
  public.payment_status,
  text,
  jsonb
) from public, anon;
grant execute on function public.create_order(
  public.order_channel,
  public.payment_method,
  public.payment_status,
  text,
  jsonb
) to authenticated;

revoke all on function public.update_order(
  uuid,
  public.payment_method,
  public.payment_status,
  text,
  jsonb
) from public, anon;
grant execute on function public.update_order(
  uuid,
  public.payment_method,
  public.payment_status,
  text,
  jsonb
) to authenticated;

revoke all on function public.dashboard_summary() from public, anon;
grant execute on function public.dashboard_summary() to authenticated;

-- Authorization helpers are used by RLS policies. Expose them to signed-in
-- users only; the SQL bodies themselves still check auth.uid().
revoke all on function public.is_active_staff() from public, anon;
grant execute on function public.is_active_staff() to authenticated;

revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

-- Trigger helpers should never be callable by API clients.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_fields() from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Pin search_path on every SECURITY DEFINER function
--    `pg_temp` last prevents temp-schema shadowing attacks.
-- ----------------------------------------------------------------------------
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.protect_profile_fields() set search_path = public, pg_temp;
alter function public.is_active_staff() set search_path = public, pg_temp;
alter function public.is_owner() set search_path = public, pg_temp;
alter function public.dashboard_summary() set search_path = public, pg_temp;
alter function public.create_order(
  public.order_channel,
  public.payment_method,
  public.payment_status,
  text,
  jsonb
) set search_path = public, pg_temp;
alter function public.update_order(
  uuid,
  public.payment_method,
  public.payment_status,
  text,
  jsonb
) set search_path = public, pg_temp;
