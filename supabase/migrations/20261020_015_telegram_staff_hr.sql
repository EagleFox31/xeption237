-- Gestion RH depuis le bot Telegram (direction only) : vue du staff par boutique,
-- activation / désactivation, objectifs vendeurs.
--
-- Service role uniquement (Edge Function telegram-bot-entry) ; l'acteur est ré-identifié
-- par telegram_staff_links car callback_data n'est pas signé.
-- upsert_sales_target (ERP) n'est pas réutilisable ici : il exige auth.jwt(), NULL en service_role.
-- Désactiver = auth.users.banned_until (déjà honoré par le bot et la Mini App) + liens Telegram
-- révoqués + demandes pending refusées. État déjà atteint = aucune écriture, aucun audit.
-- Additif et rejouable.

BEGIN;

-- Même barème que ROLE_RANK (bot, Mini App). Rôle inconnu = NULL.
CREATE OR REPLACE FUNCTION public._staff_role_rank(p_role text)
RETURNS int
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(p_role, ''))
    WHEN 'vendeur' THEN 0 WHEN 'editor' THEN 0
    WHEN 'responsable' THEN 1 WHEN 'manager' THEN 1 WHEN 'manager_vente' THEN 1
    WHEN 'direction' THEN 2 WHEN 'admin' THEN 2
    WHEN 'super_admin' THEN 3
    ELSE NULL END;
$$;

-- Acteur lié, non banni, rang direction ou plus ; sinon 42501.
CREATE OR REPLACE FUNCTION public._telegram_hr_actor(
  p_telegram_user_id text,
  OUT o_auth_user_id uuid, OUT o_staff_id uuid, OUT o_staff_name text, OUT o_rank int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT l.auth_user_id, s.id, s.name, public._staff_role_rank(s.role)
    INTO o_auth_user_id, o_staff_id, o_staff_name, o_rank
  FROM public.telegram_staff_links l
  JOIN auth.users u ON u.id = l.auth_user_id
  JOIN public.staff s ON lower(s.email) = lower(u.email)
  WHERE l.telegram_user_id = p_telegram_user_id AND l.revoked_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until <= now())
  LIMIT 1;
  IF o_auth_user_id IS NULL OR coalesce(o_rank, -1) < 2 THEN
    RAISE EXCEPTION 'Direction only' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.telegram_staff_hr_overview(p_telegram_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._telegram_hr_actor(p_telegram_user_id);
  RETURN jsonb_build_object(
    'members', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'role', lower(s.role), 'phone', s.phone,
        'store_code', st.code, 'store_name', st.name,
        'has_account', u.id IS NOT NULL,
        'active', u.id IS NOT NULL AND (u.banned_until IS NULL OR u.banned_until <= now()),
        'telegram_linked', EXISTS (SELECT 1 FROM public.telegram_staff_links l
                                   WHERE l.auth_user_id = u.id AND l.revoked_at IS NULL),
        'targets', (SELECT coalesce(jsonb_object_agg(t.period_kind, t.target_amount), '{}'::jsonb)
                    FROM public.sales_targets t
                    WHERE t.scope_type = 'staff' AND t.staff_id = s.id AND t.active)
      ) ORDER BY st.name NULLS LAST, s.name)
      FROM public.staff s
      LEFT JOIN public.stores st ON st.id = s.store_id
      LEFT JOIN LATERAL (
        SELECT u2.id, u2.banned_until FROM auth.users u2
        WHERE lower(u2.email) = lower(s.email) LIMIT 1
      ) u ON true
    ), '[]'::jsonb),
    'pending', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'request_id', r.id, 'staff_id', r.staff_id, 'name', s.name,
        'store_name', st.name, 'requested_at', r.requested_at
      ) ORDER BY r.requested_at)
      FROM public.telegram_staff_activation_requests r
      JOIN public.staff s ON s.id = r.staff_id
      LEFT JOIN public.stores st ON st.id = s.store_id
      WHERE r.status = 'pending'
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.telegram_staff_set_member_active(
  p_telegram_user_id text,
  p_staff_id uuid,
  p_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_staff public.staff%ROWTYPE;
  v_user_id uuid;
  v_banned timestamptz;
BEGIN
  SELECT * INTO v_actor FROM public._telegram_hr_actor(p_telegram_user_id);
  IF p_active IS NULL THEN
    RAISE EXCEPTION 'Invalid state' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_staff FROM public.staff WHERE id = p_staff_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('changed', false, 'reason', 'not_found'); END IF;
  IF v_staff.id = v_actor.o_staff_id THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'self', 'name', v_staff.name);
  END IF;
  -- Personne ne touche un pair ou un supérieur (super_admin intouchable).
  IF coalesce(public._staff_role_rank(v_staff.role), 0) >= v_actor.o_rank THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'rank', 'name', v_staff.name);
  END IF;

  SELECT u.id, u.banned_until INTO v_user_id, v_banned
  FROM auth.users u
  WHERE lower(u.email) = lower(v_staff.email)
  LIMIT 1 FOR UPDATE;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'no_account', 'name', v_staff.name);
  END IF;
  IF (v_banned IS NULL OR v_banned <= now()) = p_active THEN
    RETURN jsonb_build_object('changed', false, 'active', p_active, 'name', v_staff.name);
  END IF;

  PERFORM set_config('app.actor_name', coalesce(v_actor.o_staff_name, ''), true);

  IF p_active THEN
    UPDATE auth.users SET banned_until = NULL, updated_at = now() WHERE id = v_user_id;
  ELSE
    UPDATE auth.users SET banned_until = now() + interval '100 years', updated_at = now()
    WHERE id = v_user_id;
    UPDATE public.telegram_staff_links SET revoked_at = now()
    WHERE auth_user_id = v_user_id AND revoked_at IS NULL;
    UPDATE public.telegram_staff_activation_requests
    SET status = 'rejected', decided_at = now(), decided_by = v_actor.o_auth_user_id
    WHERE staff_id = v_staff.id AND status = 'pending';
  END IF;

  INSERT INTO public.telegram_staff_action_audit (telegram_user_id, auth_user_id, action, resource_id)
  VALUES (p_telegram_user_id, v_actor.o_auth_user_id,
          CASE WHEN p_active THEN 'hr.member.activate' ELSE 'hr.member.deactivate' END,
          v_staff.id::text);

  RETURN jsonb_build_object('changed', true, 'active', p_active, 'name', v_staff.name);
