-- Refus / changement de statut d'un dossier troc depuis l'ERP :
-- « new row violates row-level security policy for table trade_in_status_history ».
--
-- Cause : le trigger trg_log_trade_in_status appelle log_trade_in_status_change(), qui
-- s'exécutait avec les droits de l'appelant (staff `authenticated`). La table d'historique n'a
-- volontairement qu'une policy SELECT (écriture « uniquement via trigger », 20260923_005) :
-- l'INSERT du trigger était donc rejeté et annulait la mise à jour du statut.
--
-- Correctif : la fonction de trigger passe en SECURITY DEFINER (search_path figé), ce qui
-- garde la table fermée en écriture directe. Aucune policy d'écriture n'est ajoutée.
-- Idempotent : CREATE OR REPLACE + REVOKE rejouables.

BEGIN;

CREATE OR REPLACE FUNCTION public.log_trade_in_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.trade_in_status_history (request_id, from_status, to_status, changed_by)
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(current_setting('request.jwt.claims', true)::json->>'email', 'system')
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Fonction de trigger uniquement : personne ne doit pouvoir l'appeler directement.
-- (Le droit EXECUTE n'est vérifié qu'à la création du trigger, pas à son déclenchement.)
REVOKE ALL ON FUNCTION public.log_trade_in_status_change() FROM PUBLIC, anon, authenticated;

COMMIT;
