-- Palier 3/3 — fermer la table `staff`
-- Plan : docs/engineering/PLAN_RLS_STAFF.md
--
-- CE QUI ETAIT OUVERT, mesure le 2026-09-07 avec la seule cle publique et une
-- session signInAnonymously() (celle qu'ouvre le chatbot du site public) :
--
--   GET /rest/v1/staff        -> 200, 4 lignes : noms, emails et roles de toute
--                                l'equipe, lisibles sans aucun compte
--   UPDATE staff SET role     -> 1 ligne modifiee : un visiteur se donne
--                                le role « direction »
--   DELETE FROM staff         -> 1 ligne supprimee : un visiteur efface un
--                                membre de l'equipe
--
-- ┌─ RETOUR ARRIERE ─────────────────────────────────────────────────────────┐
-- │ Les deux policies remplacees, a recreer TELLES QUELLES en cas d'urgence : │
-- │                                                                          │
-- │   CREATE POLICY "Public Read Staff" ON public.staff                       │
-- │     FOR SELECT TO anon, authenticated USING (true);                       │
-- │                                                                          │
-- │   CREATE POLICY "Staff Self Edit" ON public.staff                         │
-- │     FOR ALL TO authenticated USING (true);                                │
-- │                                                                          │
-- │ Les recreer rouvre la faille : ne le faire que pour retablir l'acces, et  │
-- │ rejouer cette migration ensuite.                                         │
-- └──────────────────────────────────────────────────────────────────────────┘
--
-- PREALABLE, deja en place : le client ne lit plus la table avant connexion.
-- Il passe par `staff_login_hint` (palier 1, SECURITY DEFINER, donc insensible
-- a la RLS). Sans ce prealable, cette migration casserait la connexion par nom.

BEGIN;

-- ── Deux fonctions d'appui, et la raison d'etre de ce detour ────────────────
--
-- ⚠ Premier essai ecrit ainsi :
--
--     CREATE POLICY ... ON public.staff FOR SELECT
--       USING (EXISTS (SELECT 1 FROM public.staff s WHERE ...));
--
-- Postgres a repondu « infinite recursion detected in policy for relation
-- "staff" » : evaluer la policy demande de lire la table, ce qui evalue la
-- policy. Le meme motif fonctionne ailleurs dans ce depot (migration 025 sur
-- sales_targets) parce que la policy y porte sur une AUTRE table.
--
-- SECURITY DEFINER coupe la boucle : la fonction s'execute avec les droits de
-- son proprietaire, pour qui la RLS de `staff` ne s'applique pas
-- (relforcerowsecurity = false, verifie avant d'ecrire ceci).
CREATE OR REPLACE FUNCTION public.is_staff_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
  );
$fn$;

CREATE OR REPLACE FUNCTION public.is_direction_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.staff s
    WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
      AND s.role IN ('direction', 'super_admin')
  );
$fn$;

COMMENT ON FUNCTION public.is_staff_member() IS
  'Vrai si l''appelant figure dans public.staff. SECURITY DEFINER pour eviter la recursion quand la policy porte sur staff elle-meme.';
COMMENT ON FUNCTION public.is_direction_staff() IS
  'Vrai si l''appelant est direction ou super_admin.';

REVOKE ALL ON FUNCTION public.is_staff_member() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_direction_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_member() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_direction_staff() TO authenticated, service_role;

DROP POLICY IF EXISTS "Public Read Staff" ON public.staff;
DROP POLICY IF EXISTS "Staff Self Edit" ON public.staff;

-- ── Lecture : les membres du personnel, et eux seuls ────────────────────────
--
-- Le garde porte sur « l'appelant EST un membre », pas sur `authenticated`.
-- La nuance est tout le sujet : `signInAnonymously()` produit une session de
-- role `authenticated` SANS email. Une policy « pour les authentifies » couvre
-- donc les visiteurs anonymes du site public. C'est l'erreur d'origine.
CREATE POLICY staff_read_members ON public.staff
  FOR SELECT TO authenticated
  USING (public.is_staff_member());

-- ── Ecriture : direction et super-admin ─────────────────────────────────────
--
-- C'est deja la regle de l'interface : l'onglet Personnel exige le role
-- `direction`. La base cessait simplement d'etre plus permissive que l'ecran.
--
-- WITH CHECK autant que USING : sans lui on pourrait ecrire une ligne qu'on
-- n'aurait pas le droit de relire — se retirer soi-meme des ayants droit, par
-- exemple.
CREATE POLICY staff_write_direction ON public.staff
  FOR ALL TO authenticated
  USING (public.is_direction_staff())
  WITH CHECK (public.is_direction_staff());

COMMIT;
