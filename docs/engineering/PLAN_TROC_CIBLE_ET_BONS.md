# Plan — appareil cible, reste à payer, et consultation des bons

**Date** : 2026-08-26
**Demande** : afficher l'appareil cible et le reste à payer sur le bon (écran + PDF),
rétroactivement ; alléger l'onglet troc de l'ERP ; page client de consultation des
bons ; corriger les caractères du message WhatsApp.

---

## 0. Ce qui existe déjà — relevé avant de coder

Beaucoup de briques sont en place. L'essentiel du travail est de les relier.

| brique | état |
|---|---|
| `trade_in_requests.target_product_id` / `target_product_name` | ✅ en base, migration `20260721_002`, renseignés par `submitTradeIn` |
| `resteAPayer(targetPrice, credit)` | ✅ `services/trocCheckoutService.ts` |
| `getTargetPricing(productId)` | ✅ lit `price`, `stock`, `name` |
| `TrocDetailsModal` (ERP) | ✅ affiche déjà le reste à payer |
| Bon PDF | ⚠️ affiche le nom de la cible, **pas** le reste à payer |
| Bon à l'écran (`TrocVoucher`) | ❌ ni cible, ni reste à payer |

**Conséquence pour la rétroactivité** : `target_product_id` est déjà stocké sur
les dossiers existants. Le reste à payer se **calcule à l'affichage** plutôt que
de se figer en base — un bon déjà émis affichera donc la cible sans migration de
données. C'est aussi plus juste : si le prix du produit bouge, le bon suit.

---

## 1. Bon de reprise — cible et reste à payer

### Écran (`components/troc/TrocVoucher.tsx`)
Un bloc sous la valeur de reprise :

```
APPAREIL SOUHAITÉ      Xiaomi Redmi 13 256 Go     245 000 FCFA
VALEUR DE REPRISE                               − 90 000 FCFA
RESTE À PAYER                                     155 000 FCFA
```

Le prix vient de `getTargetPricing(target_product_id)`, appelé au montage.
Si l'appel échoue ou que la cible n'existe plus, on affiche la cible sans montant
plutôt qu'un chiffre faux.

### PDF (`utils/tradeInVoucherGenerator.ts`)
Même bloc. Le générateur reçoit déjà `target_product_name` ; il faut lui passer
le prix, donc résoudre le tarif **avant** la génération et le transmettre.

### Cas à ne pas rater
- **Crédit boutique** : le message WhatsApp annonce « +18 % selon offre en
  cours ». Le reste à payer doit dire lequel des deux montants il utilise —
  valeur brute ou créditée. À trancher avec le métier ; par défaut la **valeur
  brute**, la bonification étant conditionnelle.
- **Reste négatif** (reprise supérieure au prix cible) : afficher « rien à
  payer », jamais un nombre négatif.

---

## 2. ERP — onglet troc

`components/admin/tabs/TrocTab.tsx` : retirer la colonne **Historique**
(ligne 341) et répartir sa largeur sur **Appareil**, qui porte aujourd'hui
l'appareil repris, la flèche et l'appareil cible sur trois lignes serrées.

---

## 3. Page client de consultation des bons

### Le problème d'accès, mesuré

La page de suivi (`components/OrderTracking.tsx`, l. 61) interroge déjà
`trade_in_requests` par `id`. **Ce code est mort pour le public** :

```sql
-- staff_select_trade_in_requests
EXISTS (SELECT 1 FROM staff s
        WHERE lower(s.email) = lower(auth.jwt() ->> 'email'))
```

Une session anonyme n'a pas d'email : la requête ne renvoie jamais rien, et le
visiteur voit « Numéro introuvable ».

### Le problème de confidentialité, mesuré

```sql
id TEXT PRIMARY KEY DEFAULT 'TRC-' || extract(epoch from now())::bigint::text
```

La référence est **l'horodatage Unix en secondes**. `TRC-1787741068` est donc
énumérable — une valeur par seconde. Une page publique interrogée sur cette seule
référence laisserait aspirer nom, téléphone, appareil et valeur de reprise de
tous les clients. Les numéros de téléphone sont précisément ce qu'un concurrent
ou un démarcheur cherche.

### Conception retenue

Une Edge Function `troc-voucher-lookup`, en `service_role`, qui exige
**deux facteurs** : la référence **et** les 4 derniers chiffres du téléphone.
Elle ne renvoie que ce dont le client a besoin — jamais l'IMEI, jamais les notes
internes.

- Limitation de débit via `_shared/rateLimit.ts` : sans elle, deux facteurs
  n'empêchent pas le balayage.
- Changement de cible : même fonction, action `set-target`, mêmes deux facteurs,
  refusée si le dossier n'est plus modifiable (expiré, converti, refusé).
- Re-téléchargement : le PDF est régénéré côté client à partir des données
  renvoyées, comme aujourd'hui.

> Alternative écartée : ouvrir une politique RLS publique sur la table. Elle
> exposerait toutes les colonnes, y compris l'IMEI, et la RLS ne sait pas limiter
> le débit.

---

## 4. Message WhatsApp — caractères

`utils/whatsappShare.ts` ne contient **aucun caractère corrompu** : les emoji y
sont sains (vérifié, zéro occurrence de U+FFFD). Le `�` observé apparaît donc
plus loin dans la chaîne. Piste à mesurer avant de corriger : `buildWhatsAppUrl`
encode le message avec `encodeURIComponent`, ce qui gère l'UTF-8 — mais un
`�` (U+FFFD) signale un décodage d'octets invalides, pas une police manquante.

À trancher par la mesure, pas par supposition.

---

## Ordre d'exécution

1. WhatsApp — diagnostic, c'est rapide et ça débloque un doute.
2. Bon : cible + reste à payer, écran puis PDF.
3. ERP : colonnes.
4. Page client — le plus gros, et le seul qui touche à la sécurité.

## Vérification

| point | preuve attendue |
|---|---|
| 1 | Un bon déjà émis affiche sa cible et son reste, sans migration |
| 1 | Reprise supérieure au prix cible → « rien à payer », pas de négatif |
| 2 | La colonne Appareil respire, plus de colonne Historique |
| 3 | Référence seule → refus ; référence + 4 chiffres → dossier |
| 3 | Référence voisine (± 1 seconde) → refus |
| 4 | Le message reçu affiche les emoji, pas des `�` |
