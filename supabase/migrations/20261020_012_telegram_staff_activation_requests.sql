-- Activation d'un compte vendeur depuis Telegram, validée par la direction.
--
-- Avant : un vendeur sans compte Auth qui partage son numéro reçoit « no_account » et la
-- direction doit passer par l'ERP (🔑, écran Équipe). Désormais :
--   1. telegram_staff_link_by_phone enregistre une demande (numéro vérifié par Telegram)
--      et renvoie les comptes Telegram de la direction à solliciter (anti-spam 10 min) ;
--   2. la direction tape ✅ / ❌ : telegram_staff_activation_decide vérifie son rang,
--      clôt la demande (une seule décision, auditée) et renvoie la cible ;
--   3. sur ✅, le bot crée le compte Auth (mot de passe aléatoire jamais affiché) puis
--      relance la liaison avec le numéro vérifié de la demande.
-- Additif et rejouable. Service role uniquement (Edge Function telegram-bot-entry).

BEGIN;

CREATE TABLE IF NOT EXISTS public.telegram_staff_activation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id TEXT NOT NULL CHECK (telegram_user_id ~ '^[1-9][0-9]{0,19}$'),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  -- Numéro vérifié par Telegram (request_contact) au moment de la demande.
  phone_digits TEXT NOT NULL CHECK (phone_digits ~ '^[0-9]{9}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  decided_by UUID
);

-- Une seule demande ouverte par compte Telegram : un nouveau partage la met à jour.
CREATE UNIQUE INDEX IF NOT EXISTS telegram_staff_activation_requests_pending_uidx
  ON public.telegram_staff_activation_requests (telegram_user_id) WHERE status = 'pending';

ALTER TABLE public.telegram_staff_activation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.telegram_staff_activation_requests FROM PUBLIC, anon, authenticated;

-- Comptes Telegram liés de la direction (destinataires des demandes et alertes).
CREATE OR REPLACE FUNCTION public._telegram_direction_ids(p_exclude TEXT)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(l.telegram_user_id), ARRAY[]::TEXT[])
  FROM public.telegram_staff_links l
  JOIN auth.users u ON u.id = l.auth_user_id
  JOIN public.staff s ON lower(s.email) = lower(u.email)
  WHERE l.revoked_at IS NULL
    AND lower(s.role) IN ('direction', 'admin', 'super_admin')
    AND l.telegram_user_id <> coalesce(p_exclude, '');
$$;

