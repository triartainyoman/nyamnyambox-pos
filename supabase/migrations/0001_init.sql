-- ============================================================================
-- Nyamnyambox POS — initial schema (MVP)
-- Run this in the Supabase SQL editor, or via `supabase db push`.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. ENUM TYPES
-- ----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('MASTER_ADMIN', 'OWNER', 'EMPLOYEE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_channel as enum ('DINE_IN', 'TAKEAWAY', 'GRABFOOD', 'SHOPEEFOOD', 'WHATSAPP');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('CASH', 'TRANSFER', 'QRIS', 'E_WALLET');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('LUNAS', 'BELUM_LUNAS');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- 2. TABLES
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  -- Cashier login handle. Owners sign in with email only (PRD 3.3).
  username text not null,
  name text not null,
  email text unique not null,
  role public.user_role not null default 'EMPLOYEE',
  -- Added for the "deactivate cashier" requirement (PRD 3.2).
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username ~ '^[a-z0-9][a-z0-9._-]{1,28}[a-z0-9]$'
  )
);

create unique index if not exists profiles_username_key on public.profiles (lower(username));

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price int not null check (price >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  receipt_number text unique not null,
  cashier_id uuid references public.profiles(id) on delete set null,
  channel public.order_channel not null,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'LUNAS',
  total_amount int not null check (total_amount >= 0),
  is_edited boolean not null default false,
  customer_phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity int not null check (quantity > 0),
  price_at_transaction int not null check (price_at_transaction >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create sequence if not exists public.receipt_seq start with 1;

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_cashier_id_idx on public.orders (cashier_id);
create index if not exists orders_channel_idx on public.orders (channel);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);
create index if not exists products_active_idx on public.products (is_active);

-- ----------------------------------------------------------------------------
-- 3. PROFILE BOOTSTRAP TRIGGER
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

  -- Manual auth users may have an email prefix that is too short or invalid.
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
    'EMPLOYEE' -- roles are assigned by the Owner / service role, never via signup metadata
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Employees may update their own name, but never their role or active flag.
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

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
before update on public.profiles
for each row execute function public.protect_profile_fields();

-- ----------------------------------------------------------------------------
-- 4. AUTHORIZATION HELPERS
-- ----------------------------------------------------------------------------
create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active
      and p.role in ('OWNER', 'MASTER_ADMIN')
  );
$$;

grant execute on function public.is_active_staff() to authenticated;
grant execute on function public.is_owner() to authenticated;

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (public.is_active_staff());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update to authenticated
using (id = auth.uid() or public.is_owner())
with check (id = auth.uid() or public.is_owner());

drop policy if exists products_select on public.products;
create policy products_select on public.products
for select to authenticated
using (public.is_active_staff());

drop policy if exists products_insert on public.products;
create policy products_insert on public.products
for insert to authenticated
with check (public.is_owner());

drop policy if exists products_update on public.products;
create policy products_update on public.products
for update to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders
for select to authenticated
using (
  public.is_owner()
  or (
    public.is_active_staff()
    and (created_at at time zone 'Asia/Jakarta')::date
        = (now() at time zone 'Asia/Jakarta')::date
  )
);

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
for insert to authenticated
with check (public.is_active_staff() and cashier_id = auth.uid());

drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders
for update to authenticated
using (
  public.is_owner()
  or (
    public.is_active_staff()
    and (created_at at time zone 'Asia/Jakarta')::date
        = (now() at time zone 'Asia/Jakarta')::date
  )
)
with check (public.is_owner() or public.is_active_staff());

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items
for select to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (
        public.is_owner()
        or (
          public.is_active_staff()
          and (o.created_at at time zone 'Asia/Jakarta')::date
              = (now() at time zone 'Asia/Jakarta')::date
        )
      )
  )
);

drop policy if exists order_items_write on public.order_items;
create policy order_items_write on public.order_items
for all to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (
        public.is_owner()
        or (
          public.is_active_staff()
          and (o.created_at at time zone 'Asia/Jakarta')::date
              = (now() at time zone 'Asia/Jakarta')::date
        )
      )
  )
)
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (
        public.is_owner()
        or (
          public.is_active_staff()
          and (o.created_at at time zone 'Asia/Jakarta')::date
              = (now() at time zone 'Asia/Jakarta')::date
        )
      )
  )
);

