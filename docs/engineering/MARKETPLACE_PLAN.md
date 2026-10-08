# Plan Marketplace C2C — Xeption 237

> Dernière mise à jour : 2026-10-08
> Statut : chantier à cadrer, pas démarré. Triggers GTM déjà posés (`marketplace_*`) en anticipation.

---

## 1. Pourquoi ce chantier

Xeption fait aujourd'hui B2C (vente directe) + Troc (reprise). Un marketplace C2C (ventes entre particuliers, Xeption en tiers de confiance) ajoute :

- **Flux d'inventaire gratuit** : les téléphones qu'on refuse en Troc (prix trop haut pour nous, modèle hors cible) peuvent être revendus par le propriétaire sous notre marque → on garde le client et on prend une commission.
- **SEO longue traîne** : chaque annonce = une URL indexable supplémentaire. Les concurrents (CoinAfrique) tirent 90 % de leur trafic SEO de ça.
- **Barrière différenciante** : seul marketplace CM avec **IMEI vérifié** avant publication. Les autres (Jumia Deals, CoinAfrique, Afribaba) ne le font pas.
- **Donnée argus** : chaque transaction publique alimente notre modèle de pricing Troc.

---

## 2. Concurrence au Cameroun

### Acteurs identifiés

| Plateforme | Modèle | Forces | Faiblesses |
|---|---|---|---|
| **Jumia Deals / Afribaba / Vendito** | C2C classifieds, 6 villes CM | Marque Jumia, trafic | Pas de vérif IMEI, pas d'escrow, qualité annonces faible, interface vieillissante |
| **CoinAfrique** | C2C mobile-first, 17 pays Afrique francophone | App mobile solide, follow seller, contact direct call/SMS/WhatsApp | Pas de vérif technique, pas de grading unifié, modération manuelle |
| **Facebook Marketplace** | C2C informel | Déjà adopté par les Camerounais, gratuit, gratuit | Hors écosystème web, aucune vérif, scams massifs |

### Lecture du marché

- Standard local actuel : **annonce + photo + numéro WhatsApp**, rien de plus. Zéro vérification, zéro protection.
- Transaction se fait **hors plateforme** (cash en main propre). Les plateformes ne gagnent rien sur la transaction, uniquement sur les annonces boostées (payantes).
- **Trou de marché évident** : aucun acteur local ne combine vérification IMEI + grading cosmétique standardisé + escrow optionnel.

---

## 3. Normes internationales à reprendre

### Grading cosmétique (Backmarket)

Trois niveaux universels, déjà compris par les acheteurs sérieux :

| Grade | Description |
|---|---|
| **Excellent** | Aucune trace visible, écran sans rayure, coque intacte |
| **Très bon** | Micro-rayures invisibles à 20 cm, aucun impact fonctionnel |
| **Bon** | Rayures visibles, éventuels petits chocs, 100 % fonctionnel |

Avantage : on réutilise les mêmes grades que **TrocEvaluationResult.tradeInGrade** → cohérence Troc ↔ Marketplace.

### Photos (Vinted / Backmarket)

- **Minimum 4 photos obligatoires**, idéal 6-8
- Ordre imposé : face / dos / tranche / écran allumé / IMEI (facultatif, utile pour trust) / défauts éventuels
- Fond neutre, lumière naturelle, pas de flash
- Rejet automatique via Gemini Vision si photos floues/non pertinentes (on a déjà la pipeline côté Troc, à réutiliser)

### Fiche annonce (champs obligatoires)

```
- Marque + modèle (dropdown connecté à notre base argus)
- Stockage, RAM
- Grade cosmétique (dropdown 3 niveaux)
- IMEI (vérifié avant publication, affiché partiellement : ***-***-123)
- Prix demandé (XAF)
- Localisation (ville, pas adresse exacte)
- Description libre (optionnelle, 500 car max)
- Négociable oui/non
```

---

## 4. Trust & Safety — minimum viable

### Vérifications à l'inscription vendeur

| Niveau | Donnée demandée | Blocage si manquant |
|---|---|---|
| **Base** | Numéro téléphone CM vérifié (OTP SMS) | Oui, bloque publication |
| **Standard** | Email vérifié | Non, mais badge "contact vérifié" |
| **Pro** | Pièce d'identité + selfie (via Sumsub ou équivalent) | Non en V1, obligatoire en V2 si vendeur > 3 annonces/mois |

