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

## Deux questions que je ne tranche pas

Après avoir inventé le cumul des primes puis les montants, je pose plutôt que je
suppose.

### 1. Les primes restent-elles mensuelles ?

Aujourd'hui elles se calculent sur l'objectif **mensuel** uniquement
(`monthly_bonuses`). Conséquence directe : **si le boss ne pose que des objectifs
hebdomadaires, aucune prime ne se déclenchera jamais** — le code cherche un
objectif mensuel, ne le trouve pas, et renvoie « non acquis » sans rien signaler.

Trois réponses possibles :

- **a.** Les primes restent mensuelles. Il faut alors toujours un objectif
  mensuel, même si le pilotage se fait à la semaine.
- **b.** Une prime hebdomadaire s'ajoute, avec ses propres paliers.
- **c.** Les paliers s'appliquent à la période choisie, quelle qu'elle soit.

Sans réponse, j'implémente **(a)** — c'est l'existant — et j'affiche un
avertissement dans l'onglet quand un vendeur a un objectif hebdomadaire sans
objectif mensuel, pour que le cas ne passe pas inaperçu.

### 2. Semaine du lundi ou du dimanche ?

`date_trunc('week')` dit lundi. À confirmer.

---

## Option B — « appliquer à toute l'équipe »

Un bouton qui pose le même objectif à tous les vendeurs d'un coup, plutôt qu'un
formulaire par personne. Utile à partir de quatre ou cinq vendeurs ; inutile à
deux. À faire seulement si le boss recrute — sinon c'est du travail qui ne sert
personne aujourd'hui.
