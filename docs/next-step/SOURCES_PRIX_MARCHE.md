# Sources de prix marché — ce que j'ai mesuré, et ce que je propose

**Date** : 2026-08-25
**Question posée** : quelles sources ajouter à `market-price-intel` ?
**Réponse courte** : la liste de sources n'est pas le vrai problème.

---

## 1. Ce que j'ai mesuré

Chaque candidat a été appelé pour de vrai (recherche « iPhone 13 »), pas
sélectionné sur réputation.

| Source | Verdict | Détail mesuré |
|---|---|---|
| **kmerphone.com** | ✅ exploitable | HTTP 200, 704 Ko, **144 prix** dans le HTML serveur |
| **glotelho.cm** | ❌ inutile | HTTP 200, 412 Ko, **1 seul prix** — rendu JS |
| **coinafrique.com** | ❌ inutile | `www` répond 200, mais **SPA** : 45 Ko, zéro lien produit |
| **jumia.cm** | ❌ mort | Certificat au mauvais nom — domaine parqué (fermé en 2019) |
| **jiji.cm** | ❌ inexistant | DNS `ENOTFOUND` — Jiji n'a pas de présence camerounaise |
| **afrimalin.cm** | ⚠️ à confirmer | `ECONNRESET` en `fetch` **et** en `curl` |
| **kerawa.com** | ⚠️ à confirmer | idem |
| **DuckDuckGo HTML** | ✅ fonctionne | HTTP 200, 10 résultats ; les prix viennent des pages suivies |

> Les deux ⚠️ ont échoué depuis **ma** machine, qui a un proxy à interception TLS
> (déjà consigné dans `ERRORS_LOG.md`). Je ne peux pas conclure qu'elles sont
> mortes — seulement qu'elles le sont d'ici. Voir §5.

---

## 2. Le constat qui déplace la question

**Le web marchand camerounais est mince et de plus en plus rendu côté client.**
Glotelho et CoinAfrique répondent 200 avec une page quasi vide : tout le contenu
arrive ensuite en JavaScript. Un scraper serveur n'y verra jamais rien.

Ajouter des noms à `sourceConfigs` ne changera donc pas grand-chose. Aujourd'hui,
**une seule source produit réellement des données** — d'où le `sourceCount: 1`
mesuré sur le Tecno Camon 30, et le `0 offre` sur un Galaxy A15.

---

## 3. Deux défauts qui pèsent plus lourd que la liste de sources

### 3.1 On ancre une reprise d'occasion sur des prix du NEUF

kmerphone et glotelho vendent du neuf. Le `referencePrice` est donc un prix neuf,
et tout l'écart neuf → occasion doit être absorbé par le ratio de reprise. Or cet
écart varie énormément selon le modèle et son âge : un iPhone tient sa valeur, un
Tecno la perd vite. **Un ratio unique ne peut pas représenter les deux.**

C'est une explication plausible du sentiment récurrent que les reprises sont trop
généreuses : ce n'est pas le ratio qui est mal réglé, c'est l'ancrage qui est de
la mauvaise nature.

### 3.2 L'extraction associe les prix aux mauvais produits

Le scraper repère un prix dans le texte aplati, puis prend **±220 caractères
autour** comme contexte (`SNIPPET_RADIUS`). Sur une page de résultats, cette
fenêtre chevauche plusieurs fiches : le prix est scoré, et parfois retenu, sur le
texte du produit voisin.

Vérifié sur le Tecno Camon 30 — prix extraits `167 990 / 217 600 / 249 990`,
extraits associés portant « 114.990 FCFA 158.700 FCFA -27% ». Les deux ne
correspondent pas.

**C'est un défaut de méthode, pas de source.** Ajouter des sources multiplierait
le bruit sans le corriger.

---

## 4. Ce que je propose

Par ordre de rapport valeur / effort.

### A. Faire du neuf un PLAFOND, pas un ancrage *(effort : faible)*
Une occasion ne doit jamais être valorisée au-dessus du neuf le moins cher
constaté. Cette borne se pose **avec les sources qu'on a déjà** et rattrape les
cas les plus visibles. Ne résout pas le fond, mais c'est immédiat.

