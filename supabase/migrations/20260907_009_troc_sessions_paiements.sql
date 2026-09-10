-- Troc : fermer l'ecriture des sessions et la lecture des paiements
--
-- CE QUI ETAIT OUVERT, mesure le 2026-09-07 en tant que visiteur (role anon) :
--
--   UPDATE troc_sessions SET last_step = 'form';   -- sans aucun filtre
--   -> 18 sessions sur 18 modifiees
--
--   SELECT * FROM troc_payments;
--   -> 14 lignes, avec telephones et montants
--
-- Le premier est le plus grave. Une policy dit QUELLES lignes on peut toucher,
-- elle ne peut pas exiger qu'on en DESIGNE une. Tant que l'ecriture est
-- ouverte, elle est ouverte a toutes les lignes d'un coup. La correction ne
-- peut donc pas etre une policy : il faut une fonction qui ne touche qu'une
-- ligne, celle dont on passe la cle.
--
-- `session_key` est un UUID v4, tire au hasard. Il fait un bon jeton : on ne le
-- devine pas. (Contrairement a l'ancienne reference de commande, qui venait de
-- l'horodatage.)
--
-- Les paiements sont ecrits par des Edge Functions (create-payment,
-- get-payment-status) en service_role, qui ignore la RLS. Fermer les policies
-- publiques ne les gene donc pas.

BEGIN;

-- ── 1. La porte etroite pour le suivi de parcours ──────────────────────────
--
-- Une seule session touchee, celle de la cle. Aucune modification de masse
-- possible : la fonction n'expose pas de filtre.
--
-- Validation STRICTE de `last_step` : la fonction refuse toute valeur hors
-- liste au lieu de laisser la contrainte lever une erreur. Le message reste
-- ainsi maitrise, et la fonction ne peut pas servir a sonder le schema.
CREATE OR REPLACE FUNCTION public.troc_session_upsert(
  p_session_key text,
  p_last_step text,
  p_device_brand text DEFAULT NULL,
  p_device_model text DEFAULT NULL,
  p_trade_in_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_key text := trim(coalesce(p_session_key, ''));
BEGIN
  -- La cle doit ressembler a un UUID : c'est ce que produit le site. Refuser le
  -- reste evite qu'on cree des milliers de sessions avec des cles fabriquees.
  IF v_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  IF p_last_step NOT IN ('form', 'photos', 'imei', 'result', 'voucher') THEN
    RETURN false;
  END IF;

  -- Les champs libres sont bornes : un texte de 10 Mo dans device_model
  -- remplirait la base sans rien apporter.
  IF length(coalesce(p_device_brand, '')) > 120
     OR length(coalesce(p_device_model, '')) > 200
     OR length(coalesce(p_trade_in_id, '')) > 120 THEN
    RETURN false;
  END IF;

  INSERT INTO public.troc_sessions AS s
    (session_key, last_step, device_brand, device_model, trade_in_id, updated_at)
  VALUES
    (v_key, p_last_step, p_device_brand, p_device_model, p_trade_in_id, now())
  ON CONFLICT (session_key) DO UPDATE
    SET last_step    = EXCLUDED.last_step,
        device_brand = COALESCE(EXCLUDED.device_brand, s.device_brand),
        device_model = COALESCE(EXCLUDED.device_model, s.device_model),
        trade_in_id  = COALESCE(EXCLUDED.trade_in_id,  s.trade_in_id),
        updated_at   = now();

  RETURN true;
END;
$fn$;

COMMENT ON FUNCTION public.troc_session_upsert(text, text, text, text, text) IS
  'Suivi de parcours Smart Troc : cree ou met a jour UNE session, celle de la cle passee. Remplace l''ecriture publique de troc_sessions, qui permettait de modifier toutes les sessions d''un coup.';

REVOKE ALL ON FUNCTION public.troc_session_upsert(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.troc_session_upsert(text, text, text, text, text)
  TO anon, authenticated, service_role;

-- ── 2. troc_payments : la lecture staff AVANT de fermer la publique ────────
-- Dans cet ordre, sinon l'onglet Troc de l'ERP perd l'acces entre les deux
-- instructions.
CREATE POLICY troc_payments_staff_read ON public.troc_payments
  FOR SELECT TO authenticated
  USING (public.is_staff_member());

DROP POLICY IF EXISTS troc_payments_select_anon ON public.troc_payments;
DROP POLICY IF EXISTS troc_payments_insert_anon ON public.troc_payments;

-- ── 3. troc_sessions : plus d'ecriture directe ─────────────────────────────
DROP POLICY IF EXISTS troc_sessions_update_public ON public.troc_sessions;
DROP POLICY IF EXISTS troc_sessions_insert_public ON public.troc_sessions;

-- ── 4. Les GRANT, que la RLS ne remplace pas ───────────────────────────────
--
-- anon et authenticated detenaient DELETE, INSERT, REFERENCES, SELECT, TRIGGER,
-- TRUNCATE et UPDATE sur les deux tables. TRUNCATE n'est PAS soumis a la RLS :
-- le laisser reviendrait a garder une porte ouverte a cote de celle qu'on
-- ferme.
--
-- anon ne garde rien : il passe desormais par la fonction.
-- authenticated ne garde que SELECT, filtre par les policies staff.
REVOKE ALL ON public.troc_sessions FROM anon;
REVOKE ALL ON public.troc_payments FROM anon;
REVOKE ALL ON public.troc_sessions FROM authenticated;
REVOKE ALL ON public.troc_payments FROM authenticated;
GRANT SELECT ON public.troc_sessions TO authenticated;
GRANT SELECT ON public.troc_payments TO authenticated;

COMMIT;

-- RETOUR ARRIERE, en sachant que cela rouvre les deux failles :
--   CREATE POLICY troc_sessions_update_public ON public.troc_sessions
--     FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
--   CREATE POLICY troc_sessions_insert_public ON public.troc_sessions
--     FOR INSERT TO anon, authenticated WITH CHECK (true);
--   CREATE POLICY troc_payments_select_anon ON public.troc_payments
--     FOR SELECT TO anon, authenticated USING (true);
--   GRANT ALL ON public.troc_sessions, public.troc_payments TO anon, authenticated;
