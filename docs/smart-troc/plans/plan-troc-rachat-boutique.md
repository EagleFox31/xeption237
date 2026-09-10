# Plan — Smart Troc Tranche 3 : rachat en boutique (staff)

> **But** : fermer la boucle du Smart Troc. Le client arrive en boutique avec son bon (`voucher_reference`),
> le staff vérifie l'appareil, applique le crédit sur l'appareil **cible**, encaisse la différence et
> **clôture le dossier**. Tout sur le dossier `trade_in_requests` existant.
>
> _Rédigé le 2026-07-21. Sous-plan de `plan-troc-choix-appareil-cible.md` (tranche 3). Décisions actées le 2026-07-21._

> **ÉTAT** (2026-07-21) — migrations `20260721_003` (audit) + `20260721_004` (lien commande/crédit) **APPLIQUÉES + vérifiées**.
> - Étage **3.1 FAIT** : `utils/trocRedemption.ts` (13 tests), `useTrocManager.transitionStatus` (gardé), `VoucherExpiryBadge`,
>   visibilité cible/échéance + actions gardées (`TrocTab`/`TrocDetailsModal`), PDF du bon (cible + échéance réelle).
> - Étage **3.2 CŒUR FAIT** : `services/trocCheckoutService.ts` (`completeTrocWithSale` + `resteAPayer`, 3 tests) — la clôture
>   d'un bon **valide/grâce ciblé** crée la commande de la cible (total = reste), décrémente son stock, lie commande↔dossier
>   (`completed_order_id`, `credit_applied`) et passe le dossier en `completed`. Modale = mini-checkout (reste à payer + moyen de paiement).
>   Bon **générique** (sans cible) → clôture statut-seule (vente au POS). Aucun redeploy edge (écritures admin RLS directes).
> - Étage **3.2b FAIT** : `reevaluateAndPersist` (trocEvaluationService) recalcule un bon `stale` via `computeOfferV2`
>   (état déjà déclaré + `base_price` du JOUR → aucune divergence), persiste nouveau crédit + nouvelle échéance +
>   motif. Modale : bouton « Ré-évaluer le crédit » (masque la clôture tant que `stale`). Aucune migration (colonnes existantes).
>
> **→ TRANCHE 3 COMPLÈTE** (3.1 + 3.2 + 3.2b). Reste éventuel : job d'expiration auto + relance (cf. §5 hors-scope).

---

## 1. État actuel (ce qui existe DÉJÀ — ne pas réinventer)

La machine à états admin est **déjà en place** :

- [components/admin/tabs/TrocTab.tsx](../../../components/admin/tabs/TrocTab.tsx) — liste + boutons inline :
  `pending → Valider (validated)`, `validated → Terminer (completed)`, `pending/accepted → Refuser (refused)`, « Détails ».
- [hooks/admin/useTrocManager.ts](../../../hooks/admin/useTrocManager.ts) — `updateStatus(id, status)` = **update supabase direct** (RLS admin), realtime.
- [components/admin/modals/TrocDetailsModal.tsx](../../../components/admin/modals/TrocDetailsModal.tsx) — détail lecture seule + « Voir le bon PDF ».
- [hooks/admin/usePosSystem.ts](../../../hooks/admin/usePosSystem.ts) — POS : crée une commande `orders`, décrémente le stock, génère la facture. **Ne connaît aucun crédit de reprise.**
- La recherche inclut `voucher_reference`. `status` autorise déjà `validated`/`completed` (pas de migration de statut).

## 2. Les trous à combler

