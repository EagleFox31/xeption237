-- ============================================================================
-- Purge des commandes de test avant la mise en ligne réelle.
--
-- CONTEXTE : aucune vente réelle n'a encore été passée sur le site — la mise en
-- production attendait que le Smart Troc soit prêt. Les 16 commandes présentes
-- sont donc toutes des essais : recette du checkout et du POS (janvier 2026),
-- plus quelques tests isolés. Elles faussaient tout le pilotage :
--
--   CA affiché avant  5 921 900 FCFA  (dont 1 955 000 de fixtures ORD-FAKE)
--   après 20260824_001  3 966 900 FCFA
--   après cette purge           0 FCFA  ← le vrai point de départ
--
-- Le tableau de bord repart de zéro ; les premiers chiffres seront de vraies
-- ventes, sans avoir à se demander lesquelles retirer mentalement.
--
-- SANS IMPACT — vérifié avant écriture : 0 avis client reçu, 0 paiement
-- enregistré, 0 réservation de stock, 0 mouvement de stock référençant une
-- commande, 0 dossier troc lié (`completed_order_id`). Les 19 lignes d'article
-- et 16 invitations d'avis partent en CASCADE ; elles sont fictives aussi.
--
-- ⚠️ Les dossiers `trade_in_requests` (10) ne sont PAS touchés : ce sont de
-- vraies évaluations Smart Troc, indépendantes des commandes.
--
-- Idempotent : rejouable sans erreur.
-- ============================================================================

BEGIN;

-- Garde-fou : si une commande a acquis un vrai avis client ou un paiement
-- enregistré depuis, ce n'est plus un essai — on refuse plutôt que de détruire.
DO $$
DECLARE
  v_avis      integer;
  v_paiements integer;
BEGIN
  SELECT count(*) INTO v_avis FROM public.order_feedback;
  SELECT count(*) INTO v_paiements FROM public.order_payments;

  IF v_avis > 0 OR v_paiements > 0 THEN
    RAISE EXCEPTION
      'Refus : % avis client et % paiement(s) enregistrés. Des commandes réelles existent, purge annulée.',
      v_avis, v_paiements;
  END IF;
END $$;

DELETE FROM public.orders;

-- Empêche qu'une commande renaisse sans date. Une `date` NULL échappe à tout
-- filtre de période (`o.date >= v_from` est faux pour NULL) : la commande
-- devient INVISIBLE du tableau de bord, de l'export et du rapport du soir,
-- quelle que soit la période choisie. C'est exactement ce qui est arrivé à
-- ORD-997355 et ses 952 000 FCFA.
-- La colonne a déjà un DEFAULT ; les RPC font toutes COALESCE(p_date, now()).
ALTER TABLE public.orders ALTER COLUMN date SET NOT NULL;

COMMIT;
