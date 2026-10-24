-- ============================================================================
-- Nyamnyambox POS — profile privacy & owner account protection
--
-- 1. Staff can only read their own profile row. Owners (and master admins) can
--    read every profile. This stops a cashier from reading other staff emails.
-- 2. A minimal `staff_directory` view exposes only `id` and `name` so order
--    history and receipts can still show the cashier name without leaking
--    contact data. The view is owned by the migration role and therefore
--    bypasses profiles RLS by design.
-- 3. A privileged account cannot deactivate or demote itself, and the last
--    active owner cannot be removed. This prevents a permanent lockout.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Profile visibility: self or owner
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_owner());

-- ----------------------------------------------------------------------------
-- 2. Minimal staff directory for order/receipt display
--    No email, username, role, or active flag is exposed.
-- ----------------------------------------------------------------------------
create or replace view public.staff_directory
with (security_invoker = false)
as
select id, name
from public.profiles;

revoke all on public.staff_directory from public, anon;
grant select on public.staff_directory to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Owner lockout protection
--    Extends the existing field guard instead of adding a second trigger so
--    the checks always run in a predictable order.
-- ----------------------------------------------------------------------------
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_other_active_owners int;
begin
  -- Non-owners may not change identity or privilege fields.
  if v_uid is not null and not public.is_owner() then
    new.username := old.username;
    new.role := old.role;
    new.is_active := old.is_active;
    new.email := old.email;
  end if;

  -- An owner may not lock themselves out, and the last active owner must stay.
  if old.role in ('OWNER', 'MASTER_ADMIN')
     and (
       new.role not in ('OWNER', 'MASTER_ADMIN')
       or (old.is_active and not new.is_active)
     ) then
    if v_uid is not null and old.id = v_uid then
      raise exception 'Akun Owner tidak dapat menonaktifkan atau menurunkan role dirinya sendiri';
    end if;

    select count(*) into v_other_active_owners
    from public.profiles
    where id <> old.id
      and role in ('OWNER', 'MASTER_ADMIN')
      and is_active;

    if v_other_active_owners = 0 then
      raise exception 'Minimal harus ada satu Owner aktif';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_fields() from public, anon, authenticated;
