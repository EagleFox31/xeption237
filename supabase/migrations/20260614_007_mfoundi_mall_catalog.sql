-- Catalogue Mfoundi Mall — import 2026-06-12
-- Source: Mfoundi Mall, Boutique 2063 | 131 lignes

-- === MARQUES ===
INSERT INTO brands (name, slug)
SELECT 'Apple', 'apple'
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = 'apple' OR lower(name) = lower('Apple'));

INSERT INTO brands (name, slug)
SELECT 'Google Pixel', 'google-pixel'
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = 'google-pixel' OR lower(name) = lower('Google Pixel'));

INSERT INTO brands (name, slug)
SELECT 'Samsung', 'samsung'
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = 'samsung' OR lower(name) = lower('Samsung'));

INSERT INTO brands (name, slug)
SELECT 'Xiaomi', 'xiaomi'
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = 'xiaomi' OR lower(name) = lower('Xiaomi'));

INSERT INTO brands (name, slug)
SELECT 'Infinix', 'infinix'
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = 'infinix' OR lower(name) = lower('Infinix'));

INSERT INTO brands (name, slug)
SELECT 'Tecno', 'tecno'
WHERE NOT EXISTS (SELECT 1 FROM brands WHERE slug = 'tecno' OR lower(name) = lower('Tecno'));

-- === GAMMES ===
INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'iPhone XR', 'iphone-xr', b.id, 'phones'
FROM brands b
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'iphone-xr'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'iPhone 11', 'iphone-11', b.id, 'phones'
FROM brands b
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'iphone-11'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'iPhone 11 Pro', 'iphone-11-pro', b.id, 'phones'
FROM brands b
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'iphone-11-pro'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'iPhone 11 Pro Max', 'iphone-11-pro-max', b.id, 'phones'
FROM brands b
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'iphone-11-pro-max'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'iPhone 12', 'iphone-12', b.id, 'phones'
FROM brands b
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'iphone-12'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'iPhone 12 Pro', 'iphone-12-pro', b.id, 'phones'
FROM brands b
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'iphone-12-pro'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'iPhone 12 Pro Max', 'iphone-12-pro-max', b.id, 'phones'
FROM brands b
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'iphone-12-pro-max'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'iPhone 13', 'iphone-13', b.id, 'phones'
FROM brands b
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'iphone-13'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'iPhone 13 Pro', 'iphone-13-pro', b.id, 'phones'
FROM brands b
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'iphone-13-pro'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'iPhone 13 Pro Max', 'iphone-13-pro-max', b.id, 'phones'
FROM brands b
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'iphone-13-pro-max'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'iPhone 14', 'iphone-14', b.id, 'phones'
FROM brands b
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'iphone-14'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'iPhone 14 Pro', 'iphone-14-pro', b.id, 'phones'
FROM brands b
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'iphone-14-pro'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'iPhone 14 Pro Max', 'iphone-14-pro-max', b.id, 'phones'
FROM brands b
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'iphone-14-pro-max'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Pixel 6A', 'pixel-6a', b.id, 'phones'
FROM brands b
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'pixel-6a'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Pixel 7 Pro', 'pixel-7-pro', b.id, 'phones'
FROM brands b
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'pixel-7-pro'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S21+', 'galaxy-s21-plus', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s21-plus'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S22+', 'galaxy-s22-plus', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s22-plus'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S21 Ultra', 'galaxy-s21-ultra', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s21-ultra'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S22 Ultra', 'galaxy-s22-ultra', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s22-ultra'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S24 Ultra', 'galaxy-s24-ultra', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s24-ultra'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S23 Ultra', 'galaxy-s23-ultra', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s23-ultra'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S23+', 'galaxy-s23-plus', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s23-plus'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S24+', 'galaxy-s24-plus', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s24-plus'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S23 FE', 'galaxy-s23-fe', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s23-fe'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Z Flip4', 'galaxy-z-flip4', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-z-flip4'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Z Flip6', 'galaxy-z-flip6', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-z-flip6'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Z Fold4', 'galaxy-z-fold4', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-z-fold4'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Z Flip5', 'galaxy-z-flip5', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-z-flip5'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S21', 'galaxy-s21', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s21'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S23', 'galaxy-s23', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s23'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S25 Edge', 'galaxy-s25-edge', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s25-edge'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S10 5G', 'galaxy-s10-5g', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s10-5g'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S22', 'galaxy-s22', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s22'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy S20 Ultra', 'galaxy-s20-ultra', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-s20-ultra'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Note10+', 'galaxy-note10-plus', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-note10-plus'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Note20', 'galaxy-note20', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-note20'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A56', 'galaxy-a56', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a56'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A36', 'galaxy-a36', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a36'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A26', 'galaxy-a26', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a26'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A16', 'galaxy-a16', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a16'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A17', 'galaxy-a17', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a17'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A55', 'galaxy-a55', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a55'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A32', 'galaxy-a32', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a32'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A53', 'galaxy-a53', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a53'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy M53', 'galaxy-m53', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-m53'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy M33', 'galaxy-m33', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-m33'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy M44', 'galaxy-m44', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-m44'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A25', 'galaxy-a25', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a25'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A54', 'galaxy-a54', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a54'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A24', 'galaxy-a24', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a24'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A33', 'galaxy-a33', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a33'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A23', 'galaxy-a23', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a23'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A82', 'galaxy-a82', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a82'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Watch4', 'galaxy-watch4', b.id, 'accessories'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-watch4'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Watch5', 'galaxy-watch5', b.id, 'accessories'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-watch5'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Watch6', 'galaxy-watch6', b.id, 'accessories'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-watch6'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Watch7', 'galaxy-watch7', b.id, 'accessories'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-watch7'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Watch4 Classic', 'galaxy-watch4-classic', b.id, 'accessories'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-watch4-classic'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Watch5 Pro', 'galaxy-watch5-pro', b.id, 'accessories'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-watch5-pro'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Watch6 Classic', 'galaxy-watch6-classic', b.id, 'accessories'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-watch6-classic'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Watch Ultra', 'galaxy-watch-ultra', b.id, 'accessories'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-watch-ultra'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Watch8', 'galaxy-watch8', b.id, 'accessories'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-watch8'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Watch8 Classic', 'galaxy-watch8-classic', b.id, 'accessories'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-watch8-classic'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Watch FIT 3', 'galaxy-watch-fit-3', b.id, 'accessories'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-watch-fit-3'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy Buds Core', 'galaxy-buds-core', b.id, 'accessories'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-buds-core'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Pixel 7a', 'pixel-7a', b.id, 'phones'
FROM brands b
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'pixel-7a'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Pixel 7', 'pixel-7', b.id, 'phones'
FROM brands b
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'pixel-7'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Pixel 8', 'pixel-8', b.id, 'phones'
FROM brands b
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'pixel-8'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Pixel 6 Pro', 'pixel-6-pro', b.id, 'phones'
FROM brands b
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'pixel-6-pro'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Pixel 8 Pro', 'pixel-8-pro', b.id, 'phones'
FROM brands b
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'pixel-8-pro'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Pixel 9', 'pixel-9', b.id, 'phones'
FROM brands b
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'pixel-9'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Pixel 9 Pro', 'pixel-9-pro', b.id, 'phones'
FROM brands b
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'pixel-9-pro'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Pixel 8a', 'pixel-8a', b.id, 'phones'
FROM brands b
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'pixel-8a'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Pixel 9 Pro XL', 'pixel-9-pro-xl', b.id, 'phones'
FROM brands b
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'pixel-9-pro-xl'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Galaxy A07', 'galaxy-a07', b.id, 'phones'
FROM brands b
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'galaxy-a07'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Redmi A5', 'redmi-a5', b.id, 'phones'
FROM brands b
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'redmi-a5'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Redmi 13', 'redmi-13', b.id, 'phones'
FROM brands b
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'redmi-13'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Redmi 15', 'redmi-15', b.id, 'phones'
FROM brands b
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'redmi-15'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Redmi Note 9 Pro', 'redmi-note-9-pro', b.id, 'phones'
FROM brands b
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'redmi-note-9-pro'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Redmi 14C', 'redmi-14c', b.id, 'phones'
FROM brands b
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'redmi-14c'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Redmi 15C', 'redmi-15c', b.id, 'phones'
FROM brands b
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'redmi-15c'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Redmi Note 14', 'redmi-note-14', b.id, 'phones'
FROM brands b
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'redmi-note-14'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Redmi Note 15', 'redmi-note-15', b.id, 'phones'
FROM brands b
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'redmi-note-15'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Smart 10 HD', 'smart-10-hd', b.id, 'phones'
FROM brands b
WHERE b.slug = 'infinix'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'smart-10-hd'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Smart 10', 'smart-10', b.id, 'phones'
FROM brands b
WHERE b.slug = 'infinix'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'smart-10'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Hot 60i', 'hot-60i', b.id, 'phones'
FROM brands b
WHERE b.slug = 'infinix'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'hot-60i'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Hot 50 Pro+', 'hot-50-pro-plus', b.id, 'phones'
FROM brands b
WHERE b.slug = 'infinix'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'hot-50-pro-plus'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Pop 10', 'pop-10', b.id, 'phones'
FROM brands b
WHERE b.slug = 'tecno'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'pop-10'
  );

