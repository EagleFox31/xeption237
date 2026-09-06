-- =============================================================================
-- JEU D'ESSAI — 2 boutiques, 1 vendeur chacune, objectifs, primes
--
-- But : verifier de bout en bout la chaine « vente -> objectif -> prime ».
-- Resultats attendus : docs/engineering/TEST_OBJECTIFS_PRIMES.md
--
-- IDENTIFIANTS FIXES : rejouable a volonte, et le nettoyage
-- (qa_objectifs_primes_rollback.sql) ne touche que ces lignes.
--
-- ATTENTION — ces commandes entrent dans le VRAI chiffre d'affaires : elles
-- apparaitront au tableau de bord et dans « Mes ventes » tant qu'elles sont la.
--
-- Le prefixe est « QA-OBJ- » et NON « TEST- » : la vue `orders_reportable`
-- exclut `id LIKE 'TEST-%'` du CA ET des objectifs (migration 027). Un jeu
-- prefixe TEST- serait donc invisible, et le test conclurait a tort que rien
-- ne fonctionne.
-- =============================================================================

BEGIN;

DO $verif$
DECLARE
  v_jour integer := EXTRACT(DAY FROM (now() AT TIME ZONE 'Africa/Douala'))::int;
BEGIN
  IF v_jour < 4 THEN
    RAISE WARNING 'Nous sommes le % : les commandes « debut de mois » tomberaient le meme jour que celles du jour, et les totaux JOUR et MOIS se confondraient. Attendre le 4 du mois.', v_jour;
  END IF;
END
$verif$;

-- ── Nettoyage des lignes d'essai preexistantes ───────────────────────────────
DELETE FROM public.orders        WHERE id LIKE 'QA-OBJ-%' OR id LIKE 'TEST-QA-OBJ-%';
DELETE FROM public.sales_targets WHERE id IN (
  '00000000-0000-4000-c000-000000000c01','00000000-0000-4000-c000-000000000c02',
  '00000000-0000-4000-c000-000000000c03','00000000-0000-4000-c000-000000000c04',
  '00000000-0000-4000-c000-000000000c05','00000000-0000-4000-c000-000000000c06',
  '00000000-0000-4000-c000-000000000c07','00000000-0000-4000-c000-000000000c08');
DELETE FROM public.bonus_rules   WHERE id IN (
  '00000000-0000-4000-d000-000000000d01','00000000-0000-4000-d000-000000000d02',
  '00000000-0000-4000-d000-000000000d03');

-- ── 1. Deux boutiques ────────────────────────────────────────────────────────
INSERT INTO public.stores (id, code, name, city, address, active, is_default) VALUES
  ('00000000-0000-4000-a000-000000000a01','qa-akwa',  'QA — Akwa',  'Douala', 'Rue Joss, Akwa',     true, false),
  ('00000000-0000-4000-a000-000000000a02','qa-bastos','QA — Bastos','Yaounde','Avenue des Banques', true, false)
ON CONFLICT (id) DO UPDATE
  SET code = EXCLUDED.code, name = EXCLUDED.name, city = EXCLUDED.city, active = true;

-- ── 2. Un vendeur par boutique ───────────────────────────────────────────────
-- Role « vendeur » : ne voit QUE ses propres chiffres. `get_sales_targets_progress`
-- force p_staff_id sur l'appelant des que son role est 'vendeur' — c'est le
-- cloisonnement a verifier en se connectant avec chacun des deux comptes.
INSERT INTO public.staff (id, name, email, role, phone, store_id) VALUES
  ('00000000-0000-4000-b000-000000000b01','Awa Nkodo',  'awa.nkodo@qa.xeption.cm',  'vendeur','+237690000001','00000000-0000-4000-a000-000000000a01'),
  ('00000000-0000-4000-b000-000000000b02','Brice Talla','brice.talla@qa.xeption.cm','vendeur','+237690000002','00000000-0000-4000-a000-000000000a02')
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role, store_id = EXCLUDED.store_id;

