# ROADMAP — MISE SUR PIED DE L'ERP

> **Date** : 23 août 2026
> **Consolide** : `ECART_ERP_VS_CADRAGE.md` · `USE_CASES_ET_PARCOURS_ERP.md` ·
> `MODELE_STOCK_MULTI_BOUTIQUES.md` · `../engineering/PLAN_CORRECTIONS_INTEGRITE_BD.md` ·
> `../engineering/AUDIT_BD_SECURITE_2026-08-21.md`
>
> Les ordres proposés dans ces documents sont **remplacés par celui-ci**.

---

## Vue d'ensemble

| # | Étape | Visible ? | Risque | Débloque |
|---|---|:---:|:---:|---|
| 0 | Suivi des migrations | non | — | ✅ **fait** |
| 1 | Fermer les failles | non | faible | rien — mais évite d'aggraver |
| 2 | Poser le socle données | non | faible | ✅ **fait** — débloque tout le reste |
| 3 | Rattachements & répartition du stock | oui | faible | étape 4 | ✅ **UI livrée** |
| 4 | **Bascule de la vérité du stock** | oui | **élevé** | multi-boutiques |
| 5 | Le vendeur existe | oui | moyen | P1, primes, classements | ✅ |
| 6 | Pilotage & export | oui | faible | P2, P3, rapport du soir | ✅ |
| 7 | Objectifs & primes | oui | faible | UC-V-03, UC-D-04 | ✅ |
| 8 | Mouvements de stock avancés | oui | moyen | transferts, inventaires, retours | ✅ |
| 9 | Mode hors connexion | oui | élevé | saisie terrain | ✅ |
| 10 | Durcissement | non | moyen | isolation par rôle, audit |

Les étapes **1 à 3 ne changent rien pour personne**. Le premier changement de comportement
arrive à l'étape 4.

---

## Étape 0 — Suivi des migrations ✅ *fait*

Table `schema_migrations`, 48 migrations baselinées, outils `db:status` / `db:baseline` /
`db:verify` / `db:inventory`. Sans ça, impossible de travailler à plusieurs sur la base.

**Reste en attente** : `20260401_004_market_price_cache.sql` n'a jamais été appliquée alors que
`market-price-intel` et le job cron du lundi en dépendent. Hors périmètre ERP, mais à traiter.

---

## Étape 1 — Fermer les failles

**Pourquoi d'abord** : ces deux défauts existent aujourd'hui, et l'ERP multi-vendeurs les rend
nettement plus probables. Les corriger après, c'est corriger en production avec du monde dessus.

- **RLS sur `products`.** Table actuellement ouverte en écriture au rôle `anon`, dont la clé est
  publiée dans le bundle JS. Diagnostic fait, policy validée contre les données réelles.
  Séquence dans `AUDIT_BD_SECURITE_2026-08-21.md` §5.
- **Décrément atomique du stock** sur `usePosSystem.submitSale` et
  `trocCheckoutService.completeTrocWithSale`. Aujourd'hui : `Math.max(0, stock - qty)` calculé
  en JavaScript, hors transaction → deux ventes simultanées du dernier exemplaire passent
  toutes les deux.
- **Clôture troc atomique** — les trois écritures (commande, stock, dossier) dans une seule RPC.
  Aujourd'hui, si la dernière échoue, le bon reste ouvert après la vente : le client peut
  représenter le même crédit.

> **Toujours dans le modèle mono-stock actuel.** On ne touche pas encore aux boutiques.
> Le motif de référence existe déjà : `create_order_atomic` verrouille avec `FOR UPDATE`,
> contrôle, décrémente et insère en une transaction. Il s'agit d'aligner, pas d'inventer.

---

## Étape 2 — Poser le socle données

> **Spec détaillée :** [`ETAPE_2_SOCLE_DONNEES.md`](./ETAPE_2_SOCLE_DONNEES.md)

**100 % additif. Aucune lecture ne change, aucune écriture ne bascule.**

- `stores` — une boutique par défaut pour commencer.
- `store_stock (store_id, product_id, quantity, reserved)` — alimenté depuis `products.stock`
  sur la boutique par défaut.
- `stock_movements` — le journal, branché en lecture seule pour l'instant.
- `orders.store_id`, `orders.staff_id` — nullables.
- `order_items` — alimenté en parallèle du snapshot `items jsonb`, qu'on **garde** (il fige le
  prix au moment de la vente et survit à la suppression d'un produit).

À ce stade, `products.stock` reste la vérité. `store_stock` est un double qui se remplit.

> ✅ **Appliqué** — migration `20260823_010_erp_step2_data_foundation.sql` · vérif `npm run db:verify:step2`

---

## Étape 3 — Rattachements & répartition

> **UI admin** : onglet **Boutiques** (`/admin/stores`) + colonne boutique dans **Équipe**.

