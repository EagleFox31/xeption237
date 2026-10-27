-- ============================================================================
-- 20261027_001_store_cash_rls_staff_only.sql
-- Ferme store_debts / store_cash_reports / store_cash_drafts aux clients.
--
-- 20261023_005 ouvrait ces tables a tout `authenticated` (USING (true)). Or un
-- client devient `authenticated` via le lien magique du formulaire troc : il
-- pouvait lire et modifier dettes (noms, telephones) et rapports de caisse.
-- Seul le bot Telegram y accede, via service_role (hors RLS) et les RPC
-- telegram_staff_* : on retire tout acces direct a anon / authenticated.
-- Idempotent : rejouable sans effet.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS store_debts_staff_all ON public.store_debts;
DROP POLICY IF EXISTS store_cash_reports_staff_all ON public.store_cash_reports;
DROP POLICY IF EXISTS store_cash_drafts_staff_all ON public.store_cash_drafts;
DROP POLICY IF EXISTS store_debts_staff_read ON public.store_debts;
DROP POLICY IF EXISTS store_cash_reports_staff_read ON public.store_cash_reports;

ALTER TABLE public.store_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_cash_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_cash_drafts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.store_debts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.store_cash_reports FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.store_cash_drafts FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.store_debts TO service_role;
GRANT ALL ON public.store_cash_reports TO service_role;
GRANT ALL ON public.store_cash_drafts TO service_role;

-- Lecture staff seulement, pour un futur ecran admin (aucune ecriture directe).
GRANT SELECT ON public.store_debts TO authenticated;
GRANT SELECT ON public.store_cash_reports TO authenticated;
CREATE POLICY store_debts_staff_read ON public.store_debts
  FOR SELECT TO authenticated USING (public.is_staff_member());
CREATE POLICY store_cash_reports_staff_read ON public.store_cash_reports
  FOR SELECT TO authenticated USING (public.is_staff_member());

COMMIT;
