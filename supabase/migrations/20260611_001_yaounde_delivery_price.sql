-- Yaoundé : livraison à 1 000 FCFA
UPDATE delivery_zones
SET price = 1000
WHERE name ILIKE '%Yaoundé%' OR name ILIKE '%Yaounde%';
