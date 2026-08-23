# Blueprint Homepage — Audit Kmerphone & Adaptation Xeption

> Analyse de la page d'accueil de **kmerphone.com** (référence merchandising local) et
> traduction en blueprint pour la homepage Xeption. Objectif concret : que l'accueil
> **montre de vraies cartes produit dans chaque section** (pas juste des filtres).
>
> _Rédigé le 2026-07-14._

---

## 1. Note globale : **15 / 20**

Kmerphone n'est pas beau, mais il **vend**. C'est une machine à merchandising : chaque
scroll met des produits achetables sous les yeux. Il perd des points sur la **qualité**
(images cassées), le **premium** (design générique) et la **longueur** (page fleuve).

| Axe | Note | Commentaire |
|---|---|---|
| Densité produit / merchandising | 18/20 | Chaque section = vraies cartes, prix, CTA |
| Conversion (CTA, urgence, réassurance) | 17/20 | ACHETER partout, compte à rebours, trust bar, WhatsApp |
| Découvrabilité (catégories/marques) | 16/20 | Barre chips + tuiles catégories + logos marques |
| SEO on-page | 14/20 | Bloc texte « leader du smartphone » en bas (bon), mais peu de schema |
| Qualité d'exécution | 9/20 | **Images produit cassées** sur plusieurs rangées |
| Premium / image de marque | 8/20 | Vert/blanc générique, dense, « marché » plus que « boutique » |

---

## 2. Audit structurel (section par section, de haut en bas)

| # | Section | Rôle | Ce qui marche |
|---|---|---|---|
| 1 | Header (logo, recherche, compte, panier) | Navigation | Recherche très large, centrale |
| 2 | Barre chips (OFFRE FLASH, BEST SELLERS, SAMSUNG, XIAOMI, IPHONE, 5G, RECONDITIONNÉS, TABLETTES, BONS PLANS) | Accès rapide catégories/marques/thèmes | 1 clic vers tout ; **c'est ce qu'on a répliqué** |
| 3 | Hero (menu catégories à gauche, carrousel promo au centre, 2 tuiles promo à droite) | Accroche + offres | Le carrousel pousse une offre forte (paiement 3×), les tuiles poussent 2 deals |
| 4 | Trust bar (Livraison 2H, Paiement livraison, 100% authentiques, SAV, Retour gratuit) | Réassurance | Lève les freins d'achat immédiatement |
| 5 | **NOS CATEGORIES** (6 grandes tuiles image) | Navigation visuelle | Tuiles imagées cliquables, très lisibles |
| 6 | Rangée logos marques | Confiance + nav marque | Renforce la crédibilité |
| 7 | **Ventes Flash \| Chaque semaine** (compte à rebours + carrousel cartes) | **Urgence** | « Termine dans 05j 09h 37m » + cartes -32%, -27%… |
| 8 | **Les Bonnes Affaires** (onglets Offre Spéciale / BEST DEALS / Flash Deals / Promotion + carrousel) | Deals segmentés | Onglets = plusieurs angles de deal sur un même bloc |
| 9-14 | **Rangées par catégorie** : Tablettes, Téléphones à touches, Chargeurs, Écouteurs, Powerbanks, Montres connectées (titre + « Voir plus » + carrousel cartes) | Merchandising catégorie | Chaque rayon a sa vitrine ; « Voir plus » → catégorie complète |
| 15 | **Produits Recommandés** (grille multi-rangées) | Volume / découverte | Grille dense de cartes |
| 16 | Rangée logos marques (again) | Confiance | Redondant avec #6 |
| 17 | Bloc SEO (« KMERPHONE – Le leader du smartphone au Cameroun » + « Qui sommes-nous » repliable) | **SEO / GEO** | Texte riche en mots-clés pour Google |
| 18 | Footer (WhatsApp, liens, app) | Contact / conversion | CTA WhatsApp bien visible |

**La carte produit type** (répétée partout) : image · badge (`+30 Go offerts` / `-32%`) ·
titre complet (specs dans le nom) · **prix vert** + ancien prix barré · badge % · gros
bouton **ACHETER**. Standardisée = lisible, scannable, orientée achat.

---

## 3. Pourquoi ça marche (les principes à retenir)

1. **Densité produit = zéro clic pour voir des produits.** Dès l'accueil, on scrolle des
   dizaines de produits achetables. Rien n'est « caché derrière un filtre ».
2. **Merchandising thématique.** L'accueil = une succession de **vitrines** (Ventes Flash,
   Bonnes Affaires, puis rayon par rayon). Chacune a son angle et son « Voir plus ».
3. **Urgence réelle.** Ventes Flash avec **compte à rebours** hebdo → pression d'achat.
4. **Cartes standardisées.** Même gabarit partout → l'œil scanne vite, le prix barré + %
   crée l'affaire.
