-- Complète bind_staff_by_phone pour synchroniser telegram_staff_links lorsque l'utilisateur auth existe

BEGIN;

CREATE OR REPLACE FUNCTION public.bind_staff_by_phone(
  p_phone text,
  p_telegram_user_id text
)
RETURNS TABLE (
  staff_id uuid,
  name text,
  role text,
  store_name text,
  store_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text := public._staff_phone_digits(p_phone);
  v_staff_id uuid;
  v_staff_email text;
  v_auth_user_id uuid;
BEGIN
  IF length(v_digits) < 9 THEN
    RETURN;
  END IF;

  SELECT s.id, s.email INTO v_staff_id, v_staff_email
  FROM public.staff s
  WHERE public._staff_phone_digits(s.phone) = v_digits
  LIMIT 1;

  IF v_staff_id IS NULL THEN
    RETURN;
  END IF;

  -- Libérer l'ID telegram s'il était associé à un autre membre
  UPDATE public.staff
  SET telegram_user_id = NULL
  WHERE telegram_user_id = p_telegram_user_id AND id <> v_staff_id;

  -- Associer le membre actuel
  UPDATE public.staff
  SET telegram_user_id = p_telegram_user_id
  WHERE id = v_staff_id;

  -- Synchroniser telegram_staff_links si un compte auth existe
  SELECT u.id INTO v_auth_user_id
  FROM auth.users u
  WHERE lower(u.email) = lower(v_staff_email)
  LIMIT 1;

  IF v_auth_user_id IS NOT NULL THEN
    INSERT INTO public.telegram_staff_links (telegram_user_id, auth_user_id)
    VALUES (p_telegram_user_id, v_auth_user_id)
    ON CONFLICT (telegram_user_id) DO UPDATE SET auth_user_id = EXCLUDED.auth_user_id, revoked_at = NULL;
  END IF;

  RETURN QUERY
  SELECT s.id, s.name, s.role, coalesce(st.name, 'Xeption — Direction'), coalesce(st.code, 'DIRECTION')
  FROM public.staff s
  LEFT JOIN public.stores st ON s.store_id = st.id
  WHERE s.id = v_staff_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bind_staff_by_phone(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bind_staff_by_phone(text, text) TO service_role;

COMMIT;
