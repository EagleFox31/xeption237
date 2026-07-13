-- CMF Buds : visible dans « Nos Pépites » (home filtre accessoires = featured only)
-- + marque CMF si migration 004 pas encore appliquée

INSERT INTO brands (name, slug)
SELECT 'CMF', 'cmf'
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = 'cmf');

UPDATE products p
SET is_featured = true
WHERE lower(p.name) LIKE '%cmf%'
  AND p.category = 'accessories';

UPDATE products p
SET brand = b.id
FROM brands b
WHERE p.brand IS NULL
  AND b.slug = 'cmf'
  AND lower(p.name) LIKE '%cmf%';
