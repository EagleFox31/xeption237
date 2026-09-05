-- ============================================================================
-- Complète `20260823_020` : révoque EXECUTE à PUBLIC, pas seulement à `anon`.
--
-- Postgres accorde EXECUTE à PUBLIC par défaut sur toute nouvelle fonction.
-- `REVOKE ... FROM anon` seul est donc SANS EFFET : anon hérite du droit via
-- PUBLIC, et `has_function_privilege('anon', ...)` reste true.
--
-- Le contrôle d'appartenance à `staff` posé en 020 protège déjà réellement
-- (une session anonyme est refusée) : ceci est de la défense en profondeur,
-- pas la fermeture d'un trou ouvert.
--
-- Motif à reprendre pour toute future RPC sensible :
--   REVOKE ALL ON FUNCTION ... FROM PUBLIC;
--   GRANT EXECUTE ON FUNCTION ... TO authenticated, service_role;
--
-- Idempotent : rejouable sans erreur.
-- ============================================================================

BEGIN;

REVOKE ALL ON FUNCTION public.get_staff_sales_summary(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_staff_sales(uuid, timestamptz, timestamptz)        FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_staff_sales_summary(uuid, timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_staff_sales(uuid, timestamptz, timestamptz)        TO authenticated, service_role;

COMMIT;
