# Registre des policies RLS — Xeption Supabase

> Généré le 2026-09-08 depuis la base **live** (`npm run db:policies-export`).
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
| Policies live | **54** |
| Tables sans RLS | **aucune** |
| Groupes de doublons | **0** |

## Impact réel (synthèse)

| Impact | Nb | Signification |
|---|---|---|
| 🟢 `active` | **43** | Active — contrôle un flux client réel |
| 🔵 `bypass_service_role` | **9** | Contournée — accès edge en service_role (RLS bypass) |
| ⚪ `legacy_no_caller` | **1** | Orpheline — aucun appelant dans le code |
| 🟠 `redundant_shadowed` | **1** | Redondante — couverte par une policy `{public}` équivalente |

Légende : 🟢 active · ⚫ RLS off · 🔵 bypass (edge/RPC) · 🟡 doublon strict · 🟠 shadowed par `{public}` · 🟣 flux legacy · ⚪ orpheline

## Inventaire complet (54 policies)

| Table | Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|---|
| `argus` | `argus_read_service` | SELECT | {public} | ⚪ `legacy_no_caller` | Table `argus` sans référence code — policy probablement morte. |
| `bonus_rules` | `bonus_rules_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `brands` | `Public read brands` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `brands` | `brands_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `categories` | `Public View Categories` | SELECT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `categories` | `categories_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `customer_returns` | `customer_returns_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `customers` | `customers_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `delivery_zones` | `Enable read access for all users` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `delivery_zones` | `delivery_zones_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `imei_certif_records` | `imei_certif_records_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `imei_premium_calls` | `imei_premium_calls_admin_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `market_demand_signals` | `market_demand_signals_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `market_price_cache` | `market_price_cache_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `market_price_snapshots` | `market_price_snapshots_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `market_reference_prices` | `market_reference_prices_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `market_reference_prices` | `market_reference_prices_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `market_trend_cache` | `market_trend_cache_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `market_used_offers` | `market_used_offers_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `order_items` | `order_items_staff_all` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `order_payments` | `order_payments_staff_all` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `orders` | `orders_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `packs` | `Packs sont publics` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `packs` | `packs_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `phone_releases` | `phone_releases_public_read` | SELECT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `product_ranges` | `Public read ranges` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `product_ranges` | `product_ranges_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `products` | `products_public_read` | SELECT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `products` | `products_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `repair_tickets` | `repair_tickets_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `sales_targets` | `sales_targets_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `security_events` | `security_events_direction_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `security_events` | `security_events_self_insert` | INSERT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `staff` | `staff_read_members` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `staff` | `staff_write_direction` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `stock_inventory_lines` | `stock_inventory_lines_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `stock_inventory_sessions` | `stock_inventory_sessions_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `stock_movements` | `stock_movements_staff_all` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `stock_reservations` | `stock_reservations_staff_all` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `stock_transfer_items` | `stock_transfer_items_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `stock_transfers` | `stock_transfers_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `store_stock` | `store_stock_staff_all` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `stores` | `stores_staff_all` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `tac_cache` | `tac_cache_read_all` | SELECT | {public} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `tac_cache` | `tac_cache_write_service` | ALL | {public} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `trade_in_models` | `Public Read Trade Models` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `trade_in_models` | `Public View Argus` | SELECT | {anon,authenticated} | 🟠 `redundant_shadowed` | Couvert par `Public Read Trade Models` ({public} inclut anon + authenticated). |
| `trade_in_models` | `trade_in_models_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `trade_in_requests` | `staff_delete_trade_in_requests` | DELETE | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `trade_in_requests` | `staff_select_trade_in_requests` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `trade_in_requests` | `staff_update_trade_in_requests` | UPDATE | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `troc_certificates` | `troc_certificates_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_role (bypass RLS). |
| `troc_payments` | `troc_payments_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `troc_sessions` | `troc_sessions_select_staff` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

## Doublons à fusionner (ne pas recréer)

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

### `bonus_rules` (1 policy)

**Amont (app/scripts)**

_Aucun_
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `bonus_rules_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

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
| `brands_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `categories` (2 policyies)

**Amont (app/scripts)**

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
| `categories_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `customer_returns` (1 policy)

**Amont (app/scripts)**

_Aucun_
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `customer_returns_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `customers` (1 policy)

**Amont (app/scripts)**

- `hooks\admin\useAdminData.ts`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `customers_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

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
| `delivery_zones_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

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

### `market_reference_prices` (2 policyies)

**Amont (app/scripts)**

- `components\admin\tabs\MarketReferenceTab.tsx`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `market_reference_prices_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `market_reference_prices_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `market_trend_cache` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\get-market-trend\index.ts`
**Aval (edge / RPC)**

- `get-market-trend`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `market_trend_cache_staff_read` | SELECT | {authenticated} | 🔵 `bypass_service_role` | Seules les Edge Functions touchent cette table, en service_r |

### `market_used_offers` (1 policy)

**Amont (app/scripts)**

