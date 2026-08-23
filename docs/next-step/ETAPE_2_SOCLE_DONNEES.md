# Étape 2 — Poser le socle données ERP

> **Date** : 23 août 2026  
> **Statut** : ✅ migration `20260823_010` — appliquée en prod  
> **Parent** : [`ROADMAP_ERP.md`](./ROADMAP_ERP.md) § étape 2  
> **Contexte** : [`ECART_ERP_VS_CADRAGE.md`](./ECART_ERP_VS_CADRAGE.md) · [`MODELE_STOCK_MULTI_BOUTIQUES.md`](./MODELE_STOCK_MULTI_BOUTIQUES.md)

---

## 1. Objectif

Poser en base les **trois absences critiques** du cadrage suivi des ventes :

| Manque aujourd'hui | Conséquence |
|---|---|
| Pas de `orders.staff_id` | Impossible d'attribuer une vente à un vendeur |
| Pas de `orders.store_id` | Impossible de piloter par boutique |
| Pas de `order_items` | Top produits / volumes = requêtes jsonb lourdes et fragiles |

Et préparer le **modèle multi-boutiques** sans changer le comportement actuel.

**Principe directeur :** 100 % additif. Aucune lecture ne change, aucune écriture ne bascule.

---

## 2. Périmètre

### ✅ Inclus (étape 2)

| Livrable | Description |
|---|---|
| Table `stores` | Référentiel points de vente |
| Table `store_stock` | Stock par boutique (miroir initial de `products.stock`) |
| Table `stock_movements` | Journal des mouvements — **structure seulement**, pas encore alimenté par les ventes |
| Table `order_items` | Lignes structurées par commande |
| Colonnes `orders.store_id`, `orders.staff_id` | Nullables, sans contrainte métier encore |
| Colonne `staff.store_id` | Nullable — rattachement boutique (préparation étape 3) |
| Boutique par défaut | Une ligne `stores` + backfill `store_stock` depuis `products.stock` |
| Backfill `order_items` | Depuis `orders.items` jsonb existant (historique) |
| RLS minimale | Policies staff sur les nouvelles tables |
| Constantes TS | Extension de `constants/dbSchema.ts` |

### ❌ Exclus (étapes ultérieures)

| Élément | Reporté à |
|---|---|
| Trigger `products.stock = SUM(store_stock…)` | Étape 4 |
| `stock_reservations`, job pg_cron expiration | Étape 4 |
| `stock_transfers`, inventaires, retours | Étape 8 |
| Réécriture `create_order_atomic` (réservation) | Étape 4 |
| POS / troc écrivent dans `store_stock` | Étape 4 |
| UI choix boutique, « mes ventes du jour » | Étapes 3–5 |
| Dashboard KPIs, export Excel | Étape 6 |
| Rattachement staff + répartition stock physique | Étape 3 |

---

## 3. État actuel (référence)

### Stock

- **Vérité unique :** `products.stock` (entier ≥ 0).
- **Chemins d'écriture :**
  - Checkout web → `create_order_atomic` (RPC, `FOR UPDATE`, atomique) ✅
  - POS → `complete_pos_sale_atomic` (RPC, corrigé août 2026) ✅
  - Troc + vente → `complete_troc_with_sale_atomic` (RPC) ✅
  - Admin inventaire → `useInventoryManager` (direct `.upsert` / `.update` sur `products`)

### Commandes

- Lignes figées dans `orders.items` (jsonb) — format panier : `{ id, name, price, quantity, … }` (`CartItem` / `Product`).
- Pas de FK produit, pas d'index par article — OK pour l'affichage, insuffisant pour le pilotage.

### Staff

- Table `staff` : `id`, `email`, `role`, … — **pas de `store_id`**.
- Auth Supabase (`signInWithPassword`) — session `authenticated`.

---

## 4. Schéma cible

### 4.1 `stores`

```sql
CREATE TABLE public.stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,          -- ex. 'yaounde-centre'
  name        text NOT NULL,                 -- ex. 'Xeption Yaoundé Centre'
  city        text,                          -- aligné delivery_zones / customer_city
  address     text,
  active      boolean NOT NULL DEFAULT true,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Une seule boutique default (contrainte partielle)
CREATE UNIQUE INDEX stores_one_default_idx
  ON public.stores (is_default) WHERE is_default = true;
```

**Seed étape 2 :** une boutique `is_default = true`, ex. « Xeption — Siège » (ville à confirmer avec la direction).

### 4.2 `store_stock`

```sql
CREATE TABLE public.store_stock (
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  product_id  text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity    integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved    integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, product_id),
  CHECK (reserved <= quantity)
);

CREATE INDEX store_stock_product_idx ON public.store_stock (product_id);
CREATE INDEX store_stock_store_idx ON public.store_stock (store_id);
```

**Sémantique (cible étape 4+, documentée dès maintenant) :**

