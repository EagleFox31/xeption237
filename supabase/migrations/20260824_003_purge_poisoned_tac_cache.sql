-- Purge des TAC impossibles mis en cache.
--
-- Contexte : `000000000000000` passe la somme de controle de Luhn (somme 0,
-- donc divisible par 10). La cascade a donc interroge le fournisseur externe,
-- qui a repondu « Apple iPhone 15 » avec 0.92 de confiance sur un TAC qui
-- n'existe pas, et le resultat a ete mis en cache le 2026-08-24. Toute
-- evaluation ulterieure sur un IMEI a TAC 00000000 heritait de cet appareil,
-- donc de son `base_price`, donc de l'offre de reprise.
--
-- ATTENTION : le prefixe « 00 » ne disqualifie PAS un TAC. 00499901 est un vrai
-- CHUWI CW-Vi7 issu d'osmocom, present dans cette table. On ne supprime que ce
-- qui est structurellement impossible : huit fois le meme chiffre.
--
-- Le garde-fou applicatif est pose dans _shared/imeiValidation.ts
-- (isTrivialTestImei) et dans check-imei (isCacheableTac), pour que la ligne ne
-- puisse pas revenir.

DELETE FROM public.tac_cache
WHERE tac ~ '^(.)\1{7}$';
