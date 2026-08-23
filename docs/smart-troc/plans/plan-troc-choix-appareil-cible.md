# Plan — Smart Troc : choisir l'appareil cible (reprise → upgrade)

> **But** : transformer le Smart Troc d'une simple **estimation** en un vrai **parcours de
> reprise-vers-achat**. Après l'estimation, l'utilisateur choisit l'appareil qu'il veut en
> échange et repart avec un **voucher + précommande** à présenter **en boutique**, où l'échange
> physique et le paiement de la différence se font.
>
> **Pourquoi** : aujourd'hui le Smart Troc se termine sur une valeur + voucher → il chevauche
> conceptuellement le bouton **Xeption Certif** (les deux « expertisent » l'appareil). Le choix
> de l'appareil cible est **le** différenciateur : Certif = expertise IMEI/vol pour revendeurs ;
> Smart Troc = upgrade/vente grand public.
>
> _Rédigé le 2026-07-20 · Révisé le 2026-07-20 (décisions actées)._

---

## État d'implémentation (2026-07-21)

- **Tranche 1 — comparateur (FAIT, vérifié)** : `components/troc/TrocUpgradeChoice.tsx` (≤5 appareils,
  « reste à partir de », suggestions ancrées crédit + même marque plus récent), branché sous le
  Résultat via `EvaluationResult.tsx` (bouton « Utiliser mon crédit sur un appareil → »).
- **Tranche 2 — tout sur UN dossier (FAIT côté code)** : l'appareil cible + la validité du bon sont
  liés au **même** `trade_in_requests` (client + départ + évaluation + voucher + cible). Chaîne :
  `TrocUpgradeChoice.onSelect(product)` → `EvaluationResult.onAcceptOffer(target)` →
  `useTradeIn.acceptOffer/persist(target)` → `saveTradeInRequest(..., target)` →
  body `save-trade-in` → colonnes `target_product_id`, `target_product_name`, `voucher_expires_at`.
  Validité = `utils/trocVoucher.ts` (barème 7/10/14 j selon `release_year` du repris, testé).
  - **⚠️ Déploiement — ORDRE OBLIGATOIRE** (sinon toute acceptation de troc casse) :
    1. Appliquer la migration `supabase/migrations/20260721_002_troc_target_and_voucher_expiry.sql`
       (`npm run db:apply -- supabase/migrations/20260721_002_troc_target_and_voucher_expiry.sql`).
    2. **Ensuite** redéployer la edge function `save-trade-in`
       (`npx supabase functions deploy save-trade-in --project-ref tawnusmfyvugqczaydat --no-verify-jwt --use-api --workdir .`).
    Le code front/service peut partir avant (les champs sont ignorés tant que la colonne/edge n'existent pas).
- **Tranche 3 — rachat en boutique (À FAIRE)** : validation staff du bon (`status` `validated`→`completed`),
  gestion de l'expiration (`voucher_expires_at`), écran ERP. Sous-plan à écrire.

---

## 0. Décisions actées (résumé)

Les 6 questions ouvertes de la v1 sont **toutes tranchées**. Détail plus bas ; synthèse :

| # | Question | Décision |
|---|---|---|
| 1 | Crédit ≥ prix produit → surplus | **Upsell** (accessoires / modèle supérieur), **jamais cash** ni avoir |
| 2 | Paiement de la différence | **Aucun paiement en ligne** — commande + paiement **en boutique** à l'échange physique |
| 3 | Ordre du flow | Choix **après** l'estimation, **intégré dans l'écran Résultat** |
| 4 | Éligibilité | **Tous** les produits en stock (recherche libre) ; suggestions filtrées par crédit |
| 5 | Voucher vs upgrade | **Les deux chemins conservés** (upgrade optionnel) |
| 6 | Frais de service | **~100 F symbolique** = filtre anti-touristes, seul paiement en ligne. Aucune articulation avec la différence (elle se paie en boutique) |

**Point 5 v1 (stock + validité) — tranché** :

| Sujet | Décision |
|---|---|
| Durée de validité du voucher | **3 paliers selon l'âge de l'appareil repris** : < 1 an → **7 j** · 1–3 ans → **10 j** · > 3 ans → **14 j** |
| Ce qui est figé à l'émission | **Le crédit plafond uniquement** (« jusqu'à X F ») |
| Prix de l'appareil cible | **Non figé** — recalculé en boutique au tarif du jour |
| Réservation de stock | **Non** — précommande = **intention**, pas blocage (pour démarrer) |

---

## 1. Existant (le vrai flow, version formulaire)

`pages/TrocPage.tsx` pilote deux intentions :

- **`intent === 'certif'`** → `ImeiCertifFlow` (certifier un appareil : vérif IMEI / statut volé,
  destiné aux **revendeurs**, tarif plus élevé). **Produit distinct, non fusionné avec le troc.**
- **`intent === 'troc'`** → Smart Troc :
  1. Choix du **type** d'appareil (`DeviceChoiceCard` : phone/laptop/… — seul `phone` actif).
  2. **Stepper affiché** (`STEP_LABELS_QUICK`, `TrocPage.tsx:26`) :
     **Appareil → Photos → Paiement → Résultat → Bon**.
     Mapping steps internes → labels (`STEP_INDEX_QUICK`, `TrocPage.tsx:28`) :
     `form`→Appareil · `photos`/`imei`→Photos · `payment`→Paiement · `evaluating`/`result`→Résultat · `voucher`→Bon.
  3. ⚠️ **« Paiement » vient AVANT « Résultat »** : c'est le **frais de service** de l'évaluation
     (~100 F, symbolique), **pas** le paiement d'un appareil. C'est le **seul** paiement en ligne
     de tout le parcours.
  4. `EvaluationResult` (étape **Résultat**) affiche l'estimation ; l'offre expose
     **`tradeInValueCredit`** (le crédit de reprise) — `computeOfferV2` / `finalOffer.tradeInValueCredit`.

**Constat** : le flow s'arrête sur **Résultat → Bon (voucher)**. Rien ne relie ce crédit à un
**produit à acheter**.

---

## 2. Ce qu'on ajoute

**Scénario A validé** — le choix vient **APRÈS « Résultat »** (crédit connu), et le comparateur
est **intégré dans l'écran Résultat** (pas d'étape séparée, on n'alourdit pas le stepper). Le
sélecteur n'est **pas le catalogue complet** mais un **comparateur de ≤ 5 appareils**.

**Point clé : plus aucun paiement en ligne après Résultat.** L'upgrade ne se termine pas sur une
transaction mais sur la génération d'un **voucher + précommande** que l'utilisateur présente
**en boutique**. C'est en boutique que se fait l'échange physique (ancien appareil vérifié de
visu ↔ nouveau) et le paiement de la différence.

```
Appareil → Photos → Paiement(frais ~100F) → Résultat (crédit + comparateur ≤5) → Bon
                                                 │              │
                       "Ton reprise vaut         │   "Applique ton crédit — compare jusqu'à 5 :"
                        jusqu'à 120 000 F"        │    → recherche + suggestions (≤5)
                                                 │    → reste à payer indicatif = prix − crédit
                                                 ▼
                              2 chemins DEPUIS « Résultat » :
                              (A) Upgrade → comparer ≤5, choisir → voucher + précommande
                                          → l'utilisateur vient EN BOUTIQUE avec ça
                              (B) Bon / voucher simple → garder le crédit (flow actuel inchangé)

              ─────────── EN BOUTIQUE (hors application) ───────────
              vérification physique de l'appareil repris → crédit réel confirmé
              → prix cible au tarif du jour → paiement de la différence → échange
```

Le choix d'appareil est **optionnel** : on garde le chemin **Bon/voucher** pour ceux qui veulent
juste vendre.

> ✅ **Un seul paiement en ligne** : le frais de service (~100 F) avant Résultat. La différence
> de l'upgrade se règle **en boutique, à la livraison de l'échange** — rien à coder côté checkout
> en ligne, aucune intégration OM/MoMo pour la différence.

---

## 3. Détail de la fonctionnalité « upgrade »

### 3.1 Écran — un **comparateur de ≤ 5 appareils** (pas tout le catalogue)

Intégré **directement sur/sous le Résultat** (scénario A) :

- **Rappel du crédit** en haut, avec le wording exact du plafond conditionnel :
  > « Ton crédit de reprise : **jusqu'à 120 000 F** — *sous réserve de vérification en boutique* »
- **Sélection des appareils à comparer** (max **5**) :
  - **Recherche** (autocomplete catalogue) — « ajoute un appareil à comparer »
  - **Suggestions intelligentes pré-remplies** (voir 3.3).
- **Comparateur** (les ≤5 côte à côte) : image · nom · **specs clés** (`productSpecSummary`) ·
  prix · crédit appliqué · **RESTE À PARTIR DE ~X F** (le crédit est un plafond, le reste réel est ≥) ·
  CTA **« Troquer contre celui-ci »**.
- Bouton secondaire : **« Garder en voucher »** → chemin cash actuel.

> On ne noie jamais l'utilisateur dans le catalogue complet : il **construit une short-list de 5**
> et **compare** (décision), réutilisant `ProductCard`/`productSpecSummary` + le crédit.

### 3.2 Logique de prix — le voucher garantit un **crédit plafond, pas un prix final**

```
resteAPartirDe = max(0, prixProduitDuJour − créditPlafond)   // plancher (meilleur cas)
```

- Le crédit étant un **plafond** (« jusqu'à X »), ce calcul donne le **reste minimum**. On affiche
  donc **« reste à partir de ~30 000 F »** — jamais un montant sec. Le montant ferme se fixe
  **en boutique**, au **prix du jour** de l'appareil cible et au **crédit réel** confirmé après
  vérification physique (qui peut être < plafond → reste réel **≥** l'indicatif).
- **Ce qu'on fige à l'émission = le crédit plafond uniquement** (« jusqu'à 120k »). On **ne fige
  pas** le prix de l'appareil cible — sinon un voucher pourrait promettre un « reste à payer »
  devenu faux si le prix bouge pendant les 7–14 jours de validité.
- Si `créditPlafond ≥ prixProduit` → l'appareil est **entièrement couvert**. Le surplus n'est
  **jamais** rendu en cash ni en avoir : il devient un **upsell** (« ton crédit couvre tout →
  ajoute des accessoires / passe au modèle supérieur »). Objectif : éviter le churn d'inventaire
  (troquer un bon tel contre un moins bon + récupérer un avoir) et protéger la marge.
- Le **crédit** reflète les **ratios de reprise durs** du boss et reste **ancré sur des prix
  externes vérifiables** (doctrine `feedback_market_price_external`, `project_troc_pricing_stance`).

### 3.3 Pool de recherche & suggestions

- **Recherche** : sur **tous** les produits en stock (autocomplete par nom/marque).
- **Suggestions (pré-remplissage du comparateur)** — règle explicite, **pas** un simple tri par
  prix croissant :
  1. **1 appareil ancré sur le crédit** : reste à payer proche de 0 → l'option qui rassure.
  2. **1 appareil même marque, sorti plus récemment** (via `products.release_year`, ajouté en BD) :
     l'aspirationnel → **c'est lui qui monte le panier moyen** (le tri « moins cher d'abord »
     pousserait au contraire vers du bas de gamme).
  3. **3 emplacements libres** : l'utilisateur y met ce qu'il veut via la recherche.
- Cap dur : **5 appareils** dans le comparateur (au-delà, remplacer/retirer).

### 3.4 Voucher + précommande — durée de validité modulée par l'âge

- Le voucher/précommande porte une **date d'expiration** calculée sur l'âge de l'appareil repris :

  | Âge de l'appareil repris | Validité |
  |---|---|
  | < 1 an | **7 jours** |
  | 1 à 3 ans | **10 jours** |
  | > 3 ans | **14 jours** |

  > **Logique** : un appareil récent perd de la valeur **plus vite en %** (sensible aux sorties de
  > nouveaux modèles / au marché gris) → validité courte pour limiter le drift de prix côté
  > boutique. Un vieil appareil a déjà touché son plancher → validité longue sans risque. Le
  > **plafond de 14 j va donc aux vieux appareils**, pas aux neufs.

- **Réservation de stock : non** (pour démarrer). La précommande est une **intention**, pas un
  blocage d'inventaire. Le comparateur affiche « sous réserve de disponibilité en boutique ».
  Si l'appareil part avant la venue de l'utilisateur, la boutique propose l'équivalent (même
  posture que Certif : la boutique gère le réel). → On passera à une vraie réservation **si**
  on constate des déplacements pour rien à cause de ruptures ; pas avant.

---

## 4. Intégrations code (pistes, à confirmer à l'implémentation)

| Zone | Changement |
|---|---|
| `services/trocEvaluationService.ts` | Exposer `tradeInValueCredit` à l'étape Résultat (déjà calculé). Ajouter le calcul de `dateExpiration` selon l'âge (barème 7/10/14 j). |
| `pages/TrocPage.tsx` | **Pas de nouveau step ni de nouveau label** au stepper : le comparateur vit **dans** `result`. Le stepper reste **Appareil → Photos → Paiement → Résultat → Bon**. L'étape `voucher`/**Bon** porte désormais le voucher **+ la précommande** (appareil cible lié). |
| **Nouveau** `components/troc/TrocUpgradeChoice.tsx` | Rappel crédit (« jusqu'à X F ») + recherche/suggestions (règle 3.3) + **comparateur ≤ 5** (specs + reste à payer **indicatif** par appareil) + CTA — intégré **sous** `EvaluationResult`. |
| `components/troc/EvaluationResult.tsx` | Ajouter le CTA **« Utiliser mon crédit »** → affiche le comparateur (+ garder « Garder en voucher »). |
| **Objet voucher/précommande** | Nouveau modèle persistant (voir 4.1). Lie l'appareil cible + le crédit plafond + la date d'expiration. |
| ~~Paiement de la différence~~ | **Supprimé** : aucun paiement en ligne. La différence se règle en boutique. |
| ~~Panier / checkout en ligne~~ | **Supprimé** : pas de checkout. On génère un voucher+précommande, pas une commande payée. |

### 4.1 Modèle voucher / précommande

```ts
{
  creditPlafond,        // "jusqu'à 120 000" — figé à l'émission
  appareilCible,        // OPTIONNEL (nullable) — modèle choisi (chemin upgrade) ; null si voucher simple (chemin B)
  dateEmission,
  dateExpiration,       // = dateEmission + (7 | 10 | 14) j selon l'âge de l'appareil repris
  ageAppareilRepris,    // sert à déterminer le palier de validité
  statut                // 'actif' | 'expiré' | 'honoré'
}
```

> **Le reste à payer n'est PAS stocké comme montant ferme** — il s'affiche à titre indicatif en
> ligne et se recalcule en boutique (prix du jour − crédit réel).

**Réutilisation** : `ProductCard` (cards refaites), filtres boutique (`?cat`/`?brand`, slugs
propres), `tradeInValueCredit` déjà calculé, `productSpecSummary`.

> ⚠️ **Nuance sur « peu de neuf »** : le comparateur + la génération/persistance du
> voucher+précommande + le lien appareil↔voucher + le barème de validité, c'est de la **vraie
> logique métier**, pas du simple câblage. En revanche, l'abandon du paiement en ligne pour la
> différence **allège** nettement le périmètre (pas de checkout, pas d'OM/MoMo, pas de gestion de
> réservation). Bilan net : périmètre raisonnable, mais ne pas le sous-estimer comme « juste du
> branchement ».

---

## 5. Bénéfices attendus

- **Différenciation nette** vs Certif : expertise IMEI/revendeurs ≠ upgrade grand public.
- **Conversion** : le troc finit sur un **choix d'appareil + une venue en boutique**, pas un chiffre.
- **Panier moyen** : la suggestion « même marque, plus récent » pousse vers le haut de gamme.
- **Trafic boutique physique** : l'utilisateur entre dans le magasin avec un crédit à dépenser.

---

## 6. Points de vigilance résiduels (produit, pas code)

1. **Wording « jusqu'à »** : le crédit affiché doit **toujours** dire « jusqu'à X F, sous réserve
   de vérification en boutique ». C'est ce qui désamorce le cas « l'utilisateur arrive avec un
   écran fissuré » — aucun montant ferme n'a été promis. À faire respecter partout (comparateur,
   voucher, précommande).
2. **Estimation en ligne vs valeur réelle** : la friction résiduelle est humaine (il se déplace et
   obtient moins que le plafond). Le « jusqu'à » + le frais symbolique à 100 F la rendent
   acceptable, mais le langage doit rester honnête sur toute la chaîne.
3. **Voucher fantôme** : sans réservation de stock, prévoir le message boutique « appareil plus
   dispo → voici l'équivalent ». À cadrer côté process magasin, pas code.

---

## 7. Étapes d'implémentation (validé — prêt à coder)

1. **`EvaluationResult`** : ajouter le CTA « Utiliser mon crédit » (+ garder « Garder en voucher »).
2. **`TrocUpgradeChoice`** : rappel crédit « jusqu'à X F » + recherche + suggestions (règle 3.3 :
   1 ancré crédit · 1 même marque plus récent · 3 libres) + comparateur ≤ 5 avec reste à payer
   **indicatif**. Réutilise `ProductCard` + `productSpecSummary`.
3. **Barème de validité** : calcul `dateExpiration` selon l'âge (7/10/14 j) dans
   `trocEvaluationService.ts`.
4. **Objet voucher + précommande** (modèle 4.1) : persistance, lien appareil cible ↔ crédit
   plafond ↔ date d'expiration ↔ statut.
5. **Vérif bout-en-bout** : estimation → comparateur → choix → génération voucher+précommande
   (avec bon plafond, bonne date d'expiration, appareil correctement lié).

> **Rien à coder côté paiement de la différence / checkout en ligne** : hors périmètre, réglé en
> boutique.

---

## 8. Points verrouillés (révision 2026-07-21, après check)

1. **Boucle de rachat en boutique — étendre l'existant, ne PAS réinventer.**
   L'infra voucher existe déjà : **`TradeInRequest.voucher_reference`** (code) + **`status`**
   (`'validated' | 'completed'`) + **`admin_notes`**, plus `TrocVoucher` (affichage) et
   `VerifyCertificatePage` (vérif). L'upgrade = une `TradeInRequest` avec l'appareil cible lié
   (`trade_in_model_id` / réf. produit) ; le staff la passe `validated`→`completed` au rachat.
   Le voucher est **retrouvable** (`voucher_reference`) et **non réutilisable** une fois `completed`.
   → détailler en sous-plan « redemption boutique » avant de coder cette partie.
2. **« Reste à payer » = « à partir de ».** Le crédit est un **plafond** → le reste réel est **≥**.
   On affiche **« reste à partir de ~X F »**, jamais « ~X » sec. Vaut pour comparateur, voucher,
   précommande.
3. **`release_year` ajouté au catalogue `products`** (côté BD). → rend la suggestion « même marque,
   sorti plus récemment » (3.3 #2) **directement calculable**, et fiabilise toute logique de récence
   côté catalogue. (Trou #3 du check : résolu.)
4. **Âge de l'appareil repris = année de sortie du MODÈLE** (`phone_releases.release_year`, via
   `getReleaseYear`). ⛔ **PAS la possession** : le nouveau troc ne gère plus `ownership_rank` /
   `device_age_months` / `purchase_date` (legacy). **Palier par défaut si `release_year` inconnu :
   7 jours** (le plus prudent pour limiter le drift de prix côté boutique).
5. **`appareilCible` nullable** dans le modèle voucher (§4.1) : le chemin (B) « voucher simple » =
   crédit **sans** appareil cible.