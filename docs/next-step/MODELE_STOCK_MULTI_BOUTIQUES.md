# MODÈLE DE STOCK MULTI-BOUTIQUES

> **Date** : 23 août 2026
> **Contexte** : `CADRAGE_SUIVI_VENTES_XEPTION.md` · `USE_CASES_ET_PARCOURS_ERP.md`
> **Statut** : spécification — règles métier arbitrées, rien n'est codé.

---

## 1. Règles métier

Arbitrées avec la direction :

1. **Chaque boutique a son propre stock.**
2. **Vente en boutique** : elle sort du stock de cette boutique, jamais d'une autre.
3. **Commande en ligne** : servie par une boutique qui a le produit.
4. **Ravitaillement** : une boutique peut transférer du stock à une autre.
5. **Commande en ligne non payée** → le stock est **réservé**, puis **libéré automatiquement**
   à expiration si le paiement n'arrive pas.
6. **Le CA d'une commande en ligne revient à la boutique qui la sert** — elle voit son stock
   baisser et son chiffre monter.
7. **`reserved` reflète la LOCALISATION PHYSIQUE, pas l'intention du client.** Tant qu'un
   appareil n'est pas dans le magasin, il n'est pas vendable — quoi qu'en dise le statut de la
   commande. Une réservation ne se libère donc que sur un **retour constaté** (`returned`) ou
   une **annulation avant sortie**, jamais sur un minuteur. Toute livraison, même lointaine,
   est faite par un employé Xeption : un refus client déclenche le **rapatriement** du colis,
   pas sa disparition comptable.

---

## 2. Ce qui existe déjà et qui est correct

⚠️ À lire avant de toucher à quoi que ce soit.

`create_order_atomic` (RPC `SECURITY DEFINER`, utilisée par le checkout public) fait **déjà**
les choses dans les règles :

```sql
SELECT stock INTO current_stock FROM products WHERE id = product_id FOR UPDATE;
IF current_stock < qty THEN  -- refus propre
UPDATE products SET stock = stock - qty WHERE id = product_id;
```

Verrou de ligne, contrôle, décrément, insertion de la commande — le tout dans une transaction.
**Aucune survente possible par ce chemin.**

Les deux chemins fautifs sont ailleurs : `usePosSystem.submitSale` et
`trocCheckoutService.completeTrocWithSale`, qui recalculent le stock en JavaScript
(`Math.max(0, stock - qty)`) hors transaction.

> La correction n'est donc pas à inventer : il s'agit d'aligner ces deux chemins sur le
> motif que `create_order_atomic` applique déjà correctement.

---

## 3. Modèle de données

```
stores
  id, name, city, active, created_at

store_stock                          ← LA vérité du stock
  store_id, product_id               (clé primaire composite)
  quantity   int  >= 0               physiquement présent
  reserved   int  >= 0               réservé par des commandes en attente
  -- disponible = quantity - reserved

stock_reservations
  id, order_id, store_id, product_id, qty
  expires_at, status                 active | consumed | released | expired

stock_movements                      ← journal, jamais modifié
  id, store_id, product_id, delta, reason, ref_type, ref_id, staff_id, created_at
  reason: sale | online_sale | return | transfer_out | transfer_in
        | inventory_adjust | troc_intake | reservation_release

stock_transfers
  id, from_store_id, to_store_id, status, created_by, sent_at, received_by, received_at
  status: draft | sent | received | cancelled

stock_transfer_items
  transfer_id, product_id, qty

orders
  + store_id     boutique qui sert la commande
  + staff_id     vendeur (null pour une commande en ligne)
```

### `products.stock` reste — en miroir

`products.stock` devient un **total maintenu par trigger** :
`SUM(quantity - reserved)` sur toutes les boutiques actives.

