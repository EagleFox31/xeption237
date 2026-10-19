# Plan — Version desktop de la Marketplace

> Pour exécution par Gemini (ou autre agent). Repo : `xeption237/`. Stack : React 18 + Vite + TailwindCSS + Supabase. Pas de PR ni de commit tant que l'humain n'a pas validé le rendu dans le navigateur.

## 1. Contexte

- Les 2 pages Marketplace ont été livrées en **layout mobile uniquement** :
  - `pages/MarketplaceBrowsePage.tsx` (312 lignes) — grille d'annonces vendeurs, grid-cols-2 fixe
  - `pages/MarketplacePage.tsx` (569 lignes) — funnel vendeur 3 étapes (specs → prix → paiement CamPay)
- Zéro breakpoint `md:` / `lg:` → sur desktop, les cartes et formulaires s'étalent sur toute la largeur, bande horizontale moche.
- La version mobile fonctionne et doit **rester intacte**. On ajoute uniquement une couche desktop.

## 2. Objectif

Rendre les 2 pages présentables en desktop (≥ 768 px) sans toucher au comportement produit (requêtes, validations, analytics, paiement CamPay). Cohérence visuelle avec le reste du site (dark, or `#ffd700` ↔ classe `text-xeption-gold` / `amber-400`, bordures `white/10`).

## 3. Contraintes dures

- **Ne pas casser le mobile** : chaque modification doit utiliser les préfixes responsive Tailwind (`md:`, `lg:`, `xl:`). Les classes de base (sans préfixe) restent le layout mobile actuel.
- **Pas de refonte logique** : aucune modification des `useState`, `useEffect`, requêtes Supabase, fonctions de calcul (`listingFee`, `specMultiplier`, `fuzzyMatch`), analytics, flow CamPay.
- **Pas de nouvelle dépendance** npm.
- **Pas de duplication** : ne pas créer `MarketplaceBrowsePageDesktop.tsx`. On fait du responsive dans le même fichier.
- **Lire `AGENTS.md` et `CLAUDE.md`** à la racine `xeption237/` avant toute action non triviale.
- **Pas d'attribution IA** dans les commits ou PR (règle globale repo).
- Textes en **français**, phrases courtes et directes.
- Pas de texte gris sur fond non noir (règle UX du projet) — préférer `text-zinc-300` ou `text-white`.

## 4. Travaux détaillés

### 4.1 `pages/MarketplaceBrowsePage.tsx` — Liste des annonces

**État actuel** : `<div className="w-full min-h-screen bg-[#09090c] pb-28 relative">` + header sticky + grid 2 colonnes.

**Cible desktop** :

| Zone | Mobile (inchangé) | Desktop (`md:` et au-dessus) |
|---|---|---|
| Container racine | pleine largeur | `md:max-w-7xl md:mx-auto md:px-6 lg:px-8` |
| Header sticky (recherche + filtres prix) | sticky top-0 | reste sticky mais `md:px-6 lg:px-8`, input recherche `md:max-w-md` |
| Compteur résultats | petit | `md:text-sm` |
| Grille annonces | `grid-cols-2 gap-3` | `md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-5 lg:gap-6` |
| Carte annonce (`ListingCard`) | taille mobile | `md:` : hauteur image `md:h-48 lg:h-56`, padding interne `md:p-4`, titre `md:text-base`, prix `md:text-lg` |
| Skeleton | `h-36` image | `md:h-48 lg:h-56` cohérent avec vraies cartes |
| État vide | centré petit | `md:py-32`, icône `md:w-16 md:h-16`, titre `md:text-xl` |

**Points précis** :
- Ligne 229 : passer `<div className="w-full min-h-screen bg-[#09090c] pb-28 relative">` → `<div className="w-full min-h-screen bg-[#09090c] pb-28 md:pb-16 relative">` (le `pb-28` sert à la bottom nav mobile, inutile en desktop).
- Ligne 232 (header) : ajouter `md:px-6 lg:px-8` et wrapper interne `md:max-w-7xl md:mx-auto`.
- Ligne 274 (corps) : idem `md:max-w-7xl md:mx-auto md:px-6 lg:px-8`.
- Lignes 276 et 301 : les 2 `grid grid-cols-2 gap-3` → `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5 lg:gap-6`.
- Dans `ListingCard` (component local au-dessus, chercher `const ListingCard` ligne ~120) : agrandir image et typographies en `md:`.

### 4.2 `pages/MarketplacePage.tsx` — Funnel vendeur

**État actuel** : 3 étapes verticales, 569 lignes de JSX avec cards empilées pleine largeur.

