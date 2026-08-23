# CAS D'USAGE & PARCOURS UTILISATEURS — ERP SUIVI DES VENTES

> **Date** : 22 août 2026
> **Référence** : `CADRAGE_SUIVI_VENTES_XEPTION.md` (validé) · `ECART_ERP_VS_CADRAGE.md`
> **Base** : matrice d'accès réelle (`utils/adminAccess.ts`), rôles réels
> (`constants/staffRoles.ts`), schéma de production introspecté.

**Légende d'état** — ✅ existant · 🟡 partiel · 🆕 à construire

---

## 1. Profils

Le cadrage définit 3 profils. Le code en a **4**, et ce découpage est **meilleur** pour le
multi-boutique : il sépare le responsable d'une boutique de la direction qui voit tout.

| Cadrage | Rôle applicatif | Portée | Niveau |
|---|---|---|---|
| Vendeur / Commercial | `vendeur` — *Vendeur & catalogue* | Ses ventes, sa boutique | 1 |
| Responsable | `responsable` — *Responsable boutique* | Sa boutique, tous les vendeurs | 2 |
| Direction | `direction` — *Direction* | Toutes les boutiques | 3 |
| Administrateur | `super_admin` — *Super admin (Studio)* | Tout + configuration | 4 |

Hiérarchie **cumulative** : chaque niveau hérite des droits inférieurs.
`DEFAULT_STAFF_ROLE = 'vendeur'` — un compte sans rôle explicite est vendeur.

### Matrice d'accès réelle (`TAB_MIN_ROLE`)

| Onglet | vendeur | responsable | direction | super_admin |
|---|:---:|:---:|:---:|:---:|
| dashboard, pos, orders, inventory, productImages, clients | ✅ | ✅ | ✅ | ✅ |
| packs, delivery, troc, sav | — | ✅ | ✅ | ✅ |
| catalogStructure, staff | — | — | ✅ | ✅ |

**Page d'atterrissage** (`resolveAdminLandingTabForRole`) : le vendeur arrive directement sur
la **caisse**. Le responsable et la direction arrivent sur *Commandes* s'il y a des commandes
en attente, sinon sur le *Dashboard*.

> ⚠️ Ce gating est **côté interface uniquement**. En base, les policies sont
> `TO authenticated USING (true)` : un compte `vendeur` a les mêmes droits SQL qu'un
> `direction`. L'exigence « isolation des données selon le rôle » du cadrage n'est donc
> pas satisfaite au niveau où elle compte.

---

## 2. Cas d'usage — Profil VENDEUR

### UC-V-01 — Enregistrer une vente ⭐ *cas central*

| | |
|---|---|
| **Acteur** | Vendeur |
| **Préconditions** | Session staff active ; ligne dans `staff` ; boutique rattachée |
| **Déclencheur** | Un client achète en boutique |
| **Postcondition** | Commande créée, stock décrémenté, vente attribuée au vendeur et à la boutique |
| **État** | 🟡 le panier existe, l'attribution et la boutique non |