-- ----------------------------------------------------------------------------
-- 6. ORDER FUNCTIONS (atomic create / edit, server-side pricing)
-- ----------------------------------------------------------------------------
create or replace function public.create_order(
  p_channel public.order_channel,
  p_payment_method public.payment_method,
  p_payment_status public.payment_status,
  p_customer_phone text,
  p_items jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_product public.products;
  v_quantity int;
  v_total int := 0;
  v_receipt text;
begin
  if not public.is_active_staff() then
    raise exception 'Akun tidak aktif atau tidak terautentikasi';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang pesanan kosong';
  end if;

  -- Validate everything before writing anything.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := coalesce((v_item->>'quantity')::int, 0);
    if v_quantity <= 0 then
      raise exception 'Kuantitas item tidak valid';
    end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and is_active;

    if v_product.id is null then
      raise exception 'Produk tidak tersedia: %', coalesce(v_item->>'product_id', '-');
    end if;

    v_total := v_total + (v_product.price * v_quantity);
  end loop;

  v_receipt := 'NYB-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDD')
    || '-' || lpad(nextval('public.receipt_seq')::text, 4, '0');

  insert into public.orders (
    receipt_number, cashier_id, channel, payment_method, payment_status, total_amount, customer_phone
  )
  values (
    v_receipt, auth.uid(), p_channel, p_payment_method, p_payment_status, v_total,
    nullif(trim(coalesce(p_customer_phone, '')), '')
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::int;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid;

    insert into public.order_items (order_id, product_id, quantity, price_at_transaction, notes)
    values (
      v_order.id,
      v_product.id,
      v_quantity,
      v_product.price,
      nullif(trim(coalesce(v_item->>'notes', '')), '')
    );
  end loop;

  return v_order;
end;
$$;

create or replace function public.update_order(
  p_order_id uuid,
  p_payment_method public.payment_method,
  p_payment_status public.payment_status,
  p_customer_phone text,
  p_items jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_product public.products;
  v_quantity int;
  v_total int := 0;
begin
  if not public.is_active_staff() then
    raise exception 'Akun tidak aktif atau tidak terautentikasi';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then
    raise exception 'Transaksi tidak ditemukan';
  end if;

  if not (
    public.is_owner()
    or (v_order.created_at at time zone 'Asia/Jakarta')::date
       = (now() at time zone 'Asia/Jakarta')::date
  ) then
    raise exception 'Transaksi hanya dapat diedit pada hari yang sama';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Pesanan harus memiliki minimal satu item';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := coalesce((v_item->>'quantity')::int, 0);
    if v_quantity <= 0 then
      raise exception 'Kuantitas item tidak valid';
    end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid;

    if v_product.id is null then
      raise exception 'Produk tidak ditemukan';
    end if;

    v_total := v_total + (v_product.price * v_quantity);
  end loop;

  delete from public.order_items where order_id = p_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid;

    insert into public.order_items (order_id, product_id, quantity, price_at_transaction, notes)
    values (
      p_order_id,
      v_product.id,
      (v_item->>'quantity')::int,
      v_product.price,
      nullif(trim(coalesce(v_item->>'notes', '')), '')
    );
  end loop;

  update public.orders
  set payment_method = p_payment_method,
      payment_status = p_payment_status,
      customer_phone = nullif(trim(coalesce(p_customer_phone, '')), ''),
      total_amount = v_total,
      is_edited = true
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. DASHBOARD AGGREGATION
-- ----------------------------------------------------------------------------
create or replace function public.dashboard_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_month_start date := date_trunc('month', (now() at time zone 'Asia/Jakarta'))::date;
  v_result jsonb;
begin
  if not public.is_owner() then
    raise exception 'Akses ditolak';
  end if;

  with today_orders as (
    select * from public.orders
    where (created_at at time zone 'Asia/Jakarta')::date = v_today
  ),
  paid_today as (
    select * from today_orders where payment_status = 'LUNAS'
  ),
  months as (
    select to_char(
      generate_series(v_month_start - interval '5 months', v_month_start, interval '1 month'),
      'YYYY-MM'
    ) as month
  ),
  monthly as (
    select m.month,
      coalesce(sum(o.total_amount) filter (where o.payment_status = 'LUNAS'), 0)::int as revenue,
      count(o.id)::int as orders
    from months m
    left join public.orders o
      on to_char((o.created_at at time zone 'Asia/Jakarta'), 'YYYY-MM') = m.month
    group by m.month
    order by m.month
  ),
  channels as (
    select o.channel,
      coalesce(sum(o.total_amount), 0)::int as revenue,
      count(*)::int as orders
    from public.orders o
    where o.payment_status = 'LUNAS'
      and (o.created_at at time zone 'Asia/Jakarta')::date >= v_month_start
    group by o.channel
  ),
  top_products as (
    select p.id as product_id, p.name,
      sum(oi.quantity)::int as quantity,
      sum(oi.quantity * oi.price_at_transaction)::int as revenue
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.products p on p.id = oi.product_id
    where o.payment_status = 'LUNAS'
      and (o.created_at at time zone 'Asia/Jakarta')::date >= v_month_start
    group by p.id, p.name
    order by quantity desc
    limit 5
  )
  select jsonb_build_object(
    'today', jsonb_build_object(
      'revenue', coalesce((select sum(total_amount) from paid_today), 0)::int,
      'orders', (select count(*) from today_orders)::int,
      'paid_orders', (select count(*) from paid_today)::int,
      'unpaid_orders', (select count(*) from today_orders where payment_status = 'BELUM_LUNAS')::int,
      'aov', case
        when (select count(*) from paid_today) > 0
          then (coalesce((select sum(total_amount) from paid_today), 0) / (select count(*) from paid_today))::int
        else 0
      end
    ),
    'monthly', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month', month,
        'revenue', revenue,
        'orders', orders
      ) order by month)
      from monthly
    ), '[]'::jsonb),
    'channels', coalesce((
      select jsonb_agg(jsonb_build_object(
        'channel', channel,
        'revenue', revenue,
        'orders', orders
      ))
      from channels
    ), '[]'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_id', product_id,
        'name', name,
        'quantity', quantity,
        'revenue', revenue
      ))
      from top_products
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.create_order(public.order_channel, public.payment_method, public.payment_status, text, jsonb) from public;
revoke all on function public.update_order(uuid, public.payment_method, public.payment_status, text, jsonb) from public;
revoke all on function public.dashboard_summary() from public;