### Vérifications à la publication

- **IMEI check obligatoire** avant mise en ligne (déjà disponible côté Troc, à exposer dans le flow marketplace)
- Statut IMEI blacklist affiché publiquement sur l'annonce (clear / blacklisted / unknown)
- Rejet automatique si IMEI blacklisted global (GSMA DB) ou local CAMCIS (voir memory `project_innovations_marche_2026`)

### Modération

- Auto : vision IA sur photos (déjà fait pour Troc), détection mots-clés interdits (volé, débloqué-douteusement, etc.)
- Humain : queue de review pour les annonces > seuil prix (ex : > 500 000 F) ou vendeur nouveau

### Système de signalement

- Bouton "Signaler" sur chaque annonce, raisons prédéfinies (fraude / contenu interdit / spam / déjà vendu)
- 3 signalements valides = retrait automatique + review manuelle

---

## 5. Modèle transactionnel

### Option A — Contact direct (MVP recommandé)

Comme CoinAfrique : bouton WhatsApp pré-rempli, Xeption n'intervient pas dans la transaction. Zéro risque opérationnel, zéro revenu transactionnel.

**Monétisation** : annonces boostées (mise en avant 48h = X F) + éventuel abonnement vendeur pro.

### Option B — Escrow via CamPay (V2)

L'acheteur paie à Xeption, Xeption retient les fonds, libération après confirmation de livraison (ou passage en boutique Xeption pour inspection).

**Monétisation** : commission 3-5 % + revenus annonces boostées.

**Blocage V2** : nécessite logistique livraison ou flux "retrait boutique Xeption contre inspection", réserver pour quand le volume justifie.

**Recommandation V1** : partir sur **A**, instrumenter correctement les events `marketplace_payment_initiated` pour mesurer la demande latente, basculer en **B** quand on voit la volonté de payer en ligne.

---

## 6. Flows utilisateur

### Vendeur — Publier une annonce

```
1. [marketplace_listing_step: start] Clic "Vendre mon téléphone"
2. [marketplace_listing_step: device]  Sélection marque/modèle (autocomplete argus)
3. [marketplace_listing_step: photos]  Upload 4-8 photos (vision IA valide)
4. [marketplace_listing_step: imei]    Saisie IMEI → check obligatoire
5. [marketplace_listing_step: details] Grade + prix + localisation + description
6. [marketplace_listing_step: review]  Récap + CGU + publication
7. [marketplace_listing_published]     Annonce en ligne
```

### Acheteur — Parcourir / contacter

```
1. [marketplace_browse_view]       Liste annonces (filtres marque, prix, grade, ville)
2. [marketplace_browse_view]       Détail annonce (photos, specs, IMEI partiel, grade)
3. [marketplace_contact_seller]    Clic WhatsApp pré-rempli OU formulaire interne
4. [marketplace_payment_initiated] (V2 seulement) Clic "Payer via Xeption"
```

Events déjà présents dans GTM — pas besoin de rien créer côté tracking.

---

## 7. Architecture technique (ébauche)

### Base de données (Supabase)

Nouvelles tables :

- `marketplace_listings` : id, seller_id, device_brand, device_model, storage, ram, grade, imei_hash, imei_status, price, currency, city, description, photo_urls[], status (draft/pending/active/sold/removed), boost_until, created_at, updated_at
- `marketplace_sellers` : user_id (FK auth.users), phone_verified, email_verified, kyc_level (none/base/standard/pro), seller_rating, total_listings, created_at
- `marketplace_reports` : id, listing_id, reporter_id, reason, status, created_at
- `marketplace_contacts` : id, listing_id, buyer_id, channel (whatsapp/internal), created_at — pour mesurer le funnel

RLS **impérative** sur toutes ces tables (cf. memory `project_bd_securite` — on ne reproduit pas le trou de `products`).

### Edge Functions

- `marketplace-publish-listing` : validation finale + check IMEI + insert
- `marketplace-report-listing` : log signalement + trigger auto-retrait au seuil
- `marketplace-boost-listing` : (V2) paiement CamPay pour mise en avant

### Pages