**Pourquoi le garder** : la boutique publique et `InventoryTab` lisent `product.stock`
partout. En le conservant comme miroir, **tout le site public continue de fonctionner sans
une seule modification**. Le remplacer par une vue obligerait à reprendre chaque chemin de
lecture d'un coup — risque inutile.

Le stock **en transit** (transfert envoyé, non reçu) n'appartient à aucune boutique et
n'entre donc pas dans ce total : il n'est vendable nulle part.

---

## 4. Opérations atomiques

Toutes en une requête, sans verrou explicite : la condition `WHERE` fait le travail.
**Zéro ligne retournée = refus → la transaction annule.**

**Réserver** (commande en ligne créée)
```sql
UPDATE store_stock SET reserved = reserved + :qty
WHERE store_id = :store AND product_id = :product
  AND quantity - reserved >= :qty
RETURNING quantity - reserved;
```

**Consommer** (paiement confirmé) — la réservation devient une sortie ferme
```sql
UPDATE store_stock SET quantity = quantity - :qty, reserved = reserved - :qty
WHERE store_id = :store AND product_id = :product
  AND reserved >= :qty AND quantity >= :qty;
```

**Libérer** (expiration ou annulation)
```sql
UPDATE store_stock SET reserved = reserved - :qty
WHERE store_id = :store AND product_id = :product AND reserved >= :qty;
```

**Vendre au comptoir** — sort du disponible, **pas** du réservé
```sql
UPDATE store_stock SET quantity = quantity - :qty
WHERE store_id = :store AND product_id = :product
  AND quantity - reserved >= :qty;
```

> ⚠️ Le POS **doit** respecter `reserved`. Sinon un client en ligne en train de payer perd son
> article au profit d'un client au comptoir, et son paiement aboutit sans stock. Le délai
> d'expiration court (30 min) limite la gêne. Un responsable peut forcer la libération d'une
> réservation si la situation l'exige — action tracée.

Chaque opération écrit une ligne dans `stock_movements`.

---

## 5. Cycles de vie

### Commande en ligne — la réservation suit l'OBJET, pas le client

**Principe directeur** : `reserved` ne veut pas dire « gardé pour quelqu'un », ça veut dire
**« pas dans le magasin »**. Ce n'est pas une politique commerciale, c'est un constat physique.
On ne peut pas vendre au comptoir ce qui est dans un sac entre Yaoundé et Kousséri.

Conséquence : **on ne libère une réservation que quand l'objet est revenu en rayon ou
définitivement parti.** Jamais sur un minuteur, jamais parce que le client tarde.

| Statut commande | Où est physiquement l'objet | Effet sur le stock | TTL |
|---|---|---|---|
| `pending` | en boutique, rien n'a bougé | réservé | **48 h** |
| `confirmed` | en boutique, en préparation | réservé | aucun |
| `ready` | en boutique, mis de côté (retrait) | réservé | aucun |
| `shipped` | **sorti du bâtiment** | réservé | aucun |
| `delivered` + payé | chez le client | **consommé** | — |
| `refused` | **dehors, en cours de retour** | **reste réservé** | aucun |
| `returned` | revenu en rayon | **libéré** | — |
| `cancelled` (avant expédition) | en boutique | **libéré** | — |

Le TTL de 48 h ne s'applique qu'en `pending` : personne ne s'est engagé, rien n'a bougé, le
balai automatique est légitime. Dès que le staff valide, l'engagement est pris et
l'immobilisation devient un fait à constater, pas une échéance à décompter.

### Transitions autorisées

```
pending ──┬─→ confirmed ──┬─→ shipped ──┬─→ delivered   (+ paiement → consommation)
          │               │             └─→ refused ──→ returned   (→ libération)
          │               └─→ ready ────┬─→ delivered   (retrait boutique)
          │                             └─→ cancelled   (→ libération, rien n'est sorti)
          └─→ cancelled                                 (→ libération)
```

- **`cancelled` est interdit depuis `shipped`.** Un colis parti ne s'annule pas, il se fait
  **refuser** puis **retourner**. Sinon on libère du stock qui est physiquement dehors.
