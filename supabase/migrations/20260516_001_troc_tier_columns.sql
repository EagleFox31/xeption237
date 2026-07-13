-- Migration : paliers Smart Troc (Express / Premium / Sûreté)
-- Date : 2026-05-16
-- À coller dans le SQL Editor Supabase.
--
-- Ajoute la colonne `tier` aux deux tables clés du flow Smart Troc :
--   • troc_payments       — source de vérité post-paiement (montant + tier choisi)
--   • trade_in_requests   — audit trail de la demande finale
--
-- Les valeurs possibles :
--   • express   (150 XAF)  — estimation IA + rapport
--   • premium   (500 XAF)  — express + certificat PDF + QR code
--   • safety    (1000 XAF) — premium + vérif IMEI blacklist mondiale

BEGIN;

-- ── troc_payments ────────────────────────────────────────────────────────────

ALTER TABLE public.troc_payments
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'express';

ALTER TABLE public.troc_payments
  DROP CONSTRAINT IF EXISTS troc_payments_tier_check;

ALTER TABLE public.troc_payments
  ADD CONSTRAINT troc_payments_tier_check
    CHECK (tier IN ('express', 'premium', 'safety'));

CREATE INDEX IF NOT EXISTS troc_payments_session_tier_idx
  ON public.troc_payments (session_key, tier);

-- ── trade_in_requests ────────────────────────────────────────────────────────

ALTER TABLE public.trade_in_requests
  ADD COLUMN IF NOT EXISTS tier TEXT;

ALTER TABLE public.trade_in_requests
  DROP CONSTRAINT IF EXISTS trade_in_requests_tier_check;

ALTER TABLE public.trade_in_requests
  ADD CONSTRAINT trade_in_requests_tier_check
    CHECK (tier IS NULL OR tier IN ('express', 'premium', 'safety'));

CREATE INDEX IF NOT EXISTS trade_in_requests_tier_idx
  ON public.trade_in_requests (tier);

-- ── Compteur d'appels premium imeicheck.net (audit coûts) ────────────────────

CREATE TABLE IF NOT EXISTS public.imei_premium_calls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key   TEXT,
  imei_tac      TEXT,                    -- TAC = 8 premiers chiffres (anonymise)
  tier          TEXT NOT NULL,
  provider      TEXT NOT NULL,           -- 'imeicheck.net'
  http_status   INT,
  succeeded     BOOLEAN NOT NULL,
  blacklisted   BOOLEAN,
  cost_xaf      INT,                     -- coût estimé (peut être null)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS imei_premium_calls_created_idx
  ON public.imei_premium_calls (created_at DESC);

ALTER TABLE public.imei_premium_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imei_premium_calls_admin_read" ON public.imei_premium_calls;
CREATE POLICY "imei_premium_calls_admin_read"
  ON public.imei_premium_calls FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
