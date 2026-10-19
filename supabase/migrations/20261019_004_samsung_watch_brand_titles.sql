-- Montres sans marque confirmées Samsung par le propriétaire : marque + titres Galaxy Watch.
-- Idempotent : ne touche que les anciens noms.
BEGIN;

UPDATE public.products p
SET name  = r.new_name,
    brand = COALESCE(p.brand, (SELECT id FROM public.brands WHERE name = 'Samsung'))
FROM (VALUES
  ('Watch 7 44mm',     'Samsung Galaxy Watch7 44 mm'),
  ('Watch 8 44 mm',    'Samsung Galaxy Watch8 44 mm'),
  ('Watch 8 classic',  'Samsung Galaxy Watch8 Classic'),
  ('Watch ultra 2024', 'Samsung Galaxy Watch Ultra 2024'),
  ('Watch ultra 2025', 'Samsung Galaxy Watch Ultra 2025')
) AS r(old_name, new_name)
WHERE p.name = r.old_name;

COMMIT;
