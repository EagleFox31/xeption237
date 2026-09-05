# Smart Troc — Scénario de test : choix de l'appareil cible + rachat boutique (tranches 1 → 3)

Date : 2026-07-22
Portée : le différenciateur Smart Troc — le client choisit un **appareil cible**, repart avec un **bon**,
et le staff **rachète en boutique** (validation → encaissement → clôture), y compris bons en grâce / périmés.
Style : Given / When / Then (Étant donné / Quand / Alors).

> Complète (ne remplace pas) `SMOKE_TEST_TROC_20_SCENARIOS.md` (funnel + IMEI + scoring).

---

## Préconditions

1. Front local : `npm run dev`.
2. Migrations appliquées (déjà fait) : `20260721_002` (cible/échéance), `20260721_003` (audit), `20260721_004` (lien commande).
   Vérifier : `npm run db:introspect -- trade_in_requests target_product_id,voucher_expires_at,validated_at,completed_at,completed_order_id,credit_applied`
3. Edge `save-trade-in` redéployée (tranche 2).
4. **Données de test** :
   - Au moins **1 produit en stock** (`stock > 0`) servant de cible — noter son `id`, `price`, `stock`.
   - Un appareil à reprendre dont le modèle a un `release_year` connu (pour tester le barème 7/10/14 j).
   - Accès admin (`/admin` → onglet **Troc**).
5. **Outils de vérification** :
   - `npm run db:troc:latest -- 5` (derniers dossiers : client + départ + voucher + cible + échéance).
   - SQL de contrôle direct (ci-dessous, section Helpers).

---

## Partie A — Client : estimation + choix de l'appareil cible (tranches 1 & 2)

### A1 — Estimer puis troquer vers une cible (chemin nominal)
- **Given** je suis sur `/troc`, intention **Smart Troc** (pas Certif).
- **When** je complète le stepper **Appareil → Photos → Paiement (frais service) → Résultat**, puis je clique
  **« Utiliser mon crédit sur un appareil → »**, je choisis un produit et je clique **« Troquer contre celui-ci »**.
- **Then** :
  - Le comparateur s'ouvre avec des suggestions (1 ancrée sur le crédit + 1 « même marque, plus récent »).
  - Chaque carte montre **« Reste à partir de X »** ou **« Couvert par ton crédit ✓ »**.
  - Après acceptation, l'étape **Bon** s'affiche avec la référence.
- **Vérifier (un seul dossier lié)** : `npm run db:troc:latest -- 1` →
  `Cible` = l'appareil choisi, `Voucher` renseigné, `expire` = date future, `Départ` + `Client` corrects. **Tout sur la même ligne.**

### A2 — Bon générique (sans cible)
- **Given** j'arrive au **Résultat**.
- **When** je clique le CTA principal d'acceptation **sans** ouvrir le comparateur.
- **Then** le dossier est créé **sans** `target_product_id` (bon générique). `db:troc:latest` affiche `Cible : — (bon générique)`.

### A3 — Échéance selon `release_year` (barème 7 / 10 / 14 j)
- **Given** trois reprises de modèles d'âges différents (≤ 1 an, 2–3 ans, ≥ 4 ans / inconnu).
- **When** j'accepte chacune.
- **Then** `voucher_expires_at` ≈ maintenant **+ 14 j / + 10 j / + 7 j** respectivement (cf. `utils/trocVoucher.ts`).
- **Vérifier** : `select device_model, created_at, voucher_expires_at from trade_in_requests order by created_at desc limit 3;`

### A4 — Comparateur ≤ 5
- **Given** le comparateur est ouvert.
- **When** j'ajoute des appareils via la recherche.
- **Then** je peux en comparer **jusqu'à 5** (l'ajout se bloque au-delà), retirer une carte (✕), et les cartes se
  trient par reste à payer croissant.

---

## Partie B — Staff : rachat en boutique (tranche 3)

