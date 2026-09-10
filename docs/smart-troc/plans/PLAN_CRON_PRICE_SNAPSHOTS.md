# Plan — Cron de snapshots de prix marché (Smart Troc)

> Objectif : **posséder** notre historique de prix au lieu de **louer** de la donnée fragile (Wayback) ou morte (Bing).
> Un job hebdomadaire capture le prix actuel de chaque modèle tradeable → après ~3 mois, `get-market-trend` calcule de vraies tendances récent-vs-ancien depuis NOTRE base.
> Statut : conception (pas encore implémenté). Date : 2026-06-15.

---

## 1. Le constat qui justifie ce cron

`get-market-trend` a une cascade à 4 niveaux, mais en pratique :
- **Bing** : API retirée par Microsoft (août 2025) → couche morte.
- **Wayback** : rarement des captures Jumia aux 2 dates nécessaires → rendement quasi nul.
- **Fallback âge** : ce que le client voit ~99% du temps = une heuristique sur le numéro de modèle, pas une vraie tendance.

**La racine** : `get-market-trend` ÉTAPE 1 lit `market_price_snapshots`, mais **personne ne remplit cette table** régulièrement. Le cron comble exactement ce trou.

---

## 2. Principe (élégance : zéro changement sur get-market-trend)

```
┌─────────────┐   hebdo    ┌──────────────────────────┐   écrit   ┌────────────────────────┐
│  pg_cron    │ ─────────▶ │ Edge: snapshot-market-    │ ────────▶ │ market_price_snapshots │
│ (Supabase)  │  pg_net    │ prices  (worker)         │  upsert   │  (source='jumia_live') │
└─────────────┘            └──────────────────────────┘           └───────────┬────────────┘
                                                                               │ lit déjà
                                                                               ▼
                                                                   ┌────────────────────────┐
                                                                   │  get-market-trend       │
                                                                   │  ÉTAPE 1 (DB snapshots) │ ← devient enfin utile
                                                                   └────────────────────────┘
```

`get-market-trend` lit déjà `market_price_snapshots` (recent ≤30j, old 90-240j). **Aucune ligne à y changer.** On nourrit la table, le reste suit.

---

## 3. Composants à créer

### 3.1 Edge Function `snapshot-market-prices` (le worker)

**Rôle** : itérer sur les modèles tradeables, récupérer le prix du jour, écrire un snapshot.

**Source des modèles** : table `trade_in_models` (la liste Argus canonique, déjà utilisée par `fetchArgusModels`). Pas la catalogue produits (≠ ce que les clients troquent).

**Acquisition du prix** : réutiliser `market-price-intel` (DRY — ne pas réécrire le scraping). Pour chaque modèle :
1. `invoke('market-price-intel', { deviceBrand, deviceModel, forceRefresh:true })`
2. récupérer `referencePrice`
3. si valide (> 0) → upsert dans `market_price_snapshots` :
   ```
   { model_key, source:'jumia_live', snapshot_date: today, price_xaf: referencePrice, confidence: 0.8 }
   ```

> `model_key` doit être calculé avec **la même fonction de normalisation** que `get-market-trend.buildModelKey` (sinon les clés ne matchent pas et la lecture échoue). → extraire `buildModelKey` dans `_shared/` et l'importer des deux côtés (DRY + évite le bug silencieux de clés divergentes).

**Idempotence** : l'index unique `(model_key, source, snapshot_date)` existe déjà → upsert `Prefer: resolution=ignore-duplicates`. Re-run le même jour = sans effet.

**Garde-fou anti-abus** : la fonction déclenche du scraping (coût + charge). Elle DOIT exiger un secret :
- header `x-cron-secret` comparé à `Deno.env.get('CRON_SECRET')`
- sinon `401`. pg_cron passe le secret ; un appel public est rejeté.

**Throttling / coût** : `BATCH_DELAY_MS` entre modèles (ex. 1500 ms) pour respecter les rate limits Gemini (chaque `market-price-intel` fait 1 appel Gemini de filtrage). Paramétrer `MAX_MODELS_PER_RUN` pour plafonner.

**Rotation (option coût)** : si la liste est grande, traiter 1/N des modèles par run via un curseur (colonne `last_snapshot_at` sur `trade_in_models`), en commençant par les plus anciens. ⚠️ Mais `get-market-trend` veut du récent ≤30j → ne pas espacer un modèle de plus de ~3-4 semaines. Donc viser **tous les modèles / semaine** si le volume le permet.

**Observabilité** : retourner et logger un résumé `{ processed, written, skipped, failed, durationMs }`.

### 3.2 Trigger pg_cron + pg_net (migration SQL)

```sql
-- Activer les extensions (une fois)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Job hebdo : lundi 03:00 (heure serveur)
select cron.schedule(
  'snapshot-market-prices-weekly',
  '0 3 * * 1',
  $$
  select net.http_post(
    url     := 'https://<PROJECT>.supabase.co/functions/v1/snapshot-market-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body    := '{}'::jsonb
  );
  $$
);
```

### 3.3 (Petite) migration de contrainte — si besoin