1. **Donnée tranche 2 invisible** : `target_product_name` + `voucher_expires_at` n'apparaissent ni en liste, ni modale, ni PDF.
2. **Aucun garde-fou** : `updateStatus` écrit n'importe quel statut sans vérifier expiration/ordre.
3. **Pas d'audit** : seul `updated_at` bouge.
4. **PDF du bon obsolète** (pas de cible ni d'échéance).
5. **Pas d'encaissement** : « Terminer » ne fait rien côté vente/stock.

## 3. Décisions ACTÉES (2026-07-21)

- **A — Bon expiré = logique de grâce (7 j)**. À la vérification du bon :
  - `now ≤ voucher_expires_at` → **valide**, clôture normale.
  - `0 < dépassement ≤ 7 j` → **grâce** : clôture possible avec **motif obligatoire** (tracé).
  - `dépassement > 7 j` → **ré-évaluation forcée** : le crédit est recalculé aux conditions du jour (motif tracé), l'ancien crédit est caduc.
  - `voucher_expires_at` null (dossiers legacy pré-T2) → pas de contrainte d'échéance.
- **B — Couplage POS complet**. « Terminer » = créer la commande de l'appareil **cible**, appliquer le crédit,
  décrémenter le stock du produit cible, encaisser la différence, lier commande ↔ dossier. Le crédit est un
  **plafond** : `reste = max(0, prix_cible − crédit)` ; surplus → upsell, **jamais de cash rendu**.
- **C — Audit** : `validated_at` + `completed_at` (+ motif d'override / ré-évaluation).

> ⚠️ B élargit fortement le chantier → livré en **2 étages** (3.1 fondations, 3.2 encaissement POS).

---

## 4. ÉTAGE 3.1 — Fondations sûres (workflow + visibilité + garde-fous)

Indépendamment utile, prérequis de 3.2.

### 4.1 Migration (idempotente, additive — cf. règle AGENTS.md ; `npm run db:introspect` AVANT)
`supabase/migrations/2026072x_00x_troc_redemption_audit.sql` :
- `validated_at timestamptz`, `completed_at timestamptz`
- `redemption_reason text` (motif d'override en grâce, ou de ré-évaluation hors grâce)

### 4.2 Logique pure — `utils/trocRedemption.ts` (testable, TDD)
- `REDEMPTION_GRACE_DAYS = 7`.
- `redemptionState(request, now) → 'valid' | 'grace' | 'stale' | 'no_expiry'` (barème réutilise l'échéance stockée).
- `TROC_TRANSITIONS` : machine à états (`pending→validated|refused|cancelled`, `validated→completed|cancelled`, terminaux).
- `canTransition(from, to)` ; `voucherDaysLeft(request, now)`.
- Tests unitaires (bornes J, override, transitions valides/invalides).

### 4.3 `useTrocManager` — `transitionStatus(id, to, opts?)` (remplace `updateStatus`)
1. refuse hors machine à états ; 2. `→ completed` en grâce exige `opts.reason` ; `stale` bloque (renvoie « ré-éval requise ») ;
3. écrit `status` + `validated_at`/`completed_at` + `redemption_reason` en une update ; 4. garde optimistic + realtime.

### 4.4 UI — surfacer tranche 2 + état du bon
- **TrocDetailsModal** : bloc « Bon & cible » = `target_product_name`, échéance + badge **« expire dans N j » / « GRÂCE J+n » / « EXPIRÉ — ré-éval »** ; actions gardées (motif si grâce).
- **TrocTab** : pastille « Cible » + indicateur d'expiration ; boutons inline via `transitionStatus`.
- **PDF** (`tradeInVoucherGenerator`) : ajouter appareil cible + date d'expiration.

## 5. ÉTAGE 3.2 — Encaissement POS (couplage complet)

### 5.1 Migration
- `orders` ↔ dossier : `trade_in_requests.completed_order_id text` (+ éventuel `orders.trade_in_request_id`, `credit_applied`).

### 5.2 Service de vente partagé
- Extraire de `usePosSystem` une fonction de vente réutilisable acceptant un **crédit de reprise** optionnel + dossier lié.
- Clôture troc = vente de la cible avec `total = max(0, prix − crédit)`, méthode de paiement de la différence, décrément stock cible, lien commande↔dossier, `status='completed'` + `completed_at`.
- Ré-évaluation (cas `stale`) : recomputer l'offre (mêmes données d'état, `base_price`/marché du jour) avant la vente.

### 5.3 UI
- Flow « Terminer » dans la modale = mini-POS pré-rempli (cible, crédit, reste à payer, moyen de paiement) → confirme → vente + clôture liées.

## 6. Tests
- `utils/trocRedemption.ts` : machine à états, grâce/expiration (avant/pendant/après grâce), null.
- Manuel : valide→terminer ; grâce→motif requis ; stale→bloqué/ré-éval ; POS→commande+stock+lien.

## 7. Ordre de livraison
**3.1** : introspect → migration audit → `trocRedemption.ts` + tests → `transitionStatus` → modale/liste/PDF → typecheck+tests.
**3.2** : migration lien → service de vente partagé → flow POS clôture → tests.
