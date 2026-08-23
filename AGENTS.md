# Xeption 237 — instructions Agent

App e-commerce + ERP staff + Studio créateur. Code principal dans ce dossier (`xeption237/`).

## Principe directeur — penser senior avant de coder

Avant d'écrire une ligne, se demander : **que ferait un développeur senior 15 ans d'expérience (front, back, serverless, infra, QA, créativité produit) ? Comment le ferait-il ? Comment l'orchestrerait-il ?**

**Principes fondateurs** — appliqués avec discernement (KISS/YAGNI arbitrent en cas de tension) :
- **SOLID** : responsabilité unique, ouvert/fermé, Liskov, ségrégation d'interface, inversion de dépendance — y compris pour composants/hooks React et Edge Functions.
- **DRY** : factoriser la vraie duplication, sans couplage artificiel.
- **KISS** : la solution la plus simple qui répond au besoin réel ; simplicité > cleverness.
- **Réutilisabilité / Lego / app factory** : briques combinables et paramétrables, pas du copié-collé jetable.

**Process** :
- **SDLC** : penser le cycle complet (besoin → design → impl → test → déploiement → maintenance), anticiper l'exploitation.
- **TDD** : pour la logique métier/utils, le test cadre le design et révèle les vrais bugs.
- **BDD** : comportement en scénarios Given/When/Then (cf. `tests/features/*.feature.test.ts`) pour les flows utilisateur.

**Pratique** :
- **Architecture** : code réutilisable dans `utils/`, pas inline dans une page/composant ; responsabilités séparées.
- **Pas de dépendances circulaires** : imports unidirectionnels (utils → services → hooks → composants → pages). Une circularité = mauvaise frontière de responsabilité → extraire le partagé dans un module neutre.
- **Design patterns à bon escient** : appliquer le pattern qui clarifie/découple (Strategy, Factory, Adapter, Observer, Repository, Facade, custom hooks…) **sans sur-architecturer** (pas de cargo-cult, YAGNI).
- **Lisibilité** : nommer les constantes (jamais de magic numbers nus), commenter le *pourquoi* d'un algo non trivial.
- **Robustesse** : traiter les edge cases (vide, null, frontières de dates/semaines) ; ne pas muter les entrées.
- **Testabilité** : injecter les dépendances (ex. `now = new Date()` en paramètre) et écrire le test unitaire.
- **Observabilité** : logs qui gardent l'info utile (passer l'objet `error`, pas seulement `error.message`).
- **Créativité produit** : viser la meilleure solution UX, pas la première qui compile.
- **Recherche quand on est coincé** : chercher en ligne (docs officielles, issues, SO) plutôt que deviner en boucle.
- **Journal d'erreurs** : consigner **chaque** erreur dans [`docs/engineering/ERRORS_LOG.md`](./docs/engineering/ERRORS_LOG.md) — symptôme, cause racine, résolution, **et comment ne plus la refaire**. Le consulter quand une erreur semble déjà vue.

Objectif : niveau senior sans réserve, pas « ça marche ».

## Stack

- React 18 + Vite + TypeScript + React Router
- Tailwind via CDN (`index.html`) — pas de `tailwind.config` local
- Supabase (Auth, DB, Edge Functions)
- Tests : Vitest (`npm test`)

## Documentation

Toute la doc projet est dans [`docs/`](./docs/) (index : [`docs/README.md`](./docs/README.md)) — `strategy/`, `smart-troc/` (plans, roadmap, testing), `plans/`, `engineering/`. Seuls `AGENTS.md` et `README.md` restent à la racine.

## Où modifier quoi

| Zone | Routes | Fichiers clés |
|------|--------|----------------|
| Boutique publique | `/`, `/shop`, `/product/*` | `pages/HomePage.tsx`, `components/ProductList.tsx`, `components/ProductDetail.tsx`, `components/Hero.tsx` |
| ERP staff | `/admin` | `pages/AdminPage.tsx`, `components/admin/`, `adminMenuConfig.ts` |
| Studio créateur | `/studio` | `pages/StudioPage.tsx`, `components/studio/`, `studioMenuConfig.ts` |
| Troc | `/troc` | `components/TrocSection.tsx`, `components/troc/` |
| Ingestion catalogue | scripts | `services/productIngestionFunnel.ts`, `scripts/product-ingestion-funnel.mjs` |