> Accès : `/admin` → onglet **Troc** → colonne **Actions**. La liste montre la **cible** (« → vers … ») et un **badge d'échéance**.

### B1 — Valider (vérification physique)
- **Given** un dossier au statut **En attente** (`pending`).
- **When** je clique **Valider** (liste) ou j'ouvre **Détails** → **Valider (appareil vérifié)**.
- **Then** statut → **Validé** (`validated`), `validated_at` horodaté.
- **Vérifier** : `select status, validated_at from trade_in_requests where id='<ID>';`

### B2 — Encaisser & terminer (bon valide + cible) — le couplage POS
- **Given** un dossier **Validé**, bon **valide** (non expiré), avec **cible en stock**.
- **When** j'ouvre **Détails** → je vois **Reste à encaisser** (= prix cible − crédit), je choisis un **moyen de paiement**
  (Espèces / OM / MOMO), puis **Encaisser & terminer**.
- **Then** :
  - Une **commande** `orders` `TRC-POS-…` est créée (total = reste, `status=delivered`).
  - Le **stock** de la cible **diminue de 1**.
  - Le dossier → **Terminé** (`completed`) avec `completed_at`, `completed_order_id`, `credit_applied`.
  - Toast « Vente enregistrée — Commande TRC-POS-… ».
- **Vérifier** : `npm run db:troc:latest -- 1` (dossier `completed`, cible liée) +
  `select id,total,status,items from orders where id='<TRC-POS-…>';` + le `stock` de la cible avant/après.

### B3 — Bon en période de grâce (≤ 7 j après échéance) → motif obligatoire
- **Given** un dossier **Validé** dont le bon est **expiré depuis ≤ 7 j** (forcer via SQL, section Helpers).
- **When** j'ouvre **Détails** : badge **« Grâce »**, un champ **Motif** apparaît.
- **Then** :
  - Sans motif → **Encaisser & terminer** reste **désactivé**.
  - Avec motif → la clôture passe ; `redemption_reason` = le motif saisi.

### B4 — Bon périmé (> 7 j) → ré-évaluation forcée
- **Given** un dossier **Validé** dont le bon est **expiré depuis > 7 j** (forcer via SQL).
- **When** j'ouvre **Détails** : badge **« Expiré »**, les contrôles de clôture sont **masqués**, seul **« Ré-évaluer le crédit »** est proposé.
- **Then** au clic :
  - Le crédit est **recalculé aux conditions du jour** (même formule `computeOfferV2`, `base_price` actuel).
  - `trade_in_value` mis à jour, **nouvelle** `voucher_expires_at`, `redemption_reason` = « Ré-évaluation … → … FCFA ».
  - Toast `ancien → nouveau crédit`, invite à **rouvrir** le dossier.
- **When** je rouvre le dossier (désormais **valide**) **Then** je peux **Encaisser & terminer** au nouveau crédit (comme B2).
- **Cas limite** : si la ré-éval aboutit à un refus/0 (modèle devenu hors-tarif), le crédit affiché tombe à 0 — le staff annule ou vend au prix plein.

### B5 — Bon générique (sans cible) → clôture statut seule
- **Given** un dossier **Validé** **sans** cible.
- **When** **Détails** → **Terminer l'échange**.
- **Then** statut → **Terminé** **sans** commande créée (la vente se fait au POS séparément). `completed_order_id` reste nul.

### B6 — Cible en rupture de stock
- **Given** un dossier **Validé** + cible dont le `stock = 0`.
- **When** j'ouvre **Détails**.
- **Then** message **« Appareil cible en rupture de stock — vente impossible »**, bouton **Encaisser & terminer désactivé**.

