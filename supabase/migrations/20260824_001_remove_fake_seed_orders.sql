-- ============================================================================
-- Retire les commandes de test `ORD-FAKE-*` de la production.
--
-- POURQUOI : 10 fixtures datées de janvier 2026 vivaient dans `orders`. Neuf
-- d'entre elles sont `delivered`, donc éligibles au CA du tableau de bord :
--
--   CA affiché      5 921 900 FCFA
--   dont fictif     1 955 000 FCFA  (33 %)
--   CA réel         3 966 900 FCFA
--
-- Pire, comme elles n'ont pas de `order_items`, elles étaient exactement les
-- « 9 commandes anciennes sans détail article » que la note de couverture du
-- dashboard présentait comme de l'historique légitime. Le trou documenté
-- n'existait pas : c'était du jeu de test.
--
-- Une fois supprimées, `coverage_gap` retombe à zéro et la note disparaît
-- d'elle-même (topProductsCoverageNote renvoie null quand l'écart est nul).
--
-- SANS IMPACT STOCK — vérifié avant écriture : 0 order_items, 0 réservation,
-- 0 mouvement de stock, 0 dossier troc lié. Les 18 invitations d'avis
-- rattachées sont fictives elles aussi et partent en CASCADE, ce qui nettoie
-- au passage la liste « invitations à envoyer » du staff.
--
-- Toutes les FK vers orders(id) sont ON DELETE CASCADE (order_items,
-- stock_reservations, order_feedback_invites, order_payments) → pas d'orphelin.
--
-- Idempotent : rejouable sans erreur (DELETE … WHERE LIKE).
-- ============================================================================

BEGIN;

-- Garde-fou : si l'une de ces lignes a acquis un article ou une réservation
-- depuis, elle n'est plus une fixture — on refuse plutôt que de casser du stock.
DO $$
DECLARE
  v_items integer;
  v_resa  integer;
BEGIN
  SELECT count(*) INTO v_items FROM public.order_items      WHERE order_id LIKE 'ORD-FAKE%';
  SELECT count(*) INTO v_resa  FROM public.stock_reservations WHERE order_id LIKE 'ORD-FAKE%';

  IF v_items > 0 OR v_resa > 0 THEN
    RAISE EXCEPTION
      'Refus : des commandes ORD-FAKE ont % ligne(s) article et % réservation(s). Vérifier avant suppression.',
      v_items, v_resa;
  END IF;
END $$;

DELETE FROM public.orders WHERE id LIKE 'ORD-FAKE%';

COMMIT;
