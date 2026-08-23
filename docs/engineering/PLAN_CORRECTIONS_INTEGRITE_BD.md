# PLAN DE CORRECTION — INTÉGRITÉ BASE DE DONNÉES

> **Statut** : plan validé, point 1 en cours d'implémentation.
> **Date** : 21 août 2026
> **Contexte** : audit déclenché avant l'arrivée d'une intervenante externe sur la base
> (cf. `docs/next-step/CADRAGE_SUIVI_VENTES_XEPTION.md`).

---

## 0. Résumé

La base **est déjà ACID** — c'est du Postgres. Le problème n'est pas le moteur, ce sont
deux choses :

1. Le chemin de l'argent n'utilise **pas de transaction** : des séquences d'écritures
   orchestrées depuis le navigateur, où chaque appel est commité avant le suivant.
2. Le process de migration ne tient **aucun suivi**, ce qui devient dangereux dès qu'une
   deuxième personne écrit du SQL en production.

Cinq corrections, par ordre d'urgence. Les points 1 à 3 sont des **correctifs**
(des bugs présents aujourd'hui), pas des améliorations.

| # | Correction | Nature | Charge |
|---|-----------|--------|--------|
| 1 | Suivi des migrations (`schema_migrations`) | Process — bloquant | ~2 h |
| 2 | Clôture troc avec vente → RPC atomique | Bug — perte d'argent | ~0,5 j |
| 3 | Décrément de stock conditionnel | Bug — survente | ~0,5 j |
| 4 | Contraintes CHECK + RLS systématiques | Prévention | ~2 h |
| 5 | `order_items` + `staff_id` + `store_id` | Structure | ~1 j |

---

## ⚠️ Périmètre — tous les trocs ne finissent PAS par une vente

Point de cadrage explicite, pour ne pas se tromper de correction.

Chemins de sortie d'un dossier `trade_in_requests` :

| Chemin | Transition | Écritures | Atomicité |
|--------|-----------|-----------|-----------|
| Bon adossé à un **appareil cible** | `validated → completed` | `orders` + `products.stock` + `trade_in_requests` | ❌ **multi-tables, à corriger** |
| Bon **générique** (vente POS séparée) | `validated → completed` | `trade_in_requests` seul | ✅ mono-table |
| Refus | `pending`/`accepted → refused` | `trade_in_requests` seul | ✅ mono-table |
| Annulation | `* → cancelled` | `trade_in_requests` seul | ✅ mono-table |
| Bon expiré / jamais présenté | aucune | aucune | ✅ |

**Seul le premier chemin est concerné par le point 2.** La RPC ne doit rien présumer :
`transitionStatus` reste l'entrée gardée pour toutes les clôtures sans vente, et ne doit
pas être rebranchée sur la RPC.

---

## 1. Suivi des migrations — `schema_migrations`

### Le problème
`scripts/apply-migration.mjs` exécute un fichier SQL et **n'enregistre rien**. Des
migrations sont aussi passées à la main dans l'éditeur SQL Supabase. Conséquences :

- `supabase/migrations/` ne décrit pas l'état réel de la prod (documenté dans `AGENTS.md`).
- La seule défense est l'idempotence de chaque fichier — discipline humaine, pas garantie.
- Le script a un `DEFAULT_MIGRATION` codé en dur : lancé **sans argument**, il ré-applique
  une vieille migration de juin.

Ça tient tant qu'une seule personne écrit du SQL. Une deuxième arrive.

### La correction
- Table `public.schema_migrations` : `version` (nom du fichier, PK), `name`, `checksum`
  (SHA-256 du contenu), `applied_at`, `applied_by`.
- `apply-migration.mjs` :
  - crée la table si absente (auto-amorçage) ;
  - **saute** une migration déjà enregistrée avec le même checksum ;
  - **alerte et refuse** si le checksum diffère (fichier édité après application) — `--force` pour outrepasser ;
  - enregistre après application réussie ;
  - `--baseline` : marque les fichiers existants comme appliqués **sans les exécuter** (état actuel) ;
  - `--status` : liste appliqué / en attente.

### Limite assumée
L'enregistrement se fait **après** l'exécution, pas dans la même transaction — le fichier
de migration porte son propre `BEGIN/COMMIT` (convention `AGENTS.md`) et l'imbriquer
casserait son atomicité. Si l'enregistrement échoue, la migration est appliquée mais non
tracée : le script le signale bruyamment et un simple re-run répare (les deux opérations
sont idempotentes).

### Fichiers
`supabase/migrations/20260821_001_schema_migrations.sql` (nouveau) · `scripts/apply-migration.mjs` · `package.json` (scripts `db:status`, `db:baseline`)

---

## 2. Clôture troc avec vente → RPC atomique

### Le problème
[`services/trocCheckoutService.ts`](../../services/trocCheckoutService.ts) enchaîne trois
écritures indépendantes, sans transaction :

```
:87   INSERT  orders
:92   UPDATE  products SET stock = …
:98   UPDATE  trade_in_requests (completed + credit_applied + completed_order_id)
```

Deux modes de casse réels :

- L'`UPDATE` stock échoue → commande enregistrée, stock jamais décrémenté (stock fantôme).
- L'`UPDATE` dossier échoue → **le bon reste ouvert alors que la vente est faite** : le
  client peut représenter le même crédit. Perte de cash directe.

### La correction
Fonction SQL `complete_troc_with_sale_atomic(...)` en `SECURITY DEFINER`, sur le modèle de
`create_order_atomic` qui existe déjà et fait ça correctement pour le checkout public.
Elle fait, dans **une** transaction : insert commande → décrément conditionnel du stock
(cf. point 3) → mise à jour du dossier. Toute erreur annule l'ensemble.

`trocCheckoutService.completeTrocWithSale` devient un simple appel `supabase.rpc(...)`.

### Garde-fous à porter dans la fonction
- Vérifier que le dossier est bien en `validated` (sinon rejet) — pas de double clôture.
- Vérifier que `completed_order_id` est nul (idempotence).
- Le crédit est un **plafond** : `total = max(0, prix − crédit)`, jamais de cash rendu.

### Tests
`tests/unit/trocCheckout.test.ts` (3 tests existants à conserver) + cas : dossier déjà
`completed` → rejet ; stock insuffisant → rollback complet, aucune commande créée.

### Fichiers
`supabase/migrations/2026xxxx_complete_troc_with_sale_atomic.sql` · `services/trocCheckoutService.ts` · `tests/unit/trocCheckout.test.ts`

---

## 3. Décrément de stock conditionnel

### Le problème
Le stock est calculé en JavaScript, puis écrit — sur les deux chemins :

```js
// services/trocCheckoutService.ts:93
.update({ stock: Math.max(0, stock - 1) })

// hooks/admin/usePosSystem.ts:66
const newStock = Math.max(0, product.stock - item.quantity);
```

Lire-puis-écrire côté client : deux ventes simultanées du dernier exemplaire lisent toutes
les deux `stock = 1`, écrivent toutes les deux `0`, réussissent toutes les deux. Survente.

Le `Math.max(0, …)` **aggrave** le défaut : il transforme une erreur détectable (stock
négatif, visible) en corruption silencieuse.

### La correction
Décrément atomique en SQL, sans verrou explicite :

```sql
UPDATE products SET stock = stock - p_qty
WHERE id = p_product_id AND stock >= p_qty
RETURNING stock;
```

Zéro ligne retournée = stock insuffisant → `RAISE EXCEPTION` → rollback de la transaction
englobante. À utiliser depuis les RPC (point 2 et `create_order_atomic`), et à retirer du
code client.

### Fichiers
`services/trocCheckoutService.ts` · `hooks/admin/usePosSystem.ts` · les fonctions SQL concernées

---

## 4. Contraintes CHECK + RLS systématiques

### Le problème
La discipline est inégale. `trade_in_requests` porte une quinzaine de contraintes CHECK
(`imei_status`, `imei_blacklist_status`, `status`, `tier`, `trade_in_grade`…).
`orders` n'en a que deux (`status`, `payment_status`) — et **aucune** sur `total`.

Une contrainte, c'est un bug que la base refuse à ta place, définitivement.

### La correction
- Toute colonne d'argent : `CHECK (colonne >= 0)`.
- Toute colonne texte à valeurs fermées : `CHECK (colonne = ANY (ARRAY[...]))`.
- Toute nouvelle table : `ENABLE ROW LEVEL SECURITY` **dans la migration qui la crée**,
  jamais après. En Supabase le navigateur parle à la base : sans RLS, l'ACID ne protège rien.
- Rappel du piège maison : `products.id` est **`text`**, d'autres tables utilisent `uuid`.
  Une FK dont le type ne correspond pas est rejetée à l'exécution, pas à l'écriture.
  Introspecter avant, toujours.

---

## 5. `order_items` + `staff_id` + `store_id`

### Le problème
`orders` a 16 colonnes et stocke les lignes de vente en `items jsonb`. Il n'y a **aucune**
attribution vendeur (`staff_id`, `sold_by`, `created_by` : absents) ni notion de boutique
(`store_id` : absent). Vérifié par introspection du schéma réel.

Conséquence directe : « classement des vendeurs », « performance par point de vente » et
« top produits par CA » sont impossibles en l'état — or ce sont précisément les livrables
du cadrage `next-step`.

### La correction
- `order_items` (FK `order_id`, FK produit, quantité, prix unitaire) **en plus** du jsonb.
  Le snapshot `items jsonb` garde une vraie valeur : il fige le prix au moment de la vente
  et survit à la suppression d'un produit — même motif que `target_product_name` sur les
  dossiers troc. Garder les deux : la table pour interroger, le jsonb pour l'histoire.
- `orders.staff_id` → FK staff, alimenté par `useCurrentStaffSession`.
- `orders.store_id` → référentiel points de vente (nouveau).

### Coordination
Ce point recoupe le périmètre devisé à l'externe. À trancher **avant** tout versement :
ces colonnes sont-elles ajoutées à la base Supabase existante, ou une seconde base est-elle
créée à côté ? Deux sources de vérité sur le stock et le CA coûteraient bien plus cher que
la prestation.

---

## Ordre d'exécution

1. **Point 1** — avant tout autre SQL, et avant l'intervention externe.
2. **Points 2 et 3** ensemble : la RPC du point 2 embarque le décrément du point 3.
3. **Point 4** — au fil des migrations suivantes.
4. **Point 5** — après arbitrage sur le périmètre externe.

## Dette connue, hors périmètre

- `scripts/apply-migration.mjs` réimplémente la résolution d'URL que
  `scripts/lib/supabaseDbUrl.mjs` fournit déjà (dont le docstring prétend le contraire).
  À factoriser, mais pas dans le même changement que le suivi des migrations.
- `verifyOrderRpc()` s'exécute à **chaque** invocation du script et crée puis supprime une
  commande sonde en production. À rendre optionnel (`--verify`).
