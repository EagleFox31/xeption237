# Plan — Smart Troc Multi-Appareils

## Objectif

Ouvrir `Smart Troc` à plusieurs familles d'appareils sans casser le moteur
smartphone déjà en production.

Le principe directeur est simple :

- conserver le moteur `phone` tel quel
- ajouter de nouveaux moteurs spécialisés à côté
- router le parcours selon la catégorie choisie

On ne généralise pas brutalement le moteur téléphone. On étend latéralement.

---

## Contrainte non négociable

Le moteur smartphone actuel reste la référence.

Ce plan interdit :

- de fusionner `laptop`, `console`, `tablet` dans le moteur téléphone
- d'ajouter des `if category === ...` partout dans le code existant
- de dégrader l'expérience `phone` déjà stabilisée

Ce plan autorise :

- un écran de sélection catégorie au début
- un orchestrateur qui choisit le bon moteur
- un profil de parcours et d'évaluation par famille d'appareils

---

## État actuel du projet

Ce qui existe déjà :

- flow smartphone complet dans [pages/TrocPage.tsx](xeption-app/xeption237/pages/TrocPage.tsx)
- orchestration principale dans [hooks/useTradeIn.ts](xeption-app/xeption237/hooks/useTradeIn.ts)
- formulaire smartphone dans [components/troc/SmartTrocForm.tsx](xeption-app/xeption237/components/troc/SmartTrocForm.tsx)
- vérification IMEI dans [components/troc/ImeiChecker.tsx](xeption-app/xeption237/components/troc/ImeiChecker.tsx)
- pricing smartphone dans [utils/trocPricing.ts](xeption-app/xeption237/utils/trocPricing.ts)
- services troc dans [services/trocEvaluationService.ts](xeption-app/xeption237/services/trocEvaluationService.ts)
- base Argus `trade_in_models` déjà partiellement multi-catégories via [types.ts](xeption-app/xeption237/types.ts)

Ce qui existe en plus et change la stratégie :

- vous avez déjà un Argus large, environ `22k` entrées
- donc `PC`, `tablette`, `console` peuvent viser une estimation semi-auto plus tôt
- le vrai sujet n'est plus le manque de prix de base
- le vrai sujet est la séparation propre des moteurs par catégorie

---

## Vision produit

Catégories visibles :

1. `Téléphone`
2. `PC portable / MacBook`
3. `Console`
4. `Tablette`
5. `Montre, écouteurs, accessoires`

Rollout recommandé :

- `Téléphone` : actif, flow complet actuel
- `PC portable / MacBook` : prochain moteur à ouvrir
- `Tablette` : ensuite
- `Console` : ensuite
- `Montre, écouteurs, accessoires` : dernier, soit moteur simplifié, soit quote encadrée

Pourquoi cet ordre :

- `laptop` est le plus proche d'un flow structurable avec Argus
- `tablet` partage une partie du modèle téléphone
- `console` a ses propres critères mais reste cadrable
- `other` est la catégorie la plus hétérogène

---

## Architecture cible

### 1. Gateway de catégorie

Le premier écran `/troc` choisit la famille d'appareil.

Cette étape ne fait qu'une chose :

- poser `deviceCategory`

Le reste du parcours dépend de cette valeur.

### 2. Orchestrateur central

On ajoute un résolveur de moteur.

Exemple logique :

```ts
resolveTradeInEngine(deviceCategory)
```

Retour attendu :

- `phoneEngine`
- `laptopEngine`
- `tabletEngine`
- `consoleEngine`
- `otherEngine`

### 3. Profil de parcours

Chaque catégorie expose son `profile`.

Un profile décrit :

- les étapes affichées
- les champs requis
- le type d'identifiant attendu
- les validations
- la stratégie Argus
- le moteur de scoring
- le message de sortie

### 4. Moteurs indépendants

Chaque moteur calcule :

- `basePrice`
- `conditionScore`
- `tradeInValue`
- `tradeInGrade`
- `justification`
- `blockers`

Le moteur `phone` garde ses règles actuelles.

Les autres moteurs sont nouveaux.

---

## Structure de fichiers recommandée

Créer une architecture par moteurs, pas un gros service unique.