**Cible desktop** : layout 2 colonnes dès `lg:` :
- **Colonne gauche (sticky, `lg:w-80`)** : récap de l'appareil (brand, model, grade, IMEI badge, specs sélectionnées) + prix min/max en cours de saisie + fee à payer. Reste visible pendant que l'utilisateur scrolle le formulaire.
- **Colonne droite (`lg:flex-1`)** : le wizard d'étapes actuel.

**Container** : `lg:max-w-6xl lg:mx-auto lg:px-8`. En dessous de `lg:` → layout mobile actuel intact.

**Détails** :
- Détecter le `<main>` ou le `<div>` racine du return, le wrapper d'un `<div className="lg:flex lg:gap-8 lg:items-start">`.
- Créer un composant local `DesktopRecap` qui prend `{ deviceLabel, grade, imeiLabel, storageRaw, ramRaw, accessories, minVal, maxVal, fee }` et le rendre uniquement en `lg:` (ex: `<aside className="hidden lg:block lg:sticky lg:top-8 lg:w-80 shrink-0">`).
- La colonne droite garde exactement le JSX actuel du wizard, mais ses cartes gagnent `md:p-6 lg:p-8` et les boutons CTA `md:text-base`.
- L'étape 3 (paiement CamPay avec polling) : vérifier que le `<div>` du spinner reste centré en desktop.
- Les champs input numériques (prix, RAM, stockage) : `md:text-base` pour lisibilité.

### 4.3 Composants mobile associés (ne pas toucher si pas rendu sur ces pages)

- `components/mobile/MobileMarketplacePass.tsx` et `components/mobile/MobileVenteVoucher.tsx` : vérifier d'abord s'ils sont importés depuis les 2 pages ci-dessus. Si oui, les rendre eux aussi responsive avec la même logique (`md:max-w-3xl md:mx-auto`). Si non, ne rien faire.

### 4.4 Bottom nav mobile vs desktop

Le site a un `MobileBottomNav` déjà caché en desktop (vérifier `components/MobileBottomNav.tsx` → doit avoir `md:hidden`). Si ce n'est pas déjà le cas sur ces pages marketplace, pas de modif à faire côté nav — elle est globale.

## 5. Procédure d'exécution

1. **Lire d'abord** : `AGENTS.md`, `CLAUDE.md`, `PASSATION.md` à la racine `xeption237/`.
2. **Grep** `md:|lg:` dans `pages/MarketplacePage.tsx` et `pages/MarketplaceBrowsePage.tsx` pour confirmer le point de départ (~ 0-5 occurrences attendues).
3. **Modifier** `MarketplaceBrowsePage.tsx` d'abord (plus simple, grille).
4. **Lancer** `npm run dev` (port 4173, pas 5173).
5. **Vérifier manuellement** 3 largeurs : 375 px (iPhone SE), 768 px (iPad portrait), 1440 px (laptop). Les 3 doivent être propres.
6. **Modifier** `MarketplacePage.tsx` ensuite (funnel 2 colonnes).
7. **Re-tester** les 3 largeurs + le funnel complet jusqu'à l'étape paiement (sans valider CamPay).
8. **Pas de commit** sans validation humaine du rendu.

## 6. Critères d'acceptation

- [ ] Mobile 375 px : rendu **identique** à aujourd'hui (régression zéro).
- [ ] Desktop 1440 px, page Browse : grille 4-5 colonnes, header sticky centré, cartes lisibles sans étirement.
- [ ] Desktop 1440 px, page funnel : récap sticky à gauche, wizard à droite, pas de bande horizontale vide à droite.
- [ ] Tablette 768 px : grille 3 colonnes sur Browse, funnel reste empilé (le 2 colonnes ne s'active qu'à `lg:` ≥ 1024 px).
- [ ] Aucune nouvelle erreur en console browser.
- [ ] `npm run build` passe sans warning Tailwind "unknown class".

## 7. Hors scope (ne pas faire)

- Refonte du design cards (couleurs, typo, icônes) — on garde l'identité actuelle.
- Ajout de filtres / tri supplémentaires sur la Browse.
- Modification du flow CamPay ou de la table `marketplace_listings`.
- SEO / Open Graph sur ces pages.
- Tests Playwright E2E — à ajouter séparément plus tard.

## 8. Fichiers à toucher — récap

```
pages/MarketplaceBrowsePage.tsx    (modifier : responsive layout + grille)
pages/MarketplacePage.tsx          (modifier : layout 2 colonnes desktop)
```

Zéro nouveau fichier attendu.
