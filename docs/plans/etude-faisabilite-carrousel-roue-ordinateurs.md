# Étude de faisabilité — carrousel « roue courbe » pour les ordinateurs

> Statut : étude, rien n'est codé. Date : 18/11/2026.
> Inspiration : vidéo TikTok @webloved « Curved Product Carousel CSS: Rotating Wheel Technique ».
> Le produit central est mis en avant, les voisins s'inclinent sur un arc, sur fond coloré avec un grand titre.

## Verdict

**Pilote limité, pas un go général.** Techniquement, c'est faisable en 1 à 2 jours. Le vrai coût, ce sont les
**visuels** : seules ~16 des 32 photos d'ordinateurs se prêtent à l'effet, et aucune n'est détourée. Il faut
lancer le pilote sur **8 PC aux visuels refaits**, dans le hero de la page catégorie ordinateurs, et le
mesurer 4 semaines avant de l'étendre.

## 1. Données réelles (base prod, lecture seule, 18/11/2026)

| Indicateur | Valeur |
|---|---|
| Ordinateurs publiés (`category = 'computer'`) | **32**, tous en stock |
| État | 31 reconditionnés, 1 neuf |
| Marques | HP 17, Dell 7, Lenovo 5, Asus 2, Microsoft 1 |
| Prix | 74 900 → 700 000 FCFA (médiane 170 000) |
| `is_featured` / `isPromo` | 7 / 5 |
| Image principale + galerie | 32 / 32 |
| Format | 32 × WebP (worker R2), médiane 37 Ko, max 406 Ko |
| Ratio | 15 paysage, 12 carrés, 5 portrait |
| Plus petit côté | 4 < 400 px, 19 de 400 à 799 px, 9 ≥ 800 px |
| Fond (bords de l'image) | **19 blancs**, 12 « décor », **1 transparent** |

Revue visuelle de la planche contact :
- environ **16 packshots** sur fond blanc, exploitables tels quels si le fond est assorti. Les angles varient (face, dos, 3/4, tablette) ;
- environ **12 photos d'ambiance** : bureau, main, plante, pile de PC ;
- **3 à 4 visuels marketing** avec texte, pictos et badges incrustés. Inutilisables dans une roue.

**Conséquence :** sur fond coloré, ce qui fait le rendu de la vidéo, un packshot blanc forme un rectangle
blanc. L'effet suppose des **PNG/WebP détourés, de même cadrage (3/4 avant), de même échelle**.

### Chiffrage du détourage

| Option | Travail | Coût |
|---|---|---|
| A. Détourage auto (`sharp` + modèle de suppression de fond, ou outil SaaS) des 16 packshots, retouche à la main | script + contrôle visuel | ~0,5 j |
| B. Refaire 8 photos en boutique (fond uni, 3/4 avant, même focale) puis détourer | séance photo + post-traitement | ~1 j |
| C. Les 32 en homogène | B × 4 | ~3 j, à faire seulement si le pilote est concluant |

Stockage : nouvelle colonne optionnelle (ex. `cutout_image text null`, migration **additive**) ou convention
de nom sur le worker R2. Repli automatique : produit sans détourage = **exclu de la roue** (pas affiché en mauvais état).

## 2. Où le placer

| Emplacement | Pour | Contre | Avis |
|---|---|---|---|
| **Hero de `/categorie/pc-portables-reconditionnes-cameroun`** (`pages/LandingPage.tsx`, ou un futur `/categorie/ordinateurs`) | page dédiée PC, trafic SEO qualifié, sans concurrence avec d'autres blocs | trafic plus faible que l'accueil | **Pilote** |
| Haut de `/shop?cat=computer` (`components/ProductList.tsx`) | trafic d'intention d'achat | décale la grille et les filtres sticky sur mobile, et ce composant fait déjà 1 100 lignes | non |
| Bloc sur `pages/HomePage.tsx` (remplace la rangée « Ordinateurs & Gaming », l.152) | forte visibilité | concurrence le hero (`components/Hero.tsx` + `hero/HeroMobileCarousel.tsx`, qui tournent déjà), donc deux animations dans le même écran | phase 2, si le pilote gagne |

Règles d'affichage à respecter : nom via `getProductDisplayName()` (`utils/productDisplay.ts`), pas d'étoiles
sans `reviews`, prix en FCFA via le formateur existant, CTA unique « Voir » / « Ajouter au panier ».

## 3. Technique — reuse-first

| Approche | Poids | Glisser au doigt | A11y | Effet roue | Risque |
|---|---|---|---|---|---|
| **CSS seul** : `scroll-snap` + transformation pilotée par `animation-timeline: view()` | 0 Ko | natif (scroll) | natif (liste scrollable) | oui | `animation-timeline` n'est pas encore universel (Chrome/Edge 115+, Safari récent, Firefox incertain) : il faut un repli statique avec `@supports` |
| **Embla Carousel** (`embla-carousel-react`) + exemple officiel « tween scale » adapté en rotation | ~7 Ko gz, sans dépendance | moteur de glisse éprouvé | à câbler (rôles ARIA, boutons) | via callback `scroll`, en `transform` sur chaque slide | faible |
| **Swiper** (`EffectCoverflow` + `A11y`) | ~25 à 45 Ko modulaire + CSS dédiés | oui | module A11y prêt | coverflow ≈ roue, mais en perspective 3D et non en arc | poids, styles globaux à importer alors que le projet n'a pas de CSS de librairie (Tailwind CDN) |
| Étendre `HeroMobileCarousel` (glisse maison avec `touchstart`/`touchend`, auto-défilement de 4,5 s) | 0 Ko | rudimentaire, sans inertie | limité | à écrire | réinventer un moteur de glisse |

**Décision : Adapt.** Embla pour le moteur (glisse, inertie, snap, boucle) et une transformation en arc maison
(`rotate` + `translateY` calculés depuis la progression du scroll), isolée dans `utils/wheelTransform.ts` et
testée en Vitest. Le CSS seul est séduisant, mais son support navigateur est encore trop inégal sur Android
d'entrée de gamme (WebView et Chrome pas à jour).

Calcul de l'arc (pur et testable) : pour une slide de distance `d` au centre (en nombre de slides),
`angle = d × STEP_DEG`, `translateY = R × (1 − cos(angle))`, `scale = 1 − |d| × SCALE_STEP`,
`opacity` dégressive. Ce sont des constantes nommées, sans nombres magiques.

## 4. Mobile d'abord

- **Glisse** : Embla gère le pointer et le tactile. Sur la piste, `touch-action: pan-y` pour ne pas bloquer le scroll vertical.
- **Performance sur Android d'entrée de gamme** : n'animer que `transform` et `opacity`, sans `filter`/`blur`/`box-shadow` animés. 5 à 7 slides rendues au maximum. Image centrale en `fetchpriority="high"`, les autres en `loading="lazy"`. WebP détourés ≤ 80 Ko, dimensionnés à 2× la taille affichée. À vérifier avec un profil Chrome DevTools CPU ×4 : pas de tâche > 50 ms pendant la glisse.
- **`prefers-reduced-motion`** : pas d'auto-défilement, transitions coupées, arc remplacé par une rangée plate. L'auto-défilement est désactivé par défaut de toute façon (un client qui lit un prix ne doit pas le voir partir).
- **Accessibilité** : section `aria-roledescription="carousel"` + `aria-label`, slides `role="group"` avec `aria-label="3 sur 8"`, boutons précédent/suivant réels (`<button>`), flèches ← → au clavier, focus visible, région `aria-live="polite"` qui annonce le produit central. Les slides hors écran restent atteignables au clavier. Référence : motif Carousel de l'APG W3C.

## 5. Valeur métier, mesure, coût

**Quels modèles** : 8 slots. Règle de sélection en config (et non en dur) : `is_featured` d'abord (7 aujourd'hui),
puis les promos (`isPromo`, 5), puis les meilleures marges, avec stock > 0 et un détourage disponible. Couvrir
la gamme de prix (une entrée < 120 000, un cœur 150 000 à 250 000, une vitrine haut de gamme), pas seulement le plus cher.

