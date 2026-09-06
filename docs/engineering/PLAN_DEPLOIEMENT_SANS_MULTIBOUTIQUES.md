# Déployer Smart Troc et les améliorations d'interface sans livrer le multi-boutiques

**Date** : 2026-09-06

Le boss a payé le site public. Il n'a pas payé l'extension multi-boutiques.
Il faut donc mettre en production le travail Smart Troc et les corrections
d'interface **sans** lui livrer, de fait, un module qu'il n'a pas acheté.

---

## La contrainte, énoncée franchement

**Le site public et l'ERP sont une seule application React.** Il n'y a pas deux
builds, pas deux domaines : `/admin` vit dans le même bundle que la boutique.
Mettre le site en production met l'ERP en production.

Et le boss possède un compte `direction` (`admin@xeption.cm`). Il ne s'agit donc
pas de le protéger d'un inconnu : il a les clés. La question est **commerciale**,
pas sécuritaire.

Ce point change tout : une protection technique parfaite serait du travail perdu
face à quelqu'un qui a un compte légitime. Ce qu'il faut, c'est que le module non
payé **ne soit pas là**, simplement et visiblement.

---

## Trois façons de faire, et pourquoi j'en retiens une

### A. Drapeau de module — **retenu**

Une variable d'environnement `VITE_ERP_MODULES_OFF=multiboutiques` retire les
onglets du module de partout : menu latéral, barre mobile, routeur d'onglets.

- **Pour** : une seule branche, aucune divergence. Le jour du paiement, on
  change une variable sur Vercel et on redéploie — pas de merge, pas de risque.
- **Contre** : le code reste dans le bundle. Quelqu'un qui lit le JavaScript
  livré voit que le module existe.

### B. Branche séparée

Garder le multi-boutiques sur `feat/erp-multiboutiques`, ne fusionner que le
reste.

- **Pour** : rien n'est livré, ni écran ni code.
- **Contre** : le coût de divergence est réel et croissant. Le travail
  responsive de ces derniers jours a touché des fichiers **partagés** —
  `adminUi.ts`, `TableShell.tsx`, `AdminPageHeader.tsx`. Chaque correction
  ultérieure sur ces fichiers devra être portée deux fois, et chaque portage est
  une occasion de casser quelque chose. Pour un module qui sera payé dans
  quelques semaines, c'est cher.

### C. Exclusion à la compilation

Drapeau + imports dynamiques, pour que les onglets ne soient pas dans le bundle.

- **Pour** : rien à lire, bundle plus léger.
- **Contre** : les onglets sont aujourd'hui importés statiquement dans
  `AdminPanel.tsx` ; il faut les convertir en `React.lazy`. C'est faisable, mais
  c'est du travail pour un gain qui n'existe que si l'on craint une lecture du
  bundle — ce qui n'est pas le sujet ici.

**Retenu : A**, avec C comme durcissement si le besoin apparaît.

---

## Ce que le mécanisme fait — et ne fait pas

Il retire les onglets. **Il ne verrouille rien côté serveur** : les tables
`stores`, `store_stock`, `sales_targets`, `bonus_rules` et leurs RPC restent
joignables pour qui possède un compte staff et sait écrire une requête.

**C'est un rideau, pas un coffre.** Je le dis parce que la différence compte le
jour où quelqu'un demande « est-ce qu'il peut y accéder quand même ? » — la
réponse est oui, s'il s'en donne la peine. Rendre le blocage résistant demande
une garde dans les RPC concernées : travail distinct, à décider si le besoin est
réel.

---

## Périmètre du module — à confirmer

| onglet | dans le module | pourquoi |
|---|---|---|
| `stores` | oui | référentiel des boutiques |
| `stockMovements` | oui | transferts et stock par boutique |
| `targets` | oui | objectifs et primes, étape 7 de la feuille de route multi-boutiques |
| `pos`, `orders`, `inventory`, `clients`, `mySales`, `dashboard` | non | fonctionnent en mono-boutique, relèvent de l'ERP de base |
| `troc`, `sav`, `delivery`, `packs`, `staff` | non | modules distincts |

**Question ouverte** : `targets` est-il vendu avec le multi-boutiques, ou
séparément ? La feuille de route le place à l'étape 7 du multi-boutiques, mais
un objectif par vendeur a du sens même avec une seule boutique. Un mot de ta part
et je déplace la ligne — c'est une entrée de tableau à changer.

---

## Marche à suivre

### Aujourd'hui

1. Sur Vercel, environnement **Production** (et Preview si le boss y teste) :

   ```
   VITE_ERP_MODULES_OFF=multiboutiques
   ```

2. Vérifier que la variable est bien lue par le build, pas seulement déclarée :

   ```bash
   npx esbuild scripts/qa-check-modules-erp.ts --bundle --platform=node --format=esm \
     --define:import.meta.env.VITE_ERP_MODULES_OFF='"multiboutiques"' --outfile=t.mjs \
     && node t.mjs off && rm t.mjs
   ```

3. Déployer `preview` → `main`.

**Variable absente = tous les modules actifs.** C'est volontaire : un
déploiement qui oublie la variable n'ampute rien. Le revers est qu'un oubli
livre le module — d'où le contrôle de l'étape 2, à faire avant d'annoncer.

### Le jour du paiement

Retirer la variable, redéployer. Rien d'autre : aucune fusion, aucun code à
écrire. Les données déjà saisies pendant la période masquée sont intactes — le
rideau ne touche qu'à l'affichage.

---

## Ce que ça ne règle pas

**La migration `20260906_001` est déjà appliquée en production.** La colonne
`period_kind` accepte désormais `weekly`, et la fonction de progression renvoie
la tranche correspondante. C'est de l'infrastructure invisible : sans onglet
`targets`, personne ne peut créer d'objectif. Mais la base est en avance sur ce
qui est vendu, et c'est à savoir plutôt qu'à découvrir.

**Les Edge Functions ne sont pas concernées** : elles se déploient séparément et
aucune ne sert le multi-boutiques.