INSERT INTO product_ranges (name, slug, brand_id, category)
SELECT 'Spark 40', 'spark-40', b.id, 'phones'
FROM brands b
WHERE b.slug = 'tecno'
  AND NOT EXISTS (
    SELECT 1 FROM product_ranges pr WHERE pr.brand_id = b.id AND pr.slug = 'spark-40'
  );

-- === PRODUITS (upsert par nom + marque + gamme) ===
INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone XR 64 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  82000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"64 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-xr'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone XR 64 Go (US/Canada)'))
  );

UPDATE products p
SET price = 82000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"64 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-xr'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone XR 64 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone XR 128 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  90000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-xr'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone XR 128 Go (US/Canada)'))
  );

UPDATE products p
SET price = 90000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-xr'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone XR 128 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 11 64 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  98000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"64 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-11'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 11 64 Go (US/Canada)'))
  );

UPDATE products p
SET price = 98000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"64 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-11'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 11 64 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 11 128 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  105000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-11'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 11 128 Go (US/Canada)'))
  );

UPDATE products p
SET price = 105000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-11'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 11 128 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 11 Pro 64 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  120000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"64 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-11-pro'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 11 Pro 64 Go (US/Canada)'))
  );

UPDATE products p
SET price = 120000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"64 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-11-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 11 Pro 64 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 11 Pro 256 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  140000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-11-pro'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 11 Pro 256 Go (US/Canada)'))
  );

UPDATE products p
SET price = 140000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-11-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 11 Pro 256 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 11 Pro Max 64 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  135000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"64 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-11-pro-max'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 11 Pro Max 64 Go (US/Canada)'))
  );

UPDATE products p
SET price = 135000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"64 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-11-pro-max'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 11 Pro Max 64 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 11 Pro Max 256 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  145000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-11-pro-max'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 11 Pro Max 256 Go (US/Canada)'))
  );

UPDATE products p
SET price = 145000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-11-pro-max'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 11 Pro Max 256 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 12 128 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  118000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-12'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 12 128 Go (US/Canada)'))
  );

UPDATE products p
SET price = 118000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-12'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 12 128 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 12 Pro 128 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  153000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-12-pro'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 12 Pro 128 Go (US/Canada)'))
  );

UPDATE products p
SET price = 153000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-12-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 12 Pro 128 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 12 Pro 256 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  165000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-12-pro'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 12 Pro 256 Go (US/Canada)'))
  );

UPDATE products p
SET price = 165000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-12-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 12 Pro 256 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 12 Pro Max 128 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  185000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-12-pro-max'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 12 Pro Max 128 Go (US/Canada)'))
  );

