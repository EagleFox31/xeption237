# Stratégie SEO + GEO — Xeption Network 237

> **Objectif** : bâtir une visibilité durable sur (1) la recherche Google classique **SEO** et (2) les moteurs génératifs **GEO** (ChatGPT Shopping, Perplexity, Gemini, Google AI Overviews, Copilot, Amazon Rufus).
> **Principe directeur** : ne pas copier les leaders sur leur terrain (marque + volume catalogue), mais **exploiter précisément leurs trous techniques**, en particulier le **GEO** que personne au Cameroun n'a encore travaillé sérieusement.
>
> _Rédigé le 2026-07-13. Sources et méthodologie en fin de document._

---

## 1. Contexte marché 2026 : pourquoi le GEO change la donne

Le SEO classique reste nécessaire mais n'est plus suffisant :

- **AI Overviews** = ~**14 %** des requêtes shopping (mars 2026) contre ~2 % en novembre 2025.
- **Trafic référent IA** : +**527 % en un an**, e-commerce en tête (2–3 % du trafic).
- **82–85 % des recommandations produit des LLM** proviennent de **sources tierces** (presse, comparateurs, avis), pas du site de la marque → la RP et les citations externes deviennent un pilier SEO.
- **Le flux Google Merchant Center** est l'entrée principale qui alimente ChatGPT Shopping (900 M d'utilisateurs/sem.), Perplexity Shopping, Copilot, Rufus.
- **62–69 % des sites bloquent involontairement** les crawlers IA (`GPTBot`, `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`).

**Conclusion** : SEO et GEO se travaillent ensemble, mais **le GEO est un océan bleu local**. C'est là que Xeption prend l'avantage.

---

## 2. Audit concurrents (données HTML réelles, vérifiées le 2026-07-13)

Méthode : inspection du HTML brut (`curl`), pas de rendu JS, vérification directe des balises `<head>`, JSON-LD, `robots.txt`, `sitemap.xml` et pages produit.

| Critère | Glotelho (`glotelho.cm`) | Kmerphone (`kmerphone.com`) | Oraimo (`cm.oraimo.com`) |
|---|---|---|---|
| Plateforme | Nuxt 3 SSR (custom) | Shopify | Magento-like (store de marque) |
| Title + meta description | ✅ | ✅ | ✅ |
| Open Graph | ✅ complet | ✅ + `og:type` | ✅ |
| hreflang FR/EN | ❌ absent | ✅ `en`/`fr`/`x-default` | ❌ absent |
| JSON-LD accueil | ❌ 0 | ✅ Organization + WebSite + SearchAction | ❌ 0 |
| H1 accueil (HTML brut) | ❌ 0 | ✅ 1 | ❌ 4 (mauvaise sémantique) |
| Schema page produit | ✅ Product + Offer + Organization + BreadcrumbList | ✅ Product + Brand + Organization | ❓ non confirmé (probable faible) |
| `aggregateRating` / avis ⭐ | ❌ | ❌ | ❌ |
| Canonical | ✅ (produit) | ✅ | ✅ |
| robots.txt vs bots IA | ❌ « content-signals » restrictif | ✅ ouvert (défaut Shopify) | ✅ ouvert |
| Sitemap XML segmenté | ✅ pages/categories/products | ✅ (Shopify) | ❓ |
| Atout hors-technique | Marque + ~16 000 réf + **sitelinks Google** | Base technique la plus propre | Autorité de marque mondiale |
| **Note SEO estimée** | **13 / 20** | **14 / 20** | **10 / 20** |

### Lecture stratégique
- **Glotelho** : marque installée + catalogue + sitelinks Google → dur à battre en SEO pur. Mais **se coupe du GEO** (robots.txt restrictif) et néglige l'accueil (0 schema, 0 hreflang). **Attaquable sur le GEO et les avis.**
- **Kmerphone** : meilleure hygiène technique (Shopify fournit hreflang, schema accueil, SearchAction, schema produit) mais **catalogue mince** (produit testé = *OutOfStock*) et **zéro avis structuré**. **Attaquable sur la profondeur catalogue, la fraîcheur et le contenu.**
- **Oraimo** : repose sur l'autorité de marque mondiale ; technique le plus faible (4× H1, 0 schema accueil, pas de hreflang). Catalogue limité aux accessoires. **Attaquable partout sauf notoriété de marque.**

### Le trou commun aux trois
**Aucun n'expose `aggregateRating` / avis clients en JSON-LD.** Or c'est le levier n°1 pour :
- afficher les **étoiles ⭐ en rich results** (CTR +30 %),
- multiplier **x3–5 la citation** dans les réponses shopping IA.
👉 **Fenêtre stratégique n°1 pour Xeption.**