grant execute on function public.create_order(public.order_channel, public.payment_method, public.payment_status, text, jsonb) to authenticated;
grant execute on function public.update_order(uuid, public.payment_method, public.payment_status, text, jsonb) to authenticated;
grant execute on function public.dashboard_summary() to authenticated;

-- ----------------------------------------------------------------------------
-- 8. SEED MENU (only when the catalog is empty)
-- ----------------------------------------------------------------------------
insert into public.products (name, price, image_url, is_active)
select * from (
  values
    ('Thai Basil Chicken', 20000, '/images/thai-basil.svg', true),
    ('Chicken Salted Egg', 20000, '/images/salted-egg.svg', true),
    ('Chicken BBQ Cheese', 23000, '/images/bbq-cheese.svg', true),
    ('Mac & Cheese Ball', 15000, '/images/mac-cheese.svg', true),
    ('Kentang & Sosis', 15000, '/images/kentang-sosis.svg', true),
    ('Chicken Popcorn', 15000, '/images/popcorn.svg', true),
    ('Es Teh Manis', 4000, '/images/es-teh.svg', true),
    ('[PROMO] Thai Basil + Free Es Teh', 20000, '/images/promo-thai-basil.svg', true)
) as seed(name, price, image_url, is_active)
where not exists (select 1 from public.products);

-- ----------------------------------------------------------------------------
-- 9. FIRST OWNER
-- ----------------------------------------------------------------------------
-- 1) Create the owner account in Authentication > Users (email + password).
-- 2) Promote it with:
--    update public.profiles set role = 'OWNER' where email = 'owner@nyamnyambox.com';