UPDATE products p
SET price = 185000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-12-pro-max'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 12 Pro Max 128 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 12 Pro Max 256 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  190000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-12-pro-max'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 12 Pro Max 256 Go (US/Canada)'))
  );

UPDATE products p
SET price = 190000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-12-pro-max'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 12 Pro Max 256 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 12 Pro Max 512 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  208000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"512 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"},{"label":"Notes","value":"Source text had ''515g'' for iPhone 12 Pro Max; normalized to 512 Go."}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-12-pro-max'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 12 Pro Max 512 Go (US/Canada)'))
  );

UPDATE products p
SET price = 208000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"512 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"},{"label":"Notes","value":"Source text had ''515g'' for iPhone 12 Pro Max; normalized to 512 Go."}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-12-pro-max'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 12 Pro Max 512 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 13 128 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  170000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-13'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 13 128 Go (US/Canada)'))
  );

UPDATE products p
SET price = 170000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-13'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 13 128 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 13 256 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  185000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-13'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 13 256 Go (US/Canada)'))
  );

UPDATE products p
SET price = 185000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-13'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 13 256 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 13 Pro 128 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  225000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-13-pro'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 13 Pro 128 Go (US/Canada)'))
  );

UPDATE products p
SET price = 225000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-13-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 13 Pro 128 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 13 Pro 256 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  235000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-13-pro'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 13 Pro 256 Go (US/Canada)'))
  );

UPDATE products p
SET price = 235000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-13-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 13 Pro 256 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 13 Pro Max 128 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  250000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-13-pro-max'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 13 Pro Max 128 Go (US/Canada)'))
  );

UPDATE products p
SET price = 250000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-13-pro-max'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 13 Pro Max 128 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 13 Pro Max 256 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  280000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-13-pro-max'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 13 Pro Max 256 Go (US/Canada)'))
  );

UPDATE products p
SET price = 280000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-13-pro-max'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 13 Pro Max 256 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 14 128 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  195000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-14'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 14 128 Go (US/Canada)'))
  );

UPDATE products p
SET price = 195000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-14'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 14 128 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 14 Pro 128 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  280000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-14-pro'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 14 Pro 128 Go (US/Canada)'))
  );

UPDATE products p
SET price = 280000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-14-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 14 Pro 128 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 14 Pro 256 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  300000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-14-pro'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 14 Pro 256 Go (US/Canada)'))
  );

UPDATE products p
SET price = 300000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-14-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 14 Pro 256 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 14 Pro Max 128 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  310000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-14-pro-max'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 14 Pro Max 128 Go (US/Canada)'))
  );

UPDATE products p
SET price = 310000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-14-pro-max'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 14 Pro Max 128 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Apple iPhone 14 Pro Max 256 Go (US/Canada)',
  'Import Mfoundi Mall — MFOUNDI MALL - IPHONE',
  345000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
  1,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-14-pro-max'
WHERE b.slug = 'apple'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Apple iPhone 14 Pro Max 256 Go (US/Canada)'))
  );

UPDATE products p
SET price = 345000,
    condition = 'refurbished',
    warranty_months = 1,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Origine","value":"US/Canada"},{"label":"Source","value":"MFOUNDI MALL - IPHONE"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - IPHONE'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'iphone-14-pro-max'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Apple iPhone 14 Pro Max 256 Go (US/Canada)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 6A 128 Go',
  'Import Mfoundi Mall — MFOUNDI MALL - GOOGLE PIXEL',
  90000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"MFOUNDI MALL - GOOGLE PIXEL"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-6a'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 6A 128 Go'))
  );

UPDATE products p
SET price = 90000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"MFOUNDI MALL - GOOGLE PIXEL"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - GOOGLE PIXEL'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-6a'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 6A 128 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 7 Pro 128 Go',
  'Import Mfoundi Mall — MFOUNDI MALL - GOOGLE PIXEL',
  160000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"MFOUNDI MALL - GOOGLE PIXEL"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-7-pro'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 7 Pro 128 Go'))
  );

UPDATE products p
SET price = 160000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"MFOUNDI MALL - GOOGLE PIXEL"}]'::jsonb,
    description = 'Import Mfoundi Mall — MFOUNDI MALL - GOOGLE PIXEL'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-7-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 7 Pro 128 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S21+ 256 Go Scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM',
  140000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s21-plus'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S21+ 256 Go Scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 140000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s21-plus'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S21+ 256 Go Scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S22+ 256 Go Scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM',
  170000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s22-plus'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S22+ 256 Go Scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 170000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s22-plus'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S22+ 256 Go Scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S21 Ultra 256 Go Scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM',
  190000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s21-ultra'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S21 Ultra 256 Go Scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 190000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s21-ultra'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S21 Ultra 256 Go Scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S22 Ultra 256 Go Scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM',
  245000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s22-ultra'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S22 Ultra 256 Go Scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 245000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s22-ultra'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S22 Ultra 256 Go Scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S24 Ultra 256 Go Scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM',
  440000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s24-ultra'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S24 Ultra 256 Go Scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 440000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s24-ultra'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S24 Ultra 256 Go Scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S23 Ultra 1024 Go Scellé SIM+eSIM (Australia)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM',
  365000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"1024 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Australia"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23-ultra'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S23 Ultra 1024 Go Scellé SIM+eSIM (Australia)'))
  );

