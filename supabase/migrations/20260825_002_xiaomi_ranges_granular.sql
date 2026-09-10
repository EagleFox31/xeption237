-- Gammes Xiaomi : structure catalogue détaillée (12 familles)
-- Remplace la consolidation 4 gammes (20260825_001).

BEGIN;

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT v.name, v.slug, b.id, 'phones'
FROM brands b
CROSS JOIN (
  VALUES
    ('Xiaomi Standard', 'xiaomi-standard'),
    ('Xiaomi Série T', 'xiaomi-serie-t'),
    ('Xiaomi Série Ultra', 'xiaomi-serie-ultra'),
    ('Xiaomi Série Mix / Flip', 'xiaomi-serie-mix-flip'),
    ('Redmi Note', 'redmi-note'),
    ('Redmi Standard', 'redmi-standard'),
    ('Redmi Série A', 'redmi-serie-a'),
    ('Redmi Série C', 'redmi-serie-c'),
    ('POCO Série F', 'poco-serie-f'),
    ('POCO Série X', 'poco-serie-x'),
    ('POCO Série M', 'poco-serie-m'),
    ('POCO Série C', 'poco-serie-c')
) AS v(name, slug)
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr
    WHERE pr.brand_id = b.id AND pr.slug = v.slug
  );

-- Produits du catalogue Xiaomi (marque ou gamme existante)
-- Classifications du plus spécifique au plus général.

-- Redmi Note
UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi'
  AND pr.brand_id = b.id AND pr.slug = 'redmi-note'
  AND (
    p.brand = b.id
    OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id)
  )
  AND lower(trim(p.name)) LIKE '%redmi note%';

-- POCO par série
UPDATE products p SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi' AND pr.brand_id = b.id AND pr.slug = 'poco-serie-f'
  AND (p.brand = b.id OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id))
  AND lower(trim(p.name)) ~ 'poco\s*f[0-9]?';

UPDATE products p SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi' AND pr.brand_id = b.id AND pr.slug = 'poco-serie-x'
  AND (p.brand = b.id OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id))
  AND lower(trim(p.name)) ~ 'poco\s*x[0-9]?';

UPDATE products p SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi' AND pr.brand_id = b.id AND pr.slug = 'poco-serie-m'
  AND (p.brand = b.id OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id))
  AND lower(trim(p.name)) ~ 'poco\s*m[0-9]?';

UPDATE products p SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi' AND pr.brand_id = b.id AND pr.slug = 'poco-serie-c'
  AND (p.brand = b.id OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id))
  AND lower(trim(p.name)) ~ 'poco\s*c[0-9]?';

-- POCO restant (fallback série X si non matché F/M/C)
UPDATE products p SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi' AND pr.brand_id = b.id AND pr.slug = 'poco-serie-x'
  AND (p.brand = b.id OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id))
  AND lower(trim(p.name)) LIKE '%poco%';

-- Xiaomi Mix / Flip
UPDATE products p SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi' AND pr.brand_id = b.id AND pr.slug = 'xiaomi-serie-mix-flip'
  AND (p.brand = b.id OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id))
  AND (lower(trim(p.name)) LIKE '%mix%' OR lower(trim(p.name)) LIKE '%flip%')
  AND lower(trim(p.name)) NOT LIKE '%redmi%' AND lower(trim(p.name)) NOT LIKE '%poco%';

-- Xiaomi Ultra
UPDATE products p SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi' AND pr.brand_id = b.id AND pr.slug = 'xiaomi-serie-ultra'
  AND (p.brand = b.id OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id))
  AND lower(trim(p.name)) LIKE '%ultra%';

-- Xiaomi Série T (14T, 15T, 17T, Mi 15T Pro…)
UPDATE products p SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi' AND pr.brand_id = b.id AND pr.slug = 'xiaomi-serie-t'
  AND (p.brand = b.id OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id))
  AND lower(trim(p.name)) ~ '[0-9]+t(\s|pro|$|-)'
  AND lower(trim(p.name)) NOT LIKE '%redmi%' AND lower(trim(p.name)) NOT LIKE '%poco%';

-- Redmi Série A (A3, A5, A7…)
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

-- Redmi Standard (entrée de gamme hors Note / A / C)
UPDATE products p SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'xiaomi' AND pr.brand_id = b.id AND pr.slug = 'redmi-standard'
  AND (p.brand = b.id OR p.product_range IN (SELECT id FROM product_ranges WHERE brand_id = b.id))
  AND lower(trim(p.name)) LIKE '%redmi%'
  AND lower(trim(p.name)) NOT LIKE '%redmi note%'
  AND lower(trim(p.name)) !~ 'a[0-9](\s|pro|go|$|-)'
  AND lower(trim(p.name)) !~ '[0-9]+c(\s|go|$|-)';

-- Xiaomi Standard (flagship numérique classique — hors T / Ultra / Mix / Flip)
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

-- Nettoyage des anciennes gammes génériques / par modèle
DELETE FROM product_ranges pr
USING brands b
WHERE pr.brand_id = b.id
  AND b.slug = 'xiaomi'
  AND pr.slug IN ('xiaomi', 'redmi', 'poco')
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.product_range = pr.id);

COMMIT;
