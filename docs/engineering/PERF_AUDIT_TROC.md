# Audit perf mobile `/troc` — baseline → fix

> Issue de référence : [#13 — Audit `/troc` mobile performance and loading bottlenecks](https://github.com/EagleFox31/xeption-237/issues/13).
> Méthode : mesurer AVANT, identifier le bottleneck chiffré, fixer, mesurer APRÈS.

## Baseline (2026-09-23, avant fix)

### Bundle JS — ce que télécharge l'utilisateur sur le premier paint

```bash
npm run build && ls -lh dist/assets/*.js | sort -k5 -h -r | head
```

| Chunk | Raw | Gzip | Chargé quand ? |
|---|---|---|---|
| `index-*.js` | 1 291 KB | **347 KB** | **Tout premier chargement de n'importe quelle page** |
| `AdminPage-*.js` | 1 326 KB | 368 KB | Lazy — seulement sur `/admin` |
| `html2pdf-*.js` | 757 KB | 227 KB | Dynamic import depuis `tradeInVoucherGenerator.ts` quand le voucher PDF est généré |
| `jspdf.es.min-*.js` | 381 KB | 124 KB | Dépendance de html2pdf |
| `html2canvas.esm-*.js` | 198 KB | — | Dépendance de html2pdf |

### Problème identifié

Le **main bundle `index-*.js` à 347 KB gzip** charge pour TOUS les visiteurs — même ceux qui n'iront jamais sur `/troc`, `/marketplace`, `/bon`, `/tracking`, les CGV, etc.

Au grep des imports dans `App.tsx` :

```tsx
// 15 pages importées EAGERLY alors que le user n'en visite qu'une par session
import TrocPage from './pages/TrocPage';
import MarketplacePage from './pages/MarketplacePage';
import MarketplaceBrowsePage from './pages/MarketplaceBrowsePage';
import TrackingPage from './pages/TrackingPage';
import TrocVoucherPage from './pages/TrocVoucherPage';
import SavPage from './pages/SavPage';
import CGVPage from './pages/CGVPage';
// ... (8 autres)
```

**Diagnostic** : TrocPage à lui seul tire `useTradeIn`, 15 composants `components/mobile/MobileTroc*`, les services de troc (évaluation, photo preflight, checkout) et toutes leurs deps transitives — ~240 KB raw / 57 KB gzip. Même histoire pour les 14 autres pages secondaires.

### Autres bottlenecks mesurés

| Zone | Mesure | Verdict |
|---|---|---|
| `html2pdf` + deps (~550 KB gzip cumulé) | Déjà en dynamic import depuis `tradeInVoucherGenerator.ts` → chunk séparé `html2pdf-*.js` | **OK — déjà optimisé** |
| Images Cloudinary | `utils/mediaOptimization.ts` + `useBandwidthDetector` adaptent la qualité au réseau | **OK — déjà optimisé** (commit perf précédent) |
| Skeleton loaders | `SkeletonLoader` + `ProductCardImage` placeholder lazy | **OK — déjà optimisé** |
| Headers cache | `public/_headers` pour les assets statiques | **OK — déjà optimisé** |
| API latency (évaluation photo) | Edge Function `evaluate-device` : 2–4s typique, dépend du call Gemini Vision | **Hors scope frontend** — c'est un bottleneck réseau/IA |

## Fix appliqué — lazy-loading des 15 routes secondaires

### Code

Dans `App.tsx`, 15 pages passent d'`import` statique à `React.lazy()` :

```tsx
// Pages critiques (landing + commerce) : eager pour éviter un fallback au premier paint.
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import ProductPage from './pages/ProductPage';

// Pages secondaires : lazy pour alléger le main bundle.
const TrocPage = lazy(() => import('./pages/TrocPage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const MarketplaceBrowsePage = lazy(() => import('./pages/MarketplaceBrowsePage'));
// … (12 autres)
```

Les `<Routes>` sont enveloppées dans un `<Suspense fallback={<PageFallback />}>` global.

### Raison du choix "critique vs secondaire"

| Page | Statut | Pourquoi |
|---|---|---|
| `HomePage` | **Eager** | Landing — un spinner au premier paint tue la perception SEO + bounce rate |
| `ShopPage` | **Eager** | Trafic principal commerce, SEO prerendering critique |
| `ProductPage` | **Eager** | Prerender SEO (241 fiches produit buildées) — pas de risque de hydration mismatch |
| TrocPage, MarketplacePage*, autres | **Lazy** | Visitées depuis la nav (bottom nav, header, CTA) — un spinner de ~300ms est acceptable, les users n'y arrivent pas au premier paint |

## Résultat mesuré (2026-09-23, après fix)

| Chunk | Baseline (gzip) | After (gzip) | Gain |
|---|---|---|---|
| `index-*.js` (main bundle) | **347 KB** | **192 KB** | **−155 KB (−45 %)** |
| `TrocPage-*.js` (nouveau) | — | 57 KB | Chargé **seulement** si `/troc` |
| `MarketplacePage-*.js` | — | 4 KB | Chargé seulement si `/marketplace/lister` |
| `MarketplaceBrowsePage-*.js` | — | 3 KB | Chargé seulement si `/marketplace` |
| `TrackingPage-*.js` | — | ~21 KB | Chargé seulement si `/tracking/*` |
| `CGVPage`, `PolitiqueConfidentialitePage`, autres statiques | — | 20–24 KB chacun | Chargés uniquement si visités |

### Impact pour l'utilisateur type (hits homepage → shop → checkout)

- **Télécharge 155 KB gzip de moins au premier paint** (−45 % du bundle principal)
- Sur mobile 3G à 400 Kb/s : ~3 s économisées sur le time-to-interactive
- Pas de régression fonctionnelle : les routes lazy ont un `<PageFallback>` (spinner xeption-gold) le temps du fetch (~100–500ms sur 4G)

### Impact pour un utilisateur qui va sur `/troc`

- Télécharge 192 + 57 = 249 KB gzip total (vs 347 KB avant)
- **Toujours ~100 KB de moins** qu'avant parce qu'il n'a pas chargé marketplace, tracking, CGV, feedback, etc.

## Métriques Core Web Vitals (à mesurer en prod)

Après ce fix en prod, mesurer avec un outil tiers :

- **LCP (Largest Contentful Paint)** : attendu −500ms à −1s sur mobile 4G
- **INP (Interaction to Next Paint)** : neutre (déjà bon car `useBandwidthDetector` adapte les images)
- **CLS (Cumulative Layout Shift)** : neutre (skeleton loaders stables)

**Outils recommandés** :
- [PageSpeed Insights](https://pagespeed.web.dev/) : exécuter sur `https://www.xeptionetwork.shop/` + `/troc` + `/shop`
- Chrome DevTools → Lighthouse → Mobile → Capture avant/après
- GA4 → Reports → Life cycle → Technology → Web Vitals (si configuré)

**Note** : ces mesures varient fortement selon le réseau du user. Une baseline en ambiance (ex: Lighthouse score 68 → 85) suffit pour valider l'impact.

## Fixes NON appliqués (volontairement)

Ces optimisations potentielles n'ont PAS été faites parce qu'elles ne pointaient pas vers un bottleneck mesuré :

- ❌ Preloading agressif des routes lazy (`<link rel="prefetch">`) — introduit du bruit réseau pour un gain subjectif
- ❌ Split html2pdf en micro-chunks — déjà isolé, ne charge que à la génération du voucher
- ❌ Service Worker custom — complexité disproportionnée vu le gain
- ❌ Preact ou alternative à React — refactor massif pour un gain marginal après lazy-loading

**Principe RAIDER (E)** : fix measured, pas speculative. Si de nouveaux bottlenecks apparaissent (Lighthouse en prod), on ouvre un nouveau cycle d'audit.

## Baseline post-fix (reference pour la prochaine itération)

```
Main bundle (index-*.js)       : 192 KB gzip
TrocPage lazy chunk            :  57 KB gzip
Marketplace lazy chunks        :   3-4 KB gzip chacun
Tracking lazy chunk            :  21 KB gzip
CGV / Politique lazy chunks    :  20-24 KB gzip chacun
AdminPage lazy chunk           : 369 KB gzip (inchangé, hors scope)
```

Si la prochaine itération fait monter `index-*.js` au-dessus de 220 KB gzip, il faut re-auditer (nouvelle feature mal splittée, dépendance trop lourde ajoutée, etc.).
