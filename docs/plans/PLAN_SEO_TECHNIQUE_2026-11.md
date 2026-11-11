# Plan — correctifs SEO techniques (novembre 2026)

Source : audit du 2026-11-07 sur la production (`https://www.xeptionetwork.shop`), HTML récupéré
avec le user-agent Googlebot (accueil, `/shop`, `/categorie/iphone-cameroun`, un guide, une fiche
produit, `robots.txt`, `sitemap.xml`, redirections).

## Constats retenus pour ce lot

| # | Constat | Gravité |
|---|---------|---------|
| 1 | Une URL inconnue répond **200** avec le HTML prérendu de l'accueil (canonical `/`) → « soft 404 » et pages produits supprimées qui restent vivantes. | Haute |
| 2 | `https://xeptionetwork.shop` → `www` en **307** (temporaire) ; `http://xeptionetwork.shop` fait deux sauts. | Haute |
| 3 | Plusieurs `<h1>` par page (accueil : 2, fiche produit : 3) car les rendus mobile et desktop coexistent dans le DOM ; H1 accueil lu « accessoiresau ». | Moyenne |
| 4 | `Product` JSON-LD sans `shippingDetails` ni `hasMerchantReturnPolicy` → non éligible aux résultats marchands enrichis. | Moyenne |
| 5 | Titres de fiches jusqu'à 86 caractères, tronqués dans Google. | Faible |

Hors lot (contenu / notoriété, à planifier séparément) : pages catégorie supplémentaires, guides
plus longs, image Open Graph par page, médias sur un domaine de marque, sitemap d'images, `alt`
manquants, Google Business Profile, Search Console.

## Correctifs

### 1. Soft 404
- `App.tsx` : route `*` → `NotFoundPage` (texte utile + liens vers boutique/catégories) avec
  `PageSEO noindex`. Google exécute le JS et retire la page de l'index.
- `scripts/prerender.mjs` : écrire le shell Vite d'origine dans `dist/spa.html` (snapshot pris
  avant que `/` ne réécrive `dist/index.html`).
- `vercel.json` : la règle fourre-tout réécrit vers `/spa.html` au lieu de `/index.html`. Une URL
  inconnue ne sert plus le contenu de l'accueil ; les routes prérendues restent servies en priorité
  par le système de fichiers ; les routes SPA non prérendues (`/marketplace`, `/verify/:token`,
  `/tracking/*`, fiche créée après le build…) démarrent depuis le shell comme avant l'hydratation.
- Limite assumée : un vrai code HTTP 404 demanderait un middleware Edge ; le `noindex` rendu est la
  méthode documentée par Google pour les SPA.

### 2. Redirections de domaine (configuration Vercel, pas de code)
- Vercel → Project → Settings → Domains → `xeptionetwork.shop` : « Redirect to
  `www.xeptionetwork.shop` » avec le code **308 Permanent**.
- Changement de configuration de production : appliqué uniquement avec accord explicite.

### 3. Un seul `<h1>` par page
- Accueil : `HeroWelcomeSlide` reçoit `asH1` ; la variante desktop (`Hero.tsx`) rend
  `role="heading" aria-level={1}` (accessibilité conservée, un seul `<h1>` réel). Espace manquante
  entre « accessoires » et « au meilleur prix ».
- Fiche produit : le `<h1>` réel reste dans `MobileProductDetailView` (indexation mobile-first) ;
  les deux de `ProductDetail` passent en `role="heading" aria-level={1}`.

### 4. Données structurées marchandes
- `productJsonLd` : `hasMerchantReturnPolicy` aligné sur les CGV §7 (Cameroun, 15 jours, retour en
  boutique, frais de retour à la charge du client, remboursement ou échange).
- `shippingDetails` uniquement quand le prix atteint `FREE_DELIVERY_THRESHOLD_XAF` (livraison
  offerte, tarif réellement connu = 0 XAF) ; délais CGV §6 (1 à 7 jours ouvrés). Sous le seuil, le
  tarif dépend de la zone : pas de donnée inventée.

### 5. Titres de fiches
- `buildProductSeoTitle` : si le titre complet dépasse 60 caractères, le montant est retiré (il
  reste dans la meta description). Le marqueur « prix Cameroun » est conservé (garde du prérendu).

## Vérification
- Tests unitaires : `tests/unit/productSeo.test.ts` (titre long), test `productJsonLd`
  (politique de retour, livraison selon seuil), `vercel.json` (fourre-tout → `/spa.html`).
- `tsc --noEmit` sur le projet.
- Navigateur local : URL inconnue → page « introuvable » + `noindex` ; accueil et fiche → un seul
  `<h1>`.
- Après déploiement : `curl` d'une URL inconnue (shell sans contenu d'accueil), validateur
  Rich Results sur une fiche produit.

## Rollback
Commits isolés par correctif ; le correctif 1 se désactive en remettant `/index.html` comme
destination de la règle fourre-tout dans `vercel.json`.