-- ── 3. Objectifs ─────────────────────────────────────────────────────────────
-- Volontairement asymetriques dans le RESULTAT, pas dans la consigne : les deux
-- vendeurs ont la meme cible, seul leur chiffre differe. C'est ce qui permet de
-- lire « atteint » chez l'un et « reste a faire » chez l'autre.
INSERT INTO public.sales_targets (id, scope_type, staff_id, store_id, period_kind, target_amount, active) VALUES
  ('00000000-0000-4000-c000-000000000c01','staff','00000000-0000-4000-b000-000000000b01',NULL,'daily',    300000, true),
  ('00000000-0000-4000-c000-000000000c02','staff','00000000-0000-4000-b000-000000000b01',NULL,'monthly', 1000000, true),
  ('00000000-0000-4000-c000-000000000c03','staff','00000000-0000-4000-b000-000000000b02',NULL,'daily',    300000, true),
  ('00000000-0000-4000-c000-000000000c04','staff','00000000-0000-4000-b000-000000000b02',NULL,'monthly', 1000000, true),
  ('00000000-0000-4000-c000-000000000c05','store',NULL,'00000000-0000-4000-a000-000000000a01','daily',    350000, true),
  ('00000000-0000-4000-c000-000000000c06','store',NULL,'00000000-0000-4000-a000-000000000a01','monthly', 1200000, true),
  ('00000000-0000-4000-c000-000000000c07','store',NULL,'00000000-0000-4000-a000-000000000a02','daily',    350000, true),
  ('00000000-0000-4000-c000-000000000c08','store',NULL,'00000000-0000-4000-a000-000000000a02','monthly', 1200000, true);

-- ── 4. Primes ────────────────────────────────────────────────────────────────
-- A savoir : les primes se calculent sur l'objectif MENSUEL uniquement
-- (`monthly_bonuses` dans get_sales_targets_progress). Depasser l'objectif du
-- jour n'en declenche aucune. Les paliers sont cumulatifs : a 130 % les deux
-- premiers sont acquis, soit 45 000 F.
INSERT INTO public.bonus_rules (id, label, min_achievement_percent, bonus_amount, sort_order, active) VALUES
  ('00000000-0000-4000-d000-000000000d01','Objectif atteint',    100, 15000, 1, true),
  ('00000000-0000-4000-d000-000000000d02','Depassement',         120, 30000, 2, true),
  ('00000000-0000-4000-d000-000000000d03','Performance except.', 150, 60000, 3, true);

