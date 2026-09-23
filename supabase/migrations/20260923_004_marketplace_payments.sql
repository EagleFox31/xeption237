-- Paiements de frais de publication marketplace (100 XAF via Campay).
-- Un paiement confirmed (status='paid') débloque l'insertion de l'annonce.

BEGIN;

CREATE TABLE IF NOT EXISTS public.marketplace_payments (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  reference   TEXT NOT NULL UNIQUE,   -- MKT-{8char}-{timestamp}
  campay_ref  TEXT,                   -- référence interne Campay
  phone       TEXT NOT NULL,
  channel     TEXT CHECK (channel IN ('om', 'momo')),
  amount      INT  NOT NULL DEFAULT 100,
  currency    TEXT NOT NULL DEFAULT 'XAF',
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_payments_reference_idx ON public.marketplace_payments (reference);
CREATE INDEX IF NOT EXISTS marketplace_payments_status_idx    ON public.marketplace_payments (status);

ALTER TABLE public.marketplace_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_payments_insert_anon"
  ON public.marketplace_payments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "marketplace_payments_select_anon"
  ON public.marketplace_payments FOR SELECT
  TO anon, authenticated
  USING (true);

COMMIT;