UPDATE products p
SET price = 365000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"1024 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Australia"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23-ultra'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S23 Ultra 1024 Go Scellé SIM+eSIM (Australia)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S23 Ultra 512 Go Scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM',
  340000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23-ultra'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S23 Ultra 512 Go Scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 340000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23-ultra'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S23 Ultra 512 Go Scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S23 Ultra 256 Go Scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM',
  325000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23-ultra'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S23 Ultra 256 Go Scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 325000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23-ultra'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S23 Ultra 256 Go Scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S23+ 256 Go Scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM',
  255000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23-plus'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S23+ 256 Go Scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 255000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23-plus'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S23+ 256 Go Scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S23+ 512 Go Scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM',
  265000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23-plus'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S23+ 512 Go Scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 265000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23-plus'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S23+ 512 Go Scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S24+ 256 Go Scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM',
  290000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s24-plus'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S24+ 256 Go Scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 290000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s24-plus'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S24+ 256 Go Scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S23 FE 256 Go Scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM',
  195000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23-fe'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S23 FE 256 Go Scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 195000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23-fe'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S23 FE 256 Go Scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Z Flip4 512 Go Scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM',
  170000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-z-flip4'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Z Flip4 512 Go Scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 170000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-z-flip4'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Z Flip4 512 Go Scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Z Flip6 512 Go Scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM',
  310000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-z-flip6'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Z Flip6 512 Go Scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 310000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-z-flip6'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Z Flip6 512 Go Scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Z Fold4 512 Go Scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM',
  315000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-z-fold4'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Z Fold4 512 Go Scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 315000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-z-fold4'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Z Fold4 512 Go Scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Z Flip5 512 Go Non scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM',
  190000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-z-flip5'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Z Flip5 512 Go Non scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 190000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-z-flip5'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Z Flip5 512 Go Non scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Z Fold4 256 Go Non scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM',
  295000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-z-fold4'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Z Fold4 256 Go Non scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 295000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-z-fold4'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Z Fold4 256 Go Non scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S21 128 Go Non scellé SIM+eSIM (US)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM',
  110000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"US"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s21'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S21 128 Go Non scellé SIM+eSIM (US)'))
  );

UPDATE products p
SET price = 110000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"US"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s21'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S21 128 Go Non scellé SIM+eSIM (US)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S21 256 Go Non scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM',
  120000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s21'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S21 256 Go Non scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 120000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s21'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S21 256 Go Non scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S23 128 Go Non scellé SIM+eSIM (US)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM',
  195000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"US"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S23 128 Go Non scellé SIM+eSIM (US)'))
  );

UPDATE products p
SET price = 195000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"US"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S23 128 Go Non scellé SIM+eSIM (US)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S23 256 Go Non scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM',
  205000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S23 256 Go Non scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 205000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S23 256 Go Non scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S23 Ultra 512 Go Non scellé SIM+eSIM (US)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM',
  330000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"US"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23-ultra'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S23 Ultra 512 Go Non scellé SIM+eSIM (US)'))
  );

UPDATE products p
SET price = 330000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"US"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s23-ultra'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S23 Ultra 512 Go Non scellé SIM+eSIM (US)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S25 Edge 256 Go Non scellé SIM+eSIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM',
  365000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s25-edge'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S25 Edge 256 Go Non scellé SIM+eSIM (Korea)'))
  );

UPDATE products p
SET price = 365000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"SIM+eSIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ SIM+eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ SIM+eSIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s25-edge'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S25 Edge 256 Go Non scellé SIM+eSIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S10 5G 512 Go Non scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM',
  130000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s10-5g'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S10 5G 512 Go Non scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 130000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s10-5g'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S10 5G 512 Go Non scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S10 5G 256 Go Non scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM',
  115000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s10-5g'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S10 5G 256 Go Non scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 115000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s10-5g'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S10 5G 256 Go Non scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S22 256 Go Non scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM',
  150000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s22'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S22 256 Go Non scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 150000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s22'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S22 256 Go Non scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy S20 Ultra 256 Go Non scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM',
  145000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s20-ultra'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy S20 Ultra 256 Go Non scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 145000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-s20-ultra'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy S20 Ultra 256 Go Non scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Note10+ 512 Go Non scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM',
  150000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-note10-plus'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Note10+ 512 Go Non scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 150000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-note10-plus'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Note10+ 512 Go Non scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Note20 256 Go Non scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM',
  115000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-note20'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Note20 256 Go Non scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 115000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-note20'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Note20 256 Go Non scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A56 256 Go 8 GB RAM Scellé 2SIMS',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS',
  235000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a56'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A56 256 Go 8 GB RAM Scellé 2SIMS'))
  );

UPDATE products p
SET price = 235000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a56'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A56 256 Go 8 GB RAM Scellé 2SIMS'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A56 128 Go 8 GB RAM Scellé 2SIMS',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS',
  220000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a56'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A56 128 Go 8 GB RAM Scellé 2SIMS'))
  );

UPDATE products p
SET price = 220000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a56'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A56 128 Go 8 GB RAM Scellé 2SIMS'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A36 256 Go 8 GB RAM Scellé 2SIMS',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS',
  200000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a36'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A36 256 Go 8 GB RAM Scellé 2SIMS'))
  );

UPDATE products p
SET price = 200000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a36'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A36 256 Go 8 GB RAM Scellé 2SIMS'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A36 128 Go 8 GB RAM Scellé 2SIMS',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS',
  190000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a36'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A36 128 Go 8 GB RAM Scellé 2SIMS'))
  );

UPDATE products p
SET price = 190000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a36'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A36 128 Go 8 GB RAM Scellé 2SIMS'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A26 256 Go 8 GB RAM Scellé 2SIMS',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS',
  155000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a26'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A26 256 Go 8 GB RAM Scellé 2SIMS'))
  );

UPDATE products p
SET price = 155000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a26'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A26 256 Go 8 GB RAM Scellé 2SIMS'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A26 128 Go 6 GB RAM Scellé 2SIMS',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS',
  140000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a26'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A26 128 Go 6 GB RAM Scellé 2SIMS'))
  );

UPDATE products p
SET price = 140000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a26'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A26 128 Go 6 GB RAM Scellé 2SIMS'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A16 256 Go 8 GB RAM Scellé 2SIMS',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS',
  135000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a16'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A16 256 Go 8 GB RAM Scellé 2SIMS'))
  );

