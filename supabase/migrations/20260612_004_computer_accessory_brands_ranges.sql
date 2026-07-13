-- Marques PC & accessoires présentes en inventaire mais absentes de `brands` / `product_ranges`
-- (produits Dell, Oraimo, HP, Lenovo, ASUS, CMF avec brand NULL)

INSERT INTO brands (name, slug)
SELECT v.name, v.slug
FROM (
  VALUES
    ('Dell', 'dell'),
    ('Oraimo', 'oraimo'),
    ('HP', 'hp'),
    ('Lenovo', 'lenovo'),
    ('ASUS', 'asus'),
    ('CMF', 'cmf')
) AS v(name, slug)
WHERE NOT EXISTS (
  SELECT 1 FROM brands b WHERE b.slug = v.slug OR lower(b.name) = lower(v.name)
);

-- Gammes ordinateurs
INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT v.name, v.slug, b.id, 'computer'
FROM brands b
CROSS JOIN (
  VALUES
    ('Latitude', 'dell-latitude'),
    ('XPS', 'dell-xps'),
    ('Education / Chromebook', 'dell-education'),
    ('Laptops HP', 'hp-laptops'),
    ('ThinkPad / LOQ', 'lenovo-laptops'),
    ('ExpertBook / Vivobook', 'asus-laptops')
) AS v(name, slug)
WHERE b.slug IN ('dell', 'hp', 'lenovo', 'asus')
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr
    WHERE pr.brand_id = b.id AND pr.slug = v.slug
  );

-- Gammes accessoires
INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT v.name, v.slug, b.id, 'accessories'
FROM brands b
CROSS JOIN (
  VALUES
    ('Écouteurs', 'oraimo-ecouteurs'),
    ('Power Bank', 'oraimo-power-bank'),
    ('Casques', 'oraimo-casques'),
    ('Chargeurs HP', 'hp-chargeurs'),
    ('Chargeurs Lenovo', 'lenovo-chargeurs'),
    ('Chargeurs ASUS', 'asus-chargeurs'),
    ('Chargeurs Dell', 'dell-chargeurs'),
    ('Écouteurs CMF', 'cmf-ecouteurs'),
    ('Moniteurs', 'hp-moniteurs')
) AS v(name, slug)
WHERE (b.slug = 'oraimo' AND v.slug LIKE 'oraimo-%')
   OR (b.slug = 'hp' AND v.slug LIKE 'hp-%')
   OR (b.slug = 'lenovo' AND v.slug = 'lenovo-chargeurs')
   OR (b.slug = 'asus' AND v.slug = 'asus-chargeurs')
   OR (b.slug = 'dell' AND v.slug = 'dell-chargeurs')
   OR (b.slug = 'cmf' AND v.slug = 'cmf-ecouteurs')
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr
    WHERE pr.brand_id = b.id AND pr.slug = v.slug
  );

-- Lier marque sur les produits (brand était NULL)
UPDATE products p
SET brand = b.id
FROM brands b
WHERE p.brand IS NULL
  AND b.slug = 'dell'
  AND lower(p.name) LIKE '%dell%';

UPDATE products p
SET brand = b.id
FROM brands b
WHERE p.brand IS NULL
  AND b.slug = 'oraimo'
  AND lower(p.name) LIKE '%oraimo%';

UPDATE products p
SET brand = b.id
FROM brands b
WHERE p.brand IS NULL
  AND b.slug = 'hp'
  AND lower(p.name) LIKE '%hp%';

UPDATE products p
SET brand = b.id
FROM brands b
WHERE p.brand IS NULL
  AND b.slug = 'lenovo'
  AND lower(p.name) LIKE '%lenovo%';

UPDATE products p
SET brand = b.id
FROM brands b
WHERE p.brand IS NULL
  AND b.slug = 'asus'
  AND lower(p.name) LIKE '%asus%';

UPDATE products p
SET brand = b.id
FROM brands b
WHERE p.brand IS NULL
  AND b.slug = 'cmf'
  AND lower(p.name) LIKE '%cmf%';

