# AUDIT BASE DE DONNÉES — SÉCURITÉ & INTÉGRITÉ

> **Date** : 21 août 2026
> **Portée** : schéma `public` de la base Supabase de production (`tawnusmfyvugqczaydat`)
> **Méthode** : inventaire en lecture seule des catalogues système (`npm run db:inventory`,
> `npm run db:verify`, `npm run db:introspect`). Aucune écriture pendant l'audit.
> **Déclencheur** : arrivée prochaine d'une intervenante externe sur la base
> (cf. `docs/next-step/CADRAGE_SUIVI_VENTES_XEPTION.md`).

---

## 1. Résumé

| Sévérité | Constat |
|---|---|
| 🔴 **Critique** | `products` sans RLS + `anon` a tous les droits d'écriture → **la clé publique du site permet de modifier prix et stocks, ou de vider le catalogue** |
| 🟠 Élevé | `brands` et `product_ranges` : policy `ALL` ouverte au rôle `public` |
| 🟠 Élevé | `customers` : policy `UPDATE` ouverte à tous (7 lignes concernées) |
| 🟠 Élevé | Les sessions **anonymes** portent le rôle `authenticated` → réactiver la RLS telle quelle ne suffirait pas |
| 🟡 Moyen | 4 tables et 2 fonctions existent sans aucun fichier de migration |
| 🟡 Moyen | Prolifération de policies redondantes (7 sur `orders`, une nommée `TEMP:`) |
| 🟡 Moyen | Job cron hebdomadaire qui échoue depuis des mois (table absente) |
| 🟡 Moyen | `staff.password text DEFAULT '123456'` toujours présente |

**Ce qui doit être corrigé avant toute autre chose : le point critique.** Les autres peuvent
suivre un calendrier normal.

---

## 2. Inventaire réel

25 tables · 0 vue · 8 fonctions (5 en `SECURITY DEFINER`) · 3 triggers · **61 policies** ·
7 extensions (`pg_cron`, `pg_net`, `pgcrypto`, `pg_stat_statements`, `supabase_vault`,
`uuid-ossp`, `plpgsql`) · 1 job cron actif.

---

## 3. 🔴 Le trou critique : `products`

### Les faits

1. `products` est la **seule des 25 tables** dont la RLS est désactivée.
2. Le rôle `anon` y détient `SELECT, INSERT, UPDATE, DELETE, TRUNCATE`.

### Pourquoi c'est exploitable

La clé `anon` est **publique par conception** : Vite inline `VITE_SUPABASE_ANON_KEY` dans le
bundle JavaScript livré à chaque visiteur. C'est le fonctionnement normal de Supabase — la
sécurité ne repose pas sur le secret de cette clé, mais **entièrement sur la RLS**.

Sans RLS, il ne reste rien. N'importe qui peut lire le bundle, extraire la clé, et écrire
directement dans `products` : changer un prix, vider un stock, supprimer le catalogue.

Les policies « Staff Full Access Products » existent bien, mais **RLS désactivée = policies
ignorées**. Elles ne protègent rien aujourd'hui.

### Pourquoi la RLS avait été désactivée

Elle l'a été pour une raison légitime : **quand elle était active, le boss ne pouvait pas
ajouter de produit depuis son téléphone**, alors que ça fonctionnait depuis le poste de dev.

