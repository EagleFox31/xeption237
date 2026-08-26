-- Fix classement Xiaomi : les gammes « Standard » ne doivent pas écraser A / C / T.

BEGIN;

-- Redmi Série A
UPDATE products p SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi' AND pr.brand_id = b.id AND pr.slug = 'redmi-serie-a'
  AND (p.brand = b.id OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id))
  AND lower(trim(p.name)) LIKE '%redmi%'
  AND lower(trim(p.name)) ~ 'a[0-9](\s|pro|go|$|-)';

-- Redmi Série C (13C, 14C, 15C…)
UPDATE products p SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi' AND pr.brand_id = b.id AND pr.slug = 'redmi-serie-c'
  AND (p.brand = b.id OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id))
  AND lower(trim(p.name)) LIKE '%redmi%'
  AND lower(trim(p.name)) !~ 'redmi note%'
  AND lower(trim(p.name)) ~ '[0-9]+c(\s|go|$|-)';

-- Xiaomi Série T
UPDATE products p SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi' AND pr.brand_id = b.id AND pr.slug = 'xiaomi-serie-t'
  AND (p.brand = b.id OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id))
  AND lower(trim(p.name)) ~ '[0-9]+t(\s|pro|go|$|-)'
  AND lower(trim(p.name)) NOT LIKE '%redmi%'
  AND lower(trim(p.name)) NOT LIKE '%poco%';

-- Redmi Standard (hors Note / A / C)
UPDATE products p SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi' AND pr.brand_id = b.id AND pr.slug = 'redmi-standard'
  AND (p.brand = b.id OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id))
  AND lower(trim(p.name)) LIKE '%redmi%'
  AND lower(trim(p.name)) NOT LIKE '%redmi note%'
  AND lower(trim(p.name)) !~ 'a[0-9](\s|pro|go|$|-)'
  AND lower(trim(p.name)) !~ '[0-9]+c(\s|go|$|-)';

-- Xiaomi Standard (hors T / Ultra / Mix / Flip / Redmi / POCO)
UPDATE products p SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi' AND pr.brand_id = b.id AND pr.slug = 'xiaomi-standard'
  AND (p.brand = b.id OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id))
  AND lower(trim(p.name)) LIKE '%xiaomi%'
  AND lower(trim(p.name)) NOT LIKE '%redmi%'
  AND lower(trim(p.name)) NOT LIKE '%poco%'
  AND lower(trim(p.name)) !~ '[0-9]+t(\s|pro|go|$|-)'
  AND lower(trim(p.name)) NOT LIKE '%ultra%'
  AND lower(trim(p.name)) NOT LIKE '%mix%'
  AND lower(trim(p.name)) NOT LIKE '%flip%';

COMMIT;