-- Lier gammes Dell ordinateurs
UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'dell'
  AND p.category = 'computer'
  AND pr.brand_id = b.id
  AND pr.slug = 'dell-xps'
  AND lower(p.name) LIKE '%xps%'
  AND p.product_range IS NULL;

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'dell'
  AND p.category = 'computer'
  AND pr.brand_id = b.id
  AND pr.slug = 'dell-latitude'
  AND (lower(p.name) LIKE '%latitude%' OR lower(p.name) LIKE '%3190%')
  AND p.product_range IS NULL;

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'dell'
  AND p.category = 'computer'
  AND pr.brand_id = b.id
  AND pr.slug = 'dell-education'
  AND lower(p.name) LIKE '%3190%'
  AND p.product_range IS NULL;

-- Lier gammes Oraimo accessoires
UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'oraimo'
  AND p.category = 'accessories'
  AND pr.brand_id = b.id
  AND pr.slug = 'oraimo-power-bank'
  AND (lower(p.name) LIKE '%magpower%' OR lower(p.name) LIKE '%power bank%' OR lower(p.name) LIKE '%10000mah%')
  AND p.product_range IS NULL;

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'oraimo'
  AND p.category = 'accessories'
  AND pr.brand_id = b.id
  AND pr.slug = 'oraimo-ecouteurs'
  AND (lower(p.name) LIKE '%spacebuds%' OR lower(p.name) LIKE '%écouteur%' OR lower(p.name) LIKE '%ecouteur%')
  AND p.product_range IS NULL;

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'oraimo'
  AND p.category = 'accessories'
  AND pr.brand_id = b.id
  AND pr.slug = 'oraimo-casques'
  AND (lower(p.name) LIKE '%necklace%' OR lower(p.name) LIKE '%casque%')
  AND p.product_range IS NULL;

-- Chargeurs & moniteurs accessoires
UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'hp'
  AND p.category = 'accessories'
  AND pr.brand_id = b.id
  AND pr.slug = 'hp-chargeurs'
  AND lower(p.name) LIKE '%chargeur%'
  AND p.product_range IS NULL;

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'hp'
  AND p.category = 'accessories'
  AND pr.brand_id = b.id
  AND pr.slug = 'hp-moniteurs'
  AND lower(p.name) LIKE '%moniteur%'
  AND p.product_range IS NULL;

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'lenovo'
  AND p.category = 'accessories'
  AND pr.brand_id = b.id
  AND pr.slug = 'lenovo-chargeurs'
  AND lower(p.name) LIKE '%chargeur%'
  AND p.product_range IS NULL;

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'asus'
  AND p.category = 'accessories'
  AND pr.brand_id = b.id
  AND pr.slug = 'asus-chargeurs'
  AND lower(p.name) LIKE '%chargeur%'
  AND p.product_range IS NULL;

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'dell'
  AND p.category = 'accessories'
  AND pr.brand_id = b.id
  AND pr.slug = 'dell-chargeurs'
  AND lower(p.name) LIKE '%chargeur%'
  AND p.product_range IS NULL;

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'cmf'
  AND p.category = 'accessories'
  AND pr.brand_id = b.id
  AND pr.slug = 'cmf-ecouteurs'
  AND lower(p.name) LIKE '%écouteur%'
  AND p.product_range IS NULL;

-- Lier ordinateurs HP / Lenovo / ASUS
UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'hp'
  AND p.category = 'computer'
  AND pr.brand_id = b.id
  AND pr.slug = 'hp-laptops'
  AND p.product_range IS NULL;

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'lenovo'
  AND p.category = 'computer'
  AND pr.brand_id = b.id
  AND pr.slug = 'lenovo-laptops'
  AND p.product_range IS NULL;

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE p.brand = b.id
  AND b.slug = 'asus'
  AND p.category = 'computer'
  AND pr.brand_id = b.id
  AND pr.slug = 'asus-laptops'
  AND p.product_range IS NULL;
