-- Retirer TRUNCATE, REFERENCES et TRIGGER a anon et authenticated
--
-- POURQUOI CES TROIS-LA, ET PAS LES AUTRES
--
-- La RLS filtre les LIGNES d'un SELECT, INSERT, UPDATE ou DELETE. Ces quatre
-- droits peuvent donc rester : une policy decide ensuite qui touche quoi.
--
-- TRUNCATE est different : il ne passe PAS par la RLS. C'est un droit de table,
-- point. Le laisser a `anon` revient a poser un verrou sur la porte en laissant
-- la fenetre ouverte — une seule commande vide la table, policies ou pas.
--
-- REFERENCES et TRIGGER n'ont aucun usage pour un client de l'API : le premier
-- sert a creer des cles etrangeres, le second des declencheurs. Ce sont des
-- droits d'administration du schema.
--
-- CONSTAT : 42 tables les accordaient a anon et authenticated. C'est le signe
-- d'un `GRANT ALL ON ALL TABLES` passe une fois, puis oublie.
--
-- CE QUE CETTE MIGRATION NE FAIT PAS : toucher a SELECT, INSERT, UPDATE ou
-- DELETE. Aucun chemin applicatif ne peut donc casser — ces quatre droits sont
-- exactement ceux d'avant, et la RLS continue de les filtrer comme avant.

BEGIN;

DO $revoke$
DECLARE
  t record;
  n integer := 0;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    -- 'r' table ordinaire, 'p' table partitionnee, 'v' vue, 'm' vue materialisee.
    -- La vue `orders_reportable` conservait TRUNCATE au premier essai parce que
    -- la boucle ne prenait que les tables. Le droit y est sans effet — on ne
    -- tronque pas une vue — mais il faussait l'audit.
    WHERE ns.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
    ORDER BY c.relname
  LOOP
    EXECUTE format(
      'REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM anon, authenticated',
      t.relname
    );
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'TRUNCATE, REFERENCES et TRIGGER retires sur % relation(s)', n;
END
$revoke$;

-- Les futures tables heriteront des droits par defaut du schema. On corrige
-- aussi ce moule, sans quoi la prochaine table creee reproduira le probleme.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;

COMMIT;

-- RETOUR ARRIERE (aucune raison de le jouer — rien d'applicatif n'utilise ces
-- droits) :
--   GRANT TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public
--     TO anon, authenticated;
