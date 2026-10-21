-- products.is_published : défaut true.
-- 007 a posé DEFAULT false : tout produit créé par l'ERP, le Studio ou le funnel d'ingestion
-- (qui n'envoient pas la colonne) serait devenu invisible sur la boutique. Seule la création
-- Telegram doit être masquée, et telegram_staff_product_commit écrit déjà is_published = false
-- explicitement. Aucune ligne existante n'est modifiée.
BEGIN;

ALTER TABLE public.products
  ALTER COLUMN is_published SET DEFAULT true;

COMMIT;
