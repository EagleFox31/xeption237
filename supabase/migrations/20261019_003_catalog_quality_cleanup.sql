-- Nettoyage qualité catalogue (audit du 19/10/2026, décisions propriétaire) :
--   1. promos inversées (prix barré < prix de vente) ;
--   2. doublons : on garde la fiche la plus complète (photos, commandes, dernière mise à jour),
--      les autres sont archivées dans archived_rows puis supprimées (historique = backfill initial seul) ;
--   3. marques manquantes déterminables (Tecno, Xiaomi) ;
--   4. titres normalisés (marque, casse, espaces, capacité quand elle est unique) ;
--   5. stock disponible minimum 6 via store_stock (le trigger resynchronise products.stock),
--      tracé par un mouvement inventory_adjust.
-- Idempotent : chaque étape ne touche que les lignes encore à corriger.
BEGIN;

-- ── Archive générique des lignes supprimées (lecture staff via service role uniquement) ──
CREATE TABLE IF NOT EXISTS public.archived_rows (
  id           bigserial PRIMARY KEY,
  source_table text        NOT NULL,
  source_id    text        NOT NULL,
  row_data     jsonb       NOT NULL,
  reason       text,
  archived_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.archived_rows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.archived_rows FROM PUBLIC, anon, authenticated;

-- ── 1. Promos inversées ──
UPDATE public.products
SET price = "oldPrice", "oldPrice" = price
WHERE name IN ('Samsung Galaxy A17', 'Infinix Hot 60i')
  AND "oldPrice" > 0 AND "oldPrice" < price;

-- ── 2. Doublons ──
CREATE TEMP TABLE dedup_drop (id text PRIMARY KEY, keep_id text NOT NULL) ON COMMIT DROP;
INSERT INTO dedup_drop (id, keep_id) VALUES
  ('7be7a846-fbfb-49c5-ab60-eb1a0146b092', '02046144-d565-48fc-a9d5-8e25b8f5607d'), -- Z Flip6 (3 photos gardée)
  ('961e8784-f6d7-47b9-97f7-a7c5373e4b82', '02046144-d565-48fc-a9d5-8e25b8f5607d'),
  ('a78f0aa7-37f0-4162-88a6-237502e124b8', 'e2f86f60-a4f5-4e58-91bb-6528ce538636'), -- Z Flip4 (identiques)
  ('ff7c2538-f380-4738-b68a-0071e1e5a873', '9be02c29-6196-4a57-b148-f82d08ee813e'), -- Pixel 10 Pro (3 commandes, + récente)
  ('c8503f74-9651-45fc-97ba-9373a472acab', '8adc0b6a-a82d-42f4-88c2-15d5f8dcd5b7'), -- Pixel 8 Pro (5 photos gardée)
  ('4635203c-d2d6-47a7-b29c-b8cff1edeea0', 'cf4dc8c7-d88c-434f-a6f3-4b809e1cd923'), -- Galaxy A07 (identiques)
  ('10a1674e-1cc7-49aa-948b-d4e4dd3c46be', 'add14d88-4dfe-40e1-995c-605affb7b2ab'), -- S21 Ultra (identiques)
  ('180d541c-db60-4f70-acb4-b4f5483a6ec4', 'add14d88-4dfe-40e1-995c-605affb7b2ab'),
  ('cca927a4-b427-46ad-ab64-cd6ce9679305', '048b1fec-9214-4922-a526-26f649fc8411'), -- Watch Ultra 2024
  ('acb5e540-5c38-4507-a9ef-5a987626adca', '048b1fec-9214-4922-a526-26f649fc8411');

-- Ne supprimer que si la fiche gardée existe encore (sécurité si rejoué sur une base modifiée).
DELETE FROM dedup_drop d
WHERE NOT EXISTS (SELECT 1 FROM public.products k WHERE k.id = d.keep_id);

INSERT INTO public.archived_rows (source_table, source_id, row_data, reason)
SELECT 'products', p.id, to_jsonb(p), 'dedup 20261019 -> ' || d.keep_id
FROM public.products p JOIN dedup_drop d ON d.id = p.id;

INSERT INTO public.archived_rows (source_table, source_id, row_data, reason)
SELECT 'stock_movements', m.id::text, to_jsonb(m), 'dedup 20261019'
FROM public.stock_movements m JOIN dedup_drop d ON d.id = m.product_id;

INSERT INTO public.archived_rows (source_table, source_id, row_data, reason)
SELECT 'stock_inventory_lines', l.id::text, to_jsonb(l), 'dedup 20261019'
FROM public.stock_inventory_lines l JOIN dedup_drop d ON d.id = l.product_id;

INSERT INTO public.archived_rows (source_table, source_id, row_data, reason)
SELECT 'store_stock', s.store_id::text || ':' || s.product_id, to_jsonb(s), 'dedup 20261019'
FROM public.store_stock s JOIN dedup_drop d ON d.id = s.product_id;

DELETE FROM public.stock_movements       WHERE product_id IN (SELECT id FROM dedup_drop);
DELETE FROM public.stock_inventory_lines WHERE product_id IN (SELECT id FROM dedup_drop);
DELETE FROM public.store_stock           WHERE product_id IN (SELECT id FROM dedup_drop);
DELETE FROM public.products              WHERE id         IN (SELECT id FROM dedup_drop);

-- ── 3. Marques manquantes déterminables ──
UPDATE public.products SET brand = (SELECT id FROM public.brands WHERE name = 'Tecno')
WHERE brand IS NULL AND name ILIKE '%tecno megapad%';
UPDATE public.products SET brand = (SELECT id FROM public.brands WHERE name = 'Xiaomi')
WHERE brand IS NULL AND name = 'Xiaomi 11 Lite NE 5G';

-- ── 4. Titres ──
UPDATE public.products p
SET name = r.new_name
FROM (VALUES
  ('Buds 3 Pro',                  'Samsung Galaxy Buds3 Pro'),
  ('Buds core',                   'Samsung Galaxy Buds Core'),
  ('Buds Fe',                     'Samsung Galaxy Buds FE'),
  ('Buds Pro 4',                  'Samsung Galaxy Buds4 Pro'),
  ('Fit 3 Samsung',               'Samsung Galaxy Fit3'),
  ('Galaxy Z flip 6 ',            'Samsung Galaxy Z Flip6 512 Go'),
  ('Galaxy Z flip4  ',            'Samsung Galaxy Z Flip4'),
  ('Google Pixel 7 256 Go ',      'Google Pixel 7 256 Go'),
  ('GOOGLE PIXEL 7 PRO 5G - 6.7', 'Google Pixel 7 Pro 5G'),
  ('Google Pixel 8 Pro 256 Go ',  'Google Pixel 8 Pro 256 Go'),
  ('Google Pixel 9 Pro XL ',      'Google Pixel 9 Pro XL'),
  ('Google Pixel 9a ',            'Google Pixel 9a'),
  ('Infinix HOT 60 Pro ',         'Infinix Hot 60 Pro 256 Go'),
  ('iPhone 11 Pro 64 Go ',        'iPhone 11 Pro 64 Go'),
  ('iPhone 11 Pro Max 256Go ',    'iPhone 11 Pro Max 256 Go'),
  ('iPhone 11 Pro Max 64Go ',     'iPhone 11 Pro Max 64 Go'),
  ('iPhone 12 128Go ',            'iPhone 12 128 Go'),
  ('IPHONE 12 PRO',               'iPhone 12 Pro'),
  ('iPhone 13 Pro 128Go ',        'iPhone 13 Pro 128 Go'),
  ('iPhone 14 Pro Max 128Go ',    'iPhone 14 Pro Max 128 Go'),
  ('IPhone XR 128 Go ',           'iPhone XR 128 Go'),
  ('Redmi 15C ',                  'Xiaomi Redmi 15C'),
  ('Redmi A3 Pro',                'Xiaomi Redmi A3 Pro 128 Go'),
  ('Redmi A5',                    'Xiaomi Redmi A5'),
  ('Redmi note 8 ',               'Xiaomi Redmi Note 8'),
  ('Redmi Note 8 A ',             'Xiaomi Redmi Note 8A'),
  ('S21  256Go ',                 'Samsung Galaxy S21 256 Go'),
  ('Samsung S 23 FE  256 Go',     'Samsung Galaxy S23 FE 256 Go'),
  ('Samsung S21 ultra',           'Samsung Galaxy S21 Ultra'),
  ('Samsung S22 ',                'Samsung Galaxy S22 256 Go'),
  ('Samsung S22 ultra ',          'Samsung Galaxy S22 Ultra 256 Go'),
  ('Samsung S23 ',                'Samsung Galaxy S23'),
  ('Samsung S23 ultra ',          'Samsung Galaxy S23 Ultra'),
  ('Samsung S23 ultra 512Go ',    'Samsung Galaxy S23 Ultra 512 Go'),
  ('Samsung S24 ultra ',          'Samsung Galaxy S24 Ultra 256 Go'),
  ('TABLETTE TECNO MEGAPAD SE ',  'Tecno Megapad SE 128 Go'),
  ('Tecno Pop 3',                 'Tecno Pop 3 16 Go'),
  ('Tecno Spark 50 ',             'Tecno Spark 50')
) AS r(old_name, new_name)
WHERE p.name = r.old_name;

-- ── 5. Stock disponible minimum ──
-- Boutique de rattachement : l'unique magasin « Siège » (store_stock n'en connaît qu'un).
CREATE TEMP TABLE stock_fix ON COMMIT DROP AS
SELECT p.id AS product_id,
       s.id AS store_id,
       COALESCE(ss.quantity, 0) AS old_qty,
       COALESCE(ss.reserved, 0) + 6 AS new_qty
FROM public.products p
CROSS JOIN (SELECT id FROM public.stores WHERE name ILIKE '%siège%' ORDER BY id LIMIT 1) s
LEFT JOIN public.store_stock ss ON ss.product_id = p.id AND ss.store_id = s.id
WHERE COALESCE(ss.quantity, 0) - COALESCE(ss.reserved, 0) < 6;

INSERT INTO public.store_stock (store_id, product_id, quantity)
SELECT store_id, product_id, new_qty FROM stock_fix
ON CONFLICT (store_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now();

INSERT INTO public.stock_movements (store_id, product_id, delta, reason, ref_type, note)
SELECT store_id, product_id, new_qty - old_qty, 'inventory_adjust', 'migration',
       '20261019_003_catalog_quality_cleanup : stock minimum 6'
FROM stock_fix;

COMMIT;