- **`refused` ne libère rien.** Le client a dit non, mais l'objet voyage encore.
- **`returned` est le seul point de libération après expédition** — il correspond au moment où
  le livreur repose l'appareil sur l'étagère.

### ⚠️ Deux « retours » à ne surtout pas confondre

| | `refused → returned` | Retour SAV après `delivered` |
|---|---|---|
| La réservation a-t-elle été consommée ? | **non** | **oui** |
| Le stock a-t-il été décrémenté ? | non | oui |
| Action correcte | **libérer la réservation** (`reserved -= qty`) | **ré-incrémenter** (`quantity += qty`) |
| Mouvement | `release` | `return` (entrée) |

Même mot, deux mécanismes opposés. Les confondre crée du stock fantôme dans un sens ou en
détruit dans l'autre. Le retour SAV relève de l'étape 8, pas de ce cycle.

### Choix de la boutique qui sert

D'abord une boutique de la **ville de livraison** (`orders.customer_city` vs `stores.city`,
19 villes couvertes), sinon celle qui a le plus de disponible. Règle paramétrable.

**Si aucune boutique seule n'a la quantité** : refus. Pas de découpe entre boutiques en V1 —
deux expéditions, deux suivis et des lignes rattachées à des boutiques différentes, pour un
cas rare.

### Garde-fou algorithmique — et pourquoi ce n'est PAS une libération

Supprimer le TTL après validation ne doit pas rendre le système dépendant de la vigilance
humaine. Mais le minuteur qui prend le relais ne doit pas mentir sur la réalité physique.

Un colis parti depuis 30 jours et jamais revenu n'est pas un stock à **libérer** : le libérer
reviendrait à déclarer qu'on possède un appareil qu'on n'a pas. C'est une **perte**.

Deux seuils, deux actions **différentes** :

| Seuil | Condition | Action |
|---|---|---|
| **5 jours** | `shipped` ou `refused` sans issue | **Signalement** dans l'encart « Stock réservé ». Aucune écriture. |
| **30 jours** | idem | **Perte enregistrée** : `quantity -= qty`, réservation close, mouvement `reason = 'loss'`. |

Au seuil long, le stock cesse d'être bloqué **et** les livres cessent de prétendre qu'on l'a.
Une libération classique aurait fait apparaître du stock fantôme ; une perte assumée corrige
l'inventaire. Les deux seuils sont paramétrables.

### Ce que ça demande

- Valeurs `refused` et `returned` dans le CHECK de `orders.status`.
- `release_order_stock_reservations` **conditionnée** : aujourd'hui elle libère sans regarder
  si la commande était sortie ou non.
- Transition `refused → returned` comme unique point de libération après expédition.
- `loss` dans l'enum `stock_movement_reason`, et le job de perte au seuil long.
- Blocage de `shipped → cancelled` côté machine à états.

### Vente au comptoir
```
Panier → décrément direct sur la boutique du vendeur → mouvement sale
       → orders.store_id + orders.staff_id renseignés
```

### Ravitaillement — en deux temps, obligatoirement
```
Émission   → décrément boutique source, statut sent, mouvement transfer_out
             (le stock est EN TRANSIT : dans aucune boutique)
Réception  → incrément boutique cible, statut received, mouvement transfer_in
```

> Le deux-temps n'est pas un raffinement : sans lui, un transfert perdu fait **disparaître**
> de la marchandise sans trace. Un transfert `sent` depuis plus de N jours doit remonter en
> alerte de réconciliation.

### Autres entrées et sorties
- **Retour client** revendable → réintègre la boutique qui traite le retour.
- **Reprise Troc** → entre dans le stock de la boutique qui a racheté l'appareil.
- **Inventaire** → ajustement, avec écart et motif consignés.

---

## 6. Impact sur l'existant

