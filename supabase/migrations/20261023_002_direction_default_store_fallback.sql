-- Migration pour fallback de boutique automatique pour la Direction (Super Admin multi-boutiques)
-- Évite le blocage "Votre compte n'est rattaché à aucune boutique" pour les membres Direction

CREATE OR REPLACE FUNCTION public._telegram_staff_actor(
  p_telegram_user_id text,
  OUT o_auth_user_id uuid, OUT o_staff_id uuid, OUT o_staff_name text, OUT o_rank int,
  OUT o_store_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT l.auth_user_id, s.id, s.name, public._staff_role_rank(s.role),
    coalesce(
      s.store_id,
      (SELECT st.id FROM public.stores st WHERE st.code = coalesce(l.scope_store_code, 'siege') LIMIT 1),
      (SELECT st.id FROM public.stores st ORDER BY st.created_at ASC LIMIT 1)
    )
    INTO o_auth_user_id, o_staff_id, o_staff_name, o_rank, o_store_id
  FROM public.telegram_staff_links l
  JOIN auth.users u ON u.id = l.auth_user_id
  JOIN public.staff s ON lower(s.email) = lower(u.email)
  WHERE l.telegram_user_id = p_telegram_user_id AND l.revoked_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until <= now())
  LIMIT 1;

  IF o_auth_user_id IS NULL OR o_rank IS NULL THEN
    RAISE EXCEPTION 'Staff only' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._telegram_staff_actor(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._telegram_staff_actor(text) TO service_role;