```txt
components/troc/
  DeviceCategorySelector.tsx
  DeviceIdentifier.tsx
  forms/
    PhoneTrocForm.tsx
    LaptopTrocForm.tsx
    TabletTrocForm.tsx
    ConsoleTrocForm.tsx
    OtherTrocForm.tsx

hooks/troc/
  useTradeInFlow.ts
  useTradeInCategory.ts

services/troc/
  resolveTradeInEngine.ts
  profiles/
    phoneProfile.ts
    laptopProfile.ts
    tabletProfile.ts
    consoleProfile.ts
    otherProfile.ts
  engines/
    phoneEngine.ts
    laptopEngine.ts
    tabletEngine.ts
    consoleEngine.ts
    otherEngine.ts
  shared/
    argusLookup.ts
    identifierRules.ts
    mediaRules.ts
    commonScoring.ts
    commonTypes.ts
```

Le service actuel [services/trocEvaluationService.ts](xeption-app/xeption237/services/trocEvaluationService.ts)
ne doit pas devenir un monolithe encore plus gros. Il doit progressivement
servir de façade ou être décomposé proprement.

---

## Modèle de données cible

### `TrocDeviceForm`

Ajouter :

- `deviceCategory`
- `identifierType`
- `serialNumber`

Rendre certains champs dépendants de la catégorie :

- `imei` : smartphone / certaines tablettes cellulaires
- `batteryHealth` : smartphone uniquement
- `cameraCondition` : smartphone / tablette seulement si utile
- `biometricsWork` : smartphone / tablette selon catégorie

Ajouter des champs spécialisés par catégorie.

### Champs laptop

- `cpu`
- `ram`
- `storage`
- `screenSize`
- `chargerIncluded`
- `keyboardLayout`
- `keyboardFaulty`
- `trackpadWorks`
- `batteryHoldsCharge`
- `portsFunctional`

### Champs tablet

- `connectivityType` : `wifi` | `cellular`
- `stylusIncluded`
- `batteryHoldsCharge`
- `screenCondition`
- `bodyCondition`

### Champs console

- `storage`
- `controllersCount`
- `officialControllersCount`
- `hdmiIncluded`
- `powerCableIncluded`
- `readsDiscs`
- `overheats`
- `videoOutputOk`

### Champs other

- `subType`
- `accessoriesIncluded`
- `functionalState`

### `TradeInRequest`

Ajouter progressivement :

- `device_category`
- `identifier_type`
- `serial_number`
- `specs_snapshot` `jsonb`
- `engine_version`
- `engine_name`

Le `jsonb` est important pour ne pas exploser la table avec trop de colonnes
spécifiques tant que tous les moteurs ne sont pas stabilisés.

---

## Identifiant appareil

Ne pas penser "IMEI ou rien". Penser "type d'identifiant".

Règle métier :

- `phone` : IMEI obligatoire
- `tablet`
  - `cellular` : IMEI obligatoire
  - `wifi` : serial number facultatif ou obligatoire selon politique
- `laptop` : serial number recommandé
- `console` : serial number recommandé
- `other` : identifiant facultatif

Composant cible :

- remplacer la logique de [components/troc/ImeiChecker.tsx](xeption-app/xeption237/components/troc/ImeiChecker.tsx)
  par un composant plus générique `DeviceIdentifier.tsx`
- conserver le sous-comportement IMEI pour `phone`

Ainsi, le code téléphone est réutilisé, mais pas imposé aux autres.

---

## Stratégie Argus

Vous avez déjà suffisamment d'Argus pour lancer un vrai système multi-appareils.

Donc la règle devient :

- `basePrice` vient d'abord de l'Argus catégorie + marque + modèle
- les moteurs appliquent ensuite leurs propres décotes / coefficients

Prévoir une couche partagée :

- recherche exacte
- recherche floue
- normalisation des modèles
- fallback si plusieurs résultats
- log du niveau de confiance

Sorties possibles :

- `base price confirmed`
- `base price inferred`
- `base price uncertain`

Cela permet de garder une estimation semi-auto mais honnête.

---

## Scoring par moteur

### `phoneEngine`

Aucun changement structurel au départ.

On garde :

- IMEI
- batterie %
- biométrie
- caméra
- écran
- boîtier
- iCloud / Google account unlocked

### `laptopEngine`

Critères recommandés :

- état écran
- état coque
- batterie tient la charge
- chargeur fourni
- clavier OK
- trackpad OK
- ports OK
- RAM / SSD / CPU déjà intégrés au modèle Argus

Blockers possibles :

- ne s'allume pas
- carte mère / vidéo KO
- écran mort total

### `tabletEngine`

Critères recommandés :

- type `wifi` ou `cellular`
- IMEI si cellulaire
- écran
- boîtier
- batterie tient la charge
- tactile OK
- Face ID / Touch ID si pertinent

### `consoleEngine`

Critères recommandés :

