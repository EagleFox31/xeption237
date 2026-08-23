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

## Doublons à fusionner (ne pas recréer)

### Enable… (2 policies identiques)

Signature : `orders|INSERT|{public}|`

Policies actuelles :
- `Enable insert access for all users`
- `Public Insert Orders`

**Canonique recommandée** : garder **une seule** policy avec le nom normalisé ; supprimer les autres après vérif.

### Enable… (2 policies identiques)

Signature : `orders|SELECT|{public}|true`

Policies actuelles :
- `Enable read access for all users`
- `Public Read Orders`

**Canonique recommandée** : garder **une seule** policy avec le nom normalisé ; supprimer les autres après vérif.

### Public… (2 policies identiques)

Signature : `orders|INSERT|{anon,authenticated}|`

Policies actuelles :
- `Public Create Orders`
- `Public insert orders`

**Canonique recommandée** : garder **une seule** policy avec le nom normalisé ; supprimer les autres après vérif.

### Public… (2 policies identiques)

Signature : `orders|SELECT|{anon,authenticated}|true`

Policies actuelles :
- `Public View Own Orders`
- `Public read orders`

**Canonique recommandée** : garder **une seule** policy avec le nom normalisé ; supprimer les autres après vérif.

### Staff… (2 policies identiques)

Signature : `orders|ALL|{authenticated}|true`

Policies actuelles :
- `Staff Full Access Orders`
- `Staff full access orders`

**Canonique recommandée** : garder **une seule** policy avec le nom normalisé ; supprimer les autres après vérif.

### Staff… (3 policies identiques)

Signature : `products|ALL|{authenticated}|true`

Policies actuelles :
- `Staff Full Access Products`
- `Staff Write Products`
- `Staff update products`

**Canonique recommandée** : garder **une seule** policy avec le nom normalisé ; supprimer les autres après vérif.

### Public… (2 policies identiques)

Signature : `repair_tickets|INSERT|{anon,authenticated}|`

Policies actuelles :
- `Public Create Ticket`
- `Public insert tickets`

**Canonique recommandée** : garder **une seule** policy avec le nom normalisé ; supprimer les autres après vérif.

### Staff… (2 policies identiques)

Signature : `repair_tickets|ALL|{authenticated}|true`

Policies actuelles :
- `Staff Manage Tickets`
- `Staff full access tickets`

**Canonique recommandée** : garder **une seule** policy avec le nom normalisé ; supprimer les autres après vérif.

### Staff… (2 policies identiques)

Signature : `trade_in_models|ALL|{authenticated}|true`

Policies actuelles :
- `Staff Manage Argus`
- `Staff Write Trade Models`

**Canonique recommandée** : garder **une seule** policy avec le nom normalisé ; supprimer les autres après vérif.

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

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `argus_read_service` | SELECT | {public} | (auth.role() = 'service_role'::text) |

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

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `Public read brands` | SELECT | {public} | true |
| `Staff manage brands` | ALL | {public} | true |

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

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `Public View Categories` | SELECT | {anon,authenticated} | true |
| `Staff Full Access Categories` | ALL | {authenticated} | true |

### `customers` (4 policyies)

**Amont (app/scripts)**

- `components\AdminPanel.tsx`
- `hooks\admin\useAdminData.ts`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `Public insert` | INSERT | {public} | true |
| `Public read` | SELECT | {public} | true |
| `Public update` | UPDATE | {public} | true |
| `Staff Full Access Customers` | ALL | {authenticated} | true |

### `delivery_zones` (2 policyies)

**Amont (app/scripts)**

- `components\admin\tabs\DeliveryTab.tsx`
- `components\delivery\deliveryZoneUi.tsx`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `Enable read access for all users` | SELECT | {public} | true |
| `Enable write access for authenticated users` | ALL | {public} | (auth.role() = 'authenticated'::text) |

### `imei_certif_records` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\generate-imei-certificate\index.ts`
**Aval (edge / RPC)**

- `generate-imei-certificate`
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `imei_certif_records_staff_read` | SELECT | {authenticated} | true |

### `imei_premium_calls` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\check-imei\index.ts`
**Aval (edge / RPC)**

- `check-imei`
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `imei_premium_calls_admin_read` | SELECT | {authenticated} | true |

### `market_demand_signals` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\get-market-trend\index.ts`
**Aval (edge / RPC)**

- `get-market-trend`
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `market_demand_signals_staff_read` | SELECT | {authenticated} | true |

### `market_price_cache` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\market-price-intel\index.ts`
**Aval (edge / RPC)**

