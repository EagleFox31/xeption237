# Plan — objectifs et primes entièrement paramétrables

**Date** : 2026-09-06
**Demande** : périodes au choix (mensuel / hebdomadaire), objectifs identiques ou
différents par personne et par boutique, nombre de paliers modifiable, montants
modifiables à volonté.

---

## Ce qui existe déjà — vérifié, pas supposé

Trois demandes sur quatre sont **déjà satisfaites**. Autant ne pas refaire ce qui
marche :

| demande | état | où |
|---|---|---|
| objectifs différents par personne | ✅ | `sales_targets.scope_type = 'staff'`, un montant par vendeur |
| objectifs par boutique | ✅ | `scope_type = 'store'` |
| objectifs identiques | ✅ | saisir le même montant — voir la réserve ci-dessous |
| nombre de paliers modifiable | ✅ | table `bonus_rules` + `upsert_bonus_rule` / `delete_bonus_rule`, formulaire d'ajout et de suppression déjà dans l'onglet |
| montants modifiables à tout moment | ✅ | même formulaire, bouton « Mettre à jour » |
| **période hebdomadaire** | ❌ | **c'est le seul vrai manque** |

**Réserve sur « identiques »** : c'est faisable, mais il faut ressaisir le même
montant pour chaque vendeur. À deux, c'est indolore ; à huit, c'est huit
formulaires. Un bouton « appliquer à toute l'équipe » est proposé en option B.

---

## Le manque : la période hebdomadaire

La contrainte en base n'accepte que deux valeurs :

```
sales_targets_period_kind_check : CHECK (period_kind = ANY (ARRAY['daily', 'monthly']))
```

### Le piège, et c'est le point important de ce plan

`_period_bounds(p_kind)` est écrite ainsi :

```sql
IF p_kind = 'daily' THEN ... RETURN; END IF;
-- sinon : bornes du MOIS
```

**Il n'y a pas de branche `ELSE` explicite.** Toute valeur qui n'est pas
`'daily'` retourne les bornes du **mois**. Si l'on se contentait d'ajouter
`'weekly'` à la contrainte, un objectif hebdomadaire serait comparé au chiffre
d'affaires **du mois entier** : le vendeur apparaîtrait à 400 % de son objectif
de la semaine, et rien dans les logs ne le signalerait.

C'est exactement le genre de défaut qui se découvre le jour de la paie.

**Correction** : trois branches explicites, et une exception sur toute valeur
inconnue. Une période mal orthographiée doit échouer bruyamment, pas retourner
un chiffre plausible.

### Définition de la semaine

`date_trunc('week', ...)` en Postgres commence le **lundi** (norme ISO), en heure
d'Afrique/Douala comme le reste. Lundi 00 h 00 → lundi suivant 00 h 00.

À confirmer avec le boss : si la semaine commerciale commence le dimanche, c'est
une ligne à changer, mais il faut le savoir avant.

---

## Travaux

### Étape 1 — migration

1. `sales_targets_period_kind_check` : accepter `'weekly'`.
   Les deux index uniques portent sur `(staff_id, period_kind)` et
   `(store_id, period_kind)` : rien à changer, un vendeur pourra avoir un
   objectif de chaque période sans conflit.
2. `_period_bounds` : trois branches explicites + `RAISE EXCEPTION` sur inconnu.
3. `get_sales_targets_progress` : ajouter la tranche `weekly` pour les vendeurs
   **et** pour les boutiques, sur le modèle exact des tranches existantes.

### Étape 2 — côté application

4. `TargetPeriodKind` : `'daily' | 'weekly' | 'monthly'`.
5. `parseStaffProgress` / `parseStoreProgress` : lire la tranche `weekly`.
6. Formulaire d'objectif : troisième option dans la liste de période.
7. Affichage : une carte « Objectif de la semaine » à côté du jour et du mois,
   dans l'onglet direction et dans « Mes ventes ».

### Étape 3 — vérification

8. Étendre `scripts/qa-check-objectifs-primes.mjs` à la période hebdomadaire.
   Le jeu d'essai place déjà des commandes en début de mois : selon le jour où
   on le joue, elles tombent dans la semaine en cours ou non. Le vérificateur
   doit **calculer** l'attendu à partir des bornes réelles plutôt que de le
   coder en dur, sinon il sera faux une semaine sur deux.

---

## Décisions de la direction — 2026-09-06

### Les primes restent mensuelles ✅ tranché

Elles se calculent sur l'objectif du mois, quelle que soit la période de
pilotage. Conséquence conservée telle quelle : un vendeur suivi **uniquement** à
la semaine ne déclenche aucune prime. L'onglet le signale désormais par un
avertissement au lieu de rester muet — c'est un cas légitime, pas une erreur,
mais il ne doit pas surprendre en fin de mois.

### La direction choisit la période, et c'est la seule que le vendeur voit ✅ tranché

Aucune carte vide : seules les périodes réellement fixées sont affichées, dans
l'onglet direction comme dans « Mes ventes ». Si aucun objectif n'est posé, le
bloc entier disparaît de l'écran du vendeur. Les félicitations couvrent les trois
périodes.

### La semaine commence le LUNDI ✅ tranché

Conforme à ce qui est déjà en place : `date_trunc('week')` en Postgres commence
le lundi, vérifié en production (31/08 lundi → 07/09 lundi, 7 jours pleins).
Aucun changement à faire.

### Objectifs de boutique ET de vendeur ✅ confirmé

Les deux portées coexistent, elles existaient déjà (`scope_type` `store` et
`staff`) et l'affichage rend désormais les trois périodes pour chacune.

## Option B — « appliquer à toute l'équipe »

Un bouton qui pose le même objectif à tous les vendeurs d'un coup, plutôt qu'un
formulaire par personne. Utile à partir de quatre ou cinq vendeurs ; inutile à
deux. À faire seulement si le boss recrute — sinon c'est du travail qui ne sert
personne aujourd'hui.