- s'allume
- sortie vidéo OK
- lit les jeux / disques si version lecteur
- surchauffe
- manettes incluses
- câbles inclus

### `otherEngine`

Moteur plus léger :

- état global
- fonctionnement
- accessoires inclus
- photo proof

Au début, `otherEngine` peut retourner une fourchette prudente ou un verdict
`validation boutique renforcée`.

---

## UX cible

### Étapes de haut niveau

Le stepper ne doit pas être hardcodé une fois pour toutes.

Il doit venir du profile.

Exemples :

#### Smartphone

```txt
Catégorie → Appareil → Photos → IMEI → Paiement → Résultat → Bon
```

#### Laptop

```txt
Catégorie → Appareil → Specs → Photos → S/N → Paiement → Résultat → Bon
```

#### Console

```txt
Catégorie → Appareil → Accessoires → Photos → S/N → Paiement → Résultat → Bon
```

Le stepper devient piloté par config, pas codé en dur dans une seule constante.

---

## Plan d'implémentation par phases

### Phase 0 — Stabilisation de la gateway

Objectif :

- garder l'écran de choix catégorie
- supprimer les doublons éventuels
- figer les catégories finales

Livrables :

- [pages/TrocPage.tsx](xeption-app/xeption237/pages/TrocPage.tsx) propre
- design stable de la gateway

### Phase 1 — Socle multi-catégories

Objectif :

- ajouter `deviceCategory` au form
- introduire les profiles et le résolveur
- ne rien casser côté téléphone

Livrables :

- `deviceCategory` dans [types.ts](xeption-app/xeption237/types.ts)
- `resolveTradeInEngine.ts`
- `profiles/phoneProfile.ts`
- migration éventuelle DB pour `device_category`

### Phase 2 — Extraction du moteur téléphone

Objectif :

- isoler le moteur smartphone actuel dans `phoneEngine`
- conserver exactement le comportement existant

Livrables :

- `engines/phoneEngine.ts`
- tests de non-régression logique

### Phase 3 — Identifiant générique

Objectif :

- créer `DeviceIdentifier.tsx`
- garder IMEI pour téléphone
- ouvrir S/N pour les autres catégories

Livrables :

- composant générique
- règles `identifierRules.ts`

### Phase 4 — Laptop engine

Objectif :

- première vraie nouvelle catégorie active

Livrables :

- `LaptopTrocForm.tsx`
- `laptopProfile.ts`
- `laptopEngine.ts`
- mapping Argus laptop

### Phase 5 — Tablet engine

Objectif :

- gérer `wifi` vs `cellular`

Livrables :

- `TabletTrocForm.tsx`
- `tabletProfile.ts`
- `tabletEngine.ts`

### Phase 6 — Console engine

Objectif :

- activation console

Livrables :

- `ConsoleTrocForm.tsx`
- `consoleProfile.ts`
- `consoleEngine.ts`

### Phase 7 — Other engine

Objectif :

- dernier moteur, plus prudent

Livrables :

- `OtherTrocForm.tsx`
- `otherProfile.ts`
- `otherEngine.ts`

---

## Ordre de priorité recommandé

1. `phone` inchangé
2. `laptop`
3. `tablet`
4. `console`
5. `other`

Pourquoi :

- meilleur rapport volume / structuration
- plus simple pour roder l'architecture après téléphone
- évite de commencer par la catégorie la plus floue

---

## Ce qu'on ne fait pas

- pas de refactor global "one size fits all"
- pas d'ajout brutal de toutes les catégories dans le même formulaire
- pas de mutation du moteur téléphone pour lui faire porter tous les cas
- pas de scoring générique faible juste pour dire "ça marche partout"

---

## Décisions produit à verrouiller

1. `serial number` obligatoire ou non pour :
   - laptop
   - console
   - tablette wifi

2. `other` :
   - vrai moteur léger
   - ou estimation prudente avec validation boutique plus forte

3. niveau de sortie autorisé par catégorie :
   - montant précis
   - fourchette
   - ou "pré-estimation"

4. seuil de confiance Argus :
   - quand accepte-t-on une correspondance approximative
   - quand exige-t-on revue boutique

---

## Recommandation finale

La meilleure implémentation n'est pas :

- "rendre SmartTrocForm plus intelligent"

La meilleure implémentation est :

- garder le moteur smartphone
- créer une architecture `profiles + engines`
- ouvrir les nouvelles catégories une par une
- brancher l'Argus existant comme source commune de prix de base

En une phrase :

`on protège le téléphone, on spécialise le reste, on orchestre au centre`