- Créer les boutiques réelles. ✅
- Rattacher chaque membre du staff à une boutique (`StaffTab`). ✅
- Répartir le stock existant entre les boutiques — **inventaire physique de départ**. ✅ (modal « Répartir »)
- Vérifier que la somme par boutique retombe sur `products.stock`. ✅ (RPC `redistribute_product_stock`)

> Sans cette réconciliation terrain, l'étape 4 bascule sur des chiffres faux.

---

## Étape 4 — Bascule de la vérité du stock ✅ *appliquée 2026-08-23*

**Migration** : `20260823_012_erp_step4_store_stock_truth.sql` · vérif `npm run db:verify:step4`

**La contrainte qui structure tout** : dès que le trigger qui maintient
`products.stock = SUM(quantity - reserved)` est posé, **tout chemin qui écrit encore
directement dans `products.stock` entre en conflit avec lui.** Les trois chemins doivent donc
être convertis **dans le même déploiement**. Ça ne s'étale pas.

Contenu du déploiement coordonné :

1. Réécriture de `create_order_atomic` : choix de la boutique qui sert (ville de livraison
   d'abord, sinon plus grand disponible), **réservation** au lieu du décrément, `store_id`
   renseigné. ✅
2. POS → RPC : décrément atomique sur la boutique du vendeur, `store_id` + `staff_id`. ✅
3. Clôture troc → même RPC de décrément, sur la boutique du rachat. ✅
4. Trigger de maintien de `products.stock`. ✅
5. Table `stock_reservations` + job `pg_cron` d'expiration (extension déjà installée, v1.6.4). ✅

**Hooks mis à jour** : `usePosSystem`, `useInventoryManager` (`set_product_catalog_stock`),
`useOrdersManager` (`sync_order_stock_on_status` à l'annulation). Consommation stock au **paiement**
(`confirm_order_payment_and_consume_stock`) — webhook Campay + encaissement staff (`create-order-payment`).

**Paiement commande** : Campay à la livraison/retrait (pas au checkout). Migration `20260823_014`.

**TTL réservations** (`20260823_015`) : 48 h en `pending`. **Cycle physique** (`20260823_017`) :
TTL supprimé après validation ; `refused` / `returned` ; annulation interdite depuis `shipped` ;
alerte colis dehors ≥ 5 j ; perte auto à 30 j (`reason = loss`). Vue admin « Stock réservé » dans Boutiques.

**Ce qui change pour les utilisateurs** : rien de visible côté boutique publique — c'est tout
l'intérêt d'avoir gardé `products.stock` en miroir. Côté staff, la caisse devient rattachée à
une boutique (boutique du vendeur, sinon siège).

**Repli** : garder la version précédente des trois fonctions prête à redéployer, et le trigger
supprimable en une commande.

---

## Étape 5 — Le vendeur existe ✅ *appliquée 2026-08-23*

**Migration** : `20260823_018_erp_step5_vendor_sales.sql`

Le parcours P1 s'arrête aujourd'hui à « valider une vente » : la vente part en base et
n'appartient à personne.

- Caisse rattachée à la boutique du vendeur, pré-remplie. ✅
- `staff_id` renseigné à chaque vente. ✅ *(déjà RPC étape 4 ; UI boutique + mes ventes)*
- **UC-V-02** — « mes ventes du jour » : nombre, montant, détail, historique. ✅
- Remise à la vente (absente aujourd'hui). ✅
- Moyens de paiement manquants : **Carte**, et le **Troc** intégré au sélecteur du POS plutôt
  que par un chemin séparé. ✅

---

## Étape 6 — Pilotage & export ✅ *appliquée 2026-08-24*

**Migration** : `20260823_024_dashboard_analytics.sql` · RPC `get_dashboard_analytics`

`DashboardTab` refondu : KPIs CA encaissé, transactions, articles, panier moyen · filtres
jour / 7 j / mois / personnalisé × boutique × vendeur · classement vendeurs et boutiques ·
top produits · export CSV Excel · rapport de fin de journée (impression).

- KPIs complets : CA réel, nombre de transactions, volume d'articles, panier moyen. ✅
- Classement des vendeurs *(dépend de l'étape 5)*. ✅
- Performance par point de vente *(dépend de l'étape 4)*. ✅
- Top produits en CA et volume *(dépend d'`order_items`)*. ✅

> **CA encaissé** = vue `orders_reportable` : commandes payées ou livrées, hors
> annulées, retournées et essais caisse (`TEST-%`), sur la période filtrée
> (`orders.date`). Source unique pour dashboard, objectifs/primes et mes ventes
> (migration `20260824_026`). Toute vérification manuelle doit reprendre ces
> critères pour retomber sur le même chiffre.

> ⚠️ **Trou de couverture connu sur l'historique.** `order_items` ne couvre que
> **16 des 26 commandes** : 10 commandes antérieures ont `orders.items = NULL`, donc
> le backfill de l'étape 2 n'a rien pu en tirer. Elles représentent **2 905 000 FCFA**
> qui comptent dans le CA total mais seront **absentes du détail par produit et par
> catégorie**. Le total et la somme des détails ne se recouperont donc pas sur
> l'historique ancien — c'est attendu, pas un bug. `npm run db:verify:step2` affiche
> l'écart à chaque exécution. À afficher explicitement dans les rapports plutôt qu'à
> laisser deviner.
- Filtres : jour / semaine / mois / période libre × boutique × vendeur.
- **Export Excel** — zéro occurrence dans l'admin aujourd'hui.
- **Rapport de fin de journée automatique** — la promesse centrale du cadrage, « la
  suppression de la corvée du soir ».

---

## Étape 7 — Objectifs & primes ✅ *appliquée 2026-08-24*

**Migration** : `20260824_025_erp_step7_sales_targets.sql`

Tables `sales_targets` (vendeur ou boutique × journalier/mensuel) et `bonus_rules`
(seuils de prime). RPC `get_sales_targets_progress`, `upsert_sales_target`,
`upsert_bonus_rule` — garde staff, écriture réservée à la direction.

- **UC-V-03** — progression jour/mois dans « Mes ventes », alerte à l'atteinte. ✅
- **UC-D-04** — onglet « Objectifs & primes » : fixer quotas, primes, suivre l'équipe. ✅
- CA objectifs = vue `orders_reportable` (aligné dashboard, hors essais `TEST-%`). ✅

---

## Étape 8 — Mouvements de stock avancés ✅ *appliquée 2026-08-24*

**Migration** : `20260824_027_erp_step8_stock_operations.sql`

- **Annulation tracée** — `cancel_order_with_stock` (motif + auteur, réintégration via
  `sync_order_stock_on_status`, déjà en place étape 4/17). ✅
- **Transferts deux temps** — brouillon → expédition (`transfer_out`, stock en transit) →
  réception (`transfer_in`). Alerte transferts &gt; 5 jours. ✅
- **Inventaire physique** — session par boutique, écarts, ajustement `inventory_adjust`. ✅
- **Retour SAV** (après `delivered` + payé) — revendable → réintégration stock + mouvement
  `return` ; atelier → circuit SAV sans stock ; remboursement → `payment_status = refunded`
  (exclu du CA via `orders_reportable`). ✅
- **Journal** — `list_stock_movements` + onglet « Mouvements stock ». ✅

---

## Étape 9 — Mode hors connexion ✅

File d'attente locale des ventes POS (IndexedDB), synchronisation à la reconnexion, refus avec
alerte si le stock a été épuisé entre-temps (`stock_conflict` — reprise manuelle ou retrait de
la file).

- **File locale** — `utils/offlinePosQueue.ts` : ventes + snapshot catalogue pour rechargement
  offline. ✅
- **Sync** — `services/offlinePosSync.ts` + `hooks/admin/useOfflinePos.ts` : rejeu FIFO via
  `complete_pos_sale_atomic` au retour réseau. ✅
- **Caisse** — branche offline dans `usePosSystem.submitSale`, bandeau + file dans `PosTab`. ✅
- **PWA minimal** — `public/sw-admin.js` (cache shell), `manifest.json` `start_url: /admin`. ✅

Conflit stock : la vente reste en file avec statut `stock_conflict` ; le staff est notifié et
peut réessayer ou retirer l'entrée (pas d'acceptation automatique hors stock).

---

## Étape 10 — Durcissement

- **Isolation par rôle en base.** Le gating existe côté interface (`utils/adminAccess.ts`,
  `TAB_MIN_ROLE`) et il est propre. Mais en base, un compte `vendeur` a exactement les mêmes
  droits SQL qu'une `direction` : les policies sont `TO authenticated USING (true)`.
  L'exigence « isolation des données selon le rôle » du cadrage n'est satisfaite qu'en façade.
- **Journal d'audit transverse** (UC-A-05). Aujourd'hui seul le Troc trace
  (`validated_at`, `completed_at`, `redemption_reason`).
- **Nettoyage des policies** : `orders` en porte sept, dont quatre INSERT quasi identiques ;
  `products` traîne une policy nommée `TEMP:`.
- **Suppression de `staff.password`** (`DEFAULT '123456'`, sans usage depuis le passage à
  Supabase Auth).

---

## Deux points de vigilance

**L'étape 3 n'est pas du développement.** Répartir le stock réel entre les boutiques demande un
inventaire physique. C'est probablement le poste le plus long du projet et il ne se code pas.

**L'étape 4 est le seul moment vraiment risqué.** Tout le reste est soit additif, soit
incrémental. Elle mérite une fenêtre calme, un repli préparé, et une vérification des totaux
avant et après.
