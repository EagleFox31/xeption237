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
- Ne pas committer `.env` ni secrets.

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

## Règles Cursor complémentaires

- `.cursor/rules/ui-layout-spacing.mdc` — layout sticky / spacing Tailwind
- `.cursor/rules/admin-ux-and-db.mdc` — admin ERP, slugs, textes staff