**Studio ≠ ERP** : funnel import produits et outils créateur → Studio seulement, pas l’admin ERP.

## Produits & catalogue

- **Affichage nom** : toujours `getProductDisplayName()` (`utils/productDisplay.ts`) — pas `product.name` brut dans l’UI.
- **Orthographe Samsung** : `Galaxie` → `Galaxy` via `normalizeSamsungGalaxySpelling()` ; ne pas réintroduire « Galaxie » dans les noms affichés.
- **Marque** : `resolveProductBrandId()` + `canonicalizeBrandKey()` (`utils/productBrand.ts`) — une seule entrée **Samsung** (pas Samsung + Samsung Galaxy).
- **Étoiles / avis** : afficher seulement si `product.reviews?.length > 0` — pas `rating || 5` sur les cards.
- **Descriptions faibles** : `utils/productDescription.ts` / `isWeakProductDescription()` — stubs Mfoundi = vide.
- **Enrichissement IA** : DeepSeek (`services/deepseekClient.ts`, `geminiService.ts` → DeepSeek) — pas Gemini pour specs/descriptions.

## Catégories Supabase (slugs)

Utiliser `constants/dbSchema.ts` → `CATEGORY_SLUGS` :

- Smartphones : `phones` (pas `smartphones`)
- Tablettes : `tablettes`
- Ordinateurs : `ordinateurs`
- Accessoires : `accessories`

FK `products.category` et `product_ranges.category` → `categories.slug`.

## UI boutique (mobile)

- Filtres shop mobile : `<select>` natifs, Type + Marque sur **une ligne** (`ProductList.tsx`).
- Bandeau shop sticky : gap visible sous le bandeau = parent `flex` + `gap`, pas gros `padding-bottom` dans le même fond noir (voir `.cursor/rules/ui-layout-spacing.mdc`).
- Fiche produit : image carrée raisonnable + titre visible au-dessus — pas hero 68vh qui masque le nom.

## Base de données

- Migrations : `supabase/migrations/` — appliquer avec `npm run db:apply -- supabase/migrations/xxx.sql`
- **Toute nouvelle RPC `SECURITY DEFINER`** : Postgres accorde `EXECUTE` à `PUBLIC` par défaut (`anon` en hérite). En fin de migration : `REVOKE ALL ON FUNCTION … FROM PUBLIC, anon` puis `GRANT` explicite. Vérifier avec `npm run db:inventory` (section « RPC exécutable par anon sans garde staff »).
- Ne pas committer `.env` ni secrets.
- **Outils d'inspection (READ-ONLY)** — connexion partagée `scripts/lib/supabaseDbUrl.mjs` :
  - `npm run db:introspect -- <table> [col1,col2]` → colonnes+types, index, contraintes/FK (à lancer AVANT une migration).
  - `npm run db:troc:latest -- [N]` → derniers dossiers `trade_in_requests` avec la liaison Smart Troc (client + départ + voucher + cible + échéance).
  - `npm run db:status` → migrations appliquées / en attente / fichier modifié après application.
  - `npm run db:verify` → diff **fichiers → base** : les objets déclarés par les migrations existent-ils réellement ? (les migrations purement DML sont signalées « non vérifiables »).
  - `npm run db:inventory [-- --full]` → diff **base → fichiers** : inventaire réel (tables, vues, fonctions, triggers, policies, extensions, enums, jobs cron), tables **sans RLS**, et objets **absents des migrations** (créés à la main).

⚠️ **Tout script `.mjs` ad hoc qui parle à la base DOIT charger `.env`** :
`dotenv.config({ path: resolve(root, '.env') })`. Sans ça `DATABASE_URL` est vide,
`resolveDatabaseUrl` fabrique une URL bancale et l'erreur renvoyée est trompeuse
(« The server does not support SSL connections » / `ETIMEDOUT`) — on croit à un souci
réseau alors que c'est le fichier `.env` qui n'a pas été lu. Voir `db-introspect.mjs` pour le
motif correct.

