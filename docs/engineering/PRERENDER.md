# Prérendu SEO incrémental

`scripts/prerender.mjs` génère le HTML statique des pages publiques (accueil, boutique, contenus SEO,
fiches produit) pour les robots. L'app remplace ce HTML au chargement (`createRoot`, sans hydratation) :
il ne sert qu'à l'indexation.

Depuis la v2, seules les pages nouvelles ou modifiées passent dans Chrome ; les autres sont reprises
d'un cache disque.

## Fonctionnement

| Étape | Détail |
|---|---|
| Manifeste de modules | Le plugin Vite `prerender-module-manifest` (`vite.config.ts`) écrit `<cacheDir>/modules.json` : chunk → modules, module → hash du code transformé. Hors de `dist/`. |
| Version de rendu | Hash du script, de `scripts/lib/prerenderCache.mjs`, de la config, du shell HTML (sans les balises d'assets), de `SITE_URL` et de l'URL Supabase. Changement → rendu complet. |
| Empreinte code (par page) | Hash des modules des chunks JS chargés pendant son rendu. Une modif de l'admin ou du Studio (chunks séparés) ne re-rend aucune page publique. |
| Empreinte données (par page) | Fiche produit : sa ligne `products` + les produits qu'elle lie + la composition de sa catégorie + les sources globales. Autres pages : tout le catalogue + les sources globales. |
| Pages volatiles | Une page qui lit une source non déclarée (`globalSources`) ou un script hors manifeste est toujours re-rendue (avertissement dans les logs). |
| Reprise | Chaque page réussie est écrite dans le cache immédiatement (HTML puis entrée, écritures atomiques). Après une interruption, la passe suivante ne refait que ce qui manque. |
| Réutilisation | Le HTML en cache reçoit les balises JS/CSS du build courant (`rebaseHtmlAssets`). |
| Vérification | Toujours sur 100 % des pages : SEO produit, liens, canonical, FAQ, et chaque `/assets/*` référencé doit exister dans `dist/`. |

Le log affiche le plan : `plan : N à rendre (nouvelle=…, donnees=…, code=…, ttl=…), M reprise(s) du cache, K retirée(s) du cache`.

## Configuration

`scripts/prerender.config.json` :

- `cacheDir` (défaut `node_modules/.cache/prerender`, surchargeable par `PRERENDER_CACHE_DIR`) ;
- `ttlDays` / `ttlJitterDays` : chaque page est re-rendue au plus tard tous les `ttlDays` jours, avec une gigue déterministe par route pour étaler les re-rendus ;
- `catalog` : table, préfixe de route, champs de composition de catégorie, `ignoreFields` (champs volatils à exclure de l'empreinte) ;
- `globalSources` : tables lues par toutes les pages (marques, catégories, packs) ;
- `ignoredRequestPaths` : requêtes Supabase sans effet sur le HTML (auth, storage, realtime).

Variables : `PRERENDER_FULL=1` force un rendu complet (et vide le cache) ; les variables existantes
(`PRERENDER_REQUIRED`, `PRERENDER_CONCURRENCY`, timeouts) sont inchangées.

## Rendu complet automatique

Cache absent, version de rendu modifiée, `PRERENDER_FULL=1`, manifeste de modules absent ou périmé,
catalogue ou source globale indisponible (dans ces deux derniers cas, le cache n'est ni lu ni élagué).

## Exception assumée (RAIDER)

Le bloc « meilleures ventes » d'une fiche est trié sur tout le catalogue (mise en avant, note, prix).
Son empreinte couvre les produits **affichés**, pas le classement complet : si un produit non affiché
devrait y entrer après un changement de prix, la fiche reste à l'ancienne sélection jusqu'au TTL
(≤ 7 jours). Impact SEO négligeable (liens internes secondaires, tous valides) ; l'alternative
(re-rendre toutes les fiches à chaque changement de prix) annulerait le gain.

## Cache sur Vercel

Vercel ne garantit que le cache des dépendances. `node_modules/.cache/` est conservé en pratique
(retours communautaires), sans documentation officielle. Si le cache est perdu, le build retombe sur
un rendu complet, comme avant.