UPDATE products p
SET price = 135000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a16'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A16 256 Go 8 GB RAM Scellé 2SIMS'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A17 128 Go 4 GB RAM Scellé 2SIMS',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS',
  110000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"4 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a17'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A17 128 Go 4 GB RAM Scellé 2SIMS'))
  );

UPDATE products p
SET price = 110000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"4 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a17'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A17 128 Go 4 GB RAM Scellé 2SIMS'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A17 256 Go 8 GB RAM Scellé 2SIMS',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS',
  140000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a17'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A17 256 Go 8 GB RAM Scellé 2SIMS'))
  );

UPDATE products p
SET price = 140000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"2SIMS"},{"label":"Source","value":"SAMSUNG SCELLÉ 2SIMS"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 2SIMS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a17'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A17 256 Go 8 GB RAM Scellé 2SIMS'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A55 128 Go 8 GB RAM Scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM - A/M',
  150000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM - A/M"},{"label":"Notes","value":"eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a55'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A55 128 Go 8 GB RAM Scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 150000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM - A/M"},{"label":"Notes","value":"eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM - A/M'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a55'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A55 128 Go 8 GB RAM Scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A32 128 Go 4 GB RAM Scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM - A/M',
  80000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"4 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM - A/M"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a32'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A32 128 Go 4 GB RAM Scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 80000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"4 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM - A/M"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM - A/M'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a32'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A32 128 Go 4 GB RAM Scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A53 128 Go 6 GB RAM Scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM - A/M',
  100000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM - A/M"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a53'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A53 128 Go 6 GB RAM Scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 100000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM - A/M"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM - A/M'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a53'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A53 128 Go 6 GB RAM Scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy M53 128 Go 8 GB RAM Scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM - A/M',
  95000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM - A/M"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-m53'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy M53 128 Go 8 GB RAM Scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 95000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM - A/M"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM - A/M'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-m53'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy M53 128 Go 8 GB RAM Scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy M33 128 Go 6 GB RAM Scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM - A/M',
  90000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM - A/M"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-m33'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy M33 128 Go 6 GB RAM Scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 90000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM - A/M"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM - A/M'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-m33'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy M33 128 Go 6 GB RAM Scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy M44 128 Go 6 GB RAM Scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM - A/M',
  90000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM - A/M"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-m44'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy M44 128 Go 6 GB RAM Scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 90000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG SCELLÉ 1SIM - A/M"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG SCELLÉ 1SIM - A/M'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-m44'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy M44 128 Go 6 GB RAM Scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A25 128 Go 6 GB RAM Non scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM - A/M',
  95000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM - A/M"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a25'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A25 128 Go 6 GB RAM Non scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 95000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM - A/M"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM - A/M'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a25'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A25 128 Go 6 GB RAM Non scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A54 128 Go 8 GB RAM Non scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM - A/M',
  120000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM - A/M"},{"label":"Notes","value":"eSIM"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a54'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A54 128 Go 8 GB RAM Non scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 120000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"8 GB"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM - A/M"},{"label":"Notes","value":"eSIM"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM - A/M'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a54'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A54 128 Go 8 GB RAM Non scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A24 128 Go 4 GB RAM Non scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM - A/M',
  80000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"4 GB"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM - A/M"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a24'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A24 128 Go 4 GB RAM Non scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 80000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"4 GB"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM - A/M"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM - A/M'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a24'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A24 128 Go 4 GB RAM Non scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A33 128 Go 6 GB RAM Non scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM - A/M',
  90000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM - A/M"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a33'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A33 128 Go 6 GB RAM Non scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 90000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM - A/M"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM - A/M'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a33'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A33 128 Go 6 GB RAM Non scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A23 128 Go 4 GB RAM Non scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM - A/M',
  70000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"4 GB"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM - A/M"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a23'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A23 128 Go 4 GB RAM Non scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 70000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"4 GB"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM - A/M"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM - A/M'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a23'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A23 128 Go 4 GB RAM Non scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A82 128 Go 6 GB RAM Non scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM - A/M',
  90000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM - A/M"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a82'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A82 128 Go 6 GB RAM Non scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 90000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM - A/M"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM - A/M'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a82'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A82 128 Go 6 GB RAM Non scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy M44 128 Go 6 GB RAM Non scellé 1SIM (Korea)',
  'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM - A/M',
  80000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM - A/M"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-m44'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy M44 128 Go 6 GB RAM Non scellé 1SIM (Korea)'))
  );

UPDATE products p
SET price = 80000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"RAM","value":"6 GB"},{"label":"Conditionnement","value":"Non scellé"},{"label":"SIM","value":"1SIM"},{"label":"Origine","value":"Korea"},{"label":"Source","value":"SAMSUNG NON SCELLÉ 1SIM - A/M"}]'::jsonb,
    description = 'Import Mfoundi Mall — SAMSUNG NON SCELLÉ 1SIM - A/M'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-m44'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy M44 128 Go 6 GB RAM Non scellé 1SIM (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Watch4 (Korea)',
  'Import Mfoundi Mall — Samsung Galaxy Watch',
  50000,
  'accessories',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Origine","value":"Korea"},{"label":"Source","value":"Samsung Galaxy Watch"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch4'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Watch4 (Korea)'))
  );

UPDATE products p
SET price = 50000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Origine","value":"Korea"},{"label":"Source","value":"Samsung Galaxy Watch"}]'::jsonb,
    description = 'Import Mfoundi Mall — Samsung Galaxy Watch'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch4'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Watch4 (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Watch5 (Korea)',
  'Import Mfoundi Mall — Samsung Galaxy Watch',
  65000,
  'accessories',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Origine","value":"Korea"},{"label":"Source","value":"Samsung Galaxy Watch"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch5'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Watch5 (Korea)'))
  );

