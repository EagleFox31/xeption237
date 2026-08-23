# Registre des policies RLS — Xeption Supabase

> Généré le 2026-08-23 depuis la base **live** (`npm run db:policies-export`).
> JSON machine : `docs/engineering/policies-registry.json`

## Règles avant d’ajouter une policy

1. **Consulter ce registre** — une policy équivalente existe peut‑être déjà (voir doublons ci‑dessous).
2. **Une responsabilité par policy** : `public_read`, `staff_write`, `anon_insert` — pas de `FOR ALL TO public USING (true)`.
3. **Écriture staff** : lier à `staff.email = auth.jwt()->>'email'`, jamais `TO authenticated USING (true)`.
4. **Edge Functions / RPC** : `service_role` contourne la RLS — pas besoin de policy `public` pour elles.
5. **Nommage** : `<table>_<role>_<action>` en snake (ex. `products_staff_write`).
6. **Migration idempotente** : toujours `DROP POLICY IF EXISTS` avant `CREATE POLICY`.
7. **Regénérer** : `npm run db:policies-export` après toute modification en SQL Editor.

## État global

| Métrique | Valeur |
|---|---|
| Policies live | **62** |
| Tables sans RLS | **products** |
| Groupes de doublons | **9** |

## Impact réel (synthèse)

| Impact | Nb | Signification |
|---|---|---|
| 🟢 `active` | **33** | Active — contrôle un flux client réel |
| 🔵 `bypass_service_role` | **9** | Contournée — accès edge en service_role (RLS bypass) |
| 🟡 `redundant_duplicate` | **8** | Redondante — doublon strict (même table/cmd/rôles/qual) |
| ⚫ `inactive_rls_off` | **6** | Inactive — RLS désactivée sur la table |
| 🟠 `redundant_shadowed` | **4** | Redondante — couverte par une policy `{public}` équivalente |
| ⚪ `legacy_no_caller` | **1** | Orpheline — aucun appelant dans le code |
| 🟣 `active_rare` | **1** | Active rare — insert/update direct legacy (hors RPC principal) |

Légende : 🟢 active · ⚫ RLS off · 🔵 bypass (edge/RPC) · 🟡 doublon strict · 🟠 shadowed par `{public}` · 🟣 flux legacy · ⚪ orpheline

## Inventaire complet (62 policies)

