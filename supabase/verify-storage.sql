-- ============================================================================
-- Nyamnyambox POS — Storage verification (Phase 2)
--
-- Run in the Supabase SQL Editor AFTER 0006_product_images_storage.sql.
-- This is intentionally separate from `verify.sql`: Storage objects live in
-- the `storage` schema, which is not part of `pg_dump --schema=public`, so the
-- restore drill (PGlite) has no `storage` schema to check.
--
-- Every row should show OK.
-- ============================================================================

with checks as (
  select
    'product-images bucket exists' as check_name,
    exists (select 1 from storage.buckets where id = 'product-images') as ok,
    coalesce(
      (select 'public=' || public || ', limit=' || file_size_limit
       from storage.buckets where id = 'product-images'),
      '-'
    ) as detail

  union all

  select
    'bucket is public with 5 MB limit',
    coalesce(
      (select public and file_size_limit = 5242880
       from storage.buckets where id = 'product-images'),
      false
    ),
    'public, 5242880 bytes'

  union all

  select
    'bucket MIME allow-list',
    coalesce(
      (select allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
       from storage.buckets where id = 'product-images'),
      false
    ),
    coalesce(
      (select array_to_string(allowed_mime_types, ', ')
       from storage.buckets where id = 'product-images'),
      '-'
    )

  union all

  select
    'product image policies',
    count(*) = 4,
    coalesce(string_agg(p.polname, ', ' order by p.polname), '-')
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'storage'
    and c.relname = 'objects'
    and p.polname in (
      'product_images_read',
      'product_images_insert',
      'product_images_update',
      'product_images_delete'
    )
)
select
  check_name,
  case when ok then 'OK' else 'FAIL' end as status,
  detail
from checks
order by ok, check_name;