- `scripts\render-market-sources.mjs`
- `supabase\functions\market-price-intel\index.ts`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `market_used_offers_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `order_items` (1 policy)

**Amont (app/scripts)**

- `scripts\verify-erp-step2.mjs`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `order_items_staff_all` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `order_payments` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\_shared\orderPayment.ts`
- `supabase\functions\create-order-payment\index.ts`
- `supabase\functions\get-payment-status\index.ts`
- `supabase\functions\payment-webhook\index.ts`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `order_payments_staff_all` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `orders` (1 policy)

**Amont (app/scripts)**

- `hooks\admin\useAdminData.ts`
- `scripts\apply-migration.mjs`
- `scripts\verify-erp-step2.mjs`
- `supabase\functions\create-order-payment\index.ts`
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
| `orders_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `packs` (2 policyies)

**Amont (app/scripts)**

- `hooks\admin\usePacksManager.ts`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `Packs sont publics` | SELECT | {public} | 🟢 `active` | Active — contrôle un flux client réel |
| `packs_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

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
| `product_ranges_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `products` (2 policyies)

**Amont (app/scripts)**

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
- `scripts\generate-mfoundi-import.mjs`
_+ 9 autres — voir JSON_

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
| `products_public_read` | SELECT | {anon,authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `products_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `repair_tickets` (1 policy)

**Amont (app/scripts)**

- `components\RepairTicketManagement.tsx`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `repair_tickets_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `sales_targets` (1 policy)

**Amont (app/scripts)**

_Aucun_
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `sales_targets_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `security_events` (2 policyies)

**Amont (app/scripts)**

- `services\staffSecurity.ts`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `security_events_direction_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `security_events_self_insert` | INSERT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `staff` (2 policyies)

**Amont (app/scripts)**

- `components\StaffLogin.tsx`
- `hooks\admin\useCurrentStaffSession.ts`
- `hooks\admin\useStaffManager.ts`
- `scripts\qa-check-rls-staff.mjs`
- `supabase\functions\_shared\staffAuth.ts`
- `supabase\functions\create-order-payment\index.ts`
- `supabase\functions\create-staff-auth\index.ts`
**Aval (edge / RPC)**

- `create-staff-auth`
- `sync_staff_auth_display_name RPC`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `staff_read_members` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |
| `staff_write_direction` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `stock_inventory_lines` (1 policy)

**Amont (app/scripts)**

_Aucun_
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `stock_inventory_lines_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `stock_inventory_sessions` (1 policy)

**Amont (app/scripts)**

_Aucun_
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `stock_inventory_sessions_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `stock_movements` (1 policy)

**Amont (app/scripts)**

- `scripts\verify-erp-step2.mjs`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `stock_movements_staff_all` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `stock_reservations` (1 policy)

**Amont (app/scripts)**

_Aucun_
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `stock_reservations_staff_all` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `stock_transfer_items` (1 policy)

**Amont (app/scripts)**

_Aucun_
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `stock_transfer_items_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `stock_transfers` (1 policy)

**Amont (app/scripts)**

_Aucun_
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `stock_transfers_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `store_stock` (1 policy)

**Amont (app/scripts)**

- `scripts\verify-erp-step2.mjs`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `store_stock_staff_all` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `stores` (1 policy)

**Amont (app/scripts)**

- `scripts\verify-erp-step2.mjs`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `stores_staff_all` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

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

### `trade_in_models` (3 policyies)

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
| `trade_in_models_staff_write` | ALL | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `trade_in_requests` (3 policyies)

**Amont (app/scripts)**

- `hooks\admin\useTrocManager.ts`
- `services\trocEvaluationService.ts`
- `supabase\functions\check-imei\index.ts`
- `supabase\functions\create-payment\index.ts`
- `supabase\functions\generate-certificate\index.ts`
- `supabase\functions\save-trade-in\index.ts`
- `supabase\functions\troc-voucher-lookup\index.ts`
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

### `troc_payments` (1 policy)

**Amont (app/scripts)**

- `hooks\admin\useTrocManager.ts`
- `supabase\functions\_shared\orderPayment.ts`
- `supabase\functions\create-payment\index.ts`
- `supabase\functions\generate-imei-certificate\index.ts`
- `supabase\functions\get-payment-status\index.ts`
- `supabase\functions\save-trade-in\index.ts`
**Aval (edge / RPC)**

- `create-payment`
- `save-trade-in`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `troc_payments_staff_read` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

### `troc_sessions` (1 policy)

**Amont (app/scripts)**

- `hooks\admin\useAdminData.ts`
- `supabase\functions\upsert-troc-intake\index.ts`
**Aval (edge / RPC)**

- `save-trade-in`
- `upsert-troc-intake`
**Policies live**

| Policy | CMD | Rôles | Impact | Note |
|---|---|---|---|---|
| `troc_sessions_select_staff` | SELECT | {authenticated} | 🟢 `active` | Active — contrôle un flux client réel |

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
| 2026-09-08 | Inventaire initial 61 policies + registre |
| 2026-09-08 | Migration `20260823_002_market_price_cache_fix.sql` |
| 2026-09-08 | Colonne **impact réel** par policy (classif. automatique) |

