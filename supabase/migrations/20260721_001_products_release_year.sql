-- Année de sortie du modèle (catalogue shop) — suggestion Troc « même marque, plus récent »
-- Rempli via scripts/batch-enrich-release-year.mjs (phone_releases + DeepSeek)

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS release_year INT
  CHECK (release_year IS NULL OR release_year BETWEEN 1995 AND 2100);

COMMENT ON COLUMN public.products.release_year IS
  'Année de sortie commerciale du modèle de base (hors variante stockage/couleur).';

CREATE INDEX IF NOT EXISTS products_phones_release_year_idx
  ON public.products (release_year)
  WHERE category = 'phones' AND release_year IS NOT NULL;

COMMIT;
