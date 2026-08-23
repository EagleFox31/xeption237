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

### Commande en ligne
```
Création → choix de la boutique → RÉSERVATION (expires_at = +30 min)
   ├─ paiement confirmé  → consommation, mouvement online_sale, CA → boutique
   ├─ expiration (cron)  → libération, réservation = expired
   └─ annulation client  → libération, réservation = released
```

**Choix de la boutique** : d'abord une boutique de la **ville de livraison**
(`orders.customer_city` vs `stores.city`, 19 villes couvertes), sinon celle qui a le plus de
disponible. Règle paramétrable.

**Si aucune boutique seule n'a la quantité** : refus. Pas de découpe entre boutiques en V1 —
deux expéditions, deux suivis et des lignes rattachées à des boutiques différentes, pour un
cas rare.

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

---

## 8. Ordre d'implémentation

1. **`stores` + `store_stock`**, alimentés depuis `products.stock` existant sur une boutique
   par défaut. *Aucun changement de comportement à ce stade.*
2. **Trigger de maintien** de `products.stock`. Le site public reste intact.
3. **`stock_movements`** — journal branché sur les chemins existants.
4. **POS atomique** avec `store_id` + `staff_id`. *(corrige la survente)*
5. **Clôture troc atomique.**
6. **Réservations** + réécriture de `create_order_atomic` + job `pg_cron` d'expiration.
7. **Transferts** en deux temps.
8. **Inventaires** et retours.

Les étapes 1 à 3 sont **additives et sans effet visible** : elles posent le socle pendant que
tout continue de tourner. Le premier changement de comportement arrive à l'étape 4, et c'est
une correction de bug.
