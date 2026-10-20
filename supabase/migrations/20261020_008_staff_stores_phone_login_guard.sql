-- Gestion du personnel par la direction :
--   1. boutiques Mfoundi Mall et Olembe (rattachement des vendeurs) ;
--   2. connexion par numéro de téléphone (le staff boutique n'a pas toujours d'email) ;
--   3. garde-fou : seul un super_admin peut créer, modifier ou retirer un super_admin.
--      Sans lui, la policy staff_write_direction laisse un compte direction se promouvoir
--      super_admin ou modifier le compte technique.

BEGIN;

-- ── 1. Boutiques (idempotent : rejouable, ne touche pas une boutique existante) ──
INSERT INTO public.stores (code, name, city, active, is_default)
VALUES
  ('MFOUNDI', 'Mfoundi Mall', 'Yaoundé', true, false),
  ('OLEMBE', 'Olembe', 'Yaoundé', true, false)
ON CONFLICT (code) DO NOTHING;

-- ── 2. Téléphone → identifiant de connexion ─────────────────────────────────
-- Chiffres seuls, indicatif 237 retiré : « +237 6 41 89 10 31 » = « 641891031 ».
CREATE OR REPLACE FUNCTION public._staff_phone_digits(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $fn$
  SELECT CASE
    WHEN d ~ '^237[0-9]{9}$' THEN substr(d, 4)
    ELSE d
  END
  FROM (SELECT regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') AS d) x;
$fn$;

CREATE OR REPLACE FUNCTION public.staff_login_hint(p_identifier text)
RETURNS TABLE (name text, email text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT s.name, s.email, s.role
  FROM public.staff s
  WHERE lower(trim(p_identifier)) <> ''
    AND (
      -- Correspondance EXACTE, jamais un motif (voir 20260907_001).
      lower(s.email) = lower(trim(p_identifier))
      OR lower(s.name) = lower(trim(p_identifier))
      -- Numéro complet uniquement (9 chiffres) : pas de recherche par fragment.
      OR (
        public._staff_phone_digits(p_identifier) ~ '^[0-9]{9}$'
        AND public._staff_phone_digits(s.phone) = public._staff_phone_digits(p_identifier)
      )
    )
  ORDER BY s.email
  LIMIT 1;
$fn$;

COMMENT ON FUNCTION public.staff_login_hint(text) IS
  'Ecran de connexion, avant mot de passe : resout un identifiant (email, nom exact ou numero complet) en nom/email/role. Une ligne au plus, jamais de liste.';

REVOKE ALL ON FUNCTION public.staff_login_hint(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_login_hint(text) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._staff_phone_digits(text) FROM PUBLIC, anon, authenticated;

-- ── 3. Garde-fou super_admin ────────────────────────────────────────────────
-- Ne s'applique qu'aux appels d'un utilisateur connecté (ERP). Service role,
-- migrations et edge functions (provisioning) ne sont pas concernés.
CREATE OR REPLACE FUNCTION public._guard_staff_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_touches_super boolean;
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') <> 'authenticated' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  v_touches_super :=
    (TG_OP IN ('UPDATE', 'DELETE') AND lower(coalesce(OLD.role, '')) = 'super_admin')
    OR (TG_OP IN ('INSERT', 'UPDATE') AND lower(coalesce(NEW.role, '')) = 'super_admin');

  IF v_touches_super AND NOT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email') AND lower(s.role) = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Seul un super admin peut gérer un compte super admin.' USING ERRCODE = '42501';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$fn$;

REVOKE ALL ON FUNCTION public._guard_staff_super_admin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_staff_super_admin ON public.staff;
CREATE TRIGGER trg_guard_staff_super_admin
  BEFORE INSERT OR UPDATE OR DELETE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public._guard_staff_super_admin();

COMMIT;