5. **Réassurance omniprésente.** Trust bar + logos marques + WhatsApp → confiance.
6. **Bloc SEO en bas.** Texte « leader du smartphone au Cameroun » + « Qui sommes-nous »
   = contenu mots-clés pour le référencement (et le GEO).

---

## 4. Ce qu'il NE faut PAS copier

- ❌ **Images produit cassées** (plusieurs rangées : Chargeurs, Écouteurs, Powerbanks) →
  vrai défaut de qualité qui casse la confiance. **Xeption doit avoir un fallback image.**
- ❌ **Page fleuve** (10+ sections) → lourde, longue. On peut être plus resserré.
- ❌ **Design générique** vert/blanc « marché » → Xeption garde son **dark premium**.
- ❌ **Redondances** : marques affichées 2×, `TOP SMARTPHONES` vs `SMARTPHONES`.
- ❌ **Fausse urgence** : un compte à rebours doit correspondre à une **vraie** vente flash
  (cf. doctrine honnêteté : pas de fausses notes, pas de fausse urgence).

---

## 5. Blueprint Xeption (adaptation premium + honnête)

**Le problème actuel** : sur l'accueil Xeption, « Nos Pépites » montre un **filtre TYPE DE
PRODUIT** mais l'utilisateur ne voit pas immédiatement de **cartes**. Kmerphone prouve
qu'il faut des **vitrines de cartes** par thème/catégorie.

### Structure cible de la homepage Xeption

1. **Header + barre catégories/marques** — ✅ déjà fait.
2. **Hero** (welcome + Top Ventes) — ✅ existe. Garder.
3. **Trust bandeau** — ✅ existe.
4. **▶️ Rangées produit thématiques** (le vrai ajout, façon Kmerphone mais premium) :
   - **Promos / Bonnes Affaires** — carrousel des `isPromo` (prix barré + %).
   - **Smartphones** — carrousel catégorie `phones` + « Voir tout » → `/shop?cat=phones`.
   - **Ordinateurs** — carrousel `computer` → `/shop?cat=computer`.
   - **Tablettes** — carrousel `tablettes`.
   - **Accessoires** — carrousel `accessories`.
   - **Reconditionnés** — carrousel `condition=refurbished` (ton différenciateur).
   - _(Chaque rangée = titre + « Voir tout » + scroll horizontal de cartes, réutilise
     `ProductList`/un `ProductCarousel`.)_
5. **Section Troc** (CTA « Estimer mon téléphone ») — différenciateur unique, garder/mettre en avant.
6. **Bloc SEO/GEO** en bas (façon Kmerphone mais aligné sur notre stratégie) : texte
   « Xeption, high-tech & troc au Cameroun » + mini-FAQ → nourrit le référencement **et**
   les IA (cf. `SEO_GEO_STRATEGY.md`).
7. **Footer**.

### Règles d'adaptation (l'ADN Xeption)

- **Cartes = réutiliser le gabarit existant** (dark, badge NEUF/PROMO, prix, panier).
- **Fallback image obligatoire** (ne jamais afficher un cadre vide comme Kmerphone).
- **« Nos Pépites » évolue** : garder le filtre in-place, MAIS toujours afficher des cartes
  sous le filtre (au moins la 1re rangée visible sans scroll excessif).
- **Vente Flash** : seulement si on implémente le **vrai** mécanisme (flag + compte à
  rebours), sinon on s'en tient à « Promos ». Pas de fausse urgence.
- **Resserrer** : 5-6 vitrines bien choisies plutôt que 12 (rester premium, pas fleuve).

---

## 6. Priorisation (quick wins)

| Priorité | Action | Effort |
|---|---|---|
| 🥇 | **Rangées produit par catégorie sur l'accueil** (Smartphones, Ordinateurs, Tablettes, Accessoires, Reconditionnés) — voir des cartes tout de suite | Moyen (réutilise ProductList / carrousel) |
| 🥇 | **Fallback image** sur les cartes produit (ne jamais montrer un cadre vide) | Faible |
| 🥈 | **Rangée Promos / Bonnes Affaires** en haut du catalogue | Faible |
| 🥈 | **Bloc SEO/GEO** en bas d'accueil (texte + mini-FAQ) | Faible |
| 🥉 | **Vraie Vente Flash** (data model + compte à rebours) | Élevé — chantier séparé |

**Résumé** : Kmerphone gagne parce que son accueil est une **enfilade de vitrines
produit**. Xeption doit adopter ce merchandising — des **rangées de cartes par
catégorie/thème** — tout en gardant son **dark premium**, un **fallback image** propre, et
**zéro fausse urgence**.
