-- Sync display name Auth staff (dashboard Supabase + identity email)
CREATE OR REPLACE FUNCTION public.sync_staff_auth_display_name(p_email text, p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_user_id uuid;
  v_meta jsonb;
  v_display text;
BEGIN
  v_display := NULLIF(trim(p_name), '');
  IF v_display IS NULL THEN
    v_display := split_part(lower(trim(p_email)), '@', 1);
  END IF;

  SELECT id, coalesce(raw_user_meta_data, '{}'::jsonb)
  INTO v_user_id, v_meta
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email));

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  v_meta := v_meta || jsonb_build_object(
    'full_name', v_display,
    'name', v_display,
    'display_name', v_display,
    'staff_name', v_display
  );

  UPDATE auth.users
  SET raw_user_meta_data = v_meta
  WHERE id = v_user_id;

  UPDATE auth.identities
  SET identity_data = coalesce(identity_data, '{}'::jsonb) || jsonb_build_object(
    'name', v_display,
    'full_name', v_display,
    'display_name', v_display,
    'email', lower(trim(p_email))
  )
  WHERE user_id = v_user_id
    AND provider = 'email';
END;
$$;

REVOKE ALL ON FUNCTION public.sync_staff_auth_display_name(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_staff_auth_display_name(text, text) TO service_role;