- `market-price-intel`
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `market_price_cache_staff_read` | SELECT | {authenticated} | (EXISTS ( SELECT 1
   FROM staff s
  WHE |

### `market_price_snapshots` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\get-market-trend\index.ts`
- `supabase\functions\snapshot-market-prices\index.ts`
**Aval (edge / RPC)**

- `get-market-trend`
- `snapshot-market-prices`
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `market_price_snapshots_staff_read` | SELECT | {authenticated} | true |

### `market_trend_cache` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\get-market-trend\index.ts`
**Aval (edge / RPC)**

- `get-market-trend`
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `market_trend_cache_staff_read` | SELECT | {authenticated} | true |

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

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `Enable insert access for all users` | INSERT | {public} | true |
| `Enable read access for all users` | SELECT | {public} | true |
| `Enable update access for all users` | UPDATE | {public} | true |
| `Public Create Orders` | INSERT | {anon,authenticated} | true |
| `Public Insert Orders` | INSERT | {public} | true |
| `Public Read Orders` | SELECT | {public} | true |
| `Public View Own Orders` | SELECT | {anon,authenticated} | true |
| `Public insert orders` | INSERT | {anon,authenticated} | true |
| `Public read orders` | SELECT | {anon,authenticated} | true |
| `Staff Full Access Orders` | ALL | {authenticated} | true |
| `Staff full access orders` | ALL | {authenticated} | true |

### `packs` (2 policyies)

**Amont (app/scripts)**

- `hooks\admin\usePacksManager.ts`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `Packs sont publics` | SELECT | {public} | true |
| `Staff peut tout gérer` | ALL | {public} | (auth.role() = 'authenticated'::text) |

### `phone_releases` (1 policy)

**Amont (app/scripts)**

- `scripts\batch-enrich-release-year.mjs`
- `scripts\import-phone-releases.mjs`
- `services\trocEvaluationService.ts`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `phone_releases_public_read` | SELECT | {anon,authenticated} | true |

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

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `Public read ranges` | SELECT | {public} | true |
| `Staff manage ranges` | ALL | {public} | true |

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

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `Public Read Products` | SELECT | {public} | true |
| `Public View Products` | SELECT | {anon,authenticated} | true |
| `Staff Full Access Products` | ALL | {authenticated} | true |
| `Staff Write Products` | ALL | {authenticated} | true |
| `Staff update products` | ALL | {authenticated} | true |
| `TEMP: authenticated can insert products` | INSERT | {authenticated} | true |

### `repair_tickets` (6 policyies)

**Amont (app/scripts)**

- `components\RepairTicketManagement.tsx`
**Aval (edge / RPC)**

_Aucun_
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `Public Create Ticket` | INSERT | {anon,authenticated} | true |
| `Public can create tickets` | INSERT | {public} | true |
| `Public insert tickets` | INSERT | {anon,authenticated} | true |
| `Staff Manage Tickets` | ALL | {authenticated} | true |
| `Staff can manage tickets` | ALL | {public} | (auth.role() = 'authenticated'::text) |
| `Staff full access tickets` | ALL | {authenticated} | true |

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

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `Public Read Staff` | SELECT | {anon,authenticated} | true |
| `Staff Self Edit` | ALL | {authenticated} | true |

### `tac_cache` (2 policyies)

**Amont (app/scripts)**

- `supabase\functions\check-imei\index.ts`
**Aval (edge / RPC)**

- `check-imei`
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `tac_cache_read_all` | SELECT | {public} | true |
| `tac_cache_write_service` | ALL | {public} | (auth.role() = 'service_role'::text) |

### `trade_in_models` (4 policyies)

**Amont (app/scripts)**

- `services\trocEvaluationService.ts`
- `supabase\functions\save-trade-in\index.ts`
- `supabase\functions\snapshot-market-prices\index.ts`
**Aval (edge / RPC)**

- `snapshot-market-prices`
- `evaluate-device`
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `Public Read Trade Models` | SELECT | {public} | true |
| `Public View Argus` | SELECT | {anon,authenticated} | true |
| `Staff Manage Argus` | ALL | {authenticated} | true |
| `Staff Write Trade Models` | ALL | {authenticated} | true |

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

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `staff_delete_trade_in_requests` | DELETE | {authenticated} | (EXISTS ( SELECT 1
   FROM staff s
  WHE |
| `staff_select_trade_in_requests` | SELECT | {authenticated} | (EXISTS ( SELECT 1
   FROM staff s
  WHE |
| `staff_update_trade_in_requests` | UPDATE | {authenticated} | (EXISTS ( SELECT 1
   FROM staff s
  WHE |

### `troc_certificates` (1 policy)

**Amont (app/scripts)**

- `supabase\functions\generate-certificate\index.ts`
**Aval (edge / RPC)**

- `generate-troc-certificate`
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `troc_certificates_staff_read` | SELECT | {authenticated} | true |

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

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `troc_payments_insert_anon` | INSERT | {anon,authenticated} | true |
| `troc_payments_select_anon` | SELECT | {anon,authenticated} | true |

### `troc_sessions` (3 policyies)

**Amont (app/scripts)**

- `hooks\admin\useAdminData.ts`
- `services\trocEvaluationService.ts`
- `supabase\functions\upsert-troc-intake\index.ts`
**Aval (edge / RPC)**

- `save-trade-in`
- `upsert-troc-intake`
**Policies live**

| Policy | CMD | Rôles | Qual |
|---|---|---|---|
| `troc_sessions_insert_public` | INSERT | {anon,authenticated} | true |
| `troc_sessions_select_staff` | SELECT | {authenticated} | (EXISTS ( SELECT 1
   FROM staff s
  WHE |
| `troc_sessions_update_public` | UPDATE | {anon,authenticated} | true |

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

