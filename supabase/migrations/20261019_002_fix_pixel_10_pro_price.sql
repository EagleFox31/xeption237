-- Prix du Google Pixel 10 Pro saisi à 680 XAF (erreur de saisie) : aligné sur le marché (555 000 XAF).
-- Idempotent : rejouer ne change rien.
BEGIN;

UPDATE public.products
SET price = 555000
WHERE id = '9be02c29-6196-4a57-b148-f82d08ee813e'
  AND price IS DISTINCT FROM 555000;

COMMIT;