-- ── 5. Commandes ─────────────────────────────────────────────────────────────
-- Chaque ligne teste une branche du predicat `orders_reportable` :
--   compte  : payment_status = 'paid'  OU  status = 'delivered'
--   exclut  : cancelled, returned, refunded, id LIKE 'TEST-%',
--             et « ni payee ni livree »
WITH b AS (
  SELECT
    date_trunc('day',   now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala' AS j,
    date_trunc('month', now() AT TIME ZONE 'Africa/Douala') AT TIME ZONE 'Africa/Douala' AS m,
    '00000000-0000-4000-a000-000000000a01'::uuid AS sa,
    '00000000-0000-4000-a000-000000000a02'::uuid AS sb,
    '00000000-0000-4000-b000-000000000b01'::uuid AS va,
    '00000000-0000-4000-b000-000000000b02'::uuid AS vb
)
INSERT INTO public.orders
  (id, date, customer_name, customer_phone, customer_city, delivery_mode, total,
   status, payment_method, payment_status, store_id, staff_id, items)
-- `v.*` et non `*` : `b` porte six colonnes de travail qui n'ont rien a faire
-- dans la commande inseree.
SELECT v.* FROM b, LATERAL (VALUES
  -- AWA — aujourd'hui
  ('QA-OBJ-A01', b.j + interval '10 hours', 'Client A1', '+237690100001','Douala', 'pickup',   250000::numeric, 'delivered','cash','paid',     b.sa, b.va, '[{"id":"p1","name":"Telephone A","quantity":1}]'::jsonb),
  ('QA-OBJ-A02', b.j + interval '11 hours', 'Client A2', '+237690100002','Douala', 'pickup',   110000::numeric, 'pending',  'om',  'paid',     b.sa, b.va, '[{"id":"p2","name":"Ecouteurs","quantity":2}]'::jsonb),
  ('QA-OBJ-A03', b.j + interval '12 hours', 'Client A3', '+237690100003','Douala', 'delivery',  40000::numeric, 'delivered','cash','unpaid',   b.sa, b.va, '[{"id":"p3","name":"Coque","quantity":1}]'::jsonb),
  ('QA-OBJ-A04', b.j + interval '13 hours', 'Client A4', '+237690100004','Douala', 'pickup',   200000::numeric, 'cancelled','cash','paid',     b.sa, b.va, '[{"id":"p4","name":"Annulee","quantity":1}]'::jsonb),
  ('QA-OBJ-A05', b.j + interval '14 hours', 'Client A5', '+237690100005','Douala', 'delivery', 150000::numeric, 'returned', 'cash','paid',     b.sa, b.va, '[{"id":"p5","name":"Retournee","quantity":1}]'::jsonb),
  ('QA-OBJ-A06', b.j + interval '15 hours', 'Client A6', '+237690100006','Douala', 'pickup',    90000::numeric, 'pending',  'cash','unpaid',   b.sa, b.va, '[{"id":"p6","name":"Ni payee ni livree","quantity":1}]'::jsonb),
  ('QA-OBJ-A09', b.j + interval '16 hours', 'Client A9', '+237690100009','Douala', 'delivery', 500000::numeric, 'delivered','om',  'refunded', b.sa, b.va, '[{"id":"p9","name":"Remboursee","quantity":1}]'::jsonb),
  ('TEST-QA-OBJ-A10', b.j + interval '17 hours','Client A10','+237690100010','Douala','pickup',700000::numeric, 'delivered','cash','paid',     b.sa, b.va, '[{"id":"p10","name":"Essai caisse","quantity":1}]'::jsonb),
  -- AWA — debut de mois
  ('QA-OBJ-A07', b.m + interval '1 day 12 hours',  'Client A7','+237690100007','Douala','pickup', 600000::numeric,'delivered','cash','paid',   b.sa, b.va, '[{"id":"p7","name":"Telephone B","quantity":1}]'::jsonb),
  ('QA-OBJ-A08', b.m + interval '2 days 12 hours', 'Client A8','+237690100008','Douala','pickup', 300000::numeric,'delivered','om',  'paid',   b.sa, b.va, '[{"id":"p8","name":"Tablette","quantity":1}]'::jsonb),
  -- BRICE — aujourd'hui
  ('QA-OBJ-B01', b.j + interval '10 hours', 'Client B1','+237690200001','Yaounde','pickup', 180000::numeric,'delivered','cash','paid',         b.sb, b.vb, '[{"id":"p11","name":"Telephone C","quantity":1}]'::jsonb),
  ('QA-OBJ-B02', b.j + interval '11 hours', 'Client B2','+237690200002','Yaounde','pickup', 250000::numeric,'cancelled','cash','paid',         b.sb, b.vb, '[{"id":"p12","name":"Annulee","quantity":1}]'::jsonb),
  -- BRICE — debut de mois
  ('QA-OBJ-B03', b.m + interval '3 days 12 hours','Client B3','+237690200003','Yaounde','pickup',300000::numeric,'delivered','cash','paid',    b.sb, b.vb, '[{"id":"p13","name":"Montre","quantity":1}]'::jsonb)
) AS v(id, date, customer_name, customer_phone, customer_city, delivery_mode, total,
       status, payment_method, payment_status, store_id, staff_id, items);

COMMIT;
