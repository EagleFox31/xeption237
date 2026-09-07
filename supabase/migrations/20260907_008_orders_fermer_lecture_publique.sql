-- Fermer la lecture publique de `orders`
--
-- ORDRE RESPECTE : les deux ecrans publics ont ete bascules sur des RPC AVANT
-- cette migration, et testes avec une vraie commande.
--
--   page de suivi   -> track_order(reference, telephone)
--   page d'accueil  -> get_social_proof_stats()
--
-- Faire l'inverse aurait casse le suivi de commande.
--
-- CE QUI ETAIT OUVERT : quatre policies SELECT `true` sur `orders`, dont deux
-- pour `public`. N'importe qui pouvait lire toutes les commandes : nom, email,
-- telephone, ville, montant, contenu du panier.
--
-- Sans effet tant que la table etait vide. Elle ne l'est plus depuis que le
-- tunnel de commande a ete repare (20260907_006).

BEGIN;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.orders;
DROP POLICY IF EXISTS "Public Read Orders" ON public.orders;
DROP POLICY IF EXISTS "Public View Own Orders" ON public.orders;
DROP POLICY IF EXISTS "Public read orders" ON public.orders;

-- Il reste `orders_staff_write` (FOR ALL, is_staff_member()) posee au motif A :
-- elle couvre deja la lecture par l'equipe. Aucune policy publique ne subsiste.

COMMIT;

-- RETOUR ARRIERE, si le suivi devait casser :
--   CREATE POLICY "Public Read Orders" ON public.orders
--     FOR SELECT TO public USING (true);
-- Cela rouvre TOUTES les commandes a TOUT LE MONDE. Preferer corriger l'appel
-- a track_order.
