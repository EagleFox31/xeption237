-- Gammes Blackview (tablettes) — admin produit + filtres boutique
-- FK product_ranges.category → categories.slug : phones (pas "smartphones"), tablettes, ordinateurs, etc.

INSERT INTO brands (name, slug)
SELECT 'Blackview', 'blackview'
WHERE NOT EXISTS (
  SELECT 1 FROM brands WHERE slug = 'blackview' OR lower(name) = 'blackview'
);

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT v.name, v.slug, b.id, 'tablettes'
FROM brands b
CROSS JOIN (
  VALUES
    -- Tab (ligne principale)
    ('Tab 60 Pro',        'tab-60-pro'),
    ('Tab 60 WiFi',       'tab-60-wifi'),
    ('Tab 90 WiFi',       'tab-90-wifi'),
    ('Tab 18',            'tab-18'),
    ('Tab 16 Pro',        'tab-16-pro'),
    ('Tab 16',            'tab-16'),
    ('Tab 13 Pro',        'tab-13-pro'),
    ('Tab 13',            'tab-13'),
    ('Tab 12',            'tab-12'),
    ('Tab 11',            'tab-11'),
    ('Tab 10',            'tab-10'),
    ('Tab 9',             'tab-9'),
    ('Tab 8',             'tab-8'),
    -- Active (rugged)
    ('Active 12 Pro',     'active-12-pro'),
    ('Active 10 Pro',     'active-10-pro'),
    ('Active 8 Pro',      'active-8-pro'),
    ('Active 7',          'active-7'),
    ('Active 5',          'active-5'),
    -- MEGA
    ('MEGA 12',           'mega-12'),
    ('MEGA 3',            'mega-3'),
    ('MEGA 2 WiFi',       'mega-2-wifi'),
    ('MEGA 2',            'mega-2'),
    ('MEGA 1',            'mega-1'),
    -- ZENO
    ('ZENO 10',           'zeno-10'),
    ('ZENO 1',            'zeno-1')
) AS v(name, slug)
WHERE b.slug = 'blackview'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr
    WHERE pr.brand_id = b.id AND pr.slug = v.slug
  );

-- Gammes phones Blackview (occasionnel : A80, Shark…) — slug catégorie DB = phones
INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT v.name, v.slug, b.id, 'phones'
FROM brands b
CROSS JOIN (
  VALUES
    ('A80 Pro',           'a80-pro'),
    ('A80',               'a80'),
    ('Shark 8',           'shark-8'),
    ('Shark 6',           'shark-6')
) AS v(name, slug)
WHERE b.slug = 'blackview'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr
    WHERE pr.brand_id = b.id AND pr.slug = v.slug
  );

-- Assigner la gamme sur les produits Blackview déjà en stock (nom → slug)
UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'blackview'
  AND p.brand = b.id
  AND pr.brand_id = b.id
  AND pr.slug = 'tab-60-pro'
  AND lower(p.name) LIKE '%tab 60 pro%';

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'blackview'
  AND p.brand = b.id
  AND pr.brand_id = b.id
  AND pr.slug = 'tab-60-wifi'
  AND lower(p.name) LIKE '%tab 60%'
  AND lower(p.name) NOT LIKE '%pro%';

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'blackview'
  AND p.brand = b.id
  AND pr.brand_id = b.id
  AND pr.slug = 'tab-90-wifi'
  AND lower(p.name) LIKE '%tab 90%';

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'blackview'
  AND p.brand = b.id
  AND pr.brand_id = b.id
  AND pr.slug = 'tab-18'
  AND lower(p.name) LIKE '%tab 18%';

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'blackview'
  AND p.brand = b.id
  AND pr.brand_id = b.id
  AND pr.slug = 'mega-12'
  AND lower(p.name) LIKE '%mega 12%';

UPDATE products p
SET product_range = pr.id
FROM brands b, product_ranges pr
WHERE b.slug = 'blackview'
  AND p.brand = b.id
  AND pr.brand_id = b.id
  AND pr.slug = 'active-8-pro'
  AND lower(p.name) LIKE '%active 8 pro%';
