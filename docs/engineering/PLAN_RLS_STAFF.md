# Plan — fermer la table `staff`

**Date** : 2026-09-07
**Constat** : mesuré, pas supposé, avec la seule clé publique et aucun compte.

---

## Les deux failles

### 1. Lecture publique de toute l'équipe

```
GET /rest/v1/staff?select=name,email,role   →  HTTP 200, 4 membres
```

Policy en cause : `Public Read Staff`, `[SELECT]`, rôles `anon` + `authenticated`,
condition `true`. N'importe qui, sans compte, télécharge noms, emails et rôles.

### 2. Écriture ouverte à tout compte connecté

Policy `Staff Self Edit`, `[ALL]`, rôle `authenticated`, condition `true`.
Malgré son nom, elle n'a rien de « self » : **tout compte authentifié peut
modifier ou supprimer n'importe quelle ligne**, y compris changer son propre
rôle en `direction`.

C'est la plus grave des deux. La première expose des adresses ; la seconde
donne les droits.

**Ce n'est pas théorique — mesuré le 2026-09-07**, en simulant exactement une
session `signInAnonymously()` (rôle `authenticated`, aucun email dans le jeton),
dans une transaction annulée :

```
lecture de staff        : 4 ligne(s) visibles
promotion d'un vendeur  : 1 ligne modifiée  -> Manager Vente devient direction
suppression d'un membre : 1 ligne supprimée
```

Or c'est précisément la session qu'ouvre **le chatbot du site public**. Autrement
dit : n'importe quel visiteur peut aujourd'hui se donner le rôle `direction` ou
supprimer un membre de l'équipe. Aucune compétence particulière requise — la clé
publique est dans le bundle, comme prévu, et la table est ouverte.

> **Piège à connaître** : `signInAnonymously()` produit une session de rôle
> `authenticated` **sans email**. Le chatbot public en ouvre une. Une policy
> écrite « pour les authentifiés » couvre donc aussi les visiteurs anonymes du
> site. Le garde correct n'est pas `authenticated`, c'est *« l'appelant est un
> membre de `staff` »*.

---

## Ce que l'application a réellement besoin de faire

Relevé de tous les accès à `staff` côté client :

| appel | moment | besoin |
|---|---|---|
| `resolveEmailFromIdentifier` | **avant** connexion | nom saisi → email |
| `fetchStaffPreview` | **avant** connexion | email → nom, rôle (accueil « Bonjour X ») |
| `resolveSuperAdminAccess` | **avant** connexion | email → rôle |
| `useCurrentStaffSession` | après | sa propre ligne |
| `useAdminData.fetchStaff` | après | la liste, pour l'ERP |
| `useStaffManager` upsert / delete | après | écriture, onglet Personnel (`direction`) |

Trois besoins **avant** authentification. C'est ce qui explique la policy
ouverte : quelqu'un a ouvert la table plutôt que de traiter ces trois cas.

---

## Correction proposée

### Étape 1 — une RPC pour les besoins d'avant-connexion

Une fonction `SECURITY DEFINER` qui répond à **une question à la fois** et ne
renvoie **qu'une ligne**, au lieu d'ouvrir la table :

```sql
CREATE FUNCTION public.staff_login_hint(p_identifier text)
RETURNS TABLE (name text, email text, role text)
-- correspondance EXACTE sur l'email, ou sur le nom (insensible à la casse)
-- LIMIT 1, jamais de liste
```

Ce que ça change : on ne peut plus **lister** l'équipe. On peut encore vérifier
si un nom existe, en le devinant — c'est inhérent à un écran qui accueille par
le nom, et ça reste à décider :

- **on garde** l'accueil « Bonjour Jennifer » et cette énumération résiduelle ;
- **ou** on supprime l'étape d'aperçu, on demande email + mot de passe, et il ne
  reste rien à deviner. Moins accueillant, franchement plus fermé.

Mon avis : garder l'aperçu. L'équipe fait quatre personnes, leurs noms ne sont
pas un secret, et le vrai risque était la liste complète, pas la vérification
unitaire.

### Étape 2 — remplacer les deux policies

```sql
-- Lecture : réservée aux membres du personnel.
-- Le garde porte sur « est un membre », PAS sur `authenticated` : une session
-- anonyme (chatbot) est authenticated et n'a pas à lire l'équipe.
CREATE POLICY staff_read_staff ON public.staff FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.staff s
                 WHERE lower(s.email) = lower(auth.jwt() ->> 'email')));

-- Écriture : direction et super-admin uniquement, ce que fait déjà l'onglet
-- Personnel côté interface. La base cesse simplement d'être plus permissive
-- que l'écran.
CREATE POLICY staff_write_direction ON public.staff FOR ALL TO authenticated
  USING     (EXISTS (SELECT 1 FROM public.staff s
                     WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
                       AND s.role IN ('direction','super_admin')))
  WITH CHECK(EXISTS (SELECT 1 FROM public.staff s
                     WHERE lower(s.email) = lower(auth.jwt() ->> 'email')
                       AND s.role IN ('direction','super_admin')));
```

`WITH CHECK` autant que `USING` : sans lui, on peut écrire une ligne qu'on
n'aurait pas le droit de relire.

### Étape 3 — brancher le client sur la RPC

`resolveEmailFromIdentifier`, `fetchStaffPreview` et `resolveSuperAdminAccess`
appellent `staff_login_hint` au lieu de `from('staff')`. Trois fonctions, un
seul point d'entrée.

---

## Vérification, avant et après

Le contrôle qui compte se fait avec la clé publique, comme un inconnu :

```
GET /rest/v1/staff?select=*                      doit passer de 200 à 0 ligne
POST /rest/v1/rpc/staff_login_hint  {"jennifer"} doit renvoyer 1 ligne
PATCH /rest/v1/staff?id=eq.<autre>               doit echouer pour un vendeur
```

À jouer **avant** la migration pour constater l'état actuel, puis après. Un
script fera les deux, sur le modèle de `qa-check-objectifs-hebdo.mjs` :
transaction, mesure, annulation.

---

## Ce qui peut casser, et comment le voir tôt

**La connexion de toute l'équipe.** C'est le risque réel : une policy trop
stricte et plus personne n'entre dans l'ERP. D'où l'ordre imposé — RPC d'abord,
client branché dessus ensuite, policies en dernier. À chaque étape l'application
reste fonctionnelle, et on peut s'arrêter.

**Retour arrière** : les deux anciennes policies sont recréables en trois lignes.
La migration inclura leur définition exacte en commentaire, pour ne pas avoir à
la reconstituer dans l'urgence.

**Les Edge Functions ne sont pas concernées** : elles utilisent la clé de service,
qui contourne la RLS.

---

## Ce que ça ne corrige pas

L'audit `AUDIT_BD_SECURITE_2026-08-21.md` liste d'autres tables ouvertes, dont
`products` sans RLS. Ce plan ne traite que `staff`. Les autres méritent le même
traitement, une table à la fois — c'est la façon d'avancer sans casser
l'authentification d'un coup.
