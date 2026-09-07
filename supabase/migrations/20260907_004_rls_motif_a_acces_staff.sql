-- Motif A — « acces staff » ecrit trop large, sur 8 tables
-- Audit : scripts/qa-audit-rls-complet.mjs
--
-- LA MEPRISE, repetee depuis le debut du projet :
--
--     CREATE POLICY "Staff Full Access X" ON x FOR ALL TO authenticated
--       USING (true);
--
-- « authenticated » ne veut pas dire « membre de l'equipe ». Une session
-- `signInAnonymously()` — celle qu'ouvre le chatbot du site public — porte ce
-- role SANS aucun email. Toute policy ainsi ecrite est donc ouverte a n'importe
-- quel visiteur.
--
-- Une VARIANTE dit la meme chose autrement et se lisait comme une condition :
--
--     USING (auth.role() = 'authenticated')
--
-- Elle n'ajoute rien : le role est deja `authenticated` puisque la policy lui est
-- adressee. Presente sur delivery_zones et repair_tickets, elle explique
-- pourquoi une session chatbot pouvait modifier les zones de livraison.
--
-- AUDIT AVANT (essais reels, transaction annulee) — ecriture possible par un
-- visiteur ou par la session chatbot sur :
--   brands, categories, customers, delivery_zones, product_ranges,
--   repair_tickets, trade_in_models
--
-- Correction identique partout : `is_staff_member()`, la fonction posee avec la
-- fermeture de `staff` (20260907_002). Une seule policy d'ecriture par table,
-- nommee <table>_staff_write.
--
-- CE QUE CETTE MIGRATION NE TOUCHE PAS : les policies de creation publique du
-- tunnel client (customers « Public insert »/« Public update », repair_tickets
-- « Public Create Ticket », orders « Public Insert Orders », troc_*). Elles sont
-- legitimes dans leur intention et relevent du motif B. Apres cette migration,
-- `customers` restera donc modifiable par un visiteur — c'est attendu, et
-- corrige a l'etape suivante.

BEGIN;

-- ── brands ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff manage brands" ON public.brands;
CREATE POLICY brands_staff_write ON public.brands
  FOR ALL TO authenticated
  USING (public.is_staff_member()) WITH CHECK (public.is_staff_member());

-- ── categories ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff Full Access Categories" ON public.categories;
CREATE POLICY categories_staff_write ON public.categories
  FOR ALL TO authenticated
  USING (public.is_staff_member()) WITH CHECK (public.is_staff_member());

-- ── customers ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff Full Access Customers" ON public.customers;
CREATE POLICY customers_staff_write ON public.customers
  FOR ALL TO authenticated
  USING (public.is_staff_member()) WITH CHECK (public.is_staff_member());

-- ── delivery_zones ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.delivery_zones;
CREATE POLICY delivery_zones_staff_write ON public.delivery_zones
  FOR ALL TO authenticated
  USING (public.is_staff_member()) WITH CHECK (public.is_staff_member());

-- ── orders ─────────────────────────────────────────────────────────────────
-- Deux policies pour la meme chose, aux noms differant par la casse.
DROP POLICY IF EXISTS "Staff Full Access Orders" ON public.orders;
DROP POLICY IF EXISTS "Staff full access orders" ON public.orders;
CREATE POLICY orders_staff_write ON public.orders
  FOR ALL TO authenticated
  USING (public.is_staff_member()) WITH CHECK (public.is_staff_member());

-- ── product_ranges ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff manage ranges" ON public.product_ranges;
CREATE POLICY product_ranges_staff_write ON public.product_ranges
  FOR ALL TO authenticated
  USING (public.is_staff_member()) WITH CHECK (public.is_staff_member());

-- ── repair_tickets ─────────────────────────────────────────────────────────
-- TROIS policies de gestion pour la meme chose, dont une en `auth.role()`.
DROP POLICY IF EXISTS "Staff Manage Tickets" ON public.repair_tickets;
DROP POLICY IF EXISTS "Staff can manage tickets" ON public.repair_tickets;
DROP POLICY IF EXISTS "Staff full access tickets" ON public.repair_tickets;
CREATE POLICY repair_tickets_staff_write ON public.repair_tickets
  FOR ALL TO authenticated
  USING (public.is_staff_member()) WITH CHECK (public.is_staff_member());

-- ── trade_in_models (l'argus) ──────────────────────────────────────────────
-- Base de calcul des offres de reprise Smart Troc : une modification discrete
-- y fausse tous les prix sans rien casser de visible.
DROP POLICY IF EXISTS "Staff Manage Argus" ON public.trade_in_models;
DROP POLICY IF EXISTS "Staff Write Trade Models" ON public.trade_in_models;
CREATE POLICY trade_in_models_staff_write ON public.trade_in_models
  FOR ALL TO authenticated
  USING (public.is_staff_member()) WITH CHECK (public.is_staff_member());

COMMIT;

-- RETOUR ARRIERE — a ne recreer que pour retablir un acces, en sachant que cela
-- rouvre l'ecriture a tout visiteur :
--   CREATE POLICY "Staff manage brands" ON public.brands FOR ALL TO public
--     USING (true) WITH CHECK (true);
--   ... idem pour chaque table, avec USING (true).
