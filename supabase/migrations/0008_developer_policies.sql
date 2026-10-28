-- ============================================================================
-- Nyamnyambox POS — hidden DEVELOPER account
--
-- The DEVELOPER role is a super-owner used for maintenance. It must be
-- invisible and untouchable to Owners and cashiers:
--
-- 1. `is_developer()` identifies the active developer, `is_owner()` treats the
--    developer as an owner for every existing policy/RPC.
-- 2. Profile reads/updates exclude DEVELOPER rows for everyone except the
--    developer themselves. An Owner therefore cannot see, edit, deactivate or
--    promote/demote a developer through PostgREST.
-- 3. `staff_directory` (used by order history/receipts) hides developer names.
-- 4. `protect_profile_fields` refuses developer edits from non-developers and
--    counts the developer as a privileged account for lockout protection.
--
-- There is intentionally no client-side DELETE policy on `profiles`: nobody
-- except the service role can delete accounts, so the developer row is safe.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Authorization helpers
-- ----------------------------------------------------------------------------
create or replace function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active
      and p.role = 'DEVELOPER'
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active
      and p.role in ('OWNER', 'MASTER_ADMIN', 'DEVELOPER')
  );
$$;

grant execute on function public.is_developer() to authenticated;
grant execute on function public.is_owner() to authenticated;

-- ----------------------------------------------------------------------------
-- 2. Profile visibility & updates
--    Self always sees itself (needed at login). Owners see every non-developer
--    row. Only a developer can read or write developer rows.
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or (public.is_owner() and (public.is_developer() or role <> 'DEVELOPER'))
);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update to authenticated
using (
  id = auth.uid()
  or (public.is_owner() and (public.is_developer() or role <> 'DEVELOPER'))
)
with check (
  (
    id = auth.uid()
    or (public.is_owner() and (public.is_developer() or role <> 'DEVELOPER'))
  )
  -- Even on their own row, a non-developer may never grant the hidden role.
  and (public.is_developer() or role <> 'DEVELOPER')
);

-- ----------------------------------------------------------------------------
-- 3. Minimal staff directory (order history / receipts) hides developers
-- ----------------------------------------------------------------------------
create or replace view public.staff_directory
with (security_invoker = false)
as
select id, name
from public.profiles
where role <> 'DEVELOPER';

revoke all on public.staff_directory from public, anon;
grant select on public.staff_directory to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Profile trigger: developer protection + lockout guard
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
  -- A developer account can only be changed by a developer (or service role).
  if old.role = 'DEVELOPER' and v_uid is not null and not public.is_developer() then
    raise exception 'Akun Developer hanya dapat diubah oleh Developer';
  end if;

  -- Non-owners may not change identity or privilege fields.
  if v_uid is not null and not public.is_owner() then
    new.username := old.username;
    new.role := old.role;
    new.is_active := old.is_active;
    new.email := old.email;
  end if;

  -- A privileged account may not lock themselves out, and at least one active
  -- privileged account (Owner/Master Admin/Developer) must stay.
  if old.role in ('OWNER', 'MASTER_ADMIN', 'DEVELOPER')
     and (
       new.role not in ('OWNER', 'MASTER_ADMIN', 'DEVELOPER')
       or (old.is_active and not new.is_active)
     ) then
    if v_uid is not null and old.id = v_uid then
      raise exception 'Akun Owner tidak dapat menonaktifkan atau menurunkan role dirinya sendiri';
    end if;

    select count(*) into v_other_active_owners
    from public.profiles
    where id <> old.id
      and role in ('OWNER', 'MASTER_ADMIN', 'DEVELOPER')
      and is_active;

    if v_other_active_owners = 0 then
      raise exception 'Minimal harus ada satu Owner aktif';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_fields() from public, anon, authenticated;
