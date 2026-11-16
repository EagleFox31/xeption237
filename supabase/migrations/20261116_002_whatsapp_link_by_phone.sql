-- Liaison WhatsApp automatique par numéro (ADR-003, § Liaison).
--
-- Au premier geste d'un membre du staff non lié, l'Edge Function notify-staff-action :
--   1. lit les numéros du staff (whatsapp_staff_phone_candidates, format E.164 sans « + ») ;
--   2. calcule pour chacun l'empreinte HMAC partagée avec Notify et cherche une correspondance
--      UNIQUE avec actor.fingerprint (le numéro de l'auteur est garanti par WhatsApp) ;
--   3. appelle link_whatsapp_staff_by_phone(empreinte, staff_id), puis rejoue le geste.
-- Même règle que telegram_staff_link_by_phone (20261020_009) : correspondance unique, staff
-- boutique seulement (direction et super_admin : code de liaison de l'ERP), compte Auth requis,
-- idempotente, refus si l'empreinte ou le membre est déjà lié ailleurs, auditée.
-- La clé ne vient jamais en base : le calcul d'empreinte reste dans l'Edge Function.
-- Service role uniquement.

BEGIN;

-- 1. Numéros candidats -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.whatsapp_staff_phone_candidates()
RETURNS TABLE (staff_id uuid, phone_e164 text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  -- 9 chiffres locaux (_staff_phone_digits a retiré l'indicatif 237) -> 237 + numéro ;
  -- numéro déjà international (10 à 15 chiffres, sans 0 initial) -> tel quel ; sinon ignoré.
  SELECT s.id,
         CASE WHEN x.d ~ '^[0-9]{9}$' THEN '237' || x.d ELSE x.d END
  FROM public.staff s
  CROSS JOIN LATERAL (SELECT public._staff_phone_digits(s.phone) AS d) x
  WHERE x.d ~ '^[0-9]{9}$' OR x.d ~ '^[1-9][0-9]{9,14}$';
$$;

REVOKE ALL ON FUNCTION public.whatsapp_staff_phone_candidates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whatsapp_staff_phone_candidates() TO service_role;

COMMENT ON FUNCTION public.whatsapp_staff_phone_candidates() IS
  'Numeros du staff en E.164 sans + pour la liaison WhatsApp par numero (empreinte calculee dans notify-staff-action) ; service-role only.';

-- 2. Liaison ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_whatsapp_staff_by_phone(p_fingerprint text, p_staff_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_staff public.staff%ROWTYPE;
  v_digits text;
  v_matches integer;
  v_auth_user_id uuid;
  v_current uuid;
  v_store_name text;
BEGIN
  IF p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{64}$' OR p_staff_id IS NULL THEN
    RAISE EXCEPTION 'Invalid phone link' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_staff FROM public.staff s WHERE s.id = p_staff_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'phone_not_found');
  END IF;

  -- Défense en profondeur : l'Edge Function a déjà exigé une correspondance unique.
  v_digits := public._staff_phone_digits(v_staff.phone);
  SELECT count(*) INTO v_matches
  FROM public.staff s WHERE public._staff_phone_digits(s.phone) = v_digits;
  IF v_digits = '' OR v_matches <> 1 THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'phone_ambiguous');
  END IF;

  IF lower(coalesce(v_staff.role, '')) NOT IN
      ('vendeur', 'editor', 'responsable', 'manager', 'manager_vente') THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'use_erp_code');
  END IF;

  SELECT u.id INTO v_auth_user_id FROM auth.users u WHERE lower(u.email) = lower(v_staff.email);
  IF v_auth_user_id IS NULL THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'no_account');
  END IF;

  SELECT name INTO v_store_name FROM public.stores WHERE id = v_staff.store_id;

  -- Cette empreinte est-elle déjà liée ?
  SELECT l.auth_user_id INTO v_current
  FROM public.whatsapp_staff_links l
  WHERE l.fingerprint = p_fingerprint AND l.revoked_at IS NULL
  FOR UPDATE;
  IF v_current = v_auth_user_id THEN
    RETURN jsonb_build_object('linked', true, 'changed', false,
      'actor', nullif(trim(v_staff.name), ''), 'role', lower(v_staff.role), 'store', v_store_name);
  END IF;
  IF v_current IS NOT NULL THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'fingerprint_already_linked');
  END IF;

  -- Ce membre est-il lié à un AUTRE numéro ? On ne déplace jamais une liaison active en silence :
  -- un changement de téléphone passe par le code de liaison de l'ERP.
  IF EXISTS (SELECT 1 FROM public.whatsapp_staff_links l
             WHERE l.auth_user_id = v_auth_user_id AND l.revoked_at IS NULL) THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'staff_already_linked');
  END IF;

  INSERT INTO public.whatsapp_staff_links (fingerprint, auth_user_id)
  VALUES (p_fingerprint, v_auth_user_id)
  ON CONFLICT (fingerprint) DO UPDATE
    SET auth_user_id = excluded.auth_user_id, linked_at = now(), revoked_at = NULL;

  -- Audit : identifiant propre (jamais celui du geste, rejoué juste après avec son propre reçu).
  INSERT INTO public.staff_action_receipts (source, external_id, auth_user_id, action, resource_id, outcome)
  VALUES ('whatsapp', 'link.phone:' || gen_random_uuid()::text, v_auth_user_id, 'link.phone',
          v_staff.id::text, 'linked');

  RETURN jsonb_build_object('linked', true, 'changed', true,
    'actor', nullif(trim(v_staff.name), ''), 'role', lower(v_staff.role), 'store', v_store_name);
END;
$$;

REVOKE ALL ON FUNCTION public.link_whatsapp_staff_by_phone(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_whatsapp_staff_by_phone(text, uuid) TO service_role;

COMMENT ON FUNCTION public.link_whatsapp_staff_by_phone(text, uuid) IS
  'Liaison WhatsApp du staff boutique par numero (correspondance unique calculee par notify-staff-action) : idempotente, auditee ; service-role only.';

COMMIT;
