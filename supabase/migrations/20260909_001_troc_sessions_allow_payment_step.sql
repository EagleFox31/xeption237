-- Migration : Autoriser l'étape 'payment' dans troc_sessions et troc_session_upsert
--
-- Contexte :
-- L'étape de paiement Campay a été introduite dans le tunnel Smart Troc (`step = 'payment'`),
-- mais la contrainte CHECK de `troc_sessions` et la validation de la RPC `troc_session_upsert`
-- rejetaient cette étape car seules ('form', 'photos', 'imei', 'result', 'voucher') étaient admises.

-- 1. Mise à jour de la contrainte CHECK sur troc_sessions
ALTER TABLE public.troc_sessions
  DROP CONSTRAINT IF EXISTS troc_sessions_last_step_check;

ALTER TABLE public.troc_sessions
  ADD CONSTRAINT troc_sessions_last_step_check
  CHECK (last_step IN ('form', 'photos', 'imei', 'payment', 'result', 'voucher'));

-- 2. Mise à jour de la fonction RPC troc_session_upsert
CREATE OR REPLACE FUNCTION public.troc_session_upsert(
  p_session_key text,
  p_last_step text,
  p_device_brand text DEFAULT NULL,
  p_device_model text DEFAULT NULL,
  p_trade_in_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_key text := trim(coalesce(p_session_key, ''));
BEGIN
  IF v_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  -- Inclut désormais 'payment'
  IF p_last_step NOT IN ('form', 'photos', 'imei', 'payment', 'result', 'voucher') THEN
    RETURN false;
  END IF;

  IF length(coalesce(p_device_brand, '')) > 120
     OR length(coalesce(p_device_model, '')) > 200
     OR length(coalesce(p_trade_in_id, '')) > 120 THEN
    RETURN false;
  END IF;

  INSERT INTO public.troc_sessions AS s
    (session_key, last_step, device_brand, device_model, trade_in_id, updated_at)
  VALUES
    (v_key, p_last_step, p_device_brand, p_device_model, p_trade_in_id, now())
  ON CONFLICT (session_key) DO UPDATE
    SET last_step    = EXCLUDED.last_step,
        device_brand = COALESCE(EXCLUDED.device_brand, s.device_brand),
        device_model = COALESCE(EXCLUDED.device_model, s.device_model),
        trade_in_id  = COALESCE(EXCLUDED.trade_in_id,  s.trade_in_id),
        updated_at   = now();

  RETURN true;
END;
$fn$;

COMMENT ON FUNCTION public.troc_session_upsert(text, text, text, text, text) IS
  'Suivi de parcours Smart Troc : cree ou met a jour UNE session, incluant l''etape payment.';

REVOKE ALL ON FUNCTION public.troc_session_upsert(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.troc_session_upsert(text, text, text, text, text)
  TO anon, authenticated;
