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
