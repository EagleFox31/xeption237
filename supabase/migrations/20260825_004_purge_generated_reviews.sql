-- Retirer les avis fabriqués et les notes sans avis derrière.
--
-- La génération d'avis a été supprimée de l'éditeur produit, mais désactiver un
-- bouton ne retire pas ce qu'il a déjà publié. Constat en base avant purge :
--
--    32 produits  3 avis générés chacun, notes 4,7 à 4,9
--   171 produits  note = 5 et AUCUN avis — valeur par défaut posée à l'import
--
-- Les 32 sont le vrai sujet : `ProductPage` n'émet un AggregateRating schema.org
-- que s'il existe des avis, donc eux seuls partaient vers Google. Les 171, elles,
-- restaient internes — mais faisaient afficher cinq étoiles pleines sur la fiche,
-- ce qui n'est pas neutre pour un client.
--
-- Après cette migration, une étoile ne s'affiche que si un client l'a laissée,
-- via le lien envoyé par WhatsApp après achat. C'est ce que le test T-C06 de la
-- recette exige depuis le début : « étoiles affichées seulement s'il y a de
-- VRAIS avis ».

BEGIN;

-- 1. Avis fabriqués : on vide, on ne supprime pas la colonne — la collecte
--    WhatsApp écrit au même endroit.
UPDATE public.products
SET reviews = '[]'::jsonb,
    rating  = NULL
WHERE reviews IS NOT NULL
  AND jsonb_array_length(reviews) > 0;

-- 2. Notes sans aucun avis derrière : rien ne les justifie.
UPDATE public.products
SET rating = NULL
WHERE rating IS NOT NULL
  AND (reviews IS NULL OR jsonb_array_length(reviews) = 0);

COMMIT;

-- Contrôle attendu après exécution :
--   select count(*) filter (where rating is not null) as notes_restantes,
--          count(*) filter (where reviews is not null
--                             and jsonb_array_length(reviews) > 0) as avis_restants
--   from products;
--   -> 0 et 0, jusqu'au premier avis client réel.
