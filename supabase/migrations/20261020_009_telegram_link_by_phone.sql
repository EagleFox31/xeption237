-- Liaison Telegram par « Partager mon numéro » (bot, bouton request_contact).
--
-- Le bot ne transmet le contact que si contact.user_id = from.id (le numéro est celui du
-- compte Telegram qui l'envoie, vérifié par Telegram). Ici :
--   - correspondance UNIQUE sur le numéro complet (_staff_phone_digits) ;
--   - réservée au staff boutique (vendeur / responsable) : direction et super_admin
--     restent sur le code à usage unique de l'ERP ;
--   - le compte Auth doit exister (bouton 🔑 de l'écran Équipe) ;
--   - idempotente : un second partage du même numéro = no-op (changed=false) ;
--   - renvoie les comptes Telegram de la direction à prévenir de l'association.
-- Service role uniquement (Edge Function telegram-bot-entry).

BEGIN;

CREATE OR REPLACE FUNCTION public.telegram_staff_link_by_phone(
  p_telegram_user_id TEXT,
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits TEXT := public._staff_phone_digits(p_phone);
  v_matches INTEGER;
  v_staff public.staff%ROWTYPE;
  v_store_name TEXT;
  v_auth_user_id UUID;
  v_current UUID;
  v_other_telegram TEXT;
  v_notify TEXT[];
BEGIN
  IF p_telegram_user_id IS NULL OR p_telegram_user_id !~ '^[1-9][0-9]{0,19}$' THEN
    RAISE EXCEPTION 'Invalid Telegram user' USING ERRCODE = '22023';
  END IF;
  IF v_digits !~ '^[0-9]{9}$' THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'phone_not_found');
  END IF;

  SELECT count(*) INTO v_matches
  FROM public.staff s WHERE public._staff_phone_digits(s.phone) = v_digits;
  IF v_matches = 0 THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'phone_not_found');
  END IF;
  IF v_matches > 1 THEN
    -- Deux fiches pour un même numéro : on ne devine pas, la direction corrige l'ERP.
    RETURN jsonb_build_object('linked', false, 'reason', 'phone_ambiguous');
  END IF;

  SELECT * INTO v_staff FROM public.staff s WHERE public._staff_phone_digits(s.phone) = v_digits;
  IF lower(coalesce(v_staff.role, '')) NOT IN
      ('vendeur', 'editor', 'responsable', 'manager', 'manager_vente') THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'use_erp_code');
  END IF;

  SELECT u.id INTO v_auth_user_id FROM auth.users u WHERE lower(u.email) = lower(v_staff.email);
  IF v_auth_user_id IS NULL THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'no_account');
  END IF;

  SELECT name INTO v_store_name FROM public.stores WHERE id = v_staff.store_id;

  -- Ce compte Telegram est-il déjà lié ?
  SELECT auth_user_id INTO v_current
  FROM public.telegram_staff_links
  WHERE telegram_user_id = p_telegram_user_id AND revoked_at IS NULL
  FOR UPDATE;
  IF v_current = v_auth_user_id THEN
    RETURN jsonb_build_object('linked', true, 'changed', false,
      'name', v_staff.name, 'role', lower(v_staff.role), 'store', v_store_name);
  END IF;
  IF v_current IS NOT NULL THEN
    RETURN jsonb_build_object('linked', false, 'reason', 'telegram_already_linked');
  END IF;

  -- Ce membre du staff est-il lié à un AUTRE compte Telegram ? (auth_user_id est UNIQUE)
  SELECT telegram_user_id INTO v_other_telegram
  FROM public.telegram_staff_links
  WHERE auth_user_id = v_auth_user_id AND telegram_user_id <> p_telegram_user_id
  FOR UPDATE;
  IF v_other_telegram IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.telegram_staff_links
               WHERE telegram_user_id = v_other_telegram AND revoked_at IS NULL) THEN
      RETURN jsonb_build_object('linked', false, 'reason', 'staff_already_linked');
    END IF;
    -- Ancienne liaison révoquée (changement de téléphone) : on la remplace.
    DELETE FROM public.telegram_staff_links WHERE telegram_user_id = v_other_telegram;
  END IF;

  INSERT INTO public.telegram_staff_links (telegram_user_id, auth_user_id, linked_at, revoked_at)
  VALUES (p_telegram_user_id, v_auth_user_id, now(), NULL)
  ON CONFLICT (telegram_user_id)
    DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id, linked_at = now(), revoked_at = NULL;

  INSERT INTO public.telegram_staff_action_audit (telegram_user_id, auth_user_id, action, resource_id)
  VALUES (p_telegram_user_id, v_auth_user_id, 'link.phone', v_staff.id::TEXT);

  SELECT coalesce(array_agg(l.telegram_user_id), ARRAY[]::TEXT[]) INTO v_notify
  FROM public.telegram_staff_links l
  JOIN auth.users u ON u.id = l.auth_user_id
  JOIN public.staff s ON lower(s.email) = lower(u.email)
  WHERE l.revoked_at IS NULL
    AND lower(s.role) IN ('direction', 'admin', 'super_admin')
    AND l.telegram_user_id <> p_telegram_user_id;

  RETURN jsonb_build_object('linked', true, 'changed', true,
    'name', v_staff.name, 'role', lower(v_staff.role), 'store', v_store_name,
    'notify_telegram_ids', to_jsonb(v_notify));
END;
$$;

REVOKE ALL ON FUNCTION public.telegram_staff_link_by_phone(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_link_by_phone(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.telegram_staff_link_by_phone(TEXT, TEXT) IS
  'Liaison Telegram du staff boutique par numero verifie (request_contact) : correspondance unique, idempotente, auditee ; service-role only.';

COMMIT;