Le `CHECK` actuel autorise `source IN ('wayback_jumia','jumia_live','jiji_live','common_crawl','manual')`.
→ `jumia_live` convient pour le prix agrégé quotidien. Si on veut tracer la vraie provenance multi-sites (glotelho/kmerphone), ajouter ces valeurs au CHECK dans une migration.

---

## 4. Attente réaliste (à dire au boss)

- **Semaine 0** : le cron commence à remplir les snapshots « récents ».
- **Tant que < 90 jours d'historique** : `get-market-trend` n'a pas encore de point « ancien » → continue sur le fallback âge. **Normal.**
- **À partir de ~3 mois** : recent (≤30j) ET old (90-240j) existent → **vraies tendances calculées depuis notre data**, sans Wayback ni Bing.
- Ensuite ça s'améliore tout seul chaque semaine. **On possède la donnée.**

---

## 5. Coût

- N modèles × 1 appel `market-price-intel`/semaine. Chaque appel = jusqu'à 3 fetchs HTTP + 1 appel Gemini Flash (filtrage).
- Ex. 150 modèles → 150 appels Gemini/semaine = **quelques centimes/semaine**. Négligeable.
- Aucune dépendance payante nouvelle (réutilise Gemini déjà en place). pg_cron/pg_net inclus dans Supabase.

---

## 6. Sécurité

- Worker protégé par `CRON_SECRET` (header) → pas d'abus public du scraping.
- Écritures via `SUPABASE_SERVICE_ROLE_KEY` (RLS n'autorise que le SELECT authentifié ; le worker écrit en service role comme les autres edge functions).
- Secret stocké en Supabase secret, jamais commité.

---

## 7. Découpage de livraison

| Étape | Contenu | Statut |
|---|---|---|
| 1 | Extraire `buildModelKey` dans `_shared/marketKey.ts`, l'importer dans `get-market-trend` | ✅ codé (tsc OK) |
| 2 | Migration CHECK source → `glotelho_live`, `kmerphone_live` (`20260615_001_…`) | ✅ codé |
| 3 | Edge `snapshot-market-prices` : modèles `trade_in_models`, garde `CRON_SECRET`, réutilise `market-price-intel`, médiane par site, upsert, background `waitUntil` | ✅ codé (tsc OK) |
| 4 | Migration pg_cron template (`20260615_002_…`) + fallback GitHub Actions (`.github/workflows/…yml.example`) | ✅ codé |
| **À FAIRE côté humain (déploiement)** | | |
| 5 | Vérifier pg_cron activable (cf. §8.4). Sinon activer le workflow GitHub Actions | ⏳ |
| 6 | `supabase secrets set CRON_SECRET=<aléatoire long>` | ⏳ |
| 7 | Appliquer les 2 migrations (`npm run db:apply -- supabase/migrations/20260615_001_…` puis `…_002_…` avec `<PROJECT_REF>`/`<CRON_SECRET>` remplis) | ⏳ |
| 8 | `supabase functions deploy snapshot-market-prices` | ⏳ |
| 9 | Test manuel : `curl -X POST .../snapshot-market-prices -H "x-cron-secret: …"` → vérifier lignes dans `market_price_snapshots` | ⏳ |
| 10 | (option) onglet admin : historique de prix par modèle | — |

> Rappel : sans secret valide, la fonction renvoie 401 (anti-abus). Le 1er run remplit les snapshots « récents » ; les vraies tendances calculées arrivent après ~3 mois (cf. §4).

---

## 8. Décisions (tranchées 2026-06-15)

1. **Cadence** : ✅ **hebdomadaire** (lundi 03:00).
2. **Périmètre** : ✅ **tous les modèles** — `trade_in_models` compte **32 lignes**. Volume trivial → pas de rotation, on snapshot les 32 chaque semaine (~48 s avec délai 1,5 s).
3. **Multi-source** : ✅ **séparé** — tracer `jumia_live`, `glotelho_live`, `kmerphone_live` distinctement → migration pour étendre le `CHECK` de `market_price_snapshots.source`.
4. **pg_cron** : ⏳ **à vérifier**. Test SQL à lancer dans le SQL Editor Supabase :
   ```sql
   select * from pg_extension where extname in ('pg_cron','pg_net');
   -- vide → exécuter : create extension if not exists pg_cron; create extension if not exists pg_net;
   -- si refusé par le plan → fallback GitHub Actions (cron YAML appelant la même edge function).
   ```

> **Multi-source sans re-scraper (DRY)** : `market-price-intel` renvoie déjà `offers[]` où chaque offre porte `{ source, price }` (sites `jumia.cm`, `glotelho.cm`, `kmerphone.com`). Le worker appelle `market-price-intel` **une fois par modèle**, **groupe les offres par source**, calcule la **médiane par site**, et écrit **1 snapshot par site** (jusqu'à 3/modèle/semaine). On réutilise tout le scraper + filtrage Gemini + anti-outliers existant — zéro duplication.
>
> Mapping source : `jumia.cm`→`jumia_live`, `glotelho.cm`→`glotelho_live`, `kmerphone.com`→`kmerphone_live`. Les offres d'autres provenances (DuckDuckGo) sont ignorées pour les snapshots (moins structurées).
