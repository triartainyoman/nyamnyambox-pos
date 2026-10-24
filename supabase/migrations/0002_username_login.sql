-- ============================================================================
-- Nyamnyambox POS — username login for cashiers
-- Safe to run on an existing database created by 0001_init.sql.
-- Owners keep signing in with email; only active EMPLOYEE profiles can be
-- resolved from a username by the login server action.
-- ============================================================================

alter table public.profiles add column if not exists username text;

-- Backfill existing accounts from the email prefix, de-duplicating collisions.
do $$
declare
  profile_row record;
  base_username text;
  candidate text;
  suffix int;
begin
  for profile_row in
    select id, email from public.profiles where username is null
  loop
    base_username := lower(split_part(profile_row.email, '@', 1));
    base_username := regexp_replace(base_username, '[^a-z0-9._-]', '', 'g');

    if base_username !~ '^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$' then
      base_username := 'user';
    end if;

    candidate := base_username;
    suffix := 0;
    while exists (
      select 1 from public.profiles
      where lower(username) = candidate and id <> profile_row.id
    ) loop
      suffix := suffix + 1;
      candidate := left(base_username, 26) || suffix::text;
    end loop;

    update public.profiles set username = candidate where id = profile_row.id;
  end loop;
end;
$$;

alter table public.profiles alter column username set not null;

do $$ begin
  alter table public.profiles
    add constraint profiles_username_format
    check (username ~ '^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$');
exception when duplicate_object then null; end $$;

create unique index if not exists profiles_username_key
  on public.profiles (lower(username));

comment on column public.profiles.username is
  'Cashier login handle (lowercase). Owners sign in with email only.';

-- ----------------------------------------------------------------------------
-- Keep the profile bootstrap trigger in sync with the new column.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  suffix int := 0;
begin
  base_username := lower(
    coalesce(
      nullif(new.raw_user_meta_data->>'username', ''),
      split_part(new.email, '@', 1)
    )
  );
  base_username := regexp_replace(base_username, '[^a-z0-9._-]', '', 'g');

  if base_username !~ '^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$' then
    base_username := 'user';
  end if;

  candidate := base_username;
  while exists (select 1 from public.profiles where lower(username) = candidate) loop
    suffix := suffix + 1;
    candidate := left(base_username, 26) || suffix::text;
  end loop;

  insert into public.profiles (id, username, name, email, role)
  values (
    new.id,
    candidate,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)),
    new.email,
    'EMPLOYEE'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Employees may update their own name, but never their username, role,
-- active flag, or email.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_owner() then
    new.username := old.username;
    new.role := old.role;
    new.is_active := old.is_active;
    new.email := old.email;
  end if;
  return new;
end;
$$;
