# QA mobile SMART TROC — checklist de régression

> Issue de référence : [#9 — Add mobile regression coverage for SMART TROC](https://github.com/EagleFox31/xeption237/issues/9).
> **Usage** : à exécuter AVANT chaque mise en prod touchant le flow troc. Durée cible : ~10 min par profil device.

## 1. Coverage automatisé (ce qui est déjà protégé)

Les cas purs sont couverts par la suite Vitest (`npm test`). Si un de ces tests casse → arrêt du déploiement, pas de smoke manuel.

| Scope | Fichier test | Cas couverts |
|---|---|---|
| Validation formulaire | `tests/features/troc-form-validation.feature.test.ts` | Champs obligatoires, formats téléphone/email, bornes dates |
| Pricing troc | `tests/features/troc-pricing.feature.test.ts` + `tests/unit/trocPricing.test.ts` | Barème, bonus crédit, plancher, âge max |
| IMEI | `tests/features/troc-imei.feature.test.ts` | Statuts valid/blacklisted/check_failed, formatage |
| Scoring photo | `tests/features/troc-scoring.feature.test.ts` | Grades A/B/refuse, blockers |
| Machine à états | `tests/unit/trocRedemption.test.ts` | Transitions autorisées, statuts terminaux, labels FR, `isTerminalStatus` |
| Détection doublons | `tests/unit/trocDuplicates.test.ts` | Phone + IMEI, fenêtre glissante, normalisation CM `+237...` |
| Metrics funnel | `tests/unit/trocFunnelMetrics.test.ts` | KPIs, décroissance monotone, median transitions, timeline |
| Hook useTradeIn | `tests/unit/useTradeIn.test.ts` + `useTradeInTarget.test.ts` | Transitions step, upload photos, payment flow, autosave |
| Gestionnaire admin | `tests/unit/useTrocManager.test.ts` | Transitions status, filtres, charge données |
| Voucher / rachat | `tests/unit/trocVoucher.test.ts` + `trocCheckout.test.ts` | Validité bon, expiration, rachat |

Si tu ajoutes du code SMART TROC sans toucher à ces zones, lance `npm test -- troc` pour valider en 30s avant commit.

---

## 2. Profils device cibles

**Obligatoire** avant chaque release :

| Profil | Viewport (W×H) | Browser | Pourquoi |
|---|---|---|---|
| **Android petit** | 360×640 | Chrome mobile | Le plus répandu au Cameroun (Tecno/Infinix entry) |
| **Android moderne** | 390×844 | Chrome mobile | Milieu de gamme (Samsung A, Xiaomi Redmi Note) |
| **iOS** | 390×844 | Safari iOS | Validation safe-area + autoplay audio notif |

**Comment simuler sans device physique** : Chrome DevTools → `Toggle device toolbar` (Ctrl+Shift+M) → `Responsive` → entre les dimensions manuellement. **ATTENTION** : le DevTools responsive mode N'A PAS le même rendering que le vrai device pour la safe-area iOS et la gestion du clavier Android. Un device physique OU un simulateur Android Studio reste nécessaire sur les releases majeures.

---

## 3. Smoke test — parcours critique (10 min)

Checklist à cocher à chaque release. Si **une seule** case rouge → bloquer le déploiement.

### 3.1 Entrée

- [ ] Clic sur le CTA SMART TROC depuis la homepage (slide hero carousel + bouton bottom nav) → `/troc` charge sans erreur console
- [ ] Entrée via URL directe `/troc` → même rendu
- [ ] Entrée via campagne analytics (query param `?utm_source=...`) → la session est bien tracée (vérifier dans GA4 Debug View)

### 3.2 Formulaire — étape 1

- [ ] Soumettre vide → les erreurs de validation s'affichent et bloquent la progression
- [ ] Saisir un téléphone invalide (ex: `12345`) → erreur spécifique
- [ ] Saisir un IMEI invalide (ex: `000000000000000`) → erreur spécifique
- [ ] Formulaire valide → bouton CTA "Suivant" devient actif et navigue
- [ ] Le CTA est **toujours visible** quand le clavier Android est ouvert (pas caché sous la barre d'adresse)
- [ ] Aucun scroll horizontal sur tous les champs/pills

### 3.3 Photos — upload

- [ ] Prendre 3 photos consécutives → preview correct, pas de reset silencieux
- [ ] Retenter une photo (bouton "Reprendre") → l'ancienne est écrasée, pas en doublon
- [ ] Si upload rate (couper le wifi en plein milieu) → message d'erreur clair + retry possible sans perdre les photos
- [ ] Précheck crédibilité (icône verte/orange/rouge) → feedback dans un délai acceptable (< 5s sur 4G correct)
- [ ] Autosave : refresh la page après upload de 2 photos → les 2 photos sont restaurées

### 3.4 IMEI + Paiement frais éval

- [ ] Vérification IMEI → spinner → résultat (vert/orange/rouge) sans scroll horizontal
- [ ] Paiement frais SMART TROC (OM/MOMO) → USSD arrive sur le téléphone saisi
- [ ] Pendant polling → spinner clair + bouton "Annuler" fonctionne
- [ ] Paiement validé → navigation vers étape résultat sans refresh forcé
- [ ] Paiement échoué → message explicite + bouton retry (pas de double débit)

### 3.5 Résultat + choix

- [ ] L'offre affiche brand/model/grade/montant correctement, pas de "undefined"
- [ ] 3 CTAs visibles : **Vendre à Xeption** / **Marketplace** / **Troquer**
- [ ] Clic "Vendre à Xeption" → voucher BON- généré + PDF téléchargé auto + bouton WhatsApp pré-rempli
- [ ] Clic "Marketplace" → navigue vers `/marketplace/lister` avec les specs pré-remplies
- [ ] Clic "Troquer" (si choix cible fait avant) → voucher TRC- avec QR

### 3.6 WhatsApp handoff

- [ ] Clic sur "Contacter via WhatsApp" → ouvre `wa.me/237...` avec le message pré-rempli complet (ref voucher + device + grade + montant)
- [ ] Message **lisible sur un écran WhatsApp mobile** sans scroll horizontal

### 3.7 Protection double-tap

- [ ] Taper plusieurs fois rapidement sur "Continuer" / "Valider" / "Payer" → **une seule** soumission (pas de doubles ventes, pas de doubles paiements, pas de doubles vouchers)
- [ ] Les boutons passent en état `disabled` pendant la requête

### 3.8 Analytics non bloquant

- [ ] Si GTM/GA4 ne charge pas (bloquer `googletagmanager.com` dans DevTools Network) → le flow TROC continue de fonctionner normalement
- [ ] Les erreurs analytics n'apparaissent PAS dans l'UI (silencieuses, loggées en `console.warn`)

---

## 4. Comportement refresh / back / forward

### Refresh pleine page

| Étape où on refresh | Attendu |
|---|---|
| Formulaire step 1 (brouillon) | Données form restaurées depuis `localStorage` (autosave) |
| Photos (après upload réussi) | Photos uploadées restaurées, step toujours "photos" |
| IMEI (après vérif) | Statut IMEI restauré, pas de re-vérif automatique |
| Paiement en cours | Re-check serveur du status via `getPaymentStatus(reference)` → si `paid`, saut direct à résultat |
| Résultat | Résultat restauré depuis le brouillon, pas de re-run évaluation |
| Voucher généré | Voucher reste accessible — pas de regénération |

**Mécanisme** : `useTradeIn` persiste à `localStorage` à chaque mutation via `saveTrocDraft`. Au mount, `loadTrocDraft` hydrate l'état. Documenté dans `hooks/useTradeIn.ts`.

### Back navigation (bouton navigateur / swipe iOS)

| Depuis | Attendu |
|---|---|
| Marketplace listing form | Retour au voucher troc, pas de reset du troc en cours |
| TrocPage avec `location.state.restart=1` | Reset au step 'form' (bottom nav "Troc" après voucher) |
| TrocPage sans state restart | Reprise à l'étape courante du brouillon |

**Mécanisme** : la bottom nav envoie `state: { restart: Date.now() }` au clic sur "Troc" si le dossier est au step `voucher`. Documenté dans `components/MobileBottomNav.tsx` et `pages/TrocPage.tsx`.

### Forward navigation

- Pas de cas spécifique — `history.forward()` ramène simplement à la page précédemment visitée. Les états React sont indépendants de la navigation.

---

## 5. Checks spécifiques Android

- [ ] **Clavier numérique** sur les champs téléphone / IMEI / montants (pas d'alphabétique)
- [ ] **Autofill clavier Chrome** sur le champ nom / email : si le user accepte, le champ est bien rempli (pas de bug `onChange` manquant)
- [ ] **Pull-to-refresh** désactivé pendant l'upload photo (sinon reset en plein milieu)
- [ ] **Dialog permission caméra** : UX claire si refus, lien pour relancer la permission depuis les paramètres
- [ ] **Compression photo** pré-upload : < 500 Ko par photo (voir `trocPhotoPreflight`)

---

## 6. Checks spécifiques iOS

- [ ] **Safe-area insets** : le CTA fixe bottom n'est jamais caché par la barre home iOS
- [ ] **Autoplay son notif admin** : testé après un premier geste utilisateur (politique Safari)
- [ ] **Bouton partager WhatsApp** fonctionne même si l'app WhatsApp n'est pas installée (fallback web)

---

## 7. Gate release

Avant de merger un PR qui touche aux fichiers de la liste 👉 `pages/TrocPage.tsx`, `hooks/useTradeIn.ts`, `components/mobile/MobileTroc*`, `services/trocEvaluationService.ts`, `services/trocPhotoPreflight.ts`, `services/trocCheckoutService.ts`, `utils/trocPricing.ts`, `utils/trocRedemption.ts`, `supabase/migrations/*trade_in*`, `supabase/functions/create-payment/`, `supabase/functions/evaluate-device/`, `supabase/functions/save-trade-in/` :

1. ✅ `npm test -- troc` passe à 100%
2. ✅ Smoke test §3 effectué sur **au moins le profil Android petit (360×640)**
3. ✅ Pas d'erreur rouge dans la console navigateur pendant le smoke test
4. ✅ GA4 Debug View montre les events `troc_start`, `troc_step_view`, `troc_payment_paid`

Si un de ces points est rouge → **release bloquée**. Voir aussi `RELEASE_CHECKLIST.md` pour le gate global.
