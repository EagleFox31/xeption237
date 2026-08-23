# ÉCART — ERP EXISTANT vs CADRAGE SUIVI DES VENTES

> **Date** : 22 août 2026
> **Référence cadrage** : `CADRAGE_SUIVI_VENTES_XEPTION.md` (`XEP-SALES-2026-0820`, validé)
> **Méthode** : lecture du code (`components/admin/`, `hooks/admin/`) et introspection du
> schéma de production. Chaque verdict est adossé à un fichier ou à une colonne réelle.

---

## Résumé

Sur les **16 exigences** du périmètre V1 (§5 du cadrage) :

| Verdict | Nombre |
|---|---|
| ✅ Déjà présent | 4 |
| 🟡 Partiel | 5 |
| ❌ Absent | 7 |

**Le vrai sujet n'est pas le nombre.** Trois absences du modèle de données —
`staff_id`, `store_id`, `order_items` — bloquent à elles seules la majorité du bloc
« Pilotage & Dashboard », quel que soit le travail d'interface. Elles sont le chemin critique.

---

## §5.1 — Socle & Référentiel Commercial

| Exigence | Verdict | Existant / manque |
|---|---|---|
| Authentification sécurisée | ✅ | `components/StaffLogin.tsx` (`signInWithPassword`), `useCurrentStaffSession`, table `staff`, rôles `constants/staffRoles` (direction / super_admin / responsable / editor), `StaffTab` |
| Isolation des données selon le rôle | 🟡 | Le rôle existe et pilote l'**interface**. Mais côté base, les policies sont `TO authenticated USING (true)` : **aucune isolation réelle par rôle**. Un compte `editor` a les mêmes droits SQL qu'un `super_admin`. |
| Référentiel **points de vente** | ❌ | Aucune table boutique, aucune colonne `store_id` nulle part dans le schéma. |
| Référentiel catalogue (produits, catégories, marques, prix) | ✅ | Le plus abouti de l'ERP : `CategoriesTab`, `BrandsTab`, `CatalogStructureTab`, `InventoryTab`, `product_ranges`, plus un funnel d'import produits. |

---

## §5.2 — Saisie & Enregistrement des Ventes

| Exigence | Verdict | Existant / manque |
|---|---|---|
| Ventes multi-articles | ✅ | `usePosSystem` : panier avec quantités, `submitSale` |
| Modes de règlement | 🟡 | `CASH \| OM \| MOMO`. Le cadrage demande aussi **Carte** (absente) et **Troc** — le troc existe mais par un chemin séparé (`trocCheckoutService.completeTrocWithSale`), pas comme moyen de paiement du POS. |
| Remises accordées | ❌ | Aucune notion de remise à la vente. Le seul `discount` du code est un calcul d'affichage sur les Packs. |
| Historique & annulation encadrée, sans suppression sèche | ✅ | `OrdersTab` + `useOrdersManager` : **aucun `.delete()`**, l'annulation passe par `updateStatus(order.id, 'cancelled')`. Conforme à l'exigence. |

---

## §5.3 — Pilotage Commercial & Dashboard Direction

C'est le bloc le plus éloigné du cadrage.

`DashboardTab.tsx` fait **79 lignes** et affiche quatre cartes : *Revenu livré*, *Commandes en
attente*, *Équipe active*, *Clients enregistrés* — plus une liste d'alertes rupture et les
5 dernières ventes.