- `quantity` = physically present
- `reserved` = blocked by pending online orders
- **disponible** = `quantity - reserved`

**Étape 2 :** `reserved` reste à `0` partout. Pas de réservation en ligne tant que l'étape 4.

### 4.3 `stock_movements`

Journal **append-only** — jamais UPDATE/DELETE métier.

```sql
CREATE TYPE public.stock_movement_reason AS ENUM (
  'sale',
  'online_sale',
  'return',
  'transfer_out',
  'transfer_in',
  'inventory_adjust',
  'troc_intake',
  'reservation_release',
  'initial_backfill'
);

CREATE TABLE public.stock_movements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id),
  product_id  text NOT NULL REFERENCES public.products(id),
  delta       integer NOT NULL,              -- négatif = sortie, positif = entrée
  reason      public.stock_movement_reason NOT NULL,
  ref_type    text,                          -- 'order' | 'transfer' | 'inventory' | …
  ref_id      text,
  staff_id    uuid REFERENCES public.staff(id),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX stock_movements_store_created_idx
  ON public.stock_movements (store_id, created_at DESC);
CREATE INDEX stock_movements_product_created_idx
  ON public.stock_movements (product_id, created_at DESC);
```

**Étape 2 :** table créée vide, ou une ligne `initial_backfill` par produit si on trace le seed (optionnel). **Aucun trigger** sur les ventes existantes.

### 4.4 `order_items`

```sql
CREATE TABLE public.order_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  line_index    smallint NOT NULL DEFAULT 0,
  product_id    text REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  text NOT NULL,
  unit_price    numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  quantity      integer NOT NULL CHECK (quantity > 0),
  line_total    numeric(12,2) NOT NULL CHECK (line_total >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, line_index)
);

CREATE INDEX order_items_order_idx ON public.order_items (order_id);
CREATE INDEX order_items_product_idx ON public.order_items (product_id);
CREATE INDEX order_items_created_idx ON public.order_items (created_at DESC);
```

**Règles :**

- `orders.items` jsonb **conservé** — snapshot immuable pour factures / historique.
- `order_items` = vue relationnelle pour agrégats (top produits, volumes, CA par SKU).
- `product_id` nullable après suppression produit ; `product_name` + prix figés restent.

**Mapping backfill depuis jsonb :**

```sql
-- Pour chaque élément de orders.items (array) :
-- product_id  := elem->>'id'
-- product_name:= COALESCE(elem->>'name', elem->>'id')
-- unit_price  := (elem->>'price')::numeric
-- quantity    := COALESCE((elem->>'quantity')::int, 1)
-- line_total  := unit_price * quantity
```

### 4.5 Extensions tables existantes

```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id),
  ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES public.staff(id);

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id);

CREATE INDEX orders_store_id_idx ON public.orders (store_id);
CREATE INDEX orders_staff_id_idx ON public.orders (staff_id);
CREATE INDEX orders_date_store_idx ON public.orders (date DESC, store_id);
```

**Étape 2 :** toutes les valeurs restent `NULL` sur les commandes existantes et nouvelles — jusqu'à l'étape 4–5 où le code renseignera ces colonnes.

---

## 5. Backfill (migration one-shot)

Ordre d'exécution dans **une transaction** :

```
1. CREATE TYPE + tables + colonnes + index
2. INSERT stores (boutique default)
3. INSERT store_stock
     SELECT default_store.id, p.id, p.stock, 0
     FROM products p
     WHERE p.stock > 0          -- pas de ligne = dispo 0 (cf. MODELE §7)
4. (Optionnel) INSERT stock_movements reason='initial_backfill'
5. INSERT order_items depuis orders.items jsonb (toutes commandes historiques)
6. RLS + policies
7. GRANT / COMMENT
```

**Vérification post-backfill :**

```sql
-- Stock cohérent boutique default vs products
SELECT p.id, p.stock, ss.quantity
FROM products p
LEFT JOIN store_stock ss ON ss.product_id = p.id
  AND ss.store_id = (SELECT id FROM stores WHERE is_default LIMIT 1)
WHERE p.stock > 0 AND (ss.quantity IS NULL OR ss.quantity <> p.stock);
-- → 0 ligne

-- Lignes commandes
SELECT o.id, jsonb_array_length(o.items) AS json_lines, COUNT(oi.id) AS rel_lines
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.items
HAVING jsonb_array_length(COALESCE(o.items, '[]'::jsonb)) <> COUNT(oi.id);
-- → 0 ligne (ou documenter les exceptions items mal formés)
```

---

## 6. RLS (nouvelles tables)

Même modèle que `trade_in_requests` : lecture/écriture **staff par email**.

```sql
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Pattern staff (SELECT + ALL selon besoin)
CREATE POLICY stores_staff_all ON public.stores FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')))
  WITH CHECK (EXISTS (SELECT 1 FROM staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email')));
-- Idem store_stock, stock_movements, order_items
```