### B. Parser des paires titre + prix, au lieu d'une fenêtre de caractères *(effort : moyen)*
Extraire le bloc de chaque fiche produit et lire son titre et son prix ensemble.
Supprime la mauvaise association à la racine, et rend le filtre de pertinence
beaucoup plus efficace — celui qu'on vient de remettre en service.

### C. Déporter le scraping rendu vers le cron Node *(effort : moyen)*
`puppeteer-core` et `@sparticuz/chromium` sont **déjà dans le projet** (utilisés
par `scripts/prerender.mjs`). Une Edge Function Deno ne peut pas rendre du
JavaScript ; un job Node, si.

`snapshot-market-prices` existe déjà comme cron. Il devient l'endroit où l'on
rend les pages JS (Glotelho, CoinAfrique) et où l'on écrit dans
`market_price_cache`. L'Edge Function ne fait plus que lire le cache.

> Effet secondaire appréciable : l'évaluation ne dépend plus d'un scraping en
> direct, donc elle devient rapide et prévisible.

### D. Une table de référence tenue par la boutique *(effort : faible, mais humain)*
`CATALOG_FALLBACK` est aujourd'hui un tableau figé dans le front, avec ce
commentaire : « À enrichir au fil des passages en boutique ». Personne ne peut
l'enrichir sans un déploiement.

Le transformer en table Supabase éditable depuis l'admin, avec date et auteur de
chaque prix. Sur un marché où la donnée web est pauvre, **ce que la boutique
constate au comptoir est la source la plus fiable qui existe** — et elle est
datée, attribuée, donc vérifiable.

⚠️ Distinction à tenir : il s'agit de prix **constatés sur le marché** (ce qu'un
appareil se vend ailleurs), pas de nos propres prix de reprise. Ancrer sur nos
prix serait circulaire.

### E. Séparer la courbe et le niveau *(effort : moyen)*
Une source étrangère d'occasion donne la **forme** de la dépréciation (combien un
modèle perd par année), qui se transpose d'un marché à l'autre. Le **niveau**
reste local (A ou D). On cesse ainsi de dépendre d'une donnée d'occasion
camerounaise en ligne, qui n'existe pas vraiment.

---

## 5. La méthode, avant les décisions

Deux sources restent indécidables depuis ma machine (§1). La bonne façon de
trancher est celle qui a résolu la question des modèles Gemini hier : **mesurer
depuis là où le code s'exécute**, pas depuis un poste de développement.

Concrètement, un mode `probeSources: true` sur `market-price-intel`, qui appelle
chaque candidat depuis le runtime Deno et rapporte statut, taille et nombre de
prix trouvés. Même motif que `probeModels`, et la même leçon : une capacité se
vérifie en l'exerçant, pas en la supposant.

---

## 6. Recommandation

**B + C ensemble.** L'extraction correcte et le rendu JS se complètent : rendre
les pages sans savoir en extraire les paires titre/prix ne servirait à rien, et
inversement. Ces deux-là débloquent Glotelho, qui existe déjà dans le code et ne
donne qu'un prix sur 412 Ko.

**A tout de suite** — c'est une borne de bon sens qui coûte quelques lignes.

**D en parallèle**, parce que c'est le seul levier qui ne dépend d'aucun site
tiers et que le marché camerounais le justifie.

Je ne recommande **pas** d'ajouter des sources à `sourceConfigs` en l'état :
elles seraient soit vides (SPA), soit source de bruit supplémentaire tant que
§3.2 n'est pas corrigé.

---

## 7. Blocage de déploiement en cours

`market-price-intel/index.ts` porte à la fois mon correctif de chaîne de modèles
et l'import `rateLimit` du lot 1, encore en cours. Le déployer embarquerait du
travail non terminé. La séquence propre reste : appliquer
`20260824_030_ai_usage_quota.sql`, puis déployer les trois fonctions ensemble.