| Exigence | Verdict | Existant / manque |
|---|---|---|
| CA total | 🟡 | Calculé, mais **uniquement sur les commandes `delivered`** — donc sous-évalue le CA réel (une vente POS encaissée mais non passée en `delivered` n'est pas comptée). |
| Nombre de transactions | ❌ | Seules les commandes *en attente* sont comptées. |
| Volume d'articles vendus | ❌ | — |
| Panier moyen | ❌ | — |
| Performance par point de vente | ❌ | **Impossible** : pas de `store_id`. |
| Classement des vendeurs | ❌ | **Impossible** : pas de `staff_id` sur `orders`. |
| Top produits (CA et volume) | ❌ | Les lignes de vente sont dans `orders.items` en **jsonb**. Techniquement interrogeable, mais sans FK ni index — coûteux et fragile à mesure que le volume monte. |
| Filtres jour / semaine / mois / période / vendeur / boutique | ❌ | Aucun filtre temporel ni par vendeur sur le dashboard. |
| Export Excel | ❌ | **Zéro occurrence** de `xlsx`, `exceljs` ou export CSV dans tout l'admin. |

---

## §5.4 — Modules Avancés & Options Incluses

| Exigence | Verdict | Existant / manque |
|---|---|---|
| Objectifs & primes, taux d'atteinte | ❌ | **Totalement absent** — aucune trace de `objectif`, `quota`, `prime` ou `target` dans le code ou le schéma. |
| Stock : entrées | 🟡 | `useInventoryManager.addStockToExisting(id, qty)` + création produit + fusion de doublons. |
| Stock : sorties / ventes | 🟡 | Le décrément à la vente existe (`usePosSystem`, `completeTrocWithSale`) mais **aucun journal de mouvements** : on connaît le stock courant, jamais son historique. |
| Stock : transferts inter-boutiques | ❌ | **Impossible** : pas de boutiques. |
| Stock : inventaires | ❌ | Aucun flux de comptage / écart. |
| Retours & remboursements | 🟡 | `orders.status` accepte `cancelled`, `payment_status` accepte `refunded`, et `SavTab` traite le SAV. Mais aucun flux « retour → réintégration au stock ». |
| PWA & offline first | ❌ | `public/manifest.json` existe, mais **aucun service worker**, aucun `vite-plugin-pwa`. La saisie hors connexion est à construire entièrement. |
| Notifications web/PWA (stock faible, objectifs) | ❌ | `useAdminNotifications` fait 55 lignes et ne contient aucune logique de seuil. L'alerte rupture existe en **affichage** dans le dashboard, pas en notification. |

---

## §4 — Parcours vendeur cible (< 30 s)

| Étape du cadrage | Verdict |
|---|---|
| Connexion mobile/desktop | ✅ |
| Sélection du point de vente | ❌ |
| Sélection produits + quantités | ✅ |
| Remise éventuelle | ❌ |
| Moyen de paiement | 🟡 (Carte et Troc manquants) |
| Horodatage | ✅ (`orders.date`) |
| **Attribution au vendeur connecté** | ❌ |
| Rapport du soir automatique | ❌ |

---

## Ce que l'ERP a déjà, et que le cadrage ne demande pas

À ne pas perdre de vue dans l'arbitrage : l'admin compte **18 onglets** et couvre bien
au-delà du périmètre devisé.

Smart Troc complet (évaluation, bons, rachat comptoir, encaissement POS) · SAV ·
Livraison sur 19 villes · Factures · Argus (`trade_in_models`) · Packs ·
Funnel d'import produits · Traitement d'images en masse · Clients · Studio créateur.

Le cadrage décrit donc **un sous-ensemble d'un ERP existant plus large**, pas un système neuf.

---

## Chemin critique — trois évolutions de schéma

Aucune quantité de travail d'interface ne débloquera le §5.3 sans ces trois-là :

1. **`orders.staff_id`** → sans ça, pas de classement des vendeurs, pas de primes, pas de
   « total du jour » par vendeur. C'est le cœur du besoin exprimé et il n'existe pas.
2. **`orders.store_id`** + référentiel boutiques → sans ça, pas de performance par point de
   vente ni de transferts inter-boutiques.
3. **`order_items`** (en plus du snapshot `items jsonb`, pas à la place) → sans ça, le top
   produits reste une requête jsonb sans index. Le snapshot garde sa valeur : il fige le prix
   au moment de la vente et survit à la suppression d'un produit.

---

## Lecture ligne à ligne du devis

| Ligne du devis | Montant | État réel |
|---|---|---|
| Socle Ventes, Auth & Référentiel | 40 000 | **Largement existant.** Reste : référentiel boutiques + attribution vendeur. |
| Dashboard, KPIs & Export Excel | 20 000 | **Quasiment tout à faire** — 1 KPI et demi existe, l'export n'existe pas. |
| Objectifs, Primes & Règles Métier | 10 000 | **Entièrement à faire.** |
| Stock Complet & Retours/Remboursements | 25 000 | **Moitié-moitié** — la vue et les entrées existent, le journal de mouvements, les transferts et les inventaires non. |
| Notifications & Mode Hors-Connexion | 15 000 | **Entièrement à faire.** |
| Tests, Recette & Déploiement | 10 000 | — |

La ligne la plus recouverte par l'existant est la première. Les trois lignes suivantes
correspondent à du travail réellement neuf.

---

## Recommandation d'ordre

1. **Les trois colonnes du chemin critique** (`staff_id`, `store_id`, `order_items`) —
   à ajouter au schéma Supabase existant, en migration additive tracée.
   Tout le §5.3 en dépend.
2. **Attribution vendeur au POS** — brancher `useCurrentStaffSession` sur `submitSale`.
   Petit changement, débloque le classement et les primes.
3. **Dashboard** — KPIs complets + filtres période + export.
4. **Objectifs & primes** — s'appuie sur 1 et 2.
5. **Stock : journal de mouvements**, puis transferts et inventaires.
6. **PWA offline** — le plus lourd, et le moins bloquant pour les autres.

> ⚠️ Prérequis technique indépendant de ce périmètre : `products` est actuellement **sans
> RLS** avec droits d'écriture ouverts au rôle `anon`, et le POS décrémente le stock en
> lire-puis-écrire côté client (survente possible sur ventes simultanées). Voir
> `docs/engineering/AUDIT_BD_SECURITE_2026-08-21.md` et
> `docs/engineering/PLAN_CORRECTIONS_INTEGRITE_BD.md`. Ajouter des vendeurs simultanés sur
> plusieurs points de vente rend ces deux défauts nettement plus probables.
