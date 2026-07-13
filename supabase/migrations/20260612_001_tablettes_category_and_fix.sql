-- Catégorie Tablettes + reclassement produits tablette + marque Blackview

INSERT INTO categories (name, slug)
SELECT 'Tablettes', 'tablettes'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'tablettes');

INSERT INTO brands (name, slug)
SELECT 'Blackview', 'blackview'
WHERE NOT EXISTS (
  SELECT 1 FROM brands WHERE slug = 'blackview' OR lower(name) = 'blackview'
);

-- Produits nommés tablette/tablet → catégorie tablettes (pas smartphones)
UPDATE products
SET category = 'tablettes'
WHERE lower(name) LIKE '%tablette%'
   OR lower(name) LIKE '%tablet%'
   OR lower(name) LIKE '%galaxy tab%'
   OR lower(name) LIKE '%ipad%'
   OR lower(name) LIKE '%tab m%'
   OR lower(name) LIKE '%tab s%'
   OR lower(name) LIKE '%tab a%'
   OR lower(name) LIKE '% pad %';

-- Marque Blackview sur les produits correspondants
UPDATE products p
SET brand = b.id
FROM brands b
WHERE b.slug = 'blackview'
  AND lower(p.name) LIKE '%blackview%';