**Flux nominal**
1. Le vendeur ouvre la caisse (page d'atterrissage par défaut). ✅
2. Le point de vente est **pré-rempli** depuis son rattachement. 🆕
3. Il ajoute des produits, ajuste les quantités. ✅ (`usePosSystem`, panier)
4. Il applique une remise si besoin. 🆕
5. Il choisit le règlement : Cash / OM / MoMo ✅ · Carte 🆕 · Troc 🟡 *(existe par un chemin séparé)*
6. Il valide. Le système enregistre la commande **horodatée**, **attribuée à lui** et **à sa boutique**, et décrémente le stock. 🟡

**Alternatives & erreurs**
- **A1 — Stock insuffisant** : refus à la validation, rien n'est écrit. 🆕
  *Aujourd'hui le décrément se calcule en JavaScript (`Math.max(0, stock - qty)`) : deux ventes
  simultanées du dernier exemplaire passent toutes les deux. Avec plusieurs vendeurs, la
  survente devient probable — c'est la dépendance validée.*
- **A2 — Paiement Troc** : le bon de reprise s'impute en déduction ; le reste à payer suit un
  autre règlement. 🟡
- **A3 — Hors connexion** : la vente est mise en file locale et rejouée à la reconnexion. 🆕
- **A4 — Erreur de saisie après validation** : pas de suppression — voir UC-R-02.

---

### UC-V-02 — Consulter mes ventes du jour

**Acteur** Vendeur · **Déclencheur** À tout moment de la journée · **État** 🆕

1. Le vendeur ouvre son espace. 
2. Il voit **ses** ventes du jour : nombre, montant total, détail ligne à ligne.
3. Il peut remonter sur les jours précédents.

> Impossible aujourd'hui : `orders` n'a pas de `staff_id`, donc rien ne relie une vente à son
> auteur. C'est le blocage racine de tout ce profil.

---

### UC-V-03 — Suivre mon objectif

**Acteur** Vendeur · **État** 🆕 *(intégralement)*

1. Le vendeur voit son quota du jour et du mois.
2. Il voit son taux d'atteinte et l'écart restant.
3. Une alerte le prévient quand l'objectif est atteint.

> Dépend de UC-V-02 (donc de `staff_id`) et d'un référentiel d'objectifs qui n'existe pas.

---

### UC-V-04 à UC-V-07 — Actes courants

| Réf | Cas d'usage | État | Support |
|---|---|:---:|---|
| UC-V-04 | Rechercher un produit, voir prix et stock | ✅ | `InventoryTab` (filtres tous / en stock / faible / rupture) |
| UC-V-05 | Consulter les commandes en cours | ✅ | `OrdersTab` |
| UC-V-06 | Consulter la fiche d'un client | ✅ | `ClientsTab` |
| UC-V-07 | Réceptionner du stock (ajouter une quantité) | ✅ | `useInventoryManager.addStockToExisting` |

---

## 3. Cas d'usage — Profil RESPONSABLE BOUTIQUE

Hérite de tous les cas Vendeur, mais **sur le périmètre de sa boutique**.

### UC-R-01 — Piloter l'activité de ma boutique

**Acteur** Responsable · **Déclencheur** Plusieurs fois par jour · **État** 🟡

1. Il ouvre le Dashboard.
2. Il voit, **pour sa boutique** : CA du jour, nombre de transactions, panier moyen, volume d'articles.
3. Il voit le **classement de ses vendeurs**.
4. Il voit les **top produits** en CA et en volume.
5. Il filtre par jour, semaine, mois ou période libre.

> Existant : CA (mais **uniquement sur les commandes `delivered`**, donc sous-évalué), commandes
> en attente, alertes rupture, 5 dernières ventes. Tout le reste est à construire, et les
> points 2-3 supposent `store_id` et `staff_id`.

---

### UC-R-02 — Annuler ou corriger une vente

**Acteur** Responsable · **Préconditions** La vente existe · **État** 🟡

**Flux nominal**
1. Il retrouve la vente dans `OrdersTab`. ✅
2. Il passe la commande en `cancelled` — **jamais de suppression**. ✅ *(vérifié : aucun `.delete()` dans `useOrdersManager`)*
3. Le stock est **réintégré**. 🆕
4. Le motif est consigné et l'auteur de l'annulation tracé. 🆕

**Alternative — A1 : correction sans annulation** (erreur de quantité ou de prix) : aucun flux
n'existe. À définir — soit annulation + ressaisie, soit avoir explicite.

---

### UC-R-03 — Traiter un retour / remboursement

**Acteur** Responsable · **État** 🟡

1. Le client se présente avec un article.
2. Le responsable enregistre le retour, avec motif.
3. L'article rejoint le stock si revendable, sinon le circuit SAV. 🆕
4. Le remboursement est enregistré (`payment_status = 'refunded'` existe ✅).
5. Le CA de la période est ajusté. 🆕

> `SavTab` traite le service après-vente, mais aucun flux « retour → réintégration stock ».

---

### UC-R-04 — Valider un rachat Troc au comptoir

**Acteur** Responsable · **État** ✅ *(complet, hors périmètre du cadrage)*

Vérification du bon → contrôle de l'échéance (barème 7/10/14 j, grâce de 7 j) →
ré-évaluation si périmé → clôture, avec ou sans vente de l'appareil cible.

---

### UC-R-05 à UC-R-07 — Gestion boutique

| Réf | Cas d'usage | État | Support |
|---|---|:---:|---|
| UC-R-05 | Gérer packs et promotions | ✅ | `PacksTab` |
| UC-R-06 | Suivre les livraisons | ✅ | `DeliveryTab` (19 villes) |
| UC-R-07 | Suivre les tickets SAV | ✅ | `SavTab` |

---

### UC-R-08 — Inventaire physique

**Acteur** Responsable · **État** 🆕 *(intégralement)*

1. Il lance une session d'inventaire sur sa boutique.
2. Il saisit les quantités comptées.
3. Le système affiche les **écarts** entre théorique et compté.
4. Il valide : le stock est ajusté et l'écart consigné avec son motif.

---

### UC-R-09 — Transfert inter-boutiques

**Acteur** Responsable (émetteur et destinataire) · **État** 🆕 *(impossible aujourd'hui)*

1. Il crée un transfert vers une autre boutique.
2. Le stock est décrémenté à l'émission, en transit.
3. Le responsable destinataire confirme la réception.
4. Le stock est incrémenté chez lui.

> Suppose le référentiel boutiques **et** un stock par boutique — aujourd'hui `products.stock`
> est une valeur unique globale.

---

## 4. Cas d'usage — Profil DIRECTION

Hérite de tout, sur **l'ensemble des boutiques**.

### UC-D-01 — Vue consolidée multi-boutiques

**Acteur** Direction · **État** 🆕

1. CA consolidé, toutes boutiques.
2. **Comparaison entre points de vente**.
3. Classement des vendeurs, tous points de vente confondus.
4. Filtres croisés : période × boutique × vendeur × catégorie.

---

### UC-D-02 — Exporter les données

**Acteur** Direction · **État** 🆕 *(zéro occurrence de `xlsx` ou d'export CSV dans l'admin)*

1. Il choisit une période et des filtres.
2. Il exporte en Excel.
3. Le fichier contient les ventes détaillées et les récapitulatifs.

---

### UC-D-03 — Rapport de fin de journée automatique

**Acteur** Direction (destinataire) · **Déclencheur** Fermeture · **État** 🆕

À la clôture, le système produit sans aucune saisie : CA du jour par boutique, nombre de
transactions, panier moyen, top produits, performance par vendeur, alertes rupture.

> C'est **la promesse centrale du cadrage** — « la suppression de la corvée du soir ». Elle
> dépend de tout le reste.

---

### UC-D-04 — Définir objectifs et primes

**Acteur** Direction · **État** 🆕

Fixer des quotas par vendeur ou par boutique, journaliers et mensuels ; paramétrer les seuils
de prime ; suivre les taux d'atteinte.

---

### UC-D-05 / UC-D-06 — Référentiels

| Réf | Cas d'usage | État | Support |
|---|---|:---:|---|
| UC-D-05 | Structurer le catalogue (catégories, marques, gammes) | ✅ | `CatalogStructureTab`, `BrandsTab`, `CategoriesTab` |
| UC-D-06 | Gérer l'équipe (comptes, rôles) | 🟡 | `StaffTab` ✅ · **rattachement à une boutique** 🆕 |

---

## 5. Cas d'usage — Profil SUPER ADMIN

| Réf | Cas d'usage | État | Note |
|---|---|:---:|---|
| UC-A-01 | Gérer comptes, rôles et rattachements | 🟡 | Rattachement boutique à créer |
| UC-A-02 | Paramétrer règles de primes et objectifs | 🆕 | |
| UC-A-03 | Accéder au Studio créateur | ✅ | `/studio` |
| UC-A-04 | Importer le catalogue en masse | ✅ | `ProductImportFunnelTab` |
| UC-A-05 | **Auditer et tracer toutes les opérations** | 🆕 | Exigence explicite du cadrage §3. Aucun journal d'audit transverse aujourd'hui — seul le Troc trace (`validated_at`, `completed_at`, `redemption_reason`). |

---

## 6. Parcours utilisateurs

### P1 — La journée d'un vendeur

**Matin** · Il se connecte sur son téléphone → arrive **directement sur la caisse** ✅ → sa
boutique est pré-remplie 🆕 → il consulte son objectif du jour 🆕.

**Journée** · Pour chaque client : recherche produit ✅ → panier ✅ → remise 🆕 → règlement ✅ →
validation en moins de 30 s, attribuée à lui 🆕. Entre deux clients, il suit son total du jour
et son avancement 🆕. En cas de coupure réseau, il continue à saisir et tout se synchronise au
retour 🆕.

**Soir** · Il voit son récapitulatif personnel 🆕. Il ne ressaisit rien, il n'envoie rien.

> Aujourd'hui ce parcours s'arrête à l'étape « valider une vente » — et cette vente
> n'appartient à personne.

---

### P2 — La journée d'un responsable de boutique

**Matin** · Connexion → atterrissage sur *Commandes* s'il y en a en attente ✅ → revue des
alertes rupture ✅ → réception de stock ✅.

**Journée** · Suivi du CA en temps réel 🟡 → arbitrages : annulation ✅ *(stock non réintégré
🆕)*, retour 🟡, rachat Troc au comptoir ✅ → suivi des livraisons ✅ et du SAV ✅.

**Soir** · Contrôle de caisse : total encaissé par moyen de paiement 🆕, ventes par vendeur 🆕,
écarts éventuels 🆕.

---

### P3 — La semaine de la direction

Consolidation multi-boutiques 🆕 → comparaison des points de vente 🆕 → classement des vendeurs
et calcul des primes 🆕 → analyse des top produits 🆕 → export Excel pour la réunion 🆕 →
ajustement des objectifs du mois suivant 🆕.

> Ce parcours est aujourd'hui **entièrement manuel** : c'est précisément la corvée décrite au
> §1 du cadrage.

---

### P4 — Ouverture d'un nouveau point de vente *(parcours administrateur)*

Créer la boutique 🆕 → y rattacher des vendeurs 🆕 → doter le stock initial par transfert 🆕 →
fixer les objectifs 🆕 → la boutique apparaît dans les filtres et comparatifs 🆕.

> Aucune étape n'est possible aujourd'hui. C'est le parcours qui révèle le mieux l'absence de
> la dimension « point de vente » dans le modèle.

---

### P5 — Vente avec reprise Troc *(parcours transverse)*

Le client arrive avec son bon ✅ → le vendeur choisit l'appareil ✅ → le bon s'impute, le reste
à payer s'affiche ✅ → règlement du reste ✅ → clôture du dossier et création de la commande ✅.

> Le seul parcours **complet de bout en bout** aujourd'hui. Il manque juste l'attribution au
> vendeur 🆕 — et son écriture n'est pas atomique *(cf. `PLAN_CORRECTIONS_INTEGRITE_BD.md`,
> point 2)*.

---

## 7. Règles transverses

| Règle | Portée | État |
|---|---|:---:|
| Jamais de suppression sèche d'une vente | tous | ✅ |
| Toute vente est horodatée | tous | ✅ |
| Toute vente est attribuée à un vendeur et à une boutique | tous | 🆕 |
| Le stock ne peut jamais passer sous zéro par concurrence | tous | 🆕 ⚠️ |
| Une annulation réintègre le stock | responsable+ | 🆕 |
| Un vendeur ne voit que ses ventes ; un responsable, sa boutique | isolation | 🆕 |
| Toute opération sensible est tracée (qui, quand, quoi) | audit | 🆕 |

---

## 8. Ce que ces parcours exigent du modèle de données

Les 🆕 ci-dessus se ramènent à un petit nombre de manques structurels :

| Manque | Bloque |
|---|---|
| `orders.staff_id` | UC-V-02, UC-V-03, UC-R-01, UC-D-01, UC-D-03, UC-D-04, P1, P2, P3 |
| Référentiel boutiques + `orders.store_id` + stock par boutique | UC-R-01, UC-R-09, UC-D-01, P4 |
| `order_items` | UC-R-01, UC-D-01, UC-D-02 (top produits) |
| Journal de mouvements de stock | UC-R-02, UC-R-03, UC-R-08, UC-R-09 |
| Référentiel objectifs | UC-V-03, UC-D-04 |
| Journal d'audit | UC-A-05, règles transverses |
| Décrément atomique du stock | UC-V-01 A1 — **et la dépendance validée** |
| Isolation par rôle en base (RLS) | règle d'isolation, UC-V-02 |

**Deux d'entre eux — `staff_id` et le référentiel boutiques — conditionnent à eux seuls
la moitié des cas d'usage.** Tant qu'ils n'existent pas, construire les écrans revient à
peindre des façades devant un terrain vide.

---

## 9. Ordre proposé

1. **Socle données** : `staff_id`, boutiques + `store_id`, `order_items`. *(débloque tout)*
2. **Décrément atomique du stock** — dépendance validée, aggravée par le multi-vendeur.
3. **Attribution au POS** : brancher `useCurrentStaffSession` sur `submitSale`.
4. **UC-V-02** (mes ventes) puis **UC-R-01** (dashboard boutique).
5. **Export** (UC-D-02) et **rapport du soir** (UC-D-03).
6. **Objectifs et primes** (UC-V-03, UC-D-04).
7. **Mouvements de stock** : annulation, retour, inventaire, transferts.
8. **PWA offline** (UC-V-01 A3) — le plus lourd, le moins bloquant.
9. **Isolation RLS par rôle** et **journal d'audit**.