END;
$$;

-- Montant 0 = retirer l'objectif (active = false ; target_amount > 0 reste garanti par le CHECK).
CREATE OR REPLACE FUNCTION public.telegram_staff_set_sales_target(
  p_telegram_user_id text,
  p_staff_id uuid,
  p_period_kind text,
  p_target_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor record;
  v_staff public.staff%ROWTYPE;
  v_target public.sales_targets%ROWTYPE;
  v_amount numeric := coalesce(p_target_amount, 0);
BEGIN
  SELECT * INTO v_actor FROM public._telegram_hr_actor(p_telegram_user_id);
  IF p_period_kind IS NULL OR p_period_kind NOT IN ('daily', 'weekly', 'monthly') THEN
    RAISE EXCEPTION 'Invalid period' USING ERRCODE = '22023';
  END IF;
  IF v_amount < 0 OR v_amount > 1000000000 OR v_amount <> trunc(v_amount) THEN
    RAISE EXCEPTION 'Invalid amount' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_staff FROM public.staff WHERE id = p_staff_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('changed', false, 'reason', 'not_found'); END IF;
  IF coalesce(public._staff_role_rank(v_staff.role), 99) > 1 THEN
    RETURN jsonb_build_object('changed', false, 'reason', 'not_seller', 'name', v_staff.name);
  END IF;

  SELECT * INTO v_target FROM public.sales_targets t
  WHERE t.scope_type = 'staff' AND t.staff_id = p_staff_id AND t.period_kind = p_period_kind
  FOR UPDATE;

  IF v_amount = 0 THEN
    IF NOT FOUND OR NOT v_target.active THEN
      RETURN jsonb_build_object('changed', false, 'reason', 'none', 'name', v_staff.name);
    END IF;
    UPDATE public.sales_targets SET active = false, updated_at = now() WHERE id = v_target.id;
  ELSE
    IF FOUND AND v_target.active AND v_target.target_amount = v_amount THEN
      RETURN jsonb_build_object('changed', false, 'name', v_staff.name,
                                'period', p_period_kind, 'amount', v_amount);
    END IF;
    INSERT INTO public.sales_targets (scope_type, staff_id, store_id, period_kind, target_amount, active)
    VALUES ('staff', p_staff_id, NULL, p_period_kind, v_amount, true)
    ON CONFLICT (staff_id, period_kind) WHERE scope_type = 'staff'
    DO UPDATE SET target_amount = EXCLUDED.target_amount, active = true, updated_at = now();
  END IF;

  PERFORM set_config('app.actor_name', coalesce(v_actor.o_staff_name, ''), true);
  INSERT INTO public.telegram_staff_action_audit (telegram_user_id, auth_user_id, action, resource_id)
  VALUES (p_telegram_user_id, v_actor.o_auth_user_id,
          CASE WHEN v_amount = 0 THEN 'hr.target.clear' ELSE 'hr.target.set' END,
          p_staff_id::text || ':' || p_period_kind || ':' || v_amount::text);

  RETURN jsonb_build_object('changed', true, 'name', v_staff.name,
                            'period', p_period_kind, 'amount', v_amount);
END;
$$;

REVOKE ALL ON FUNCTION public._staff_role_rank(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._telegram_hr_actor(text) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.telegram_staff_hr_overview(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_hr_overview(text) TO service_role;

REVOKE ALL ON FUNCTION public.telegram_staff_set_member_active(text, uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_set_member_active(text, uuid, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.telegram_staff_set_sales_target(text, uuid, text, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_staff_set_sales_target(text, uuid, text, numeric) TO service_role;

COMMIT;
