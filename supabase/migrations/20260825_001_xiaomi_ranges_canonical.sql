-- Consolidation gammes Xiaomi : 4 familles (Xiaomi, Redmi Note, Redmi, POCO)
-- Remplace les gammes par modèle (Redmi 13, Redmi Note 14, …) issues de l'import Mfoundi.

BEGIN;

-- 1. Gammes canoniques manquantes
INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT v.name, v.slug, b.id, 'phones'
FROM brands b
CROSS JOIN (
  VALUES
    ('Redmi Note', 'redmi-note'),
    ('POCO', 'poco')
) AS v(name, slug)
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr
    WHERE pr.brand_id = b.id AND pr.slug = v.slug
  );

-- 2. Fusion des anciennes gammes « note » → redmi-note
UPDATE products p
SET product_range = note_pr.id
FROM brands b
JOIN product_ranges old_pr ON old_pr.brand_id = b.id
JOIN product_ranges note_pr ON note_pr.brand_id = b.id AND note_pr.slug = 'redmi-note'
WHERE b.slug = 'xiaomi'
  AND p.product_range = old_pr.id
  AND old_pr.slug IN ('redmi-note-14', 'redmi-note-15', 'redmi-note-9-pro');

-- 3. Fusion entrée de gamme → redmi
UPDATE products p
SET product_range = redmi_pr.id
FROM brands b
JOIN product_ranges old_pr ON old_pr.brand_id = b.id
JOIN product_ranges redmi_pr ON redmi_pr.brand_id = b.id AND redmi_pr.slug = 'redmi'
WHERE b.slug = 'xiaomi'
  AND p.product_range = old_pr.id
  AND old_pr.slug IN ('redmi-13', 'redmi-14c', 'redmi-15', 'redmi-15c', 'redmi-a5');

-- 4. Rattachement par nom (produits mal classés sur redmi / xiaomi)
UPDATE products p
SET product_range = note_pr.id
FROM brands b
JOIN product_ranges note_pr ON note_pr.brand_id = b.id AND note_pr.slug = 'redmi-note'
WHERE b.slug = 'xiaomi'
  AND (p.brand = b.id OR p.product_range IN (
    SELECT pr.id FROM product_ranges pr WHERE pr.brand_id = b.id
  ))
  AND lower(trim(p.name)) LIKE '%redmi note%';

UPDATE products p
SET product_range = poco_pr.id
FROM brands b
JOIN product_ranges poco_pr ON poco_pr.brand_id = b.id AND poco_pr.slug = 'poco'
WHERE b.slug = 'xiaomi'
  AND (p.brand = b.id OR p.product_range IN (
    SELECT pr.id FROM product_ranges pr WHERE pr.brand_id = b.id
  ))
  AND lower(trim(p.name)) LIKE '%poco%';

UPDATE products p
SET product_range = redmi_pr.id
FROM brands b
JOIN product_ranges redmi_pr ON redmi_pr.brand_id = b.id AND redmi_pr.slug = 'redmi'
WHERE b.slug = 'xiaomi'
  AND (p.brand = b.id OR p.product_range IN (
    SELECT pr.id FROM product_ranges pr WHERE pr.brand_id = b.id
  ))
  AND lower(trim(p.name)) LIKE '%redmi%'
  AND lower(trim(p.name)) NOT LIKE '%redmi note%'
  AND lower(trim(p.name)) NOT LIKE '%poco%';

UPDATE products p
SET product_range = xiaomi_pr.id
FROM brands b
JOIN product_ranges xiaomi_pr ON xiaomi_pr.brand_id = b.id AND xiaomi_pr.slug = 'xiaomi'
WHERE b.slug = 'xiaomi'
  AND (p.brand = b.id OR p.product_range IN (
    SELECT pr.id FROM product_ranges pr WHERE pr.brand_id = b.id
  ))
  AND lower(trim(p.name)) LIKE '%xiaomi%'
  AND lower(trim(p.name)) NOT LIKE '%redmi%'
  AND lower(trim(p.name)) NOT LIKE '%poco%';

-- 5. Suppression des gammes par modèle devenues vides
DELETE FROM product_ranges pr
USING brands b
WHERE pr.brand_id = b.id
  AND b.slug = 'xiaomi'
  AND pr.slug IN (
    'redmi-13',
    'redmi-14c',
    'redmi-15',
    'redmi-15c',
    'redmi-a5',
    'redmi-note-14',
    'redmi-note-15',
    'redmi-note-9-pro'
  )
  AND NOT EXISTS (
    SELECT 1 FROM products p WHERE p.product_range = pr.id
  );

COMMIT;