---

## 3. Fondations SEO (indispensables, à faire une fois et bien)

### 3.1 Technique on-page (par type de page)
- **Accueil** : `<title>` marque + proposition de valeur ; 1 seul `<h1>` ; meta description ≤ 160 car. ; OG complet.
- **Catégorie** : `<h1>` = nom catégorie ; texte descriptif unique (150–300 mots) ; pagination propre (`rel=next/prev` logique + canonical) ; **maîtrise de la navigation à facettes** (les filtres peuvent consommer 40 %+ du budget de crawl → n'indexer que les combinaisons à valeur, `noindex,follow` sur le reste).
- **Produit** : `<h1>` = nom produit ; description **factuelle** (pas d'adjectifs marketing creux) ; tableau de specs ; FAQ ; avis clients visibles.

### 3.2 Données structurées (JSON-LD) — priorité absolue
| Page | Schema à implémenter |
|---|---|
| Accueil | `Organization` + `WebSite` (avec `SearchAction` → Sitelinks Searchbox) |
| Catégorie | `BreadcrumbList` + `CollectionPage` (+ `ItemList` des produits) |
| Produit | `Product` + `Offer` (`price`, `priceCurrency: "XAF"`, `availability`) + **`AggregateRating` + `Review`** + `Brand` + `gtin`/`mpn`/`sku` |
| Global | `BreadcrumbList` sur toutes les pages profondes |

**Règle d'or** : le schema doit **refléter la réalité** (si JSON-LD dit `InStock` mais la page dit « épuisé » → pénalité de confiance). Synchroniser le stock schema ↔ front.

### 3.3 hreflang & internationalisation
- **Décision 2026-07-13 : site FR-only → hreflang non requis.** Le `<html lang="fr">` actuel suffit.
- À réactiver **uniquement si** une version anglaise est ajoutée : déclarer alors `fr-CM`, `en-CM`, `x-default` sur toutes les pages.

### 3.4 Infrastructure de crawl
- `sitemap.xml` **segmenté** (pages / catégories / produits), régénéré automatiquement, soumis à Google Search Console + Bing Webmaster Tools.
- `robots.txt` propre : bloquer panier/checkout/compte, **autoriser explicitement les bots IA** (voir §4.1).
- Core Web Vitals : LCP < 2,5 s mobile (priorité, réseau CM), CLS < 0,1. Images en `webp`/`avif` + `alt` descriptifs.

---

## 4. Stratégie GEO (l'avantage différenciant Xeption)

### 4.1 Ouvrir la porte aux moteurs génératifs
Dans `robots.txt`, **autoriser explicitement** :
```
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Google-Extended
Allow: /
```
> ⚠️ Glotelho restreint ces usages via « content-signals ». En les autorisant, Xeption devient **crawlable là où le leader est absent**.

### 4.2 Écrire pour des « extracteurs de faits »
Les LLM ignorent le marketing et extraient des **données concrètes** :
- Specs en **tableaux** (`additionalProperty` dans Product schema).
- **FAQ schema** répondant aux vraies questions d'achat (« quelle autonomie ? », « compatible 4G Cameroun ? », « garantie ? »).
- Réponses **directes** en début de paragraphe (format « question → réponse factuelle »).

### 4.3 Feed produit (Google Merchant Center)
- Feed **riche et propre** dès le lancement : `gtin`, `brand`, `mpn`, specs, `price` en XAF, `availability`, images HD.
- C'est l'entrée qui alimente ChatGPT Shopping, Perplexity, Copilot, Rufus.

### 4.4 Autorité externe (82–85 % des recos IA viennent de tiers)
- Présence sur comparateurs, presse tech camerounaise, annuaires, YouTube, réseaux.
- **Cohérent avec la doctrine interne** : l'ancrage prix Troc doit être **externe/vérifiable** — même logique ici, la crédibilité vient de sources tierces, pas de l'auto-déclaration.
- Fiche Google Business Profile complète (SEO local Douala/Yaoundé).

### 4.5 Fraîcheur
- Pages mises à jour < 60 jours = **1,9× plus citées** par les IA ; 76 % des pages très citées par Perplexity ont < 30 jours.
- Ajouter un timestamp **« Mis à jour le … »** visible sur les contenus piliers ; rafraîchir prix/stock/guides régulièrement.

### 4.6 Mesure GEO
- Suivre la **part de citation** dans ChatGPT / Perplexity / AI Overviews (part de voix, sentiment, sources citées, présence concurrents).
- KPI distinct du trafic classique : ChatGPT génère ~87 % du trafic référent IA mais cite peu (0,7 %) ; Perplexity cite beaucoup (13,8 %) → viser **citation ET trafic**.

---

## 5. Ce que fait déjà Xeption — audit interne (à compléter)

> À remplir après audit de `xeption237/utils/seo.tsx` et de la génération des balises/JSON-LD dans l'app.

- [ ] État actuel de `seo.tsx` : quelles balises générées, quels types de pages couverts ?
- [ ] JSON-LD Product/Organization : présent ? complet ?
- [ ] hreflang FR/EN : géré ?
- [ ] Sitemap dynamique : existe ?
- [ ] robots.txt : bots IA autorisés ?
- [ ] Feed Merchant Center : existe ?

---

## 6. Roadmap priorisée (impact × effort)

### 🥇 Phase 1 — Quick wins techniques (semaine 1–2) — ✅ TERMINÉE (2026-07-13)
1. ✅ JSON-LD `Product` + `Offer` + `AggregateRating` **honnête** (conditionnel) sur les fiches — doublon + fausse note supprimés.
2. ✅ `Organization` (`ElectronicsStore`) + `WebSite` + `SearchAction` sur l'accueil ; nœud `#organization` réparé (publisher/seller).
3. ✅ hreflang : **N/A** — site FR-only (voir §3.3).
4. ✅ `robots.txt` : bots IA déjà non bloqués (`Allow: /`).
5. ✅ `itemCondition` (neuf/reconditionné) + `areaServed` ajoutés au Product schema.

### 🥈 Phase 2 — Contenu & GEO (semaine 3–6)

#### 6. FAQ schema + specs structurées sur fiches produit — ✅ TERMINÉ (2026-07-13, vérifié au prerender)

**Principe de conformité** (même exigence que la note honnête Phase 1) : un schéma FAQ/spec
doit **refléter un contenu réellement visible** sur la page. On n'injecte jamais de JSON-LD
sans rendu correspondant.

**6a. `additionalProperty` (specs)** — le tableau `product.specs` est déjà affiché
(« Détails Techniques »). On le miroir dans `Product.additionalProperty` (`PropertyValue`).
Sûr, fort levier GEO (les LLM extraient les specs). Pas de changement UI.

**6b. FAQ visible + `FAQPage` schema** — pas de rich result classique (Google a restreint
les FAQ aux sites gouv/santé) mais **fort levier GEO** (les LLM lisent le FAQPage). Étapes :
- `utils/productFaq.ts` : `buildProductFaq(product)` → `[{q, a}]` **source unique** générée
  depuis les données réelles (garantie `warrantyMonths`, état `condition`, livraison
  Yaoundé/Douala, paiement OM/MoMo, authenticité). Pas de question sans réponse factuelle.
- `ProductDetail` : rendu **visible** d'un bloc FAQ (accordéon), stylé sur la zone claire
  « Détails Techniques » (`text-black` sur fond clair → pas de gris sur fond sombre).
- `seo.tsx` : `faqJsonLd(items)` ; `ProductPage` l'injecte avec le même `buildProductFaq`
  → zéro dérive entre l'affiché et le schéma.

#### 7. Descriptions produit factuelles (extraction IA) — 🟡 OUTIL PRÊT, EN ATTENTE VALIDATION BOSS

Outil livré + aperçu généré (`data/descriptions-preview.md`). Prod NON modifiée.
Commandes :
- Aperçu : `node scripts/batch-enrich-product-specs.mjs --descriptions-only --include-fluffy --provider=gemini --batch=tecno --limit=3 --preview`
- Application (après validation) : remplacer `--preview` par `--apply`.

**Ton validé (2026-07-13)** : "Mboa punchy + faits" — énergie camerounaise adossée à des specs
réelles (le prompt exige qu'un punch s'appuie sur une spec).

**Exactitude — garde-fous implémentés (`productDescription.mjs`) :**
- **#1 `descriptionSpecsConsistent`** : rejette toute génération citant un chiffre+unité
  (« 16 Go », « 108 MP ») **absent des specs/nom**. Match par nombres exacts (pas sous-chaîne).
  ✅ Testé en live : a rejeté un « 16 Go » halluciné sur Tecno Spark 40.
- **#2 `hasRichSpecs`** (gate) : réécriture facts-first d'une description fluff uniquement si
  ≥ 3 specs réelles (sinon le modèle comblerait avec sa mémoire).
- Rappel : la description reste **plafonnée par l'exactitude des specs** (elles-mêmes IA à
  l'enregistrement). Les garde-fous empêchent l'étape description d'*ajouter* des erreurs.
- **#3 (différé)** : générer la description depuis les specs validées dans le funnel
  d'ingestion (`services/productIngestionFunnel.ts`) = fix racine, à faire plus tard.

⚠️ Reste à décider : lancer `--apply` (après spot-check d'un échantillon plus large).

Constat : les descriptions sont très inégales — certaines déjà factuelles (Xiaomi Redmi
Note 15), d'autres pur marketing sans aucun fait extractible (Dell XPS « débarque au Mboa,
en jette »). Le pipeline existant (`scripts/batch-enrich-product-specs.mjs --descriptions-only`)
génère déjà des descriptions mais son prompt dit « 2-3 phrases **marketing** » → produit du fluff,
et il ne cible que les descriptions vides/stub (les longues-mais-fluff passent à travers).

Corrections (améliorer l'existant, pas dupliquer) :
- **Prompt facts-first + anti-hallucination** : `buildDescriptionPrompt` réécrit pour mener avec
  les specs concrètes (écran, proc, batterie…), **en n'utilisant QUE les specs connues** (interdiction
  d'inventer), + une seule accroche de marque. Idem pour la règle description de `buildPrompt`.
- **Détecteur de fluff** : `isFluffyDescription(desc, specs)` dans `productDescription.mjs` (long
  sans unités chiffrées = fluff), activé en **opt-in** via `--include-fluffy` (ne change pas le
  ciblage par défaut).
- **Mode `--preview` + `--limit=N`** : génère et écrit un avant/après dans
  `data/descriptions-preview.md` **sans toucher la prod** → validation du ton (boss) avant `--apply`.
- ⛔ **Pas d'`--apply` en autonomie** : la réécriture de contenu prod + voix de marque doit être
  validée. Livrable de cette étape = l'outil + un échantillon d'aperçu.
#### 8. Feed Google Merchant Center riche — ⏸️ DIFFÉRÉ (décision 2026-07-13 : overkill pour l'instant)

Fort levier GEO (alimente ChatGPT Shopping / Perplexity / Copilot / Rufus / AI Overviews) mais
chantier mi-code / mi-admin : nécessite un compte Merchant Center, un hébergement de flux, et
surtout des **GTIN/codes-barres** par produit (à confirmer côté catalogue). À réactiver quand
le trafic IA-shopping le justifiera et que les accès seront dispo. Partie code prête à faire :
un générateur de flux Supabase → `feed.xml` (sur le modèle de `scripts/generateSitemap.js`).
#### 9. Google Business Profile + SEO local Douala/Yaoundé — à venir

### 🥉 Phase 3 — Autorité & mesure (continu)
10. Programme d'avis clients (alimente `AggregateRating`).
11. RP / citations tierces (presse tech CM, comparateurs, YouTube).
12. Outil de suivi de citations GEO ; rafraîchissement contenu < 60 j.

---

## 7. Résumé exécutif

- Les leaders locaux ont un **SEO correct mais un GEO négligé** ; **aucun** n'a d'avis structurés.
- **Deux fenêtres immédiates** : (1) `AggregateRating`/avis en JSON-LD, (2) ouverture aux moteurs génératifs (robots.txt + contenu factuel + feed Merchant Center).
- La priorité n'est pas de battre Glotelho en volume, mais d'être **le premier e-commerce camerounais optimisé pour l'ère de la recherche IA**.

---

## Annexe — Méthodologie & sources

**Méthode d'audit concurrents** : `curl` sur HTML brut le 2026-07-13, inspection `<head>`, JSON-LD, `robots.txt`, `sitemap.xml`, pages produit réelles issues des sitemaps. Données factuelles, non issues d'un rendu JS.

**Sources recherche 2026** :
- Salsify — [GEO for Ecommerce](https://www.salsify.com/blog/how-to-do-generative-engine-optimization-geo-for-ecommerce)
- Search Engine Land — [Mastering GEO in 2026](https://searchengineland.com/mastering-generative-engine-optimization-in-2026-full-guide-469142)
- DigitalApplied — [Ecommerce Product-Page SEO 2026](https://www.digitalapplied.com/blog/ecommerce-product-page-seo-2026-optimization-playbook)
- Immerss — [AI Search Optimization for Ecommerce](https://www.immerss.live/content/ai-search-optimization-ecommerce-guide/)
- Passionfruit — [Optimize Product Feeds for ChatGPT/Perplexity](https://www.getpassionfruit.com/blog/how-to-optimize-product-feeds-for-chatgpt-shopping-perplexity-and-ai-commerce)
- OuterBox — [Rich Snippets & Structured Data 2026](https://www.outerboxdesign.com/articles/seo/rich-snippets-importance-for-an-ecommerce-website/)
- StudioHawk — [AI SEO for Ecommerce](https://studiohawk.com.au/blog/ai-seo-ecommerce/)
