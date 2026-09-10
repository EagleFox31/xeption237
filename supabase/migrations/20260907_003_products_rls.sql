-- Fermer `products` — le catalogue reste public en LECTURE, pas en ecriture
-- Protocole : audit avant, correction, audit apres (docs/engineering/PLAN_RLS_STAFF.md)
--
-- AUDIT AVANT, mesure le 2026-09-07 :
--   RLS activee : NON        <- les 6 policies existantes ne servaient a RIEN
--   droits anon : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
--   essai reel  : un visiteur non connecte a MODIFIE une ligne (prix compris).
--                 La suppression n'a echoue que sur une cle etrangere vers
--                 stock_movements — un produit sans mouvement etait supprimable.
--
-- Les 6 policies etaient decoratives : sans `ENABLE ROW LEVEL SECURITY`, aucune
-- n'est evaluee. C'est le piege de cette table — elle avait l'air protegee.

BEGIN;

-- ── 1. Retirer TRUNCATE, que la RLS ne couvre PAS ───────────────────────────
--
-- TRUNCATE est un privilege de TABLE : il n'est soumis a aucune policy. Activer
-- la RLS sans revoquer ce droit laisserait n'importe quel visiteur vider les
-- 228 produits d'une seule commande. On revoque aussi REFERENCES et TRIGGER,
-- dont aucun client legitime n'a l'usage.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.products FROM anon, authenticated;

-- ── 2. Activer la RLS ───────────────────────────────────────────────────────
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ── 3. Des policies qui disent quelque chose ────────────────────────────────
DROP POLICY IF EXISTS "Staff Full Access Products" ON public.products;
DROP POLICY IF EXISTS "Staff Write Products" ON public.products;
DROP POLICY IF EXISTS "Staff update products" ON public.products;
DROP POLICY IF EXISTS "TEMP: authenticated can insert products" ON public.products;
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
DROP POLICY IF EXISTS "Public View Products" ON public.products;

-- Lecture publique : VOULUE. C'est la boutique en ligne ; le catalogue doit
-- etre lisible sans compte. Une seule policy au lieu de deux qui disaient la
-- meme chose.
CREATE POLICY products_public_read ON public.products
  FOR SELECT TO anon, authenticated
  USING (true);

-- Ecriture : les membres du personnel. `is_staff_member()` et non
-- `authenticated` — une session signInAnonymously() (chatbot public) est
-- authenticated sans etre de l'equipe. C'est l'erreur qui se repetait sur
-- toutes les tables de ce projet.
--
-- Tous les membres, pas seulement la direction : l'onglet Inventaire est
-- accessible des le role `vendeur`, qui cree et modifie des produits.
CREATE POLICY products_staff_write ON public.products
  FOR ALL TO authenticated
  USING (public.is_staff_member())
  WITH CHECK (public.is_staff_member());

COMMIT;

-- RETOUR ARRIERE — etat exact d'avant, a ne recreer que pour retablir un acces :
--   ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
--   GRANT TRUNCATE, REFERENCES, TRIGGER ON public.products TO anon, authenticated;
-- (rouvre la table a tout le monde en ecriture)
