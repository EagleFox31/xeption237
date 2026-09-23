# Standard d'Ingénierie RAIDER

Les automatisations, composants partagés et évolutions de plateforme suivent par défaut le standard **RAIDER** :

- **R — Reusable** : Construire des capacités réutilisables, composables et configurables plutôt que des scripts spécifiques à un seul projet ou à une seule vue.
- **A — Agnostic** : Éviter les hypothèses codées en dur sur un dépôt, un owner, une branche, une stack, un workflow ou un environnement précis.
- **I — Idempotent** : Plusieurs exécutions avec le même état désiré doivent converger vers le même résultat sans doublons ni mutations inutiles.
- **D — Durable / Non-regressive** : Une nouvelle capacité ne doit pas casser les contrats, workflows et comportements déjà supportés ; la non-régression doit être couverte par des tests. Les erreurs et near misses significatifs alimentent une failure memory (`docs/engineering/ERRORS_LOG.md`) : cause racine, résolution, prévention et leçon généralisable sont conservées afin de réduire la récidive.
- **E — Engineering-grade** : Appliquer des patterns professionnels adaptés — séparation des responsabilités, configuration déclarative, moindre privilège, contrats explicites, testabilité, compatibilité et erreurs actionnables — avec un réflexe *reuse-first* : rechercher d'abord repositories, bibliothèques, Actions, standards et patterns existants, puis décider consciemment **Adopt / Adapt / Learn / Build**.
- **R — Retroactive** : Les projets et composants existants doivent pouvoir adopter une évolution sans reconstruction destructive ni hypothèse de greenfield.

---

## Application au Développement Mobile (Xeption)

Dans le cadre de la refonte mobile de Xeption (boutique, catalogue, tunnel Troc) :
1. **Reusable** : Les briques de l'interface mobile (`MobileHeader`, `MobileCategoryPills`, `MobileHeroBanner`, `MobileFlashSales`, `MobileTrustBandeau`) sont conçues comme des composants Lego indépendants et paramétrables via des props TypeScript strictes.
2. **Agnostic** : Les composants ne dépendent pas d'un état global figé ; ils consomment les contrats de types universels (`Product`, `Category`, `Pack`) et les utilitaires partagés de formatage et de slug.
3. **Idempotent** : Les interactions (ajouts au panier, filtrages, toggles de menu) produisent des états finaux prévisibles sans duplications accidentelles ni effets de bord fantômes.
4. **Durable** : L'expérience desktop reste 100% préservée et testée. Aucune rupture d'API ni de contrat de routage.
5. **Engineering-grade** : Utilisation des conventions seniors de `AGENTS.md` (`getProductDisplayName`, `normalizeSamsungGalaxySpelling`, gestion des erreurs d'images, typage exhaustif).
6. **Retroactive** : Intégration transparente dans les pages existantes (`HomePage.tsx`, etc.) sans migration destructrice ni régression de template.
