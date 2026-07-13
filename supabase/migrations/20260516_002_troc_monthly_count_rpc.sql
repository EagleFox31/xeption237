-- Migration : RPC publique pour le compteur mensuel Smart Troc
-- Date : 2026-05-16
-- À coller dans le SQL Editor Supabase.
--
-- Permet aux clients anonymes (landing page) de lire un compteur agrégé
-- sans exposer trade_in_requests entière. Fonction SECURITY DEFINER qui
-- ne retourne qu'un INT, jamais de données client.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_troc_monthly_count()
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_count INT;
BEGIN
  SELECT COUNT(*)::INT INTO result_count
  FROM public.trade_in_requests
  WHERE created_at >= date_trunc('month', now());

  RETURN COALESCE(result_count, 0);
END;
$$;

-- Anon + authenticated peuvent exécuter (lecture seule, agrégat anonyme).
GRANT EXECUTE ON FUNCTION public.get_troc_monthly_count() TO anon, authenticated;

COMMIT;
