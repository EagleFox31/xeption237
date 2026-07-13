-- Remplit le Display name Auth pour tous les profils staff existants
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT email, name
    FROM public.staff
    WHERE email IS NOT NULL AND trim(email) <> ''
  LOOP
    PERFORM public.sync_staff_auth_display_name(r.email, r.name);
  END LOOP;
END;
$$;
