# QA order flow — checklist de régression

> Issue de référence : [#18 — Regression-test the order flow and prepare production fixes](https://github.com/EagleFox31/xeption237/issues/18).
> **Usage** : à exécuter avant chaque mise en prod touchant le flow commande. Durée cible : ~8 min.

## 1. Coverage automatisé en place

| Scope | Fichier test | Cas couverts |
|---|---|---|
| Vente atomique (POS + checkout client) | `tests/integration/atomicSales.integration.test.ts` | RPC `create_order_atomic`, stock atomique, doubles décréments, nettoyage relatif |
| Feedback post-commande | `tests/unit/orderFeedback.test.ts` | Invite feedback, limites, duplication |
| Troc + checkout | `tests/unit/trocCheckout.test.ts` | Rachat avec voucher, reste à payer |

Lance avant chaque merge touchant `useOrderProcess`, `Checkout`, `supabase/migrations/*order*` :

```bash
npm test -- order
```

## 2. Fix dédup de double-tap (livré par #18)

**Avant** : `useOrderProcess.submitOrder` protégé par `useState([isProcessing])` → la fenêtre entre le click et le flip du state (React batching ~0–50 ms) laissait passer un double-tap. L'UI avait `disabled={isProcessing}` mais le state mettait quelques ms à propager.

**Après** : garde `useRef<Promise | null>` synchrone — toute re-soumission alors qu'une requête est en vol **retourne la même promesse**. Résultat :

- Zéro doublon côté serveur (`create_order_atomic` appelé **une seule fois** quoi qu'il arrive)
- Zéro erreur côté UI (le double-tap voit le même résultat positif)
- Le step `success` ne se déclenche qu'une fois

Protège contre : double-tap mobile, clavier Entrée répété, bots, réseau lent.

Fichier modifié : `hooks/useOrderProcess.ts` (commentaire détaillé inline).

## 3. Smoke test — parcours critique (8 min)

À cocher avant chaque release. Si **une seule** case rouge → bloquer le déploiement.

### 3.1 Catalogue → panier

- [ ] Depuis `/shop`, filtrer par catégorie / marque → résultats cohérents, pas de produit "undefined"
- [ ] Clic sur un produit → `/product/<slug>` charge, prix et stock corrects
- [ ] Ajouter au panier → le compteur du panier incrémente immédiatement
- [ ] Ajouter 2× le même produit → quantité = 2 (pas 2 lignes séparées)
- [ ] Modifier la quantité depuis le panier (±) → recalcule total correctement
- [ ] Retirer un article → disparaît + total mis à jour

### 3.2 Panier → checkout

- [ ] Panier vide → bouton "Procéder au paiement" désactivé OU message explicite
- [ ] Panier avec un article → ouverture checkout en overlay, sans scroll horizontal
- [ ] Formulaire : nom, téléphone, email, ville — validation inline des erreurs
- [ ] Choix mode livraison (livraison / retrait boutique) → recalcul frais de livraison correct selon ville
- [ ] Choix moyen de paiement (CASH, OM, MOMO) — radio fonctionne
- [ ] Captcha hCaptcha → nécessaire pour activer le bouton "Valider la commande"

### 3.3 Validation commande

- [ ] **Double-tap sur "Valider la commande"** → UNE SEULE commande créée (vérifier dans admin → Commandes)
- [ ] Pendant la soumission : spinner + texte "Traitement…" + bouton `disabled`
- [ ] Succès : navigation vers étape "success" + ouverture auto WhatsApp avec message pré-rempli
- [ ] Si WhatsApp bloqué par le navigateur → fallback bouton visible, pas de blocage silencieux
- [ ] Référence commande au format `ORD-XXXX-XXXX` (lisible, pas de 0/O/1/I/L ambigus)
- [ ] PDF facture téléchargeable depuis l'étape success

### 3.4 Côté admin — visibilité

- [ ] La commande apparaît dans `/admin → Commandes` **dans les 5s** suivant la validation
- [ ] Montant total correct (incluant frais de livraison + remise voucher troc si applicable)
- [ ] Détail commande (modal) → tous les items listés avec quantités + prix unitaires
- [ ] Status initial `pending` → bouton "Marquer en préparation" fonctionne
- [ ] Si le client a utilisé un voucher troc → le voucher est lié au dossier (`admin_notes` ou colonne dédiée)

### 3.5 Stock

- [ ] Stock du produit décrémenté **une seule fois** par commande (vérifier dans `/admin → Inventaire` avant/après)
- [ ] Si le stock passe à 0 → le produit est indiqué "rupture" sur `/shop` au prochain refresh

### 3.6 Paiement échoué / retry

- [ ] Simuler erreur captcha (bloquer `hcaptcha.com` dans DevTools Network) → message d'erreur clair, pas de commande créée côté admin
- [ ] Après erreur, l'utilisateur peut **retenter** la soumission (bouton redevient actif)
- [ ] Retry réussi → UNE commande créée (pas de doublon de la tentative avortée)
- [ ] Simuler stock insuffisant (produit à 0 stock entre temps) → RPC renvoie erreur, pas de commande orpheline

### 3.7 Troc voucher appliqué

- [ ] Appliquer un voucher troc valide → remise affichée, total mis à jour
- [ ] Appliquer un voucher déjà utilisé → erreur explicite
- [ ] Appliquer un voucher expiré → erreur explicite
- [ ] Commande validée avec voucher → le dossier troc passe à `completed` côté admin

### 3.8 Analytics ecommerce (GA4)

- [ ] Dans GA4 → Debug View, pendant le smoke test, voir les events :
  - [ ] `view_item` à l'ouverture d'une fiche produit
  - [ ] `add_to_cart` au clic "Ajouter au panier"
  - [ ] `begin_checkout` à l'ouverture du checkout
  - [ ] `purchase` à la validation réussie (avec `transaction_id`, `value`, `items[]`)

## 4. Gate release — fichiers déclencheurs

Un PR qui touche à ces fichiers → smoke test §3 OBLIGATOIRE avant merge :

- `hooks/useOrderProcess.ts`
- `components/Checkout.tsx`
- `services/trocCheckoutService.ts`
- `utils/invoiceGenerator.ts`
- `supabase/migrations/*order*`
- `supabase/functions/create-order-payment/`
- `supabase/functions/get-payment-status/`
- `supabase/functions/payment-webhook/`

## 5. Rollback plan

En cas de régression détectée post-release :

1. **Git revert immédiat** du commit coupable + redeploy Vercel
2. Si une migration DB a été appliquée → vérifier qu'elle est **additive uniquement** (pas de `DROP`), sinon rollback DB manuel par script dédié
3. Notifier le staff que les commandes passées pendant la régression doivent être revérifiées manuellement
4. Ajouter la régression à `ERRORS_LOG.md` avec cause racine + prévention

## 6. Références croisées

- Smoke test SMART TROC → [`MOBILE_QA_SMART_TROC.md`](./MOBILE_QA_SMART_TROC.md)
- Checklist release globale → [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md)
- Notifications flow (incluant order_created futur) → [`NOTIFICATIONS.md`](./NOTIFICATIONS.md)
- Journal d'erreurs → [`ERRORS_LOG.md`](./ERRORS_LOG.md)