UPDATE products p
SET price = 65000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Origine","value":"Korea"},{"label":"Source","value":"Samsung Galaxy Watch"}]'::jsonb,
    description = 'Import Mfoundi Mall — Samsung Galaxy Watch'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch5'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Watch5 (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Watch6 (Korea)',
  'Import Mfoundi Mall — Samsung Galaxy Watch',
  75000,
  'accessories',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Origine","value":"Korea"},{"label":"Source","value":"Samsung Galaxy Watch"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch6'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Watch6 (Korea)'))
  );

UPDATE products p
SET price = 75000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Origine","value":"Korea"},{"label":"Source","value":"Samsung Galaxy Watch"}]'::jsonb,
    description = 'Import Mfoundi Mall — Samsung Galaxy Watch'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch6'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Watch6 (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Watch7 (Korea)',
  'Import Mfoundi Mall — Samsung Galaxy Watch',
  95000,
  'accessories',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Origine","value":"Korea"},{"label":"Source","value":"Samsung Galaxy Watch"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch7'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Watch7 (Korea)'))
  );

UPDATE products p
SET price = 95000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Origine","value":"Korea"},{"label":"Source","value":"Samsung Galaxy Watch"}]'::jsonb,
    description = 'Import Mfoundi Mall — Samsung Galaxy Watch'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch7'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Watch7 (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Watch4 Classic (Korea)',
  'Import Mfoundi Mall — Samsung Galaxy Watch',
  55000,
  'accessories',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Origine","value":"Korea"},{"label":"Source","value":"Samsung Galaxy Watch"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch4-classic'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Watch4 Classic (Korea)'))
  );

UPDATE products p
SET price = 55000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Origine","value":"Korea"},{"label":"Source","value":"Samsung Galaxy Watch"}]'::jsonb,
    description = 'Import Mfoundi Mall — Samsung Galaxy Watch'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch4-classic'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Watch4 Classic (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Watch5 Pro (Korea)',
  'Import Mfoundi Mall — Samsung Galaxy Watch',
  75000,
  'accessories',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Origine","value":"Korea"},{"label":"Source","value":"Samsung Galaxy Watch"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch5-pro'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Watch5 Pro (Korea)'))
  );

UPDATE products p
SET price = 75000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Origine","value":"Korea"},{"label":"Source","value":"Samsung Galaxy Watch"}]'::jsonb,
    description = 'Import Mfoundi Mall — Samsung Galaxy Watch'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch5-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Watch5 Pro (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Watch6 Classic (Korea)',
  'Import Mfoundi Mall — Samsung Galaxy Watch',
  85000,
  'accessories',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Origine","value":"Korea"},{"label":"Source","value":"Samsung Galaxy Watch"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch6-classic'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Watch6 Classic (Korea)'))
  );

UPDATE products p
SET price = 85000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Origine","value":"Korea"},{"label":"Source","value":"Samsung Galaxy Watch"}]'::jsonb,
    description = 'Import Mfoundi Mall — Samsung Galaxy Watch'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch6-classic'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Watch6 Classic (Korea)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Watch7 Scellé',
  'Import Mfoundi Mall — Watch & Buds Scellé',
  135000,
  'accessories',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Conditionnement","value":"Scellé"},{"label":"Source","value":"Watch & Buds Scellé"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch7'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Watch7 Scellé'))
  );

UPDATE products p
SET price = 135000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Conditionnement","value":"Scellé"},{"label":"Source","value":"Watch & Buds Scellé"}]'::jsonb,
    description = 'Import Mfoundi Mall — Watch & Buds Scellé'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch7'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Watch7 Scellé'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Watch Ultra Scellé',
  'Import Mfoundi Mall — Watch & Buds Scellé',
  210000,
  'accessories',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Conditionnement","value":"Scellé"},{"label":"Source","value":"Watch & Buds Scellé"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch-ultra'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Watch Ultra Scellé'))
  );

UPDATE products p
SET price = 210000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Conditionnement","value":"Scellé"},{"label":"Source","value":"Watch & Buds Scellé"}]'::jsonb,
    description = 'Import Mfoundi Mall — Watch & Buds Scellé'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch-ultra'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Watch Ultra Scellé'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Watch8 Scellé',
  'Import Mfoundi Mall — Watch & Buds Scellé',
  170000,
  'accessories',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Conditionnement","value":"Scellé"},{"label":"Source","value":"Watch & Buds Scellé"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch8'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Watch8 Scellé'))
  );

UPDATE products p
SET price = 170000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Conditionnement","value":"Scellé"},{"label":"Source","value":"Watch & Buds Scellé"}]'::jsonb,
    description = 'Import Mfoundi Mall — Watch & Buds Scellé'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch8'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Watch8 Scellé'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Watch8 Classic Scellé',
  'Import Mfoundi Mall — Watch & Buds Scellé',
  210000,
  'accessories',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Conditionnement","value":"Scellé"},{"label":"Source","value":"Watch & Buds Scellé"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch8-classic'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Watch8 Classic Scellé'))
  );

UPDATE products p
SET price = 210000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Conditionnement","value":"Scellé"},{"label":"Source","value":"Watch & Buds Scellé"}]'::jsonb,
    description = 'Import Mfoundi Mall — Watch & Buds Scellé'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch8-classic'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Watch8 Classic Scellé'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Watch FIT 3 Scellé',
  'Import Mfoundi Mall — Watch & Buds Scellé',
  35000,
  'accessories',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Conditionnement","value":"Scellé"},{"label":"Source","value":"Watch & Buds Scellé"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch-fit-3'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Watch FIT 3 Scellé'))
  );

