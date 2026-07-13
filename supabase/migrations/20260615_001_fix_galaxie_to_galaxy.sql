-- Corrige la graphie « Galaxie » → « Galaxy » (gamme Samsung officielle)
UPDATE products
SET name = regexp_replace(name, '\mGalaxie\M', 'Galaxy', 'gi')
WHERE name ~* '\mGalaxie\M';

UPDATE products
SET description = regexp_replace(description, '\mGalaxie\M', 'Galaxy', 'gi')
WHERE description ~* '\mGalaxie\M';
