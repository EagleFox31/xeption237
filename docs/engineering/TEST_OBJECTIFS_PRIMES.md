# Test — 2 boutiques, 2 vendeurs, objectifs, primes

**Date** : 2026-09-06
**Jeu de données** : `supabase/seeds/qa_objectifs_primes.sql`
**Nettoyage** : `supabase/seeds/qa_objectifs_primes_rollback.sql`

---

## Ce que dit l'état actuel de la base

Relevé avant d'écrire quoi que ce soit :

| table | contenu |
|---|---|
| `stores` | **1** seule — « Xeption — Siège », Yaoundé, par défaut |
| `staff` | 4 personnes, **aucune rattachée à une boutique** (`store_id` null partout) |
| `sales_targets` | **vide** |
| `bonus_rules` | **vide** |
| `orders` | **0** |

Conséquence directe : sans commandes, toute progression d'objectif affiche 0 %.
Un jeu d'essai qui se limiterait à créer boutiques, vendeurs et objectifs ne
testerait rien du tout — il faut des ventes.

---

## Les règles que le test doit prouver

Elles ne sont écrites nulle part ailleurs que dans le SQL. Extraites de
`orders_reportable` (migration 027) et de `get_sales_targets_progress` :

1. **Une vente compte si** `payment_status = 'paid'` **OU** `status = 'delivered'`.
   Le OU est important : une commande livrée mais pas encore encaissée compte.
2. **Sont exclues** : `cancelled`, `returned`, `payment_status` `refunded` ou
   `failed`, et **tout identifiant commençant par `TEST-`** (mode essai caisse).
3. **Les primes se calculent sur l'objectif MENSUEL uniquement.** Dépasser
   l'objectif du jour n'en déclenche aucune.
4. **Chaque palier est évalué indépendamment** : à 130 %, les paliers 100 % et
   120 % sont tous deux marqués « acquis » et s'affichent en vert. En revanche
   **rien n'additionne les primes** — voir la section « Le montant dû n'existe
   pas » plus bas.
5. **Un `vendeur` ne voit que ses propres chiffres** : la fonction force
   `p_staff_id` sur l'appelant dès que son rôle est `vendeur`. Un `responsable`
   est limité à sa boutique. Seule la `direction` voit tout.
6. Les périodes sont calculées en **Africa/Douala**, pas en UTC.

> **Piège évité pendant l'écriture.** Mon premier réflexe était de préfixer les
> commandes d'essai `TEST-`. Elles auraient été exclues du CA *et des objectifs*
> par la règle 2 : toutes les progressions seraient restées à 0 et j'aurais
> conclu que la fonctionnalité ne marche pas. Le préfixe retenu est `QA-OBJ-`.

---

## Le jeu de données

**Deux boutiques** : QA — Akwa (Douala), QA — Bastos (Yaoundé).
**Un vendeur chacune** : Awa Nkodo (Akwa), Brice Talla (Bastos), rôle `vendeur`.

**Objectifs identiques pour les deux** — c'est le chiffre réalisé qui diffère,
pas la consigne. C'est ce qui permet de lire « atteint » chez l'un et « reste à
faire » chez l'autre sans changer les règles.

| portée | période | cible |
|---|---|---|
| chaque vendeur | jour | 300 000 F |
| chaque vendeur | mois | 1 000 000 F |
| chaque boutique | jour | 350 000 F |
| chaque boutique | mois | 1 200 000 F |

**Primes** : 100 % → 15 000 F · 120 % → 30 000 F · 150 % → 60 000 F.

**Treize commandes**, choisies pour couvrir chaque branche du prédicat :

| id | montant | statut | paiement | compte ? | ce que ça teste |
|---|---|---|---|---|---|
| QA-OBJ-A01 | 250 000 | livrée | payée | ✅ | cas nominal |
| QA-OBJ-A02 | 110 000 | en attente | **payée** | ✅ | payée mais pas livrée |
| QA-OBJ-A03 | 40 000 | **livrée** | non payée | ✅ | livrée mais pas encaissée |
| QA-OBJ-A04 | 200 000 | annulée | payée | ❌ | annulation |
| QA-OBJ-A05 | 150 000 | retournée | payée | ❌ | retour |
| QA-OBJ-A06 | 90 000 | en attente | non payée | ❌ | ni l'un ni l'autre |
| QA-OBJ-A09 | 500 000 | livrée | **remboursée** | ❌ | remboursement |
| TEST-QA-OBJ-A10 | 700 000 | livrée | payée | ❌ | **mode essai caisse** |
| QA-OBJ-A07 | 600 000 | livrée | payée | ✅ | début de mois |
| QA-OBJ-A08 | 300 000 | livrée | payée | ✅ | début de mois |
| QA-OBJ-B01 | 180 000 | livrée | payée | ✅ | Brice, aujourd'hui |
| QA-OBJ-B02 | 250 000 | annulée | payée | ❌ | Brice, annulation |
| QA-OBJ-B03 | 300 000 | livrée | payée | ✅ | Brice, début de mois |

Les quatre lignes les plus intéressantes sont **A03** (livrée non payée, qui
compte), **A09** (remboursée, qui ne compte pas) et **A10** (préfixe `TEST-`) :
si l'une d'elles se comporte autrement qu'annoncé, c'est un vrai défaut.

