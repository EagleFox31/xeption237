-- Migration de rattrapage Smart Troc
-- 1. Aligne trade_in_requests avec les colonnes utilisées par save-trade-in
-- 2. Rend troc_sessions insérable/mise à jour côté client sans ouvrir la lecture publique

BEGIN;

-- ---------------------------------------------------------------------------
-- trade_in_requests : colonnes attendues par la Edge Function save-trade-in
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trade_in_requests'
      AND column_name = 'offer_cash'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trade_in_requests'
      AND column_name = 'trade_in_value'
  ) THEN
    ALTER TABLE public.trade_in_requests
      RENAME COLUMN offer_cash TO trade_in_value;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trade_in_requests'
      AND column_name = 'offer_type'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trade_in_requests'
      AND column_name = 'trade_in_grade'
  ) THEN
    ALTER TABLE public.trade_in_requests
      RENAME COLUMN offer_type TO trade_in_grade;
  END IF;
END $$;

ALTER TABLE public.trade_in_requests
  DROP COLUMN IF EXISTS offer_credit,
  ADD COLUMN IF NOT EXISTS client_ai_score INT,
  ADD COLUMN IF NOT EXISTS imei_assurance_level TEXT;

ALTER TABLE public.trade_in_requests
  DROP CONSTRAINT IF EXISTS trade_in_requests_offer_type_check,
  DROP CONSTRAINT IF EXISTS trade_in_requests_trade_in_grade_check,
  DROP CONSTRAINT IF EXISTS trade_in_requests_client_ai_score_check,
  DROP CONSTRAINT IF EXISTS trade_in_requests_imei_assurance_level_check;

UPDATE public.trade_in_requests
SET trade_in_grade = CASE trade_in_grade
  WHEN 'buyback' THEN 'excellent'
  WHEN 'partial_credit' THEN 'bon'
  WHEN 'spare_parts' THEN 'pieces'
  WHEN 'refused' THEN 'refuse'
  ELSE trade_in_grade
END
WHERE trade_in_grade IN ('buyback', 'partial_credit', 'spare_parts', 'refused');

ALTER TABLE public.trade_in_requests
  ADD CONSTRAINT trade_in_requests_trade_in_grade_check
    CHECK (trade_in_grade IS NULL OR trade_in_grade IN ('excellent', 'bon', 'pieces', 'refuse')),
  ADD CONSTRAINT trade_in_requests_client_ai_score_check
    CHECK (client_ai_score IS NULL OR (client_ai_score BETWEEN 0 AND 100)),
  ADD CONSTRAINT trade_in_requests_imei_assurance_level_check
    CHECK (imei_assurance_level IS NULL OR imei_assurance_level IN ('basic', 'premium'));

-- ---------------------------------------------------------------------------
-- troc_sessions : RLS compatible avec soumission publique et lecture staff
-- ---------------------------------------------------------------------------

ALTER TABLE public.troc_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "troc_sessions_anon_insert" ON public.troc_sessions;
DROP POLICY IF EXISTS "troc_sessions_anon_update" ON public.troc_sessions;
DROP POLICY IF EXISTS "troc_sessions_auth_select" ON public.troc_sessions;
DROP POLICY IF EXISTS "troc_sessions_insert_public" ON public.troc_sessions;
DROP POLICY IF EXISTS "troc_sessions_update_public" ON public.troc_sessions;
DROP POLICY IF EXISTS "troc_sessions_select_staff" ON public.troc_sessions;

CREATE POLICY "troc_sessions_insert_public"
  ON public.troc_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "troc_sessions_update_public"
  ON public.troc_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "troc_sessions_select_staff"
  ON public.troc_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff s
      WHERE lower(s.email) = lower(auth.jwt()->>'email')
    )
  );

COMMIT;
