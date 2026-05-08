-- Migration : table troc_payments
-- Stocke chaque tentative de paiement avant évaluation Smart Troc.
-- Un paiement réussi (status='paid') débloque l'évaluation Gemini.

BEGIN;

CREATE TABLE IF NOT EXISTS public.troc_payments (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_key     TEXT NOT NULL,
  reference       TEXT NOT NULL UNIQUE,   -- référence transaction NotchPay
  amount          INT  NOT NULL DEFAULT 300,
  currency        TEXT NOT NULL DEFAULT 'XAF',
  channel         TEXT CHECK (channel IN ('om', 'momo', 'card')),
  phone           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  notchpay_status TEXT,                   -- statut brut retourné par NotchPay
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS troc_payments_session_key_idx ON public.troc_payments (session_key);
CREATE INDEX IF NOT EXISTS troc_payments_status_idx      ON public.troc_payments (status);

-- RLS : client anonyme peut créer + lire ses propres paiements (par session_key).
-- Seul le service role (webhook) peut écrire le statut final.
ALTER TABLE public.troc_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "troc_payments_insert_anon"  ON public.troc_payments;
DROP POLICY IF EXISTS "troc_payments_select_anon"  ON public.troc_payments;

CREATE POLICY "troc_payments_insert_anon"
  ON public.troc_payments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "troc_payments_select_anon"
  ON public.troc_payments FOR SELECT
  TO anon, authenticated
  USING (true);

COMMIT;