---

## Résultats attendus

Calculés à la main depuis le tableau ci-dessus.

### Awa Nkodo — Akwa

| | réalisé | cible | % | verdict |
|---|---|---|---|---|
| jour | 400 000 | 300 000 | **133,3 %** | atteint, reste 0 |
| mois | 1 300 000 | 1 000 000 | **130,0 %** | atteint, reste 0 |

Primes affichées : « Objectif atteint » ✅ 15 000 · « Dépassement » ✅ 30 000 ·
« Performance except. » ❌.

Le système s'arrête là : deux pastilles vertes. Il n'affiche **aucun total** —
ni 45 000 (cumul), ni 30 000 (palier le plus haut). Voir ci-dessous.

### Brice Talla — Bastos

| | réalisé | cible | % | verdict |
|---|---|---|---|---|
| jour | 180 000 | 300 000 | **60,0 %** | reste 120 000 |
| mois | 480 000 | 1 000 000 | **48,0 %** | reste 520 000 |

Primes : **aucune**.

### Boutiques

| boutique | période | réalisé | cible | % |
|---|---|---|---|---|
| Akwa | jour | 400 000 | 350 000 | 114,3 % |
| Akwa | mois | 1 300 000 | 1 200 000 | 108,3 % |
| Bastos | jour | 180 000 | 350 000 | 51,4 % |
| Bastos | mois | 480 000 | 1 200 000 | 40,0 % |

---

## Déroulé

### 1. Charger le jeu

```bash
psql "$DATABASE_URL" -f supabase/seeds/qa_objectifs_primes.sql
```

À jouer **à partir du 4 du mois** : avant, les commandes « début de mois »
tombent le jour même et les totaux jour/mois se confondent. Le script émet un
avertissement dans ce cas.

### 2. Ouvrir les connexions des deux vendeurs

Le script insère les profils dans `public.staff`, **pas** les comptes Auth.
Dans l'ERP → **Personnel**, cliquer sur l'activation de connexion pour Awa puis
Brice : un mot de passe aléatoire s'affiche **une seule fois**, le noter.

### 3. Vérifier sans l'interface

Contrôle direct de la fonction, avant toute lecture d'écran :

```sql
SELECT jsonb_pretty(public.get_sales_targets_progress());
```

À jouer en étant authentifié comme direction. Comparer aux tableaux ci-dessus.

### 4. Vérifier le cloisonnement par rôle

C'est le point le plus facile à casser sans s'en apercevoir :

- se connecter en **Awa** → « Mes ventes » ne doit montrer que ses ventes, et
  aucune trace de Brice ni de la boutique Bastos ;
- se connecter en **Brice** → symétrique ;
- se connecter en **direction** → les deux vendeurs et les deux boutiques.

### 5. Vérifier le mode essai de la caisse

Toujours connecté en Awa, activer « Mode test » dans la caisse et enregistrer une
vente. Elle doit apparaître dans « Mes ventes » **sans** faire bouger le
pourcentage d'objectif — c'est la règle 2 en action, et A10 la teste déjà côté
données.

### 6. Vérifier sur téléphone

Le travail responsive de ces derniers jours porte précisément sur ces écrans :

- « Mes ventes » : cartes et non tableau, la page défile jusqu'au bout ;
- la carte d'objectif affiche le pourcentage et le reste à faire ;
- le bandeau doré ne s'affiche pas, mais le bouton d'action reste là où il y en a.

### 7. Nettoyer

```bash
psql "$DATABASE_URL" -f supabase/seeds/qa_objectifs_primes_rollback.sql
```

**À ne pas oublier** : tant que les commandes `QA-OBJ-` sont en base, elles
comptent dans le vrai chiffre d'affaires du tableau de bord. Les comptes Auth des
deux vendeurs sont à supprimer à la main dans Supabase → Authentication → Users.

---

## Le montant dû n'existe pas

Constat vérifié dans le code, pas supposé : `get_sales_targets_progress` renvoie
pour chaque règle un booléen `earned`, et `SalesTargetsTab` affiche une pastille
par règle, verte si acquise. **Aucune addition nulle part** — ni en SQL, ni dans
l'interface.

La conséquence est une décision de gestion, pas un détail technique :

| lecture | Awa à 130 % | quelqu'un à 150 % |
|---|---|---|
| **cumulative** (on additionne les paliers atteints) | 45 000 F | 105 000 F |
| **exclusive** (seul le palier le plus haut compte) | 30 000 F | 60 000 F |

Le système affiche exactement la même chose dans les deux cas. Tant que la règle
n'est pas tranchée, deux personnes peuvent lire le même écran et calculer des
paies différentes. **À trancher avec la direction avant la première paie**, et à
écrire ensuite — soit dans le libellé des règles, soit en affichant le total.

## Ce que ce test ne couvre pas
- **Les objectifs de boutique quand plusieurs vendeurs y travaillent.** Ici un
  seul par boutique, donc chiffre boutique = chiffre vendeur. Le jour où deux
  vendeurs partagent une boutique, la somme et la répartition des primes
  méritent leur propre test.
- **Le changement de mois.** Les bornes sont calculées en Africa/Douala ; un test
  le 1er du mois à 00 h 30 locale vérifierait qu'aucune vente de la veille ne
  fuit dans le nouveau mois.
