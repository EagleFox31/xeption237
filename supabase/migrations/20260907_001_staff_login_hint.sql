-- Palier 1/3 — une porte etroite pour les besoins d'AVANT connexion
-- Plan : docs/engineering/PLAN_RLS_STAFF.md
--
-- L'ecran de connexion a besoin de trois choses avant tout mot de passe :
--   nom saisi  -> email        (on se connecte en tapant « Jennifer »)
--   email      -> nom, role    (accueil « Bonjour Jennifer, Vendeur »)
--   email      -> role         (autorisation Studio)
--
-- Aujourd'hui ces trois besoins sont satisfaits en laissant la table `staff`
-- ouverte a `anon`, ce qui permet aussi de la LISTER en entier. Cette fonction
-- repond a la meme question sans ouvrir la table : une correspondance exacte,
-- une ligne, jamais de liste.
--
-- Ce palier n'enleve RIEN : il ajoute seulement la porte etroite. La table reste
-- ouverte jusqu'au palier 3, pour que l'application ne casse a aucun moment.

BEGIN;

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
      -- Correspondance EXACTE, jamais un motif : ni LIKE, ni prefixe, ni
      -- caractere joker. Sans cela, « % » suffirait a re-lister l'equipe et
      -- cette fonction ne vaudrait pas mieux que la table ouverte.
      lower(s.email) = lower(trim(p_identifier))
      OR lower(s.name) = lower(trim(p_identifier))
    )
  -- Deux membres homonymes : on en renvoie un seul, de facon deterministe.
  -- Mieux vaut un choix stable qu'un resultat qui change d'un appel a l'autre.
  ORDER BY s.email
  LIMIT 1;
$fn$;

COMMENT ON FUNCTION public.staff_login_hint(text) IS
  'Ecran de connexion, avant mot de passe : resout un identifiant (email ou nom exact) en nom/email/role. Une ligne au plus, jamais de liste. Remplace la lecture anonyme de public.staff.';

-- Appelable avant connexion : c'est tout son objet.
REVOKE ALL ON FUNCTION public.staff_login_hint(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_login_hint(text) TO anon, authenticated, service_role;

COMMIT;