| Élément | Impact |
|---|---|
| `create_order_atomic` | **Réécriture** : sélection de la boutique, réservation au lieu du décrément, `store_id` renseigné. Le motif `FOR UPDATE` déjà présent reste valide. Chantier le plus délicat — c'est une fonction qui marche. |
| `usePosSystem.submitSale` | Passe par une RPC : décrément atomique sur la boutique du vendeur + `staff_id`. Corrige la survente au passage. |
| `completeTrocWithSale` | Idem, et devient atomique *(point 2 de `PLAN_CORRECTIONS_INTEGRITE_BD.md`)*. |
| `InventoryTab` | Vue par boutique + vue consolidée. |
| Boutique publique | **Aucun changement** si `products.stock` reste maintenu. |
| Job d'expiration | Nouvelle entrée `pg_cron` — l'extension est déjà installée (v1.6.4). |

---

## 7. Cas limites à traiter

| Situation | Traitement |
|---|---|
| Paiement confirmé après expiration de la réservation | Re-tenter la réservation ; si impossible, alerter et rembourser. **Ne jamais livrer sans stock.** |
| Deux commandes en ligne simultanées, dernier exemplaire | La condition `quantity - reserved >= qty` en tranche une seule. |
| Vente comptoir pendant une réservation active | Refusée sur cet exemplaire. Override possible par un responsable, tracé. |
| Transfert jamais réceptionné | Alerte au-delà de N jours ; réconciliation manuelle. |
| Boutique désactivée avec du stock | Bloquer la désactivation tant que le stock n'est pas transféré. |
| Produit jamais approvisionné dans une boutique | Pas de ligne `store_stock` = disponible 0. Ne pas créer les lignes à vide. |
| **Annulation d'une commande déjà expédiée** | Interdite. Passer par `refused` → `returned`. Libérer alors que le colis roule crée du stock fantôme — c'est le comportement actuel, à corriger. |
| **Colis refusé et jamais rapatrié** | Signalé à 5 j, enregistré en **perte** à 30 j (`quantity -= qty`, `reason = 'loss'`). Jamais libéré. |
| **Retour SAV après `delivered`** | Mécanisme **inverse** : la réservation a déjà été consommée, il faut **ré-incrémenter** `quantity`. Ne pas réutiliser le chemin `returned`. Étape 8. |
| **Réexpédition après un refus** | Depuis `returned` uniquement, en repartant sur une nouvelle sortie. L'objet doit être repassé en rayon avant de ressortir. |

---

## 8. Ordre d'implémentation

1. ✅ **`stores` + `store_stock`**, alimentés depuis `products.stock` — migration `20260823_010`.
2. ✅ **Trigger de maintien** de `products.stock` — `20260823_012`.
3. ✅ **`stock_movements`** — journal alimenté par `_store_sale_line` et `redistribute`.
4. ✅ **POS atomique** avec `store_id` + `staff_id` — `20260823_001`. *(survente corrigée)*
5. ✅ **Clôture troc atomique** — même migration.
6. ✅ **Réservations** + `create_order_atomic` + job `pg_cron` — `20260823_012` à `015`.
7. ✅ **Cycle physique du colis** — `refused` / `returned`, libération conditionnée à la
   sortie, suppression du TTL après validation, seuils de signalement (5 j) et de perte (30 j).
   Migration `20260823_017`.
8. **Transferts** en deux temps.
9. **Inventaires** et retours SAV.

Les étapes 1 à 3 étaient **additives et sans effet visible** : elles ont posé le socle pendant
que tout continuait de tourner. Le premier changement de comportement est arrivé à l'étape 4,
et c'était une correction de bug.

L'étape 7 corrige l'écart entre l'état comptable et la réalité physique : une commande
expédiée ne se libère plus à l'annulation ; le refus garde le stock bloqué jusqu'au retour
en rayon, avec alerte à 5 j et perte automatique à 30 j.
