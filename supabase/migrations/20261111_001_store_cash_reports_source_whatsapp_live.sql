-- Nouvelle provenance des rapports de caisse : 'whatsapp_live' (ingestion automatique du
-- groupe WhatsApp via webhook WAHA -> Edge Function whatsapp-cash-webhook).
--
-- Prérequis vérifié en base (2026-11-11, lecture seule) : la contrainte
-- store_cash_reports_source_check existe avec CHECK (source IN ('bot', 'whatsapp_backfill')).
-- Additive (élargit la liste autorisée) et idempotente : DROP IF EXISTS puis recréation.
-- À appliquer AVANT le déploiement de la fonction (sinon ses inserts sont rejetés).
BEGIN;

ALTER TABLE public.store_cash_reports
  DROP CONSTRAINT IF EXISTS store_cash_reports_source_check;

ALTER TABLE public.store_cash_reports
  ADD CONSTRAINT store_cash_reports_source_check
  CHECK (source IN ('bot', 'whatsapp_backfill', 'whatsapp_live'));

COMMENT ON COLUMN public.store_cash_reports.source IS
  'Origine de la ligne : bot (saisie Telegram) | whatsapp_backfill (reprise export WhatsApp) | whatsapp_live (webhook WAHA du groupe WhatsApp).';
COMMENT ON COLUMN public.store_cash_reports.source_ref IS
  'Référence dans la source : horodatage du message (whatsapp:<date>) ou identifiant WAHA (waha:<id>). Jamais de donnée nominative.';

COMMIT;