C'est important à comprendre : ce n'était pas un caprice, c'était un blocage réel. Mais la
désactivation a traité le **symptôme** (les écritures échouent) plutôt que la **cause**
(le téléphone du boss n'envoyait pas de session valide), en payant le prix fort — l'ouverture
de la table à tout internet.

### Diagnostic de la cause — à confirmer

Les policies d'écriture sur `products` sont accordées `TO authenticated` avec `USING (true)`.
La barre est donc **très basse** : n'importe quelle session valide passe. Si le boss échouait
malgré ça, c'est qu'il n'avait **aucune session** — pas qu'il avait la mauvaise.

L'authentification staff passe par `supabase.auth.signInWithPassword` dans
`components/StaffLogin.tsx`, qui persiste la session dans le `localStorage` du navigateur.
Causes plausibles d'absence de session sur mobile :

- navigation privée, ou stockage purgé par iOS/Android ;
- site ajouté à l'écran d'accueil (conteneur de stockage distinct de celui du navigateur) ;
- session expirée dont le rafraîchissement a échoué ;
- accès direct à `/admin` sans être réellement passé par l'écran de connexion.

**Test à faire, deux minutes** : sur le téléphone du boss, ouvrir l'admin et afficher le
résultat de `supabase.auth.getSession()`. S'il est `null`, la cause est identifiée et elle
n'a rien à voir avec la RLS.

> ⚠️ Tant que ce test n'est pas fait, réactiver la RLS **risque de reproduire exactement le
> blocage d'origine**. C'est pourquoi le plan ci-dessous commence par le diagnostic.

---

## 4. Pourquoi « réactiver la RLS » ne suffit pas

Un détail change la conclusion. `hooks/useOrderProcess.ts:31` appelle
`supabase.auth.signInAnonymously()` pour le tunnel de commande public.

Or **chez Supabase, un utilisateur anonyme porte le rôle `authenticated`**, pas `anon`.

Conséquence : avec les policies actuelles (`TO authenticated USING (true)`), il suffirait à
un visiteur de déclencher une connexion anonyme — ce que le site fait tout seul au checkout —
pour obtenir le droit d'écrire dans `products`.

Réactiver la RLS telle quelle fermerait la porte `anon` mais laisserait une fenêtre
`authenticated` presque aussi large.

**Et le problème s'aggrave mécaniquement** : le jour où les comptes clients acheteurs
arrivent — priorité n°1 de `RETENTION_CLIENT.md` — chaque client obtiendra le rôle
`authenticated`, donc le droit d'écrire dans le catalogue.

### La bonne correction

Adosser les policies d'écriture à une **appartenance réelle au staff**, pas au simple fait
d'être connecté. `staff.id` est un uuid autonome (pas celui de `auth.users`), donc la
jointure se fait par **email** :

```sql
CREATE POLICY "staff_write_products"
  ON public.products FOR ALL
  TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.staff s
                      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.staff s
                      WHERE lower(s.email) = lower(auth.jwt() ->> 'email')));
```

Cette forme résout les trois problèmes d'un coup : elle ferme `anon`, elle exclut les
sessions anonymes, et elle restera correcte quand les comptes clients existeront.

---

## 5. Plan de correction du point critique

**Étape 1 — Diagnostiquer (aucun risque).** Vérifier `supabase.auth.getSession()` sur le
téléphone du boss. Confirmer qu'il figure bien dans la table `staff` avec l'email exact de
son compte Supabase.

**Étape 2 — Corriger l'accès du boss.** Selon le résultat : reconnexion, correction de
l'email dans `staff`, ou fiabilisation de la persistance de session sur mobile. **Vérifier
qu'il peut ajouter un produit AVANT de toucher à la RLS.**

**Étape 3 — Remplacer les policies d'écriture** par la version adossée à `staff` ci-dessus,
et supprimer les quatre policies redondantes (`Staff Full Access Products`,
`Staff Write Products`, `Staff update products`, `TEMP: authenticated can insert products`).
Sans effet tant que la RLS est désactivée : cette étape est donc **sans risque** elle aussi.

**Étape 4 — Activer la RLS.**

```sql
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
```

La lecture publique reste ouverte : les policies `Public Read Products` et
`Public View Products` (SELECT, `USING (true)`) existent déjà. **La boutique ne tombera pas.**

**Repli immédiat** en cas de problème inattendu :

```sql
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
```

---

## 6. Autres expositions

**`brands` et `product_ranges`** — policy `ALL` accordée au rôle `public` avec `qual = true`.
Le rôle `public` inclut `anon` : n'importe qui peut créer, modifier ou supprimer marques et
gammes. Même correction que pour `products`.

**`customers`** — policies `Public insert` et `Public update`, `qual = true`. N'importe qui
peut modifier n'importe quelle fiche client. L'insertion publique se justifie peut-être
(création au checkout) ; la **mise à jour** publique, non.

---

## 7. Prolifération de policies

`orders` porte **sept** policies d'écriture, dont quatre INSERT quasi identiques
(`Enable insert access for all users`, `Public Create Orders`, `Public Insert Orders`,
`Public insert orders`) et deux « Staff full access » qui ne diffèrent que par la casse.
`repair_tickets` en a trois en double. `products` traîne une policy nommée
**`TEMP: authenticated can insert products`**.

Ce n'est pas cosmétique : avec des policies permissives qui s'additionnent, **personne ne
peut plus dire ce qui autorise quoi**. Un audit devient impossible, et supprimer la mauvaise
casse la production. À dédupliquer une table à la fois, en vérifiant après chaque passe.

---

## 8. Objets sans fichier de migration

| Objet | Type | Contenu | Utilisé par |
|---|---|---|---|
| `customers` | table | 7 lignes | checkout |
| `repair_tickets` | table | 1 ligne | SAV |
| `packs` | table | 0 ligne | `PacksTab`, `usePacksManager` |
| `order_payments` | table | 0 ligne | paiements |
| `handle_updated_at` | fonction | — | trigger `packs` |
| `set_updated_at` | fonction | — | trigger `products` |

**Pourquoi ça compte** : quelqu'un qui découvre le projet et lit `supabase/migrations/`
**ne saura pas que ces tables existent**. C'est exactement la situation qui se présente avec
l'intervention externe. Et en cas de reconstruction de la base depuis les migrations, ces
objets manqueraient.

À rapatrier dans des fichiers `CREATE TABLE IF NOT EXISTS` reconstruits depuis le schéma réel,
puis à enregistrer via `npm run db:baseline`.

Note connexe : trois fonctions font le même travail sur `updated_at`
(`handle_updated_at`, `set_updated_at`, `update_trade_in_requests_updated_at`) — symptôme
du même historique d'édition manuelle.

---

## 9. Job cron en échec silencieux

Le job `snapshot-market-prices-weekly` (lundi 3 h, actif) alimente l'intel prix. Il écrit dans
`market_price_cache` — **table qui n'existe pas**. La migration
`20260401_004_market_price_cache.sql` n'a jamais été appliquée.

`supabase/functions/market-price-intel/index.ts` (lignes 689 et 717) lit et écrit dans cette
table en production. Le chemin de ré-évaluation des bons troc tourne donc sans son cache
depuis des mois.

⚠️ Le fichier de migration n'est **pas rejouable** en l'état : deux `CREATE POLICY` sans
`DROP POLICY IF EXISTS`, et pas de `BEGIN/COMMIT`. Il porte aussi
`FOR SELECT USING (true)`, ce qui rendrait le cache — dont `offers_json`, les offres
concurrentes collectées — **lisible publiquement**. À corriger avant application.

---

## 10. `staff.password`

La colonne `password text DEFAULT '123456'` est toujours présente, alors qu'une migration
nommée `20260331_001_staff_remove_plain_password.sql` existe. À vérifier : soit les valeurs
ont été purgées mais la colonne conservée, soit la migration n'a pas produit l'effet attendu.
L'authentification réelle passe par Supabase Auth (`signInWithPassword`), donc cette colonne
n'a plus de rôle — elle ne représente qu'un risque résiduel.

*(Non vérifié pendant l'audit : je n'ai pas voulu interroger le contenu d'une colonne de mots
de passe.)*

---

## 11. Pourquoi maintenant

Trois raisons convergent :

1. **Le trou `products` est exploitable aujourd'hui**, par n'importe qui, sans compétence
   particulière — la clé est dans le bundle et la table est ouverte.
2. **Une intervenante externe va écrire du SQL dans cette base.** Elle héritera d'un dossier
   de migrations qui ne décrit pas la réalité et d'un jeu de policies illisible. Le risque
   n'est pas sa compétence, c'est le terrain qu'on lui laisse.
3. **Les comptes clients arrivent.** Chaque hypothèse actuelle du type « connecté = staff »
   deviendra fausse ce jour-là. Il vaut mieux corriger les policies avant que la population
   d'utilisateurs connectés change de nature.

---

## Ordre d'exécution proposé

1. Diagnostic session du boss, puis policies `products` adossées à `staff`, puis RLS activée. *(critique)*
2. Même traitement pour `brands`, `product_ranges` ; retrait de l'`UPDATE` public sur `customers`.
3. Correction et application de `market_price_cache` — du code en production en dépend.
4. Rapatriement des 4 tables orphelines dans des migrations versionnées.
5. Déduplication des policies, table par table.
6. Suppression de `staff.password` après vérification.

Les points 1 à 3 sont des correctifs. Les points 4 à 6 remettent la base en état d'être
travaillée à plusieurs.
