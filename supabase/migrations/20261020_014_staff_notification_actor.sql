-- Alertes staff : afficher qui a réalisé l'action (« Par : <nom> »).
--
-- Les alertes naissent de triggers (created_by = 'trigger') qui ignorent l'auteur.
-- Un seul trigger BEFORE INSERT sur admin_notifications ajoute l'auteur, résolu ainsi :
--   1. app.actor_name, posé pour la transaction par les RPC du bot Telegram (service_role,
--      donc sans auth.uid()) ;
--   2. sinon le staff de la session courante (actions ERP web) ;
--   3. sinon rien (alertes automatiques : stock bas, client, cron).
-- Le champ s'ajoute avec le séparateur des messages (' — '), lu par notify-staff.
--
-- Idempotent : rejouable sans erreur.

BEGIN;

CREATE OR REPLACE FUNCTION public._notification_actor_name()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := nullif(trim(current_setting('app.actor_name', true)), '');
BEGIN
  IF v_name IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT nullif(trim(s.name), '') INTO v_name
    FROM auth.users u
    JOIN public.staff s ON lower(s.email) = lower(u.email)
    WHERE u.id = auth.uid()
    LIMIT 1;
  END IF;
  RETURN v_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.stamp_admin_notification_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor text;
BEGIN
  -- Ne jamais bloquer une alerte pour un souci d'affichage de l'auteur.
  BEGIN
    v_actor := public._notification_actor_name();
    IF v_actor IS NOT NULL AND position('Par : ' IN coalesce(NEW.message, '')) = 0 THEN
      NEW.message := concat_ws(' — ', nullif(NEW.message, ''), 'Par : ' || v_actor);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'stamp_admin_notification_actor: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_admin_notification_actor ON public.admin_notifications;
CREATE TRIGGER trg_stamp_admin_notification_actor
  BEFORE INSERT ON public.admin_notifications
  FOR EACH ROW EXECUTE FUNCTION public.stamp_admin_notification_actor();

-- ── Troc depuis Telegram : identique à 20261020_007, + app.actor_name ──────
CREATE OR REPLACE FUNCTION public.telegram_staff_troc_action(
  p_request_id text,
  p_action text,
  p_telegram_user_id text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_user_id UUID;
  v_staff_role TEXT;
  v_staff_name TEXT;
  v_status TEXT;
BEGIN
  SELECT l.auth_user_id, lower(s.role), s.name INTO v_auth_user_id, v_staff_role, v_staff_name
  FROM public.telegram_staff_links l
  JOIN auth.users u ON u.id = l.auth_user_id
  JOIN public.staff s ON lower(s.email) = lower(u.email)
  WHERE l.telegram_user_id = p_telegram_user_id AND l.revoked_at IS NULL
  LIMIT 1;

  IF v_auth_user_id IS NULL OR v_staff_role NOT IN
      ('responsable', 'manager', 'manager_vente', 'direction', 'admin', 'super_admin') THEN
    RAISE EXCEPTION 'Action requires responsable or higher' USING ERRCODE = '42501';
  END IF;

  IF length(p_request_id) < 1 OR length(p_request_id) > 100 THEN
    RAISE EXCEPTION 'Invalid request ID' USING ERRCODE = '22023';
  END IF;

  SELECT status INTO v_status
  FROM public.trade_in_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN jsonb_build_object('changed', false, 'reason', 'not_found'); END IF;

  IF p_action = 'contacted' THEN
    IF v_status = 'contacted' THEN RETURN jsonb_build_object('changed', false, 'status', v_status); END IF;
    IF v_status <> 'accepted' THEN
      RAISE EXCEPTION 'Invalid troc transition' USING ERRCODE = '22023';
    END IF;
  ELSIF p_action = 'validated' THEN
    -- Machine à états ERP (utils/trocRedemption) : pending|accepted|contacted|appointment → validated.
    IF v_status = 'validated' THEN RETURN jsonb_build_object('changed', false, 'status', v_status); END IF;
    IF v_status NOT IN ('pending','accepted','contacted','appointment') THEN
      RAISE EXCEPTION 'Invalid troc transition' USING ERRCODE = '22023';
    END IF;
  ELSIF p_action = 'refused' THEN
    IF v_status = 'refused' THEN RETURN jsonb_build_object('changed', false, 'status', v_status); END IF;
    IF v_status NOT IN ('pending','accepted','contacted','appointment') THEN
      RAISE EXCEPTION 'Invalid troc transition' USING ERRCODE = '22023';
    END IF;
    IF p_reason IS NULL OR length(trim(p_reason)) < 5 OR length(trim(p_reason)) > 300 THEN
      RAISE EXCEPTION 'A reason between 5 and 300 characters is required' USING ERRCODE = '22023';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported troc action' USING ERRCODE = '22023';
  END IF;

  -- Local à la transaction : lu par stamp_admin_notification_actor via le trigger troc.
  PERFORM set_config('app.actor_name', coalesce(v_staff_name, ''), true);

  UPDATE public.trade_in_requests
    SET status = p_action,
        redemption_reason = CASE WHEN p_action = 'refused' THEN trim(p_reason) ELSE redemption_reason END,
        validated_at = CASE WHEN p_action = 'validated' THEN now() ELSE validated_at END,
        updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.telegram_staff_action_audit
    (telegram_user_id, auth_user_id, action, resource_id)
  VALUES
    (p_telegram_user_id, v_auth_user_id, 'troc.' || p_action, p_request_id);

  RETURN jsonb_build_object('changed', true, 'status', p_action);
END;
$$;

REVOKE ALL ON FUNCTION public._notification_actor_name()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stamp_admin_notification_actor()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.telegram_staff_troc_action(TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_troc_action(TEXT, TEXT, TEXT, TEXT)
  TO service_role;

COMMIT;
