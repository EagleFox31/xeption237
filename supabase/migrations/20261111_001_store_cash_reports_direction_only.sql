-- Lecture de store_cash_reports réservée à la direction (direction / super_admin).
-- Avant : policy store_cash_reports_staff_read (is_staff_member()) → tout le staff.
-- Le bot (service_role) n'est pas concerné : il contourne la RLS.
-- Idempotente : rejouable sans erreur.

BEGIN;

DROP POLICY IF EXISTS store_cash_reports_staff_read ON public.store_cash_reports;
DROP POLICY IF EXISTS store_cash_reports_direction_read ON public.store_cash_reports;

CREATE POLICY store_cash_reports_direction_read
  ON public.store_cash_reports
  FOR SELECT
  TO authenticated
  USING (public.is_direction_staff());

COMMIT;