- `/annonces` : liste + filtres
- `/annonces/[id]-[slug]` : détail annonce
- `/vendre` : wizard publication (reprendre pattern `TrocPage.tsx`)
- `/mon-compte/annonces` : gestion annonces vendeur

### Composants réutilisables à extraire du Troc

- `PhotoUploader` ✅ déjà fait
- `ImeiChecker` ✅ déjà fait, à extraire d'une logique Troc-only
- Pipeline vision IA photos ✅ déjà fait
- Base argus marques/modèles ✅ déjà fait

Beaucoup de code Troc est réutilisable, c'est un vrai levier.

---

## 8. Phasage proposé

### V1 — MVP (4-6 semaines dev)

- Tables + RLS
- Wizard publication (5 étapes)
- Liste + fiche annonce
- Contact WhatsApp direct
- Vérification IMEI obligatoire
- Modération manuelle via dashboard admin
- Pas de paiement, pas de KYC fort

### V1.5 — Trust (2 semaines)

- Système de signalement
- Vision IA sur photos
- Compte vendeur avec historique

### V2 — Monétisation (TBD)

- Annonces boostées (CamPay)
- Escrow optionnel
- KYC fort pour pro vendeurs

### V3 — Scale (TBD)

- API pour revendeurs pro (bulk upload)
- Notifications push (nouvelle annonce correspondant à alerte sauvegardée)
- Système d'avis vendeur/acheteur

---

## 9. Points à arbitrer avec le boss

1. **Modèle transactionnel** : on part sur contact direct WhatsApp (A) ou on vise directement escrow (B) ? Impact scope énorme.
2. **Commission** : 0 % (modèle Jumia Deals) ou commission dès le début même sur contact direct (abonnement vendeur) ?
3. **Positionnement prix** : seuil min/max pour éviter d'être perçu comme Jumia Deals (bas de gamme) ou se restreindre premium (comme Backmarket) ?
4. **Modération humaine** : budget d'un modérateur à temps partiel dès V1 ou on compte 100 % sur l'auto ?
5. **KYC fort** : on l'impose dès V1 pour les vendeurs pro ? Freine l'adoption mais augmente la confiance.
6. **Nom** : "Annonces Xeption" ? "Xeption Market" ? "Xeption Occasion" ? Impact SEO et branding.

---

## 10. Risques identifiés

| Risque | Impact | Mitigation |
|---|---|---|
| Scams massifs (vendeurs fantômes, téléphones volés) | Perte confiance marque, procès | OTP SMS obligatoire + IMEI check + signalement + modération humaine seuil |
| Transactions hors plateforme (zéro revenu) | Pas de revenu transactionnel | Pivot V2 vers escrow + boost payant |
| Faible adoption vendeurs | Marketplace vide, effet réseau cassé | Seed avec les refus Troc (on propose au client de publier son appareil refusé) |
| Cannibalisation du B2C Xeption | On vend moins de nos propres phones | Positionnement complémentaire : marketplace = modèles qu'on ne stocke pas / grades inférieurs |
| Charge modération | Coût opérationnel caché | Vision IA + queue de review automatique sur seuils |

---

## Sources

- [CoinAfrique Petites Annonces](https://cm.coinafrique.com/categorie/telephones-et-tablettes) — benchmark concurrent principal
- [CoinAfrique profile — Startup List Africa](https://www.startuplist.africa/startups/coinafrique) — modèle économique
- [Jumia Deals Cameroun — Monisnap blog](https://www.monisnap.com/fr/blog/article/jumia-deals-au-cameroun/) — couverture villes CM
- [Vinted Selling Guide 2026 — Underpriced](https://www.underpriced.app/blog/vinted-selling-guide-2026) — modèle escrow + grading
- [How to Sell on Back Market — Sellu](https://sellu.app/blog/sell-on-back-market-guide) — grading excellent/très bon/bon
- [Marketplace Fraud Guide — SEON](https://seon.io/resources/online-marketplace-fraud/) — modèle KYC multi-niveau
- [IMEI Blacklist Check — Phonecheck](https://www.phonecheck.com/blog/imei-blacklist-check-how-to-tell-if-a-phone-is-blocked-before-you-buy) — base GSMA + propagation 24-72 h
- [Marketplace Identity Verification — Regula](https://regulaforensics.com/blog/marketplace-identity-verification/) — standards KYC marketplaces
