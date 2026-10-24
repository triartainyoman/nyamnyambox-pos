-- Seed menu for local development (`supabase db reset`).
-- The migration already seeds when the catalog is empty, this file is kept
-- separate so the catalog can be re-seeded without re-running the schema.
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
