-- Provenance des rapports de caisse : saisie bot (défaut) ou reprise d'historique
-- (export WhatsApp via scripts/import-whatsapp-cash-reports.mjs).
--
-- Additive et idempotente. Le script d'import ne réécrit que les lignes dont
-- source = 'whatsapp_backfill' : une saisie bot n'est jamais écrasée par un backfill.
BEGIN;

ALTER TABLE public.store_cash_reports
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'bot',
  ADD COLUMN IF NOT EXISTS source_ref text;

COMMENT ON COLUMN public.store_cash_reports.source IS
  'Origine de la ligne : bot (saisie Telegram) | whatsapp_backfill (reprise export WhatsApp).';
COMMENT ON COLUMN public.store_cash_reports.source_ref IS
  'Référence dans la source (ex. horodatage du message WhatsApp d''origine). Jamais de donnée nominative.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.store_cash_reports'::regclass
      AND conname = 'store_cash_reports_source_check'
  ) THEN
    ALTER TABLE public.store_cash_reports
      ADD CONSTRAINT store_cash_reports_source_check
      CHECK (source IN ('bot', 'whatsapp_backfill'));
  END IF;
END $$;

COMMIT;
