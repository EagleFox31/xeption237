-- Recopie les photo_urls de trade_in_requests vers marketplace_listings
-- pour les annonces créées avant la colonne photo_urls (migration 002).
-- Idempotent : ne touche que les lignes où photo_urls est vide et troc_ref existe.

BEGIN;

UPDATE marketplace_listings ml
SET photo_urls = tir.photo_urls
FROM trade_in_requests tir
WHERE ml.troc_ref = tir.id
  AND (ml.photo_urls IS NULL OR ml.photo_urls = '{}')
  AND tir.photo_urls IS NOT NULL
  AND array_length(tir.photo_urls, 1) > 0;

COMMIT;
