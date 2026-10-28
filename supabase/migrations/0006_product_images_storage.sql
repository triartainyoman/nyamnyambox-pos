-- ============================================================================
-- Nyamnyambox POS — Phase 2: product image storage
--
-- Owners can upload menu photos from /products. The browser uploads directly
-- to Supabase Storage with the signed-in user's JWT, so authorization is
-- enforced here, not in the client:
--   * read   → public (the bucket is public, images render in <img>)
--   * write  → authenticated + public.is_owner()
--
-- SVG is deliberately excluded: it is an active content type and product
-- images never need vectors. Size and MIME are enforced by the bucket itself,
-- so a crafted request cannot bypass the client-side checks.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read: the bucket is public, and a select policy keeps the dashboard
-- object browser (and future listing features) working for signed-in staff.
drop policy if exists product_images_read on storage.objects;
create policy product_images_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists product_images_insert on storage.objects;
create policy product_images_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'product-images' and public.is_owner());

drop policy if exists product_images_update on storage.objects;
create policy product_images_update on storage.objects
for update to authenticated
using (bucket_id = 'product-images' and public.is_owner())
with check (bucket_id = 'product-images' and public.is_owner());

drop policy if exists product_images_delete on storage.objects;
create policy product_images_delete on storage.objects
for delete to authenticated
using (bucket_id = 'product-images' and public.is_owner());