**Mesure** : `utils/analytics.ts` a déjà `trackViewItem` / `trackAddToCart`, mais **aucun événement de liste**.
Il faut ajouter les événements GA4 standard `view_item_list` et `select_item` avec `item_list_id = 'pc_wheel'`
(et `'pc_grid'` pour la grille). KPI sur 4 semaines contre la rangée actuelle : CTR vers fiche produit,
ajouts au panier par session de la page, et `begin_checkout` attribués à la liste. Seuil de succès proposé :
CTR +20 % sans baisse du taux d'ajout au panier.

**Coût estimé** :

| Lot | Jours |
|---|---|
| Visuels : 8 PC (option A ou B) | 0,5 à 1 |
| Composant `ProductWheel` (Embla + arc + a11y + reduced-motion) + tests de `wheelTransform` | 1,5 |
| Sélection configurable + événements analytics | 0,5 |
| QA mobile (Android bas de gamme, Safari iOS), Playwright | 0,5 |
| **Pilote total** | **3 à 3,5 j** |
| Extension accueil + 24 visuels restants | +3 j |

**Risques** : visuels hétérogènes (le principal) ; effet « gadget » qui cache le prix ou les specs (à corriger
avec le prix et 2 specs clés sous le produit central) ; poids des images en 3G ; deux animations concurrentes
sur l'accueil ; seulement 32 PC au catalogue, donc une roue de 8 tourne vite en rond (pas de boucle infinie
artificielle).

## 6. Plan en étapes

1. **Visuels** : choisir les 8 PC (règle § 5), les détourer, puis valider la planche avec le staff. *Critère : 8 WebP détourés ≤ 80 Ko, même cadrage.*
2. **Données** : introspection puis migration additive `cutout_image` (ou convention R2) via `npm run db:apply`. *Critère : `db:verify` vert.*
3. **Brique** : `utils/wheelTransform.ts` (TDD) puis `components/catalog/ProductWheel.tsx` générique (produits et config en props, réutilisable pour une autre catégorie). *Critère : tests Vitest verts, aucun `product.name` brut.*
4. **Intégration pilote** dans le hero de la landing PC, derrière un flag de config. *Critère : Lighthouse mobile ≥ score actuel, axe sans erreur, navigation clavier OK.*
5. **Mesure** : `view_item_list` / `select_item`, puis 4 semaines de données. *Critère : décision go/no-go chiffrée.*
6. **Si go** : extension à l'accueil (en remplacement de la rangée PC) et détourage des 24 restants.

## Sources

- [Embla Carousel — exemples officiels (tween scale, parallax)](https://www.embla-carousel.com/examples/predefined/)
- [Comparatif Embla / Swiper / Splide 2026 (tailles)](https://www.pkgpulse.com/guides/embla-carousel-vs-swiper-vs-splide-2026)
- [Swiper — composants React, modules EffectCoverflow et A11y](https://v9.swiperjs.com/react)
- [MDN — `animation-timeline`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)
- [Codrops — introduction aux animations pilotées par le scroll `scroll()` / `view()`](https://tympanus.net/codrops/2024/01/17/a-practical-introduction-to-scroll-driven-animations-with-css-scroll-and-view)
- [W3C WAI-ARIA APG — motif Carousel](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)
- [MDN — `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [GA4 — événements e-commerce `view_item_list` / `select_item`](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)