**Étape 2 :** pas de lecture publique sur ces tables — la boutique publique continue de lire `products.stock` et `orders.items` jsonb.

**Note :** les RPC `SECURITY DEFINER` (étape 4+) bypassent la RLS — pas de policy anon nécessaire pour elles.

---

## 7. Impact code (étape 2)

| Zone | Changement étape 2 |
|---|---|
| Boutique publique (`App.tsx`, `ProductList`, checkout) | **Aucun** |
| Admin inventaire (`useInventoryManager`) | **Aucun** — écrit toujours `products.stock` |
| POS (`usePosSystem`) | **Aucun** |
| RPC ventes | **Aucun** |
| `constants/dbSchema.ts` | Ajouter `STORES`, `STORE_STOCK`, `STOCK_MOVEMENTS`, `ORDER_ITEMS` + colonnes `ORDERS.STORE_ID`, `ORDERS.STAFF_ID`, `STAFF.STORE_ID` |
| UI admin | **Aucun écran nouveau** — optionnel : afficher `store_id`/`staff_id` en lecture seule dans détail commande (nice-to-have, pas bloquant) |

Le premier code applicatif qui **écrit** dans ces tables arrive à l'**étape 4** (RPC stock) et l'**étape 5** (`staff_id` POS).

---

## 8. Critères d'acceptation

| # | Critère | Vérif |
|---|---|---|
| A1 | Migration idempotente (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`) | `db:status` |
| A2 | Boutique default unique | requête §5 |
| A3 | `SUM(store_stock.quantity)` sur default = somme `products.stock` (>0) | requête §5 |
| A4 | Chaque commande avec `items` valide a ses `order_items` | requête §5 |
| A5 | Aucune régression checkout / POS / inventaire (smoke manuel) | test terrain |
| A6 | `npm run db:inventory` liste les 4 nouvelles tables | script |
| A7 | Registre policies régénéré si RLS ajoutée | `db:policies-export` |

---

## 9. Risques & repli

| Risque | Mitigation |
|---|---|
| Backfill jsonb mal formé (vieilles commandes) | Logger les `order_id` en échec ; ne pas bloquer la migration sur 1–2 lignes corrompues |
| Volume `order_items` (historique long) | Migration en batch si >10k commandes ; index créés avant backfill |
| Confusion « deux stocks » | Documenter clairement : **`products.stock` = vérité jusqu'à étape 4** |

**Repli :** migration down ou manuelle :

```sql
-- Repli complet étape 2 (fenêtre de maintenance uniquement)
ALTER TABLE orders DROP COLUMN IF EXISTS store_id, DROP COLUMN IF EXISTS staff_id;
ALTER TABLE staff DROP COLUMN IF EXISTS store_id;
DROP TABLE IF EXISTS order_items, stock_movements, store_stock, stores CASCADE;
DROP TYPE IF EXISTS stock_movement_reason;
```

Aucun impact sur le fonctionnement actuel si exécuté **avant** l'étape 4.

---

## 10. Fichiers à produire (implémentation)

| Fichier | Rôle |
|---|---|
| `supabase/migrations/20260823_010_erp_step2_data_foundation.sql` | DDL + backfill + RLS |
| `constants/dbSchema.ts` | Nouvelles tables/colonnes |
| `scripts/verify-erp-step2.mjs` | Script vérif A2–A4 (optionnel, `npm run db:verify:step2`) |

**Nommage migration :** préfixe date + `_010_` pour laisser de la place aux correctifs intermédiaires.

---

## 11. Enchaînement

```
Étape 2 (ce doc)     → tables + backfill, comportement inchangé
        ↓
Étape 3              → boutiques réelles, staff.store_id, répartition stock physique
        ↓
Étape 4 ⚠️           → trigger products.stock, RPC écrivent store_stock, réservations
        ↓
Étape 5              → POS renseigne staff_id, « mes ventes du jour »
        ↓
Étape 6              → dashboard & export sur order_items + store_id + staff_id
```

---

## 12. Questions ouvertes (à trancher avant migration)

1. **Nom et ville** de la boutique default (seed).
2. **Produits stock = 0** : créer une ligne `store_stock` à 0 ou absence de ligne (= 0 implicite) — recommandation : **pas de ligne** (cf. `MODELE_STOCK_MULTI_BOUTIQUES.md` §7).
3. **Backfill `order_items`** : inclure commandes `cancelled` ? → **oui**, pour historique CA complet.
4. **`staff.store_id`** : renseigner tout le monde sur la boutique default en étape 2, ou attendre étape 3 ? → **attendre étape 3** (données terrain).

---

## Historique

| Date | Action |
|---|---|
| 2026-08-23 | Rédaction spec étape 2 (socle données ERP) |
| 2026-08-23 | Migration `20260823_010_erp_step2_data_foundation.sql` appliquée |
