-- =============================================================================
-- NETTOYAGE du jeu d'essai objectifs & primes
--
-- A jouer des que le test est fini : tant que les commandes QA-OBJ- sont en
-- base, elles comptent dans le VRAI chiffre d'affaires du tableau de bord.
--
-- Ne touche que des identifiants fixes : aucune donnee reelle n'est concernee.
-- =============================================================================

BEGIN;

DELETE FROM public.orders WHERE id LIKE 'QA-OBJ-%' OR id LIKE 'TEST-QA-OBJ-%';

DELETE FROM public.sales_targets WHERE id IN (
  '00000000-0000-4000-c000-000000000c01','00000000-0000-4000-c000-000000000c02',
  '00000000-0000-4000-c000-000000000c03','00000000-0000-4000-c000-000000000c04',
  '00000000-0000-4000-c000-000000000c05','00000000-0000-4000-c000-000000000c06',
  '00000000-0000-4000-c000-000000000c07','00000000-0000-4000-c000-000000000c08');

DELETE FROM public.bonus_rules WHERE id IN (
  '00000000-0000-4000-d000-000000000d01','00000000-0000-4000-d000-000000000d02',
  '00000000-0000-4000-d000-000000000d03');

-- Les vendeurs d'abord : `staff.store_id` reference `stores`.
DELETE FROM public.staff WHERE id IN (
  '00000000-0000-4000-b000-000000000b01','00000000-0000-4000-b000-000000000b02');

DELETE FROM public.stores WHERE id IN (
  '00000000-0000-4000-a000-000000000a01','00000000-0000-4000-a000-000000000a02');

COMMIT;

-- Les comptes Auth (awa.nkodo@qa.xeption.cm, brice.talla@qa.xeption.cm) ne sont
-- PAS supprimes ici : ils vivent dans le schema `auth`, pas dans `public`. Les
-- retirer depuis le tableau de bord Supabase → Authentication → Users, sinon
-- deux comptes fantomes resteront connectables sans profil staff.
