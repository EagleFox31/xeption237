-- RLS des tables vides & défense en profondeur sur les droits directs
--
-- MOTIF 1 : Les tables restées vides lors de l'audit du 2026-09-07 n'avaient
-- pas pu être testées dynamiquement par le script initial. Un test avec
-- peuplement temporaire (rollback) et audit statique approfondi a révélé :
--   1. `packs` : policy "Staff peut tout gérer" en `auth.role() = 'authenticated'`,
--      permettant à n'importe quel visiteur anonyme ou chatbot (JWT authenticated)
--      d'insérer, modifier ou supprimer des packs.
--   2. 6 tables avec SELECT ouvert à tout `authenticated` via `USING (true)` :
--      `troc_certificates`, `imei_certif_records`, `imei_premium_calls`,
--      `market_demand_signals`, `market_price_snapshots`, `market_trend_cache`.
--
-- MOTIF 2 (DÉFENSE EN PROFONDEUR) :
-- Ne pas compter uniquement sur la RLS pour bloquer l'accès. Pour les tables
-- internes, administratives ou accédées exclusivement via des Edge Functions
-- (service_role) ou des RPC `SECURITY DEFINER` (create_order_atomic, etc.) :
--   -> Révoquer tous les droits directs (SELECT, INSERT, UPDATE, DELETE) à `anon`.
--   -> Révoquer tout accès direct aux tables purement système / batchs (ai_usage_quota,
--      schema_migrations, qa_test_runs, catalog_health_findings).
--
-- NON-RÉGRESSION VÉRIFIÉE (scripts/test-non-regression.mjs) :
--   - Chemins publics : catalogue (produits, marques, catégories, zones de livraison,
--     sorties téléphones, gammes, cache TAC, argus, packs) restent lisibles.
--   - Suivi commande (track_order), social proof (get_social_proof_stats),
--     session troc (troc_session_upsert) fonctionnent sans accroc via leurs RPCs.
--   - ERP staff : lecture et écriture complètes conservées pour les membres du staff.

BEGIN;

-- ── 1. Correction des policies trop permissives sur authenticated ───────────

-- packs : écriture réservée au personnel
DROP POLICY IF EXISTS "Staff peut tout gérer" ON public.packs;
DROP POLICY IF EXISTS packs_staff_write ON public.packs;
CREATE POLICY packs_staff_write ON public.packs
  FOR ALL TO authenticated
  USING (public.is_staff_member())
  WITH CHECK (public.is_staff_member());

-- troc_certificates : lecture réservée au personnel
DROP POLICY IF EXISTS troc_certificates_staff_read ON public.troc_certificates;
CREATE POLICY troc_certificates_staff_read ON public.troc_certificates
  FOR SELECT TO authenticated
  USING (public.is_staff_member());

-- imei_certif_records : lecture réservée au personnel
DROP POLICY IF EXISTS imei_certif_records_staff_read ON public.imei_certif_records;
CREATE POLICY imei_certif_records_staff_read ON public.imei_certif_records
  FOR SELECT TO authenticated
  USING (public.is_staff_member());

-- imei_premium_calls : lecture réservée à la direction/admin
DROP POLICY IF EXISTS imei_premium_calls_admin_read ON public.imei_premium_calls;
CREATE POLICY imei_premium_calls_admin_read ON public.imei_premium_calls
  FOR SELECT TO authenticated
  USING (public.is_staff_member());

-- market_demand_signals : lecture réservée au personnel
DROP POLICY IF EXISTS market_demand_signals_staff_read ON public.market_demand_signals;
CREATE POLICY market_demand_signals_staff_read ON public.market_demand_signals
  FOR SELECT TO authenticated
  USING (public.is_staff_member());

-- market_price_snapshots : lecture réservée au personnel
DROP POLICY IF EXISTS market_price_snapshots_staff_read ON public.market_price_snapshots;
CREATE POLICY market_price_snapshots_staff_read ON public.market_price_snapshots
  FOR SELECT TO authenticated
  USING (public.is_staff_member());

-- market_trend_cache : lecture réservée au personnel
DROP POLICY IF EXISTS market_trend_cache_staff_read ON public.market_trend_cache;
CREATE POLICY market_trend_cache_staff_read ON public.market_trend_cache
  FOR SELECT TO authenticated
  USING (public.is_staff_member());


-- ── 2. Défense en profondeur : REVOKE direct grants pour anon ───────────────

-- Tables purement internes (service_role, scripts de maintenance, batchs) :
-- Aucun rôle public ou authentifié direct n'a besoin d'y accéder.
REVOKE ALL ON public.ai_usage_quota FROM anon, authenticated;
REVOKE ALL ON public.schema_migrations FROM anon, authenticated;
REVOKE ALL ON public.qa_test_runs FROM anon, authenticated;
REVOKE ALL ON public.catalog_health_findings FROM anon, authenticated;

-- Tables métier dont le tunnel public passe par RPC ou Edge Function :
-- anon ne doit avoir aucun GRANT direct.
REVOKE ALL ON public.trade_in_requests FROM anon;
REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.order_items FROM anon;
REVOKE ALL ON public.order_payments FROM anon;
REVOKE ALL ON public.security_events FROM anon;
REVOKE ALL ON public.customer_returns FROM anon;
REVOKE ALL ON public.sales_targets FROM anon;
REVOKE ALL ON public.bonus_rules FROM anon;
REVOKE ALL ON public.stock_inventory_sessions FROM anon;
REVOKE ALL ON public.stock_inventory_lines FROM anon;
REVOKE ALL ON public.stock_reservations FROM anon;
REVOKE ALL ON public.stock_transfers FROM anon;
REVOKE ALL ON public.stock_transfer_items FROM anon;
REVOKE ALL ON public.stock_movements FROM anon;
REVOKE ALL ON public.store_stock FROM anon;
REVOKE ALL ON public.stores FROM anon;
REVOKE ALL ON public.market_price_cache FROM anon;
REVOKE ALL ON public.market_price_snapshots FROM anon;
REVOKE ALL ON public.market_reference_prices FROM anon;
REVOKE ALL ON public.market_trend_cache FROM anon;
REVOKE ALL ON public.market_used_offers FROM anon;
REVOKE ALL ON public.market_demand_signals FROM anon;
REVOKE ALL ON public.troc_certificates FROM anon;
REVOKE ALL ON public.imei_certif_records FROM anon;
REVOKE ALL ON public.imei_premium_calls FROM anon;

COMMIT;

-- RETOUR ARRIERE (en sachant que cela rouvre les failles) :
--   CREATE POLICY "Staff peut tout gérer" ON public.packs FOR ALL TO public USING (auth.role() = 'authenticated'::text);
--   CREATE POLICY troc_certificates_staff_read ON public.troc_certificates FOR SELECT TO authenticated USING (true);
--   CREATE POLICY imei_certif_records_staff_read ON public.imei_certif_records FOR SELECT TO authenticated USING (true);
--   CREATE POLICY imei_premium_calls_admin_read ON public.imei_premium_calls FOR SELECT TO authenticated USING (true);
--   CREATE POLICY market_demand_signals_staff_read ON public.market_demand_signals FOR SELECT TO authenticated USING (true);
--   CREATE POLICY market_price_snapshots_staff_read ON public.market_price_snapshots FOR SELECT TO authenticated USING (true);
--   CREATE POLICY market_trend_cache_staff_read ON public.market_trend_cache FOR SELECT TO authenticated USING (true);
--   GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