UPDATE products p
SET price = 35000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Conditionnement","value":"Scellé"},{"label":"Source","value":"Watch & Buds Scellé"}]'::jsonb,
    description = 'Import Mfoundi Mall — Watch & Buds Scellé'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-watch-fit-3'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Watch FIT 3 Scellé'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy Buds Core Scellé',
  'Import Mfoundi Mall — Watch & Buds Scellé',
  32000,
  'accessories',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Conditionnement","value":"Scellé"},{"label":"Source","value":"Watch & Buds Scellé"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-buds-core'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy Buds Core Scellé'))
  );

UPDATE products p
SET price = 32000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Conditionnement","value":"Scellé"},{"label":"Source","value":"Watch & Buds Scellé"}]'::jsonb,
    description = 'Import Mfoundi Mall — Watch & Buds Scellé'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-buds-core'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy Buds Core Scellé'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 7a 128 Go Non scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS',
  100000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-7a'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 7a 128 Go Non scellé (US/Japan)'))
  );

UPDATE products p
SET price = 100000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-7a'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 7a 128 Go Non scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 7 128 Go Non scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS',
  110000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-7'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 7 128 Go Non scellé (US/Japan)'))
  );

UPDATE products p
SET price = 110000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-7'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 7 128 Go Non scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 7 256 Go Non scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS',
  120000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-7'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 7 256 Go Non scellé (US/Japan)'))
  );

UPDATE products p
SET price = 120000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-7'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 7 256 Go Non scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 8 128 Go Non scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS',
  165000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-8'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 8 128 Go Non scellé (US/Japan)'))
  );

UPDATE products p
SET price = 165000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-8'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 8 128 Go Non scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 6 Pro 128 Go Non scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS',
  140000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-6-pro'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 6 Pro 128 Go Non scellé (US/Japan)'))
  );

UPDATE products p
SET price = 140000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-6-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 6 Pro 128 Go Non scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 6 Pro 256 Go Non scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS',
  155000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-6-pro'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 6 Pro 256 Go Non scellé (US/Japan)'))
  );

UPDATE products p
SET price = 155000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-6-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 6 Pro 256 Go Non scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 6 Pro 512 Go Non scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS',
  165000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-6-pro'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 6 Pro 512 Go Non scellé (US/Japan)'))
  );

UPDATE products p
SET price = 165000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"512 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-6-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 6 Pro 512 Go Non scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 7 Pro 128 Go Non scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS',
  160000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-7-pro'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 7 Pro 128 Go Non scellé (US/Japan)'))
  );

UPDATE products p
SET price = 160000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-7-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 7 Pro 128 Go Non scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 7 Pro 256 Go Non scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS',
  180000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-7-pro'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 7 Pro 256 Go Non scellé (US/Japan)'))
  );

UPDATE products p
SET price = 180000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-7-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 7 Pro 256 Go Non scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 8 Pro 128 Go Non scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS',
  205000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-8-pro'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 8 Pro 128 Go Non scellé (US/Japan)'))
  );

UPDATE products p
SET price = 205000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-8-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 8 Pro 128 Go Non scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 8 Pro 256 Go Non scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS',
  240000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-8-pro'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 8 Pro 256 Go Non scellé (US/Japan)'))
  );

UPDATE products p
SET price = 240000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-8-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 8 Pro 256 Go Non scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 9 256 Go Non scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS',
  295000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-9'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 9 256 Go Non scellé (US/Japan)'))
  );

UPDATE products p
SET price = 295000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-9'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 9 256 Go Non scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 9 Pro 256 Go Non scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS',
  375000,
  'phones',
  b.id,
  pr.id,
  'refurbished',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-9-pro'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 9 Pro 256 Go Non scellé (US/Japan)'))
  );

UPDATE products p
SET price = 375000,
    condition = 'refurbished',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Non scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL NON SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL NON SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-9-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 9 Pro 256 Go Non scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 8a 128 Go Scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL SCELLÉS',
  175000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-8a'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 8a 128 Go Scellé (US/Japan)'))
  );

UPDATE products p
SET price = 175000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-8a'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 8a 128 Go Scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 8 Pro 128 Go Scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL SCELLÉS',
  260000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-8-pro'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 8 Pro 128 Go Scellé (US/Japan)'))
  );

UPDATE products p
SET price = 260000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-8-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 8 Pro 128 Go Scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 8 Pro 256 Go Scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL SCELLÉS',
  280000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-8-pro'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 8 Pro 256 Go Scellé (US/Japan)'))
  );

UPDATE products p
SET price = 280000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-8-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 8 Pro 256 Go Scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Google Pixel 9 Pro XL 128 Go Scellé (US/Japan)',
  'Import Mfoundi Mall — GOOGLE PIXEL SCELLÉS',
  380000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL SCELLÉS"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-9-pro-xl'
WHERE b.slug = 'google-pixel'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Google Pixel 9 Pro XL 128 Go Scellé (US/Japan)'))
  );

UPDATE products p
SET price = 380000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Conditionnement","value":"Scellé"},{"label":"Origine","value":"US/Japan"},{"label":"Source","value":"GOOGLE PIXEL SCELLÉS"}]'::jsonb,
    description = 'Import Mfoundi Mall — GOOGLE PIXEL SCELLÉS'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pixel-9-pro-xl'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Google Pixel 9 Pro XL 128 Go Scellé (US/Japan)'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A07 64 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  65000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"64 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a07'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A07 64 Go'))
  );

UPDATE products p
SET price = 65000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"64 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a07'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A07 64 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A07 128 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  73000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a07'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A07 128 Go'))
  );

UPDATE products p
SET price = 73000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a07'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A07 128 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A16 128 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  90000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a16'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A16 128 Go'))
  );

UPDATE products p
SET price = 90000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a16'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A16 128 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A17 128 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  100000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a17'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A17 128 Go'))
  );

UPDATE products p
SET price = 100000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a17'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A17 128 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Samsung Galaxy A17 256 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  130000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a17'
WHERE b.slug = 'samsung'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Samsung Galaxy A17 256 Go'))
  );