REVOKE ALL ON FUNCTION public._telegram_direction_ids(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._telegram_direction_ids(TEXT) TO service_role;

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
  v_request public.telegram_staff_activation_requests%ROWTYPE;
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

  SELECT name INTO v_store_name FROM public.stores WHERE id = v_staff.store_id;

  SELECT u.id INTO v_auth_user_id FROM auth.users u WHERE lower(u.email) = lower(v_staff.email);
  IF v_auth_user_id IS NULL THEN
    -- Un Telegram déjà lié à quelqu'un d'autre ne peut pas demander d'activation.
    IF EXISTS (SELECT 1 FROM public.telegram_staff_links
               WHERE telegram_user_id = p_telegram_user_id AND revoked_at IS NULL) THEN
      RETURN jsonb_build_object('linked', false, 'reason', 'telegram_already_linked');
    END IF;

    INSERT INTO public.telegram_staff_activation_requests (telegram_user_id, staff_id, phone_digits)
    VALUES (p_telegram_user_id, v_staff.id, v_digits)
    ON CONFLICT (telegram_user_id) WHERE status = 'pending'
      DO UPDATE SET staff_id = EXCLUDED.staff_id, phone_digits = EXCLUDED.phone_digits,
                    requested_at = now()
    RETURNING * INTO v_request;

    -- Anti-spam : la direction n'est relancée qu'une fois toutes les 10 minutes.
    IF v_request.notified_at IS NULL OR v_request.notified_at < now() - interval '10 minutes' THEN
      v_notify := public._telegram_direction_ids(p_telegram_user_id);
      IF cardinality(v_notify) > 0 THEN
        UPDATE public.telegram_staff_activation_requests SET notified_at = now()
        WHERE id = v_request.id;
      END IF;
    ELSE
      v_notify := ARRAY[]::TEXT[];
    END IF;

    RETURN jsonb_build_object('linked', false, 'reason', 'no_account',
      'request_id', v_request.id, 'name', v_staff.name, 'role', lower(v_staff.role),
      'store', v_store_name, 'throttled', v_request.notified_at IS NOT NULL
        AND v_request.notified_at >= now() - interval '10 minutes',
      'notify_telegram_ids', to_jsonb(v_notify));
  END IF;

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

  -- Compte créé par l'ERP entre-temps : la demande ouverte n'a plus d'objet.
  UPDATE public.telegram_staff_activation_requests
  SET status = 'approved', decided_at = now()
  WHERE telegram_user_id = p_telegram_user_id AND status = 'pending';

  v_notify := public._telegram_direction_ids(p_telegram_user_id);

  RETURN jsonb_build_object('linked', true, 'changed', true,
    'name', v_staff.name, 'role', lower(v_staff.role), 'store', v_store_name,
    'notify_telegram_ids', to_jsonb(v_notify));
END;
$$;

REVOKE ALL ON FUNCTION public.telegram_staff_link_by_phone(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_link_by_phone(TEXT, TEXT) TO service_role;

-- Décision de la direction sur une demande. Une seule décision par demande (FOR UPDATE +
-- statut) : un double tap ou deux directeurs simultanés = changed=false pour le second.
CREATE OR REPLACE FUNCTION public.telegram_staff_activation_decide(
  p_request_id UUID,
  p_telegram_user_id TEXT,
  p_decision TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approver UUID;
  v_request public.telegram_staff_activation_requests%ROWTYPE;
  v_staff public.staff%ROWTYPE;
  v_store_name TEXT;
BEGIN
  IF p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid decision' USING ERRCODE = '22023';
  END IF;

  SELECT l.auth_user_id INTO v_approver
  FROM public.telegram_staff_links l
  JOIN auth.users u ON u.id = l.auth_user_id
  JOIN public.staff s ON lower(s.email) = lower(u.email)
  WHERE l.telegram_user_id = p_telegram_user_id AND l.revoked_at IS NULL
    AND lower(s.role) IN ('direction', 'admin', 'super_admin');
  IF v_approver IS NULL THEN
    RAISE EXCEPTION 'Direction only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_request FROM public.telegram_staff_activation_requests
  WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'not_found');
  END IF;

  SELECT * INTO v_staff FROM public.staff WHERE id = v_request.staff_id;
  SELECT name INTO v_store_name FROM public.stores WHERE id = v_staff.store_id;

  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object('changed', false, 'status', v_request.status, 'name', v_staff.name);
  END IF;

  -- La fiche a changé de numéro depuis la demande : le numéro vérifié ne prouve plus rien.
  IF public._staff_phone_digits(v_staff.phone) IS DISTINCT FROM v_request.phone_digits THEN
    UPDATE public.telegram_staff_activation_requests
    SET status = 'rejected', decided_at = now(), decided_by = v_approver WHERE id = v_request.id;
    RETURN jsonb_build_object('changed', false, 'reason', 'stale', 'name', v_staff.name);
  END IF;

  UPDATE public.telegram_staff_activation_requests
  SET status = CASE p_decision WHEN 'approve' THEN 'approved' ELSE 'rejected' END,
      decided_at = now(), decided_by = v_approver
  WHERE id = v_request.id;

  INSERT INTO public.telegram_staff_action_audit (telegram_user_id, auth_user_id, action, resource_id)
  VALUES (p_telegram_user_id, v_approver,
          CASE p_decision WHEN 'approve' THEN 'activation.approve' ELSE 'activation.reject' END,
          v_staff.id::TEXT);

  RETURN jsonb_build_object('changed', true,
    'status', CASE p_decision WHEN 'approve' THEN 'approved' ELSE 'rejected' END,
    'telegram_user_id', v_request.telegram_user_id, 'phone_digits', v_request.phone_digits,
    'email', lower(trim(v_staff.email)), 'name', v_staff.name, 'store', v_store_name);
END;
$$;

REVOKE ALL ON FUNCTION public.telegram_staff_activation_decide(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_activation_decide(UUID, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.telegram_staff_activation_decide(UUID, TEXT, TEXT) IS
  'Decision direction (Telegram) sur une demande d''activation vendeur : rang verifie, decision unique, auditee ; service-role only.';

COMMIT;