### RÈGLE — vérifier la base RÉELLE avant d'écrire une migration

✅ **Depuis le 21/08/2026, `scripts/apply-migration.mjs` tient un suivi** (table
`public.schema_migrations` : version = nom du fichier, + checksum SHA-256). Une migration déjà
enregistrée est **sautée** ; si son fichier a changé depuis, le script **refuse** (le disque et
la prod ont divergé → écrire une NOUVELLE migration, pas éditer l'ancienne). Options :
`--force`, `--no-track`, `--baseline`, `--status`.

⚠️ **Mais le suivi ne rend pas le dossier fiable pour autant.** Les 49 fichiers existants ont
été **baselinés** (marqués appliqués sans être exécutés) sur la foi de l'état observé, et des
migrations ont historiquement été passées **à la main dans le SQL editor Supabase**. `db:inventory`
montre d'ailleurs 4 tables (`customers`, `repair_tickets`, `packs`, `order_payments`) et
2 fonctions qui n'ont **aucun fichier de migration**.

**Donc la règle ne change pas : toujours introspecter la base prod (lecture seule) avant d'écrire
une migration** — jamais deviner le schéma depuis les fichiers de migration ou les types TS.

**1. Introspecter (READ-ONLY)** — via `DATABASE_URL` (dans `.env`) + module `pg` (installé). N'exécuter que des `SELECT`, jamais d'écriture. Requêtes clés (remplacer `<table>`) :
- Table existe : `select to_regclass('public.<table>')`
- Colonnes + **types réels** : `select column_name, data_type, udt_name, is_nullable, column_default from information_schema.columns where table_schema='public' and table_name='<table>'`
- Index existants (noms) : `select indexname from pg_indexes where schemaname='public' and tablename='<table>'`
- Contraintes/FK : `select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.<table>'::regclass`

**2. Vérifier les TYPES de colonnes** — ne pas supposer. Précédents réels de ce projet : `products.id` est **`text`** (valeurs de forme UUID), alors que `trade_in_requests.trade_in_model_id` est **`uuid`**. Le type d'une colonne de **liaison** doit **matcher exactement** la colonne référencée, sinon l'insert est rejeté à l'exécution. En doute `text` vs `uuid` : prendre le type réel de la cible (`text` accepte tout ; `uuid` rejette un non-uuid → casse les inserts).

**3. Garantir l'IDEMPOTENCE** — la migration doit être **rejouable** sans erreur (pas de suivi + edits manuels possibles) :
- `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `DROP ... IF EXISTS`.
- Envelopper dans `BEGIN; … COMMIT;` (rollback total si une instruction échoue).
- `IF NOT EXISTS` teste par **nom seulement**, pas le type : si une colonne existe déjà avec un **type différent** (créée à la main), l'ADD devient un no-op silencieux — d'où l'étape 1 obligatoire.

**4. Vérifier la LIAISON des tables** — si FK : confirmer que table + colonne cible existent, que les types matchent, et choisir `ON DELETE` **consciemment** (`SET NULL` / `CASCADE` / `RESTRICT`). Si le type de la cible est incertain ou qu'aucune FK stricte n'est voulue : colonne simple (sans FK) + intégrité applicative + **snapshot dénormalisé** du libellé (ex. `target_product_name`) pour la lisibilité et la survie au renommage/suppression.

**5. Rester ADDITIF par défaut** — pas de `DROP COLUMN` / `ALTER … TYPE` / `UPDATE` / `DELETE` sur des données existantes sans intention explicite (et sauvegarde). Une colonne ajoutée est **nullable** ou a un `DEFAULT`.

**6. ORDRE de déploiement** — appliquer la migration **AVANT** tout code (edge function / app) qui écrit dans les nouvelles colonnes. Sinon les inserts échouent (colonne inexistante).

**7. Re-vérifier après** — ré-introspecter pour confirmer que colonnes/index/FK sont bien créés comme prévu.

## Déploiement Edge Functions — RÈGLE

**Toujours** déployer avec ces flags (convention projet, ne pas omettre `--no-verify-jwt`) :

```
npx supabase functions deploy <nom> --project-ref tawnusmfyvugqczaydat --no-verify-jwt --use-api --workdir .
```

- `--no-verify-jwt` : standard du projet (l'auth se fait dans la fonction : `validateBody`, secret cron, etc.). Ne pas proposer de l'enlever pour un déploiement de routine.
- `--use-api` : bundle sans Docker (Windows).
- Project ref : `tawnusmfyvugqczaydat`.

## Git & livraison

- **Ne pas commit** sans demande explicite du user.
- **Ne pas push** sans demande explicite.
- Diffs minimaux : pas de refactor hors scope.

## Prompts efficaces (ce projet)

1. Objectif en une ligne + fichiers si connus (`@ProductList.tsx`).
2. Critères d’acceptation (mobile/desktop, français UI).
3. Petites tâches : un levier UX à la fois (CTAs hero, filtres, orthographe…).
4. Plan mode pour refactors multi-fichiers (bento grid, témoignages, sticky CTA global).

## Fichiers canoniques à lire avant gros changements

- `utils/productDisplay.ts` — noms, badges, Galaxy
- `utils/productBrand.ts` — filtres marque
- `components/ProductList.tsx` — shop / filtres / grille
- `components/Hero.tsx` — hero mobile vs desktop
- `services/productIngestionFunnel.ts` — import catalogue

## Gestion des erreurs

- Erreurs user-facing → `notifyError(message, description?)` / `notifySuccess` / `notifyInfo` depuis `utils/notify.ts` (wrapper sonner). **Pas** `console.error` direct dans les hooks ou composants publics.
- `ErrorBoundary` (`components/ErrorBoundary.tsx`) wrape `<main>` dans `App.tsx` — le Header reste accessible en cas de crash de page.

## Hero — CTAs

- **2 CTAs max** dans le hero : Explorer (primaire or) + Estimer mon téléphone / Troc (secondaire bordure or).
- "Promos" retiré du hero — accessible via le header. `onPromos` supprimé de `HeroProps`.

## TrocMonthlyCounter

- Seuil d'affichage : **50** (pas 500). En dessous → `null`. Plages : 50-499 = message soft, 500-999 = "temps réel", ≥1000 = chiffre réel.
- Fichier : `components/troc/TrocMonthlyCounter.tsx` + hook `hooks/useTrocMonthlyCounter.ts`.

## Troc — prix & acceptation (`utils/trocPricing.ts`)

- Formule : `reprise_crédit = base_price × BASE_VALUE_MULTIPLIER(0,60) × (état/100) × désirabilité` ; `cash = crédit ÷ (1 + CASH_DISCOUNT(0,18))`. Politique boss = serré ("amortissement dès la sortie boutique").
- **Plancher digne** `DIGNIFIED_FLOOR_XAF` (15 000) : un appareil **accepté** n'a jamais une offre humiliante ; mais une valeur calculée ~0 → **refus** (pas de plancher à perte).
- **Bonus crédit affiché** = `CREDIT_BONUS_PERCENT` (dérivé de `CASH_DISCOUNT`) — ne jamais hardcoder le %.
- **Le catalogue prime sur l'âge** : un modèle dans `trade_in_models` (= `base_price` fourni en entrée, `isCatalogModel`) est acheté **quel que soit son âge**. La règle des **8 ans** (`too_old`) ne gate que le **hors-catalogue** (modèles tapés à la main). Le plancher d'acceptation = le plus vieux modèle du catalogue (le staff le décide en ajoutant/retirant un modèle, pas le calendrier).
- Année de sortie : `phone_releases` (seed + `scripts/import-phone-releases.mjs`). `release_year` null → pas de blocage d'âge.
- Aligner **client** (`trocPricing.ts`) ET **serveur** (`supabase/functions/save-trade-in/index.ts`, copie de `computeOfferV2`) sur les mêmes constantes.

## Troc — ce qui est RÉELLEMENT branché (anti-confusion, ne plus se tromper)

- **Version active = formulaire** : `components/troc/TrocQuickForm.tsx` (via `pages/TrocPage.tsx`).
  Le **chat** `components/troc/chat/TrocChatFlow.tsx` **existe mais n'est PAS branché** sur la page —
  ne pas s'y référer pour décrire le flow réel.
- **Stepper affiché** (`STEP_LABELS_QUICK`, `TrocPage.tsx`) : **Appareil → Photos → Paiement → Résultat → Bon**.
  ⚠️ **« Paiement » vient AVANT « Résultat »** = c'est le **frais de service** de l'évaluation
  (symbolique), **pas** le paiement d'un appareil. C'est le seul paiement en ligne du parcours.
- ⛔ **La possession n'est PLUS gérée dans le nouveau troc.** Les champs `ownership_rank`,
  `device_age_months`, `purchase_date`, `ownership_adjustment_factor` (types `TradeInRequest` /
  `TrocDeviceForm`) sont **legacy** — présents dans les types mais **non utilisés** par le flow
  actuel. **Ne rien construire dessus.**
- **Âge / récence = `release_year`**, jamais la possession :
  - appareil **repris** → `phone_releases.release_year` (via `getReleaseYear` dans `trocEvaluationService.ts`) ;
  - produit **catalogue cible** → `products.releaseYear` (colonne `release_year`, récemment ajoutée).
- **Voucher / rachat boutique** : réutiliser l'existant — `TradeInRequest.voucher_reference` (code) +
  `status` (`'validated' | 'completed'`) + `admin_notes`. Ne pas réinventer un système de voucher.
- **Appareil cible (Smart Troc) = MÊME dossier `trade_in_requests`**, pas de table séparée :
  colonnes `target_product_id`, `target_product_name` (snapshot), `voucher_expires_at`. Validité du
  bon = `utils/trocVoucher.ts` (barème 7/10/14 j selon `release_year` du repris). Chaîne d'acceptation :
  `TrocUpgradeChoice.onSelect` → `EvaluationResult.onAcceptOffer(target)` → `useTradeIn.acceptOffer/persist(target)`
  → `saveTradeInRequest(..., target)` → body `save-trade-in`.
  ⚠️ **Ordre de déploiement** : migration `20260721_002_...` **avant** redéploiement de `save-trade-in`
  (sinon l'insert échoue sur colonne inexistante). Tranche 3 (rachat boutique staff) = à faire.
- Plan + état d'implémentation : `docs/smart-troc/plans/plan-troc-choix-appareil-cible.md`.

## Règles Cursor complémentaires

- `.cursor/rules/ui-layout-spacing.mdc` — layout sticky / spacing Tailwind
- `.cursor/rules/admin-ux-and-db.mdc` — admin ERP, slugs, textes staff

## Règles d'architecture IMEI & Cadrage (leçons d'ingénierie)

1. **Introspection préalable de la codebase ET de la DB réelles** : Toujours vérifier si les tables, colonnes, types, helpers (`TrocQuickForm.tsx`, `check-imei`, etc.) existent déjà **avant** de concevoir un plan ou une migration.
2. **Realpolitik Web / Captcha (Turnstile)** : Ne jamais planifier un scraping serveur automatisé contre un site externe protégé par Captcha/Turnstile sans jeton d'API officiel. Les requêtes serveur échouent à 100%.
3. **Sécurité financière (Sources Opposables)** : Seule une source certifiée (`staff_verified`, `csv_batch`, `official_api`) peut engager un pricing ferme ou un déblocage de fonds. Une saisie client en ligne (`user_declarative`) est purement **indicative**.
4. **Frontières d'exécution étanches (Vite vs Deno)** : Pas d'import `utils/` depuis `supabase/functions/`. Factoriser en 2 helpers distincts : `utils/imei.ts` pour le Front React, `supabase/functions/_shared/imei.ts` pour Deno.
5. **Orthogonalité des données** : Le statut douanier (`customsStatus`) est un bloc parallèle d'enrichissement. Il ne fait **pas** partie de la cascade de fallback d'identité TAC (pour ne pas casser l'autocomplétion des modèles).
6. **Migrations SQL additives & RLS** : Ne pas altérer les contraintes `CHECK` existantes (ex: `trade_in_requests_status_check`). Porter les sous-statuts spécifiques sur des colonnes dédiées (`camcis_status`). Activer `ENABLE ROW LEVEL SECURITY` sur toute table cache contenant des IMEI (`camcis_imei_cache`).