UPDATE products p
SET price = 130000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'galaxy-a17'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Samsung Galaxy A17 256 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Xiaomi Redmi A5 64 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  57000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"64 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-a5'
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Xiaomi Redmi A5 64 Go'))
  );

UPDATE products p
SET price = 57000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"64 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-a5'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Xiaomi Redmi A5 64 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Xiaomi Redmi A5 128 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  63000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-a5'
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Xiaomi Redmi A5 128 Go'))
  );

UPDATE products p
SET price = 63000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-a5'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Xiaomi Redmi A5 128 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Xiaomi Redmi 13 256 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  90000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-13'
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Xiaomi Redmi 13 256 Go'))
  );

UPDATE products p
SET price = 90000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-13'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Xiaomi Redmi 13 256 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Xiaomi Redmi 15 256 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  100000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-15'
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Xiaomi Redmi 15 256 Go'))
  );

UPDATE products p
SET price = 100000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-15'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Xiaomi Redmi 15 256 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Xiaomi Redmi Note 9 Pro 128 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  65000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-note-9-pro'
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Xiaomi Redmi Note 9 Pro 128 Go'))
  );

UPDATE products p
SET price = 65000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-note-9-pro'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Xiaomi Redmi Note 9 Pro 128 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Xiaomi Redmi 14C 256 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  75000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-14c'
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Xiaomi Redmi 14C 256 Go'))
  );

UPDATE products p
SET price = 75000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-14c'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Xiaomi Redmi 14C 256 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Xiaomi Redmi 15C 128 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  75000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-15c'
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Xiaomi Redmi 15C 128 Go'))
  );

UPDATE products p
SET price = 75000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-15c'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Xiaomi Redmi 15C 128 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Xiaomi Redmi 15C 256 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  87000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-15c'
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Xiaomi Redmi 15C 256 Go'))
  );

UPDATE products p
SET price = 87000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-15c'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Xiaomi Redmi 15C 256 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Xiaomi Redmi Note 14 256 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  120000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-note-14'
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Xiaomi Redmi Note 14 256 Go'))
  );

UPDATE products p
SET price = 120000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-note-14'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Xiaomi Redmi Note 14 256 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Xiaomi Redmi Note 15 256 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  132000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-note-15'
WHERE b.slug = 'xiaomi'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Xiaomi Redmi Note 15 256 Go'))
  );

UPDATE products p
SET price = 132000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'redmi-note-15'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Xiaomi Redmi Note 15 256 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Infinix Smart 10 HD 64 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  60000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"64 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'smart-10-hd'
WHERE b.slug = 'infinix'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Infinix Smart 10 HD 64 Go'))
  );

UPDATE products p
SET price = 60000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"64 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'smart-10-hd'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Infinix Smart 10 HD 64 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Infinix Smart 10 128 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  70000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'smart-10'
WHERE b.slug = 'infinix'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Infinix Smart 10 128 Go'))
  );

UPDATE products p
SET price = 70000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'smart-10'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Infinix Smart 10 128 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Infinix Hot 60i 128 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  75000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'hot-60i'
WHERE b.slug = 'infinix'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Infinix Hot 60i 128 Go'))
  );

UPDATE products p
SET price = 75000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'hot-60i'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Infinix Hot 60i 128 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Infinix Hot 60i 256 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  90000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'hot-60i'
WHERE b.slug = 'infinix'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Infinix Hot 60i 256 Go'))
  );

UPDATE products p
SET price = 90000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'hot-60i'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Infinix Hot 60i 256 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Infinix Hot 50 Pro+ 128 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  135000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'hot-50-pro-plus'
WHERE b.slug = 'infinix'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Infinix Hot 50 Pro+ 128 Go'))
  );

UPDATE products p
SET price = 135000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'hot-50-pro-plus'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Infinix Hot 50 Pro+ 128 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Tecno Pop 10 64 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  60000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"64 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pop-10'
WHERE b.slug = 'tecno'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Tecno Pop 10 64 Go'))
  );

UPDATE products p
SET price = 60000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"64 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'pop-10'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Tecno Pop 10 64 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Tecno Spark 40 128 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  80000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'spark-40'
WHERE b.slug = 'tecno'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Tecno Spark 40 128 Go'))
  );

UPDATE products p
SET price = 80000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"128 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'spark-40'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Tecno Spark 40 128 Go'));

INSERT INTO products (
  id, name, description, price, category, brand, product_range, condition,
  image, stock, rating, specs, warranty_months, is_featured, images
)
SELECT
  gen_random_uuid(),
  'Tecno Spark 40 256 Go',
  'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26',
  100000,
  'phones',
  b.id,
  pr.id,
  'new',
  '/icons/icon-192x192.png',
  0,
  5,
  '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"},{"label":"Notes","value":"Source text wrote ''Spart 40''; normalized to Spark 40."}]'::jsonb,
  0,
  false,
  '{}'::text[]
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'spark-40'
WHERE b.slug = 'tecno'
  AND NOT EXISTS (
    SELECT 1 FROM products ex
    WHERE ex.brand = b.id
      AND ex.product_range = pr.id
      AND lower(trim(ex.name)) = lower(trim('Tecno Spark 40 256 Go'))
  );

UPDATE products p
SET price = 100000,
    condition = 'new',
    warranty_months = 0,
    specs = '[{"label":"Stockage","value":"256 Go"},{"label":"Source","value":"New arrivages Ets XEPTION - 03/03/26"},{"label":"Notes","value":"Source text wrote ''Spart 40''; normalized to Spark 40."}]'::jsonb,
    description = 'Import Mfoundi Mall — New arrivages Ets XEPTION - 03/03/26'
FROM brands b
JOIN product_ranges pr ON pr.brand_id = b.id AND pr.slug = 'spark-40'
WHERE p.brand = b.id
  AND p.product_range = pr.id
  AND lower(trim(p.name)) = lower(trim('Tecno Spark 40 256 Go'));

