-- Migration : valeur cash séparée de la valeur crédit boutique
-- Date : 2026-05-16
-- À coller dans le SQL Editor Supabase.
--
-- trade_in_value         = valeur principale (= crédit boutique, sortie pure de l'algo)
-- trade_in_value_cash    = valeur cash immédiat (= crédit / 1.10, arrondi 5000 inférieur)
--
-- Marketing : "le crédit boutique inclut un bonus de +10 %" — mathématiquement vrai
-- (credit = cash × 1.10), sans surcoût pour le magasin (cash conservé sur la marge revente).

BEGIN;

ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS trade_in_value_cash INT;

ALTER TABLE public.trade_in_requests
  DROP CONSTRAINT IF EXISTS trade_in_requests_value_cash_check;

ALTER TABLE public.trade_in_requests
  ADD CONSTRAINT trade_in_requests_value_cash_check
    CHECK (trade_in_value_cash IS NULL OR trade_in_value_cash >= 0);

-- Backfill : recalcule la valeur cash pour les anciennes lignes (≈ value / 1.10, arrondi 5000).
UPDATE public.trade_in_requests
SET trade_in_value_cash = FLOOR((trade_in_value / 1.10) / 5000)::INT * 5000
WHERE trade_in_value_cash IS NULL
  AND trade_in_value IS NOT NULL
  AND trade_in_value > 0;

COMMIT;
