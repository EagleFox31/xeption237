# Plan d'implémentation — sources de prix marché (points 1 à 4)

**Date** : 2026-08-25
**Décision** : les quatre points de `docs/next-step/SOURCES_PRIX_MARCHE.md` sont retenus.
**Statut** : en cours.

---

## Ordre retenu, et pourquoi

`2 → 1 → 3 → 4`.

Le parseur (2) vient en premier parce que le plafond (1) et le rendu JS (3)
s'appuient dessus : poser un plafond sur des prix mal associés le rendrait faux,
et rendre des pages sans savoir en extraire les paires ne servirait à rien.

---

## Point 2 — révisé : une API JSON, pas un parseur

**Ce que j'ai d'abord cru.** Que l'extracteur associait mal les prix parce qu'il
prend ±220 caractères autour d'un prix (`SNIPPET_RADIUS`). Un extracteur par
blocs existe pourtant déjà (`extractOffersFromHtmlBlocks`).

**Ce que la mesure a montré.** Il ne se déclenche jamais : ses motifs cherchent
`class="*product*"`, alors que kmerphone utilise `km-fd__card`, `kld__item`,
`km-pg__card`. Zéro bloc capturé sur 704 Ko → tout retombe sur la fenêtre de
caractères. Le défaut était donc réel, mais sa cause était en amont.

**Ce qui rend le parseur inutile.** kmerphone tourne sous **Shopify** et expose
des API JSON publiques :

| endpoint | usage |
|---|---|
| `/search/suggest.json?q=…&resources[type]=product` | recherche par requête — 10 produits, titres et prix exacts |
| `/collections/<handle>/products.json` | une collection entière |
| `/products.json` | catalogue paginé |

Chaque variante porte `price`, **`compare_at_price`** (le prix barré), `available`
et `vendor`. Titre et prix arrivent **appariés à la source** : la mauvaise
association disparaît, il n'y a plus rien à deviner.

Mesuré :

```
259990  compare_at_price=471400  Samsung Galaxy Z Fold 3 5G - 256GB
369990  compare_at_price=624700  Samsung Galaxy Z Fold 5 5G - 256GB
```

**Décision** : `supabase/functions/_shared/shopifySource.js`, en JavaScript pur
pour être importable depuis Deno *et* Node. Le parseur HTML reste en repli pour
les sources sans API.

### Découverte connexe : une source d'OCCASION locale

`/collections/smartphones-reconditionnes` existe chez kmerphone — des
smartphones **reconditionnés**, avec leur prix d'occasion *et* leur prix neuf
barré. C'est précisément la donnée qui manquait au §3.1 du cadrage, sur une
source déjà atteignable et déjà rendue côté serveur.

### Glotelho reste hors API

`search/suggest.json`, `products.json` et `wp-json/wc/store/products` répondent
tous **404** : ni Shopify ni WooCommerce. Il relève donc du point 3 (rendu JS)
ou doit être abandonné.

---

## Point 1 — le neuf devient un plafond

Une occasion ne peut pas valoir plus que le neuf le moins cher constaté.

- Le prix issu des sources marchandes (neuf) devient `ceilingPrice`.
- `referencePrice` reste l'estimation, mais est **borné** par ce plafond.
- La réponse expose les deux, pour que la décision reste lisible en aval.

Effet : quelques lignes, aucune dépendance nouvelle, rattrape les cas les plus
visibles en attendant une vraie donnée d'occasion.

---

## Point 3 — déporter le rendu JS vers un runner Node

**Pourquoi hors de l'Edge Function** : Deno ne rend pas le JavaScript d'une page.
Glotelho renvoie 412 Ko pour **1 prix**, CoinAfrique 45 Ko sans un seul lien
produit. Ces sites ne sont atteignables qu'avec un navigateur.

**Ce qui existe déjà** : `puppeteer-core` et `@sparticuz/chromium` sont dans les
dépendances (utilisés par `scripts/prerender.mjs`).

**Ce qui n'existe pas** : un runner Node planifié.
`.github/workflows/snapshot-market-prices.yml.example` ne fait que `curl` la
fonction Deno. Le cron `pg_cron` appelle lui aussi une Edge Function.

**Correctif** : `scripts/render-market-sources.mjs`, lancé par
`npm run market:render`, qui rend les pages, extrait les offres avec **le
parseur du point 2**, et écrit dans `market_price_cache`. Plus un workflow
planifié fourni en modèle.

> **Limite assumée** : l'automatisation dépend de l'activation du workflow CI.
> Le script fonctionne dès aujourd'hui en manuel ; sans CI activée, le rendu JS
> est un geste périodique, pas un automatisme. À dire clairement plutôt qu'à
> laisser croire que c'est planifié.

---

## Point 4 — table de référence tenue par la boutique

`CATALOG_FALLBACK` est un tableau figé dans `services/trocEvaluationService.ts`,
avec le commentaire « À enrichir au fil des passages en boutique » — alors que
l'enrichir demande un déploiement.

- Migration : table `market_reference_prices` (marque, modèle, stockage, prix,
  **source constatée**, date, auteur), RLS lecture staff / écriture staff.
- Lecture : elle passe **avant** `CATALOG_FALLBACK`, qui devient l'ultime recours.
- Écriture : un onglet admin pour saisir et corriger.

⚠️ **Garde-fou métier** : on y consigne des prix **constatés sur le marché**
(ce qu'un appareil se vend ailleurs), jamais nos propres prix de reprise.
Ancrer sur nos prix serait circulaire — contrainte déjà posée par le métier.

---

## Ce qui reste bloqué

`market-price-intel` ne peut pas être déployée sans embarquer
`_shared/rateLimit.ts`, écrit par le lot 1 encore en cours, et dont la migration
`20260824_030_ai_usage_quota.sql` est en attente. Le module échoue *ouvert*, donc
le risque est faible — mais la décision de déployer du travail non terminé
n'est pas la mienne.

Les points 1 à 3 sont donc **écrits et testés hors ligne**, mis en service au
prochain déploiement groupé.

---

## Vérification par point

| point | preuve attendue |
|---|---|
| 2 | Sur du HTML réel, chaque prix est associé au titre de sa propre fiche |
| 1 | Un prix d'occasion supérieur au neuf constaté est ramené au plafond |
| 3 | Glotelho passe de 1 prix à un nombre exploitable, après rendu |
| 4 | Un prix saisi en admin prime sur `CATALOG_FALLBACK` |
