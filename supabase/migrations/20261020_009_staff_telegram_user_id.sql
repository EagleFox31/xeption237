-- Association directe Staff ↔ Telegram par numéro de téléphone certifié
-- Permet aux vendeurs et à la direction de s'identifier au bot Telegram sans mot de passe
-- et de naviguer dans les menus par boutique.

BEGIN;

-- 1. Colonne telegram_user_id sur public.staff
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS telegram_user_id text UNIQUE;

CREATE INDEX IF NOT EXISTS staff_telegram_user_id_idx
  ON public.staff(telegram_user_id);

-- 2. Liaison automatique via partage de contact Telegram
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
BEGIN
  IF length(v_digits) < 9 THEN
    RETURN;
  END IF;

  SELECT s.id INTO v_staff_id
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

  RETURN QUERY
  SELECT s.id, s.name, s.role, coalesce(st.name, 'Xeption — Direction'), coalesce(st.code, 'DIRECTION')
  FROM public.staff s
  LEFT JOIN public.stores st ON s.store_id = st.id
  WHERE s.id = v_staff_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bind_staff_by_phone(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bind_staff_by_phone(text, text) TO service_role;

-- 3. Déconnexion / réinitialisation session Telegram
CREATE OR REPLACE FUNCTION public.unbind_staff_by_telegram(
  p_telegram_user_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.staff
  SET telegram_user_id = NULL
  WHERE telegram_user_id = p_telegram_user_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.unbind_staff_by_telegram(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unbind_staff_by_telegram(text) TO service_role;

COMMIT;
