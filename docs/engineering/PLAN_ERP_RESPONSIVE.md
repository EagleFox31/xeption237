# Plan — ERP utilisable sur téléphone par les commerciaux

**Date** : 2026-08-27
**Contexte** : le patron a payé le site public, pas l'ERP. Le rendre utilisable
sur téléphone est ce qui doit le convaincre — un commercial qui sort son
téléphone devant un client, pas un laptop.

---

## Périmètre réel, mesuré

L'ERP compte 24 onglets et 11 modales. **Un vendeur n'en voit que 7**
(`TAB_MIN_ROLE`, `utils/adminAccess.ts`) :

```
dashboard  pos  mySales  orders  inventory  productImages  clients
```

Rendre les 24 responsive serait du travail perdu. Sur ces 7 :

| onglet | tableau | défilement horizontal | verdict |
|---|---|---|---|
| DashboardTab | 2 | 2 | déjà géré |
| PosTab | 0 | 1 | déjà géré |
| ProductImagesBulkTab | 0 | 1 | déjà géré |
| **MySalesTab** | 1 | 0 | **déborde** |
| **OrdersTab** | 1 | 0 | **déborde** |
| **InventoryTab** | 1 | 0 | **déborde** |
| **ClientsTab** | 1 | 0 | **déborde** |

Quatre onglets à traiter, pas vingt-quatre.

La base mobile existe déjà : `BottomNav`, `AdminMenuSheet`, et
`getMobileQuickTabsForRole` dans `adminAccess.ts`. Rien à inventer de ce côté.

---

## Le choix de conception

**Défilement horizontal, la solution facile — et mauvaise ici.** Un tableau de
huit colonnes qu'on fait glisser du pouce, debout dans une boutique, avec un
client en face : on perd la colonne de gauche dès qu'on cherche à droite, et on
ne sait plus quelle ligne on lit.

**Cartes empilées sur mobile, tableau sur ordinateur.** Chaque ligne devient une
carte : l'information principale en tête, le reste en dessous. Le pouce fait
défiler verticalement, ce qu'il fait naturellement.

Concrètement, la table reste dans le DOM en `hidden md:table`, et une liste de
cartes en `md:hidden` la double. Deux rendus d'une même donnée, aucun risque de
divergence puisque les deux lisent le même tableau d'objets.

> Coût assumé : le balisage de chaque onglet grossit. C'est le prix d'une
> lecture correcte sur les deux supports — un tableau réellement responsive,
> lui, n'existe pas.

---

## Ordre de traitement, par réflexe métier

1. **Inventaire** — « c'est en stock ? » devant un client. Le geste le plus
   fréquent, et celui qui fait gagner une vente.
2. **Commandes** — suivre et faire avancer une commande depuis la boutique.
3. **Mes ventes** — le commercial suit son objectif et sa prime ; c'est ce qui
   le fait adopter l'outil.
4. **Clients** — consultation, moins urgent.

---

## Vérification

Mesurer, à chaque onglet, la largeur du corps de page à 412 px de large :
elle doit rester 412. Un débordement horizontal est le symptôme exact du
problème qu'on corrige, et il se mesure sans interprétation.

Contrôle complémentaire : aucune régression au-dessus de `md`, en comparant les
styles calculés avant et après — comme pour le correctif mobile de la page troc.

---

## Reprise du 2026-09-06 — ce que l'audit a corrigé du diagnostic initial

Le tableau de périmètre ci-dessus indiquait « déborde » pour quatre onglets, sur
la foi d'une recherche de `overflow-x` dans les fichiers d'onglet. **C'était une
erreur de méthode** : le conteneur de défilement ne vit pas dans l'onglet mais
dans `components/admin/shared/TableShell.tsx`, que dix onglets consomment. Il
porte `overflow-x-auto` dans ses deux branches, et l'ordre des règles dans le CSS
produit a été vérifié (`.overflow-x-auto` est déclaré après `.overflow-hidden`,
il l'emporte donc). **Le défilement horizontal des tableaux n'a jamais été
cassé.**

Le vrai défaut était vertical, et systématique : `h-[calc(100vh-140px)]` sur la
racine des onglets. Les 140 px sont calibrés pour le bureau ; le décor mesuré
vaut 197 px sous 640 px, 245 px si le bandeau porte un bouton d'action, et 263 px
entre 640 et 768 px. Le bas du panneau — dernières lignes et barre de défilement
horizontale — passait donc sous la barre de navigation. Et `vh` au téléphone vaut
la hauteur **barre d'adresse masquée**, ce qui aggrave l'écart dès qu'elle est
visible.

Corrigé par deux jetons dans `adminUi` (`tabViewportH`,
`tabViewportHWithActions`), appliqués à ClientsTab, DeliveryTab, InvoicesTab,
OrdersTab, ProductImagesBulkTab, InventoryTab et StaffTab.

`MySalesTab` est le seul cas qui demandait autre chose : ses cartes empilées sur
une colonne dépassent à elles seules la hauteur, la liste `flex-1` était donc
écrasée à zéro et rien ne défilait. Il passe en défilement de page sous 640 px.

### Mesures (Chrome, CSS produit, écran de 800 px)

| largeur | panneau | bas | limite | verdict |
|---|---|---|---|---|
| 412 px | 600 px | 685 | nav à 730 | dégagé, 44 px de marge |
| 700 px | 536 px | 687 | nav à 730 | dégagé, 42 px de marge |
| 900 px | 660 px | 746 | écran 800 | inchangé (= 800 − 140) |
| 1280 px | 660 px | 746 | écran 800 | inchangé (= 800 − 140) |

Les 44 px de marge au téléphone viennent de `pb-28` (112 px) qui sur-réserve pour
une barre de navigation de 70 px. Volontairement conservé : la marge absorbe la
zone sûre des téléphones à encoche, que le rendu sans appareil ne permet pas de
mesurer ici.

### Piège de méthode, à retenir

Une classe Tailwind absente du code source est **purgée du CSS**. Un banc d'essai
qui compare « avant / après » en réintroduisant l'ancienne classe mesure alors un
élément sans style, et produit un résultat qui semble spectaculaire mais ne veut
rien dire. Vérifier la présence de la règle dans `dist/assets/*.css` avant de
tirer une conclusion d'une comparaison.