| Table | Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|---|
| `argus` | `argus_read_service` | SELECT | {public} | ⚪ `legacy_no_caller` | Table `argus` sans référence code — policy probablement morte. |
| `brands` | `Public read brands` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `brands` | `Staff manage brands` | ALL | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `categories` | `Public View Categories` | SELECT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `categories` | `Staff Full Access Categories` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `customers` | `Public insert` | INSERT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `customers` | `Public read` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `customers` | `Public update` | UPDATE | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `customers` | `Staff Full Access Customers` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `delivery_zones` | `Enable read access for all users` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `delivery_zones` | `Enable write access for authenticated users` | ALL | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `imei_certif_records` | `imei_certif_records_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `imei_premium_calls` | `imei_premium_calls_admin_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `market_demand_signals` | `market_demand_signals_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `market_price_cache` | `market_price_cache_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `market_price_snapshots` | `market_price_snapshots_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `market_trend_cache` | `market_trend_cache_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `orders` | `Enable insert access for all users` | INSERT | {public} | 🟣 `active_rare` | Checkout via RPC (create_order_atomic) ; insert direct encore dans legacy AdminP |
| `orders` | `Enable read access for all users` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `orders` | `Enable update access for all users` | UPDATE | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `orders` | `Public Create Orders` | INSERT | {anon,authenticated} | 🟠 `redundant_shadowed` | Couvert par `Enable insert access for all users` ({public} inclut anon + authent |
| `orders` | `Public Insert Orders` | INSERT | {public} | 🟡 `redundant_duplicate` | Doublon strict — garder `Enable insert access for all users`. |
| `orders` | `Public Read Orders` | SELECT | {public} | 🟡 `redundant_duplicate` | Doublon strict — garder `Enable read access for all users`. |
| `orders` | `Public View Own Orders` | SELECT | {anon,authenticated} | 🟡 `redundant_duplicate` | Doublon strict — garder `Public read orders`. |
| `orders` | `Public insert orders` | INSERT | {anon,authenticated} | 🟡 `redundant_duplicate` | Doublon strict — garder `Public Create Orders`. |
| `orders` | `Public read orders` | SELECT | {anon,authenticated} | 🟠 `redundant_shadowed` | Couvert par `Enable read access for all users` ({public} inclut anon + authentic |
| `orders` | `Staff Full Access Orders` | ALL | {authenticated} | 🟡 `redundant_duplicate` | Doublon strict — garder `Staff full access orders`. |
| `orders` | `Staff full access orders` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `packs` | `Packs sont publics` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `packs` | `Staff peut tout gérer` | ALL | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `phone_releases` | `phone_releases_public_read` | SELECT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `product_ranges` | `Public read ranges` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `product_ranges` | `Staff manage ranges` | ALL | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `products` | `Public Read Products` | SELECT | {public} | ⚫ `inactive_rls_off` | RLS désactivée : policy ignorée par Postgres. |
| `products` | `Public View Products` | SELECT | {anon,authenticated} | ⚫ `inactive_rls_off` | RLS désactivée : policy ignorée par Postgres. |
| `products` | `Staff Full Access Products` | ALL | {authenticated} | ⚫ `inactive_rls_off` | RLS désactivée : policy ignorée par Postgres. |
| `products` | `Staff Write Products` | ALL | {authenticated} | ⚫ `inactive_rls_off` | RLS désactivée : policy ignorée par Postgres. |
| `products` | `Staff update products` | ALL | {authenticated} | ⚫ `inactive_rls_off` | RLS désactivée : policy ignorée par Postgres. |
| `products` | `TEMP: authenticated can insert products` | INSERT | {authenticated} | ⚫ `inactive_rls_off` | RLS désactivée : policy ignorée par Postgres. |
| `repair_tickets` | `Public Create Ticket` | INSERT | {anon,authenticated} | 🟠 `redundant_shadowed` | Couvert par `Public can create tickets` ({public} inclut anon + authenticated). |
| `repair_tickets` | `Public can create tickets` | INSERT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `repair_tickets` | `Public insert tickets` | INSERT | {anon,authenticated} | 🟡 `redundant_duplicate` | Doublon strict — garder `Public Create Ticket`. |
| `repair_tickets` | `Staff Manage Tickets` | ALL | {authenticated} | 🟡 `redundant_duplicate` | Doublon strict — garder `Staff full access tickets`. |
| `repair_tickets` | `Staff can manage tickets` | ALL | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `repair_tickets` | `Staff full access tickets` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `staff` | `Public Read Staff` | SELECT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `staff` | `Staff Self Edit` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `tac_cache` | `tac_cache_read_all` | SELECT | {public} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `tac_cache` | `tac_cache_write_service` | ALL | {public} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `trade_in_models` | `Public Read Trade Models` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `trade_in_models` | `Public View Argus` | SELECT | {anon,authenticated} | 🟠 `redundant_shadowed` | Couvert par `Public Read Trade Models` ({public} inclut anon + authenticated). |
| `trade_in_models` | `Staff Manage Argus` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `trade_in_models` | `Staff Write Trade Models` | ALL | {authenticated} | 🟡 `redundant_duplicate` | Doublon strict — garder `Staff Manage Argus`. |
| `trade_in_requests` | `staff_delete_trade_in_requests` | DELETE | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `trade_in_requests` | `staff_select_trade_in_requests` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `trade_in_requests` | `staff_update_trade_in_requests` | UPDATE | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `troc_certificates` | `troc_certificates_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `troc_payments` | `troc_payments_insert_anon` | INSERT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `troc_payments` | `troc_payments_select_anon` | SELECT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `troc_sessions` | `troc_sessions_insert_public` | INSERT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `troc_sessions` | `troc_sessions_select_staff` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `troc_sessions` | `troc_sessions_update_public` | UPDATE | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

## Doublons à fusionner (ne pas recréer)

### Enable… (2 policies identiques)

Signature : `orders|INSERT|{public}||true`

Policies actuelles :
- `Enable insert access for all users`
- `Public Insert Orders`

**Canonique à garder** : `Enable insert access for all users`

### Enable… (2 policies identiques)

Signature : `orders|SELECT|{public}|true|true`

Policies actuelles :
- `Enable read access for all users`
- `Public Read Orders`

**Canonique à garder** : `Enable read access for all users`

### Public… (2 policies identiques)

Signature : `orders|INSERT|{anon,authenticated}||true`

Policies actuelles :
- `Public Create Orders`
- `Public insert orders`

**Canonique à garder** : `Public Create Orders`

### Public… (2 policies identiques)

Signature : `orders|SELECT|{anon,authenticated}|true|true`

Policies actuelles :
- `Public View Own Orders`
- `Public read orders`

**Canonique à garder** : `Public read orders`

### Staff… (2 policies identiques)

Signature : `orders|ALL|{authenticated}|true|true`

Policies actuelles :
- `Staff Full Access Orders`
- `Staff full access orders`

**Canonique à garder** : `Staff full access orders`

### Staff… (3 policies identiques)

Signature : `products|ALL|{authenticated}|true|true`

Policies actuelles :
- `Staff Full Access Products`
- `Staff Write Products`
- `Staff update products`

**Canonique à garder** : `Staff Full Access Products`

### Public… (2 policies identiques)

Signature : `repair_tickets|INSERT|{anon,authenticated}||true`

Policies actuelles :
- `Public Create Ticket`
- `Public insert tickets`

**Canonique à garder** : `Public Create Ticket`

### Staff… (2 policies identiques)

Signature : `repair_tickets|ALL|{authenticated}|true|true`

Policies actuelles :
- `Staff Manage Tickets`
- `Staff full access tickets`

**Canonique à garder** : `Staff full access tickets`

### Staff… (2 policies identiques)

Signature : `trade_in_models|ALL|{authenticated}|true|true`

Policies actuelles :
- `Staff Manage Argus`
- `Staff Write Trade Models`

**Canonique à garder** : `Staff Manage Argus`

## Policies canoniques cibles (post-remédiation RLS)

### `products`

- products_public_read (SELECT → anon, authenticated)
- products_staff_write (ALL → staff via email) — RLS à réactiver

### `brands`

- brands_public_read (SELECT → anon, authenticated)
- brands_staff_write (ALL → staff via email)

### `product_ranges`

- ranges_public_read (SELECT → anon, authenticated)
- ranges_staff_write (ALL → staff via email)

### `customers`

- customers_public_insert (INSERT → anon, checkout)
- customers_staff_all (ALL → staff via email)

### `orders`

- orders_public_insert (INSERT → anon, checkout + RPC)
- orders_public_read_own (SELECT → limité ou staff)
- orders_staff_all (ALL → staff via email)

## Objets en base sans fichier de migration

Ces objets existent déjà en production ; les documenter ici évite de les recréer par erreur.

| Type | Nom | Table / note |
|---|---|---|
| table | `customers` | créée via SQL Editor |
| table | `order_payments` | créée via SQL Editor |
| table | `packs` | créée via SQL Editor |
| table | `repair_tickets` | créée via SQL Editor |
| function | `handle_updated_at()` | trigger helper |
| function | `set_updated_at()` | trigger helper |
| trigger | `on_packs_updated` | sur `packs` |
| trigger | `products_set_updated_at` | sur `products` |

> Baseline recommandée : `npm run db:baseline` après rapatriement SQL si besoin de rejouabilité.

## Inventaire par table (amont → aval)

**Amont** = code app / scripts qui appellent `.from('<table>')`  
**Aval** = Edge Functions et RPC qui touchent la table  
**Policies** = policies live aujourd’hui

### `argus` (1 policy)

**Amont (app/scripts)**

_Aucun_
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `argus_read_service` | SELECT | {public} | ⚪ `legacy_no_caller` | Table `argus` sans référence code — policy probablement mort |

### `brands` (2 policyies)

**Amont (app/scripts)**

- `components\Header.tsx`
- `components\ProductList.tsx`
- `hooks\admin\useAdminData.ts`
- `hooks\admin\useBrandsManager.ts`
- `scripts\batch-enrich-catalog.mjs`
- `scripts\batch-enrich-product-specs.mjs`
- `scripts\batch-enrich-release-year.mjs`
- `scripts\compare-mfoundi-duplicates.mjs`
- `scripts\generate-mfoundi-import.mjs`
- `scripts\import-pc-catalog-july-2026.mjs`
- `scripts\product-ingestion-funnel.mjs`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `Public read brands` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `Staff manage brands` | ALL | {public} | 🟢 `active` | Active — contrôle un flux client réel |

### `categories` (2 policyies)

**Amont (app/scripts)**

- `components\AdminPanel.tsx`
- `components\Header.tsx`
- `components\ProductList.tsx`
- `components\shop\ShopHero.tsx`
- `hooks\admin\useAdminData.ts`
- `hooks\admin\useCategoriesManager.ts`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `Public View Categories` | SELECT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `Staff Full Access Categories` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `customers` (4 policyies)

**Amont (app/scripts)**

- `components\AdminPanel.tsx`
- `hooks\admin\useAdminData.ts`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `Public insert` | INSERT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `Public read` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `Public update` | UPDATE | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `Staff Full Access Customers` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `delivery_zones` (2 policyies)

**Amont (app/scripts)**

- `components\admin\tabs\DeliveryTab.tsx`
- `components\delivery\deliveryZoneUi.tsx`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `Enable read access for all users` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `Enable write access for authenticated users` | ALL | {public} | 🟢 `active` | Active — contrôle un flux client réel |

### `imei_certif_records` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\generate-imei-certificate\index.ts`
**Aval (edge / RPC)**

- `generate-imei-certificate`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `imei_certif_records_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_r |

### `imei_premium_calls` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\check-imei\index.ts`
**Aval (edge / RPC)**

- `check-imei`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `imei_premium_calls_admin_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_r |

### `market_demand_signals` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\get-market-trend\index.ts`
**Aval (edge / RPC)**

- `get-market-trend`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `market_demand_signals_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_r |

### `market_price_cache` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\market-price-intel\index.ts`
**Aval (edge / RPC)**

- `market-price-intel`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `market_price_cache_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_r |

### `market_price_snapshots` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\get-market-trend\index.ts`
- `supabase\functions\snapshot-market-prices\index.ts`
**Aval (edge / RPC)**

- `get-market-trend`
- `snapshot-market-prices`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `market_price_snapshots_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_r |

### `market_trend_cache` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\get-market-trend\index.ts`
**Aval (edge / RPC)**

- `get-market-trend`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `market_trend_cache_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_r |

### `orders` (11 policyies)

**Amont (app/scripts)**

- `components\AdminPanel.tsx`
- `components\OrderTracking.tsx`
- `components\SocialProof.tsx`
- `hooks\admin\useAdminData.ts`
- `scripts\apply-migration.mjs`
**Aval (edge / RPC)**

- `create-payment`
- `send-invoice`
**RPC**

- `create_order_atomic`
- `complete_pos_sale_atomic`
- `complete_troc_with_sale_atomic`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `Enable insert access for all users` | INSERT | {public} | 🟣 `active_rare` | Checkout via RPC (create_order_atomic) ; insert direct encor |
| `Enable read access for all users` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `Enable update access for all users` | UPDATE | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `Public Create Orders` | INSERT | {anon,authenticated} | 🟠 `redundant_shadowed` | Couvert par `Enable insert access for all users` ({public} i |
| `Public Insert Orders` | INSERT | {public} | 🟡 `redundant_duplicate` | Doublon strict — garder `Enable insert access for all users` |
| `Public Read Orders` | SELECT | {public} | 🟡 `redundant_duplicate` | Doublon strict — garder `Enable read access for all users`. |
| `Public View Own Orders` | SELECT | {anon,authenticated} | 🟡 `redundant_duplicate` | Doublon strict — garder `Public read orders`. |
| `Public insert orders` | INSERT | {anon,authenticated} | 🟡 `redundant_duplicate` | Doublon strict — garder `Public Create Orders`. |
| `Public read orders` | SELECT | {anon,authenticated} | 🟠 `redundant_shadowed` | Couvert par `Enable read access for all users` ({public} inc |
| `Staff Full Access Orders` | ALL | {authenticated} | 🟡 `redundant_duplicate` | Doublon strict — garder `Staff full access orders`. |
| `Staff full access orders` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `packs` (2 policyies)

**Amont (app/scripts)**

- `hooks\admin\usePacksManager.ts`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `Packs sont publics` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `Staff peut tout gérer` | ALL | {public} | 🟢 `active` | Active — contrôle un flux client réel |

### `phone_releases` (1 policy)

**Amont (app/scripts)**

- `scripts\batch-enrich-release-year.mjs`
- `scripts\import-phone-releases.mjs`
- `services\trocEvaluationService.ts`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `phone_releases_public_read` | SELECT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `product_ranges` (2 policyies)

**Amont (app/scripts)**

- `hooks\admin\useAdminData.ts`
- `hooks\admin\useBrandsManager.ts`
- `scripts\generate-mfoundi-import.mjs`
- `scripts\import-pc-catalog-july-2026.mjs`
- `scripts\product-ingestion-funnel.mjs`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `Public read ranges` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `Staff manage ranges` | ALL | {public} | 🟢 `active` | Active — contrôle un flux client réel |

### `products` (6 policyies)

**Amont (app/scripts)**

- `components\AdminPanel.tsx`
- `components\troc\TrocUpgradeChoice.tsx`
- `hooks\admin\useInventoryManager.ts`
- `scripts\apply-manual-mfoundi-merges.mjs`
- `scripts\apply-researched-product-release-years.mjs`
- `scripts\audit-product-specs.mjs`
- `scripts\batch-enrich-catalog.mjs`
- `scripts\batch-enrich-product-specs.mjs`
- `scripts\batch-enrich-release-year.mjs`
- `scripts\compare-mfoundi-duplicates.mjs`
- `scripts\delete-legacy-duplicate-products.mjs`
- `scripts\fill-product-specs.mjs`
_+ 6 autres — voir JSON_

**Aval (edge / RPC)**

- `market-price-intel`
- `snapshot-market-prices (lecture trade_in_models seulement)`
**RPC**

- `create_order_atomic`
- `complete_pos_sale_atomic`
- `complete_troc_with_sale_atomic`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `Public Read Products` | SELECT | {public} | ⚫ `inactive_rls_off` | RLS désactivée : policy ignorée par Postgres. |
| `Public View Products` | SELECT | {anon,authenticated} | ⚫ `inactive_rls_off` | RLS désactivée : policy ignorée par Postgres. |
| `Staff Full Access Products` | ALL | {authenticated} | ⚫ `inactive_rls_off` | RLS désactivée : policy ignorée par Postgres. |
| `Staff Write Products` | ALL | {authenticated} | ⚫ `inactive_rls_off` | RLS désactivée : policy ignorée par Postgres. |
| `Staff update products` | ALL | {authenticated} | ⚫ `inactive_rls_off` | RLS désactivée : policy ignorée par Postgres. |
| `TEMP: authenticated can insert products` | INSERT | {authenticated} | ⚫ `inactive_rls_off` | RLS désactivée : policy ignorée par Postgres. |

### `repair_tickets` (6 policyies)

**Amont (app/scripts)**

- `components\RepairTicketManagement.tsx`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `Public Create Ticket` | INSERT | {anon,authenticated} | 🟠 `redundant_shadowed` | Couvert par `Public can create tickets` ({public} inclut ano |
| `Public can create tickets` | INSERT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `Public insert tickets` | INSERT | {anon,authenticated} | 🟡 `redundant_duplicate` | Doublon strict — garder `Public Create Ticket`. |
| `Staff Manage Tickets` | ALL | {authenticated} | 🟡 `redundant_duplicate` | Doublon strict — garder `Staff full access tickets`. |
| `Staff can manage tickets` | ALL | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `Staff full access tickets` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `staff` (2 policyies)

**Amont (app/scripts)**

- `components\AdminPanel.tsx`
- `components\StaffLogin.tsx`
- `hooks\admin\useCurrentStaffSession.ts`
- `hooks\admin\useStaffManager.ts`
- `supabase\functions\create-staff-auth\index.ts`
- `utils\superAdmin.ts`
**Aval (edge / RPC)**

- `create-staff-auth`
- `sync_staff_auth_display_name RPC`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `Public Read Staff` | SELECT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `Staff Self Edit` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `tac_cache` (2 policyies)

**Amont (app/scripts)**

- `supabase\functions\check-imei\index.ts`
**Aval (edge / RPC)**

- `check-imei`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `tac_cache_read_all` | SELECT | {public} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_r |
| `tac_cache_write_service` | ALL | {public} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_r |

### `trade_in_models` (4 policyies)

**Amont (app/scripts)**

- `services\trocEvaluationService.ts`
- `supabase\functions\save-trade-in\index.ts`
- `supabase\functions\snapshot-market-prices\index.ts`
**Aval (edge / RPC)**

- `snapshot-market-prices`
- `evaluate-device`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `Public Read Trade Models` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `Public View Argus` | SELECT | {anon,authenticated} | 🟠 `redundant_shadowed` | Couvert par `Public Read Trade Models` ({public} inclut anon |
| `Staff Manage Argus` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `Staff Write Trade Models` | ALL | {authenticated} | 🟡 `redundant_duplicate` | Doublon strict — garder `Staff Manage Argus`. |

### `trade_in_requests` (3 policyies)

**Amont (app/scripts)**

- `components\OrderTracking.tsx`
- `hooks\admin\useTrocManager.ts`
- `services\trocEvaluationService.ts`
- `supabase\functions\check-imei\index.ts`
- `supabase\functions\generate-certificate\index.ts`
- `supabase\functions\save-trade-in\index.ts`
- `supabase\functions\upsert-troc-intake\index.ts`
**Aval (edge / RPC)**

- `save-trade-in`
- `upsert-troc-intake`
**RPC**

- `complete_troc_with_sale_atomic`
- `get_troc_monthly_count`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `staff_delete_trade_in_requests` | DELETE | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `staff_select_trade_in_requests` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `staff_update_trade_in_requests` | UPDATE | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `troc_certificates` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\generate-certificate\index.ts`
**Aval (edge / RPC)**

- `generate-troc-certificate`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `troc_certificates_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_r |

### `troc_payments` (2 policyies)

**Amont (app/scripts)**

- `hooks\admin\useTrocManager.ts`
- `supabase\functions\create-payment\index.ts`
- `supabase\functions\generate-imei-certificate\index.ts`
- `supabase\functions\get-payment-status\index.ts`
- `supabase\functions\payment-webhook\index.ts`
- `supabase\functions\save-trade-in\index.ts`
**Aval (edge / RPC)**

- `create-payment`
- `save-trade-in`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `troc_payments_insert_anon` | INSERT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `troc_payments_select_anon` | SELECT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `troc_sessions` (3 policyies)

**Amont (app/scripts)**

- `hooks\admin\useAdminData.ts`
- `services\trocEvaluationService.ts`
- `supabase\functions\upsert-troc-intake\index.ts`
**Aval (edge / RPC)**

- `save-trade-in`
- `upsert-troc-intake`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `troc_sessions_insert_public` | INSERT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `troc_sessions_select_staff` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `troc_sessions_update_public` | UPDATE | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

## Chaîne cron prix marché

```
pg_cron (lundi 3h)
  → edge snapshot-market-prices (x-cron-secret)
    → lit trade_in_models
    → appelle market-price-intel (forceRefresh)
         → lit/écrit market_price_cache (staff read ; edge en service_role)
    → écrit market_price_snapshots (médiane par site)
  → get-market-trend lit snapshots + trend_cache (évaluation troc)
```

## Historique

| Date | Action |
|---|---|
| 2026-08-23 | Inventaire initial 61 policies + registre |
| 2026-08-23 | Migration `20260823_002_market_price_cache_fix.sql` |
| 2026-08-23 | Colonne **impact réel** par policy (classif. automatique) |

