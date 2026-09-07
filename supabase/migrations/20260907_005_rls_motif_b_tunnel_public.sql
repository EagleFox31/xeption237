-- Motif B — policies publiques du « tunnel client », dont la plupart ne servent
-- plus a rien. Audit : scripts/qa-audit-rls-complet.mjs
--
-- CE QUE J'AI VERIFIE AVANT DE COUPER, et qui change tout le raisonnement :
--
--   * les RPC du tunnel commande sont TOUTES en SECURITY DEFINER —
--     create_order_atomic (site public), complete_pos_sale_atomic (caisse),
--     mark_order_cash_paid, cancel_order_with_stock, sync_order_stock_on_status.
--     Elles contournent la RLS : le checkout n'a JAMAIS eu besoin des policies
--     d'insertion publiques sur `orders`.
--
--   * aucun code client n'insere ni ne modifie `orders` directement. Les deux
--     seuls acces sont des lectures : OrderTracking (suivi de commande) et
--     SocialProof (compteur public).
--
--   * `customers` n'est ecrite par PERSONNE : ni le client, ni un trigger, ni
--     une fonction. Ses trois policies publiques etaient donc du poids mort qui
--     laissait n'importe qui lire et modifier les fiches clients.
--
--   * `repair_tickets` n'est touchee que par l'onglet SAV de l'ERP. Le
--     formulaire public ne cree pas de ticket en base. Les trois policies
--     « Public Create Ticket » ne servaient rien non plus.
--
-- Le defaut commun n'est donc pas seulement l'absence de condition : c'est
-- l'ACCUMULATION. Des policies posees pour un besoin disparu, jamais retirees,
-- et dupliquees sous des noms differents. Les policies se cumulant par OU, la
-- plus permissive gagne toujours : en empiler n'a jamais protege.

BEGIN;

-- ── orders : 5 policies publiques d'ecriture, zero besoin ───────────────────
-- Quatre insertions pour la meme chose, plus une modification ouverte a tous.
-- Cette derniere est la plus grave : la table est vide aujourd'hui, mais a la
-- premiere vraie commande, n'importe qui aurait pu la marquer payee.
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.orders;
DROP POLICY IF EXISTS "Public Create Orders" ON public.orders;
DROP POLICY IF EXISTS "Public Insert Orders" ON public.orders;
DROP POLICY IF EXISTS "Public insert orders" ON public.orders;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.orders;

-- ── customers : les trois policies publiques ────────────────────────────────
-- Lecture comprise : sept fiches clients (nom, email, telephone) etaient
-- lisibles par n'importe qui, sans qu'aucun ecran public n'en ait l'usage.
DROP POLICY IF EXISTS "Public insert" ON public.customers;
DROP POLICY IF EXISTS "Public update" ON public.customers;
DROP POLICY IF EXISTS "Public read" ON public.customers;

-- ── repair_tickets : trois insertions publiques pour un besoin inexistant ───
DROP POLICY IF EXISTS "Public Create Ticket" ON public.repair_tickets;
DROP POLICY IF EXISTS "Public can create tickets" ON public.repair_tickets;
DROP POLICY IF EXISTS "Public insert tickets" ON public.repair_tickets;

COMMIT;

-- CE QUI RESTE VOLONTAIREMENT OUVERT, et pourquoi :
--
--   orders SELECT public   — le suivi de commande et le compteur SocialProof en
--     dependent. C'est un vrai probleme des que des commandes existeront : tout
--     le monde pourra lire toutes les commandes, avec noms, telephones et
--     montants. La correction demande deux RPC (suivi par reference, compteur
--     agrege) et sa propre verification. A TRAITER AVANT LA PREMIERE COMMANDE.
--
--   troc_sessions INSERT/UPDATE anon, troc_payments INSERT anon — le parcours
--     Smart Troc ecrit reellement ces tables depuis le site public, sans compte.
--     Les fermer demande d'abord une notion d'appartenance de session ; les
--     couper aveuglement casserait le troc. A traiter separement.
--
-- RETOUR ARRIERE : recreer une policy `FOR <cmd> TO public USING (true)` du nom
-- voulu. Aucune n'etait utilisee, donc aucun retour arriere ne devrait etre
-- necessaire — si l'un s'impose, c'est qu'un chemin d'ecriture m'a echappe, et
-- c'est LUI qu'il faut corriger.