### B7 — Garde-fous de la machine à états
- **Then** on **ne peut pas** : passer `pending → completed` (saut d'étape), ré-ouvrir un dossier `completed/refused/cancelled`
  (terminaux). Toute transition interdite → toast **« Action impossible »** (voir `utils/trocRedemption.ts`).

### B8 — Refuser / Annuler
- **Given** `pending` → **Refuser** = `refused`. **Given** `validated` → **Annuler** = `cancelled`.
- **Then** statut terminal, plus d'action possible.

---

## Partie C — Intégrité « rien d'éparpillé » (tranche 2)

- **Then** pour un dossier abouti, **une seule ligne** `trade_in_requests` porte : client (nom/tél/email), appareil de
  départ + évaluation, `voucher_reference`, `voucher_expires_at`, `target_product_id` + `target_product_name`,
  et à la clôture `completed_order_id` + `credit_applied`. Aucune table annexe.

---

## Helpers — forcer une échéance pour tester grâce / périmé

> On ne peut pas attendre 7 jours : on antidate `voucher_expires_at`.

```sql
-- Bon en GRÂCE (expiré il y a 3 jours)
update trade_in_requests set voucher_expires_at = now() - interval '3 days' where id = '<ID>';

-- Bon PÉRIMÉ (expiré il y a 10 jours)
update trade_in_requests set voucher_expires_at = now() - interval '10 days' where id = '<ID>';

-- Réinitialiser un dossier de test pour rejouer B2/B3/B4
update trade_in_requests
   set status='validated', completed_at=null, completed_order_id=null,
       credit_applied=null, redemption_reason=null
 where id = '<ID>';
```

## Vérification rapide (CLI + SQL)

```bash
npm run db:troc:latest -- 5          # client + départ + voucher + cible + échéance
npm run db:introspect -- trade_in_requests   # schéma (colonnes/index/contraintes)
```

```sql
-- Dossiers troc récents (schéma actuel)
select id, status, customer_name, device_brand, device_model,
       trade_in_value, credit_applied, voucher_reference, voucher_expires_at,
       target_product_name, completed_order_id, validated_at, completed_at
from trade_in_requests
order by created_at desc
limit 20;

-- Commandes issues d'un rachat troc
select id, total, status, payment_method, date
from orders
where id like 'TRC-POS-%'
order by date desc;
```

## Automatisation (Vitest + Testing Library, frontières mockées)

Une partie du scénario est déjà **automatisée** (déterministe, sans réseau) — `npm test` :

| Fichier | Scénarios couverts |
|---------|--------------------|
| `tests/e2e/smartTroc.e2e.test.tsx` | Navigation intention → device → form + stepper actuel (A, structure) |
| `tests/unit/useTradeInTarget.test.ts` | A1/A2 — liaison cible → `saveTradeInRequest` (5e arg), bon générique |
| `tests/components/TrocUpgradeChoice.test.tsx` | A1 (couvert / onSelect), A4 (crédit plafond) |
| `tests/components/TrocDetailsModal.test.tsx` | B1 (valider), B2 (encaisser + vente), B3 (grâce → motif), B4 (périmé → ré-éval), B5 (générique), B6 (rupture stock) |
| `tests/unit/trocRedemption.test.ts` | Machine à états + grâce/expiration (B7) |
| `tests/unit/trocVoucher.test.ts` | Barème d'échéance 7/10/14 j (A3) |
| `tests/unit/trocCheckout.test.ts` | Reste à payer (plafond crédit, B2) |

Restent **manuels** (réseau/DB/externe) : le funnel client bout-en-bout via l'UI (IMEI + paiement CamPay + poll),
l'écriture réelle en base (commande `orders` + décrément stock), et la vérification via `db:troc:latest`.

## Résumé de couverture

| Zone | Scénarios | Auto |
|------|-----------|------|
| Client — cible + bon (tranches 1-2) | A1–A4 | A1, A3, A4 partiels |
| Staff — rachat, encaissement, grâce, ré-éval (tranche 3) | B1–B8 | B1–B6 |
| Intégrité mono-dossier (tranche 2) | C | manuel |
