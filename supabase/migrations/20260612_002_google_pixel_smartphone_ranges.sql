-- Gammes Google Pixel pour la catégorie phones (slug DB, pas "smartphones")

INSERT INTO brands (name, slug)
SELECT 'Google Pixel', 'google-pixel'
WHERE NOT EXISTS (
  SELECT 1 FROM brands WHERE slug = 'google-pixel' OR lower(name) = 'google pixel'
);

-- Helper : insère une gamme si absente pour la marque Google Pixel
INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT v.name, v.slug, b.id, 'phones'
FROM brands b
CROSS JOIN (
  VALUES
    ('Pixel 10',           'pixel-10'),
    ('Pixel 10 Pro',       'pixel-10-pro'),
    ('Pixel 10 Pro Fold',  'pixel-10-pro-fold'),
    ('Pixel 9',            'pixel-9'),
    ('Pixel 9 Pro',        'pixel-9-pro'),
    ('Pixel 9 Pro XL',     'pixel-9-pro-xl'),
    ('Pixel 9a',           'pixel-9a'),
    ('Pixel 8',            'pixel-8'),
    ('Pixel 8 Pro',        'pixel-8-pro'),
    ('Pixel 8a',           'pixel-8a'),
    ('Pixel 7',            'pixel-7'),
    ('Pixel 7 Pro',        'pixel-7-pro'),
    ('Pixel 7a',           'pixel-7a'),
    ('Pixel Fold',         'pixel-fold')
) AS v(name, slug)
WHERE (b.slug = 'google-pixel' OR lower(b.name) = 'google pixel')
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr
    WHERE pr.brand_id = b.id AND pr.slug = v.slug
  );
