-- ============================================================================
-- Nyamnyambox POS — daily receipt numbers
--
-- The original schema used one global sequence, so numbers never restarted and
-- the README claim of `NYB-YYYYMMDD-0001` per day was wrong. Receipt numbers
-- are now allocated from a per-business-day counter:
--
--   receipt_counters(business_date primary key, last_number)
--
-- Allocation uses INSERT ... ON CONFLICT DO UPDATE ... RETURNING, which takes a
-- row lock and makes concurrent checkouts safe. A new day starts at 0001
-- because it is a different primary key.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Per-day counter table
-- ----------------------------------------------------------------------------
create table if not exists public.receipt_counters (
  business_date date primary key,
  last_number int not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now()
);

alter table public.receipt_counters enable row level security;

-- Clients never touch this table directly; only the SECURITY DEFINER helpers.
revoke all on table public.receipt_counters from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Atomic allocator
--    Kept private: only SECURITY DEFINER functions (create_order) may call it.
-- ----------------------------------------------------------------------------
create or replace function public.next_receipt_number(p_business_date date)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_number int;
begin
  if p_business_date is null then
    raise exception 'Tanggal bisnis tidak valid';
  end if;

  insert into public.receipt_counters (business_date, last_number, updated_at)
  values (p_business_date, 1, now())
  on conflict (business_date) do update
    set last_number = public.receipt_counters.last_number + 1,
        updated_at = now()
  returning last_number into v_number;

  return v_number;
end;
$$;

revoke all on function public.next_receipt_number(date) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Recreate create_order with the daily allocator
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
set search_path = public, pg_temp
as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_product public.products;
  v_quantity int;
  v_total int := 0;
  v_business_date date;
  v_receipt_number int;
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

  v_business_date := (now() at time zone 'Asia/Jakarta')::date;
  v_receipt_number := public.next_receipt_number(v_business_date);
  v_receipt := 'NYB-' || to_char(v_business_date, 'YYYYMMDD')
    || '-' || lpad(v_receipt_number::text, 4, '0');

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

-- ----------------------------------------------------------------------------
-- 4. Retire the global sequence
-- ----------------------------------------------------------------------------
drop sequence if exists public.receipt_seq;
