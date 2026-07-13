# Smart Troc — Plan d'implémentation

> **Stack validée :** Gemini Vision (scoring) + GSMA/IMEI check (anti-vol) + Supabase + stack existante  
> **Version :** 1.0 — 31 mars 2026

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Fichiers à créer](#2-fichiers-à-créer)
3. [Fichiers à modifier](#3-fichiers-à-modifier)
4. [Schéma base de données](#4-schéma-base-de-données)
5. [Types TypeScript](#5-types-typescript)
6. [Logique de scoring et pricing](#6-logique-de-scoring-et-pricing)
7. [Stratégie prompt Gemini Vision](#7-stratégie-prompt-gemini-vision)
8. [Design des services](#8-design-des-services)
9. [Hook useTradeIn — machine d'état](#9-hook-usetradein--machine-détat)
10. [Composants UI](#10-composants-ui)
11. [Edge Function IMEI](#11-edge-function-imei)
12. [Intégration panel admin](#12-intégration-panel-admin)
13. [Générateur de bon de troc](#13-générateur-de-bon-de-troc)
14. [Monétisation](#14-monétisation)
15. [Ordre de construction — Méthodologie BDD + TDD](#15-ordre-de-construction--méthodologie-bdd--tdd)
16. [Décisions d'architecture](#16-décisions-darchitecture)

---

## 1. Vue d'ensemble

### Flow utilisateur (5 étapes)

```
[1. Formulaire specs]
        ↓
[2. Upload 1-4 photos]
        ↓
[3. Vérification IMEI]  ← Edge Function Supabase (clé API cachée)
        ↓
[4. Évaluation Gemini Vision]  ← image + specs → score /100 + justification
        ↓
[5. Offre + Bon de troc]  ← cash ou crédit boutique (+10%)
```

### Score et couleurs

| Score | Couleur | Signification | Offre |
|-------|---------|---------------|-------|
| 70–100 | 🟢 Vert | Excellent — reprise directe | Rachat cash ou crédit |
| 40–69 | 🟠 Orange | Moyen — décote appliquée | Crédit partiel uniquement |
| 1–39 | 🔴 Rouge | Mauvais — pièces détachées | Prix plancher ou refus |
| 0 | ⛔ Refus | IMEI bloqué / fraude détectée | Aucune offre |

---

## 2. Fichiers à créer

```
services/
  trocEvaluationService.ts          # Gemini Vision + proxy IMEI + persistance Supabase

hooks/
  useTradeIn.ts                     # Machine d'état complète du flow utilisateur
  admin/
    useTrocManager.ts               # Hook admin — liste, filtre, mise à jour statut

components/
  troc/
    SmartTrocForm.tsx               # Étape 1 — formulaire caractéristiques appareil
    PhotoUploader.tsx               # Étape 2 — upload 1-4 photos avec preview
    ImeiChecker.tsx                 # Étape 3 — saisie IMEI + badge statut
    EvaluationResult.tsx            # Étape 4 — jauge score + offre cash/crédit
    TrocVoucher.tsx                 # Étape 5 — bon de troc imprimable
    TrocStepper.tsx                 # Barre de progression partagée
  admin/
    tabs/
      TrocTab.tsx                   # Onglet admin — tableau des demandes de troc

utils/
  trocPricing.ts                    # Score → prix FCFA (fonctions pures)
  trocVoucherGenerator.ts           # Génère le HTML du bon de troc pour impression

supabase/
  functions/
    check-imei/
      index.ts                      # Edge Function — proxy IMEI API (clé côté serveur)
```

---

## 3. Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `types.ts` | Ajouter `TradeInRequest`, `TrocDeviceForm`, `TrocEvaluationResult` |
| `constants/dbSchema.ts` | Ajouter constantes table `TRADE_IN_REQUESTS` |
| `services/geminiService.ts` | Ajouter `evaluateDeviceWithVision()` |
| `components/TrocSection.tsx` | Remplacer l'ancien simulateur par lien vers `/troc` |
| `pages/TrocPage.tsx` | Brancher le wizard Smart Troc |
| `components/admin/AdminPanel.tsx` | Ajouter tab `troc`, wirer `useTrocManager` |
| `components/admin/layout/Sidebar.tsx` | Ajouter item "Smart Troc" |
| `components/admin/layout/BottomNav.tsx` | Ajouter item "Troc" |
| `hooks/admin/useAdminData.ts` | Subscription realtime INSERT sur `trade_in_requests` |

---

## 4. Schéma base de données

### Table `trade_in_requests`

```sql
CREATE TABLE trade_in_requests (
  id                TEXT PRIMARY KEY DEFAULT 'TRC-' || extract(epoch from now())::bigint::text,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ,

  -- Client
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  customer_email    TEXT,

  -- Appareil déclaré
  device_brand      TEXT NOT NULL,
  device_model      TEXT NOT NULL,
  device_storage    TEXT,            -- '64Go' | '128Go' | '256Go' | '512Go' | '1To'
  device_ram        TEXT,            -- '4Go' | '6Go' | '8Go' | '12Go' | '16Go'
  battery_health    INT CHECK (battery_health BETWEEN 0 AND 100),
  screen_condition  TEXT,            -- 'parfait' | 'micro_rayures' | 'fissure' | 'casse'
  body_condition    TEXT,            -- 'parfait' | 'micro_rayures' | 'rayures' | 'chocs'
  accessories       TEXT[],          -- ['chargeur', 'ecouteurs', 'boite', 'cable']

  -- Photos (URLs Cloudinary)
  photo_urls        TEXT[] NOT NULL,

  -- Vérification IMEI
  imei              TEXT,
  imei_status       TEXT DEFAULT 'not_checked',
                    -- 'not_checked' | 'clean' | 'blacklisted' | 'check_failed'
  imei_raw_response JSONB,

  -- Évaluation IA
  ai_score          INT CHECK (ai_score BETWEEN 0 AND 100),
  ai_score_color    TEXT,            -- 'green' | 'orange' | 'red'
  ai_justification  TEXT,
  ai_raw_response   JSONB,

  -- Offre générée
  offer_cash        INT,             -- FCFA, arrondi à 5 000
  offer_credit      INT,             -- offer_cash * 1.10, arrondi à 5 000
  offer_type        TEXT,            -- 'buyback' | 'partial_credit' | 'spare_parts' | 'refused'

  -- Cycle de vie
  status            TEXT NOT NULL DEFAULT 'pending',
                    -- 'pending' | 'accepted' | 'refused' | 'validated' | 'completed' | 'cancelled'
  admin_notes       TEXT,
  voucher_reference TEXT UNIQUE,     -- 'TROC-2026-00042'

  -- Référence modèle Argus (nullable si modèle inconnu)
  trade_in_model_id TEXT REFERENCES trade_in_models(id) ON DELETE SET NULL
);

-- Index
CREATE INDEX idx_troc_requests_status     ON trade_in_requests(status);
CREATE INDEX idx_troc_requests_created_at ON trade_in_requests(created_at DESC);

-- RLS
ALTER TABLE trade_in_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_insert" ON trade_in_requests FOR INSERT TO anon          WITH CHECK (true);
CREATE POLICY "staff_all"     ON trade_in_requests FOR ALL   TO authenticated  USING (true);
```

### Ajouts dans `constants/dbSchema.ts`

```typescript
// Dans DB_TABLES
TRADE_IN_REQUESTS: 'trade_in_requests',

// Dans DB_SCHEMA
TRADE_IN_REQUESTS: {
  ID:                 'id',
  CREATED_AT:         'created_at',
  UPDATED_AT:         'updated_at',
  CUSTOMER_NAME:      'customer_name',
  CUSTOMER_PHONE:     'customer_phone',
  CUSTOMER_EMAIL:     'customer_email',
  DEVICE_BRAND:       'device_brand',
  DEVICE_MODEL:       'device_model',
  DEVICE_STORAGE:     'device_storage',
  DEVICE_RAM:         'device_ram',
  BATTERY_HEALTH:     'battery_health',
  SCREEN_CONDITION:   'screen_condition',
  BODY_CONDITION:     'body_condition',
  ACCESSORIES:        'accessories',
  PHOTO_URLS:         'photo_urls',
  IMEI:               'imei',
  IMEI_STATUS:        'imei_status',
  AI_SCORE:           'ai_score',
  AI_SCORE_COLOR:     'ai_score_color',
  AI_JUSTIFICATION:   'ai_justification',
  OFFER_CASH:         'offer_cash',
  OFFER_CREDIT:       'offer_credit',
  OFFER_TYPE:         'offer_type',
  STATUS:             'status',
  ADMIN_NOTES:        'admin_notes',
  VOUCHER_REFERENCE:  'voucher_reference',
  TRADE_IN_MODEL_ID:  'trade_in_model_id',
}
```

---

## 5. Types TypeScript

À ajouter dans `types.ts` :

```typescript
export interface TradeInRequest {
  id: string;
  created_at: string;
  updated_at?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  device_brand: string;
  device_model: string;
  device_storage?: string;
  device_ram?: string;
  battery_health?: number;
  screen_condition?: string;
  body_condition?: string;
  accessories?: string[];
  photo_urls: string[];
  imei?: string;
  imei_status: 'not_checked' | 'clean' | 'blacklisted' | 'check_failed';
  ai_score?: number;
  ai_score_color?: 'green' | 'orange' | 'red';
  ai_justification?: string;
  offer_cash?: number;
  offer_credit?: number;
  offer_type?: 'buyback' | 'partial_credit' | 'spare_parts' | 'refused';
  status: 'pending' | 'accepted' | 'refused' | 'validated' | 'completed' | 'cancelled';
  admin_notes?: string;
  voucher_reference?: string;
  trade_in_model_id?: string;
}

export interface TrocDeviceForm {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deviceBrand: string;
  deviceModel: string;
  deviceStorage: string;
  deviceRam: string;
  batteryHealth: number;       // 0–100
  screenCondition: string;
  bodyCondition: string;
  accessories: string[];
  imei: string;
}

export interface TrocEvaluationResult {
  score: number;
  scoreColor: 'green' | 'orange' | 'red';
  justification: string;
  offerCash: number;
  offerCredit: number;
  offerType: TradeInRequest['offer_type'];
}
```

---

## 6. Logique de scoring et pricing

### `utils/trocPricing.ts`

```typescript
// Paliers de score
// Green  70–100 → buyback        : cash = basePrice * (score/100 * 0.60)
// Orange 40–69  → partial_credit : cash = basePrice * (score/100 * 0.40)
// Red    1–39   → spare_parts    : cash = basePrice * 0.05 (plancher)
// 0            → refused         : cash = 0
//
// offer_credit = offer_cash * 1.10
// Tout arrondi au multiple de 5 000 FCFA supérieur

export const scoreToColor = (score: number): 'green' | 'orange' | 'red'

export const computeOffer = (
  score: number,
  basePrice: number   // from trade_in_models.base_price, ou 0 si modèle inconnu
): Pick<TrocEvaluationResult, 'offerCash' | 'offerCredit' | 'offerType'>

// Si basePrice = 0 (modèle inconnu) → offerType = 'refused', WhatsApp CTA en fallback
```

---

## 7. Stratégie prompt Gemini Vision

La fonction `evaluateDeviceWithVision()` dans `geminiService.ts` construit un prompt multimodal en 3 parties :

### Partie 1 — Contexte appareil (texte)

```
Tu es un expert reconditionnement d'appareils électroniques au Cameroun pour Xeption Network.
Analyse les photos de cet appareil déclaré comme suit :
- Marque/Modèle : {brand} {model}
- Stockage : {storage} | RAM : {ram}
- Santé batterie (déclarée) : {batteryHealth}%
- État écran (déclaré) : {screenCondition}
- État coque (déclaré) : {bodyCondition}
- Accessoires inclus : {accessories.join(', ') || 'Aucun'}

Examine attentivement chaque photo et identifie : fissures, rayures, traces d'humidité,
oxydation des ports, état de la caméra, cohérence entre l'état déclaré et le visuel.
```

### Partie 2 — Images (1–4 inline base64)

```typescript
{
  inlineData: {
    mimeType: file.type,    // 'image/jpeg' | 'image/png' | 'image/webp'
    data: base64string      // ArrayBuffer → Uint8Array → btoa
  }
}
```

> **Important :** Les photos sont converties en base64 **avant** l'upload Cloudinary (les `File` sont en mémoire dans le hook). Cela évite un double aller-retour réseau.

### Partie 3 — Instruction JSON (texte)

```
Retourne UNIQUEMENT un JSON valide avec la structure suivante :
{
  "score": <entier entre 0 et 100>,
  "justification": "<2-3 phrases en français expliquant le score, en mentionnant ce que tu vois dans les photos>"
}

Barème :
- 70-100 : Excellent état, reprise rentable pour revente reconditionnée
- 40-69  : État moyen, valeur partielle pour reprise avec décote
- 1-39   : Mauvais état, pièces détachées uniquement
- 0      : Non repris (IMEI bloqué, HS total, ou fraude manifeste détectée dans les photos)

Si l'état déclaré est en contradiction avec les photos (ex : "parfait" mais écran fissuré),
pénalise fortement le score et mentionne-le dans la justification.
```

**Config Gemini :** `responseMimeType: "application/json"` + `responseSchema` enforçant `score` (integer) et `justification` (string). Modèle : `gemini-2.0-flash` (déjà dans le stack, multimodal natif).

---

## 8. Design des services

### `services/trocEvaluationService.ts`

```typescript
// Vérification IMEI via Edge Function Supabase
export const checkImei = async (
  imei: string
): Promise<{ status: 'clean' | 'blacklisted' | 'check_failed'; raw: unknown }>

// Évaluation Gemini Vision
// Définie dans geminiService.ts, ré-exportée ici pour centraliser
export const evaluateDeviceWithVision = async (
  photos: File[],
  deviceInfo: {
    brand: string; model: string; storage?: string; ram?: string;
    batteryHealth: number; screenCondition: string;
    bodyCondition: string; accessories: string[];
  }
): Promise<{ score: number; justification: string }>

// Persistance Supabase
export const saveTradeInRequest = async (
  formData: TrocDeviceForm,
  photoUrls: string[],
  evaluation: TrocEvaluationResult,
  imeiStatus: TradeInRequest['imei_status']
): Promise<{ id: string; voucherReference: string }>

// Génération référence bon de troc
export const generateVoucherReference = (requestId: string): string
// Format : 'TROC-2026-00042' (compteur séquentiel depuis DB ou timestamp)
```

---

## 9. Hook useTradeIn — machine d'état

### États possibles

```
'form' → 'photos' → 'imei' → 'evaluating' → 'result' → 'voucher'
                                                ↓
                                           (refus) → 'form'
```

### Interface

```typescript
type TrocStep = 'form' | 'photos' | 'imei' | 'evaluating' | 'result' | 'voucher';

interface UseTradeInReturn {
  // État
  step: TrocStep;
  form: TrocDeviceForm;
  photos: File[];
  photoUrls: string[];
  imeiStatus: TradeInRequest['imei_status'];
  result: TrocEvaluationResult | null;
  savedRequest: TradeInRequest | null;
  tradeInModels: TradeInModel[];

  // Chargement
  isUploading: boolean;
  isCheckingImei: boolean;
  isEvaluating: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Actions
  updateForm: (partial: Partial<TrocDeviceForm>) => void;
  updatePhotos: (files: File[]) => void;
  goToPhotos: () => void;              // form → photos (valide le form)
  goToImei: () => Promise<void>;       // photos → imei (upload Cloudinary)
  checkImei: () => Promise<void>;      // appelle Edge Function IMEI
  skipImei: () => void;                // imei_status = 'not_checked', continue
  runEvaluation: () => Promise<void>;  // imei → evaluating → result
  acceptCash: () => Promise<void>;     // persistance + voucher
  acceptCredit: () => Promise<void>;   // persistance + voucher
  refuse: () => void;                  // status = 'refused', reset → form
  reset: () => void;
}
```

---

## 10. Composants UI

### `TrocStepper.tsx`
- Props : `currentStep: number`, `totalSteps: number`, `labels: string[]`
- Pur présentationnel, barre de progression visuelle

### `SmartTrocForm.tsx`
- Props : `form`, `onChange`, `onNext`, `tradeInModels`
- Combobox marque/modèle (autocomplétion depuis `trade_in_models`, saisie libre sinon)
- Slider batterie 0–100 %
- Checkboxes accessoires
- Valide avant `onNext`

### `PhotoUploader.tsx`
- Props : `photos`, `onPhotosChange`, `maxPhotos` (défaut 4), `isUploading`
- Drag-and-drop + clic, previews avec bouton suppression
- Spinner pendant upload Cloudinary

### `ImeiChecker.tsx`
- Props : `imei`, `onChange`, `imeiStatus`, `onCheck`, `isChecking`, `onSkip`
- Badges statut : 🟢 clean / 🔴 blacklisted / 🟠 check_failed / ⚪ not_checked
- Bouton "Passer cette étape" (imei_status = 'not_checked', flow continue)
- Si `check_failed` : bannière "Vérification manuelle requise en boutique"

### `EvaluationResult.tsx`
- Props : `result`, `deviceLabel`, `onAcceptCash`, `onAcceptCredit`, `onRefuse`, `isSubmitting`
- Jauge SVG animée (stroke-dashoffset piloté par le score)
- Badge couleur + texte justification Gemini
- 2 CTA : "Encaisser {offerCash} FCFA" / "Crédit boutique {offerCredit} FCFA (+10%)"
- Score rouge → message de refus doux + CTA WhatsApp

### `TrocVoucher.tsx`
- Props : `request`, `onPrint`, `onNewEvaluation`
- Référence bon (grosse, visible)
- Résumé offre acceptée, validité 30 jours
- Bouton impression → `trocVoucherGenerator.ts`

---

## 11. Edge Function IMEI

### `supabase/functions/check-imei/index.ts`

- Reçoit `{ imei: string }` en POST
- Appelle l'API IMEI côté serveur (clé jamais exposée au client)
- Options API : GSMA Device Check, imeicheck.org, checkmend.com, imeidb.com (tier gratuit)
- Retourne `{ status: 'clean' | 'blacklisted' | 'check_failed' }`
- En cas d'indisponibilité API → retourne `check_failed` proprement (ne bloque pas le flow)
- Pattern identique à la fonction `send-invoice` déjà en place

---

## 12. Intégration panel admin

### `components/admin/tabs/TrocTab.tsx`

Colonnes du tableau (miroir de `OrdersTab.tsx` avec `TableShell`) :

| Colonne | Contenu |
|---------|---------|
| Réf | `voucher_reference` ou `id` |
| Client | `customer_name` + `customer_phone` |
| Appareil | `device_brand device_model` |
| Score | Badge coloré `ai_score/100` |
| Offre cash | `offer_cash` FCFA |
| Statut | Badge `status` |
| Actions | Voir détail |

**Vue détail (side-panel ou modal) :**
- Miniatures photos cliquables
- Texte justification Gemini
- Badge statut IMEI
- Champ notes admin + boutons statut (Valider / Annuler / Compléter)

### `Sidebar.tsx` / `BottomNav.tsx`

```typescript
{ id: 'troc', label: 'Smart Troc', icon: ArrowLeftRight }
// Insérer après l'entrée 'argus'
```

### `AdminPanel.tsx`

1. Étendre le type `activeTab` avec `'troc'`
2. Instancier `const trocMgr = useTrocManager()`
3. Ajouter dans le renderer conditionnel : `{activeTab === 'troc' && <TrocTab ... />}`

### `hooks/admin/useAdminData.ts`

Ajouter une subscription realtime `INSERT` sur `trade_in_requests` :
```typescript
addNotification({
  type: 'order',
  message: `Nouvelle demande de troc — ${brand} ${model}`,
  linkToTab: 'troc'
})
```

---

## 13. Générateur de bon de troc

### `utils/trocVoucherGenerator.ts`

```typescript
export const generateTrocVoucherHTML = (request: TradeInRequest): string
```

Contenu du bon (HTML pour `window.print()`, même pattern que `invoiceGenerator.ts`) :
- Logo Xeption Network
- **Référence bon** (grande, stylée)
- Nom client + téléphone
- Appareil évalué
- Score IA + couleur
- Offre retenue (cash ou crédit)
- **Validité : 30 jours** à compter de la date d'évaluation
- Mention légale : *"Offre valable sous réserve de validation physique en boutique Xeption Network"*
- Référence QR-friendly pour scan en caisse

---

## 14. Monétisation

### Modèle A — Rachat direct (score ≥ 70)

Xeption achète l'appareil, le reconditionne, le revend avec marge.

### Modèle B — Crédit boutique (score 40–69)

L'utilisateur obtient un crédit valable 30 jours sur un achat en boutique.
Le bonus de 10% sur le crédit vs cash incite à rester dans l'écosystème Xeption.

### Modèle C — Pièces détachées (score 1–39)

Prix plancher, intéressant pour Xeption pour les pièces SAV.

### Calcul des offres

```
Base price : récupéré depuis trade_in_models.base_price
             → 0 si modèle non référencé (refus automatique + WhatsApp CTA)

offer_cash   = round_to_5000(base_price × coefficient_score)
offer_credit = round_to_5000(offer_cash × 1.10)

Coefficients :
  score 70–100 → base_price × (score/100 × 0.60)
  score 40–69  → base_price × (score/100 × 0.40)
  score 1–39   → base_price × 0.05
```

---

## 15. Ordre de construction — Méthodologie BDD + TDD

> **Principe :** on n'écrit jamais de code de production sans avoir d'abord un test qui échoue.  
> Chaque phase suit le cycle **RED → GREEN → REFACTOR**.
>
> - **BDD** (Behavior-Driven Development) : scénarios Given/When/Then qui décrivent le comportement métier attendu
> - **TDD** (Test-Driven Development) : tests unitaires écrits avant chaque fonction, les plus petits possible
> - **Mocks** : on remplace les dépendances externes (Gemini, Supabase, Cloudinary) par des fakes contrôlés

---

### Infrastructure de tests _(prérequis, fait une seule fois)_

- [x] Installer Vitest + @testing-library/react + jsdom
- [x] Créer `vitest.config.ts`
- [x] Créer `tests/setup.ts`
- [x] Ajouter scripts `test`, `test:watch`, `test:coverage` dans `package.json`

---

### Phase 1 — Fondations : types + pricing + DB

#### Étape 1.1 — Types TypeScript
> Pas de logique, pas de tests. Prérequis pour tout le reste.
- [x] `types.ts` — ajouter `TradeInRequest`, `TrocDeviceForm`, `TrocEvaluationResult`
- [x] `constants/dbSchema.ts` — ajouter constantes `TRADE_IN_REQUESTS`

#### Étape 1.2 — trocPricing.ts (TDD pur — fonctions pures, zéro dépendance externe)

**RED — écrire les tests d'abord :**
- [x] `tests/features/troc-scoring.feature.test.ts` — scénarios BDD couleurs (green/orange/red)
- [x] `tests/features/troc-pricing.feature.test.ts` — scénarios BDD offres FCFA
- [x] `tests/unit/trocPricing.test.ts` — 38 tests unitaires `roundTo5000`, `scoreToColor`, `computeOffer`

**GREEN — implémenter pour faire passer les tests :**
- [x] `utils/trocPricing.ts` — `roundTo5000()`, `scoreToColor()`, `computeOffer()`

**REFACTOR :**
- [x] Corriger les assertions `roundTo5000` incohérentes détectées par TDD
- [x] Ajuster l'assertion `offerCredit > offerCash` (arrondi peut égaliser les montants)

#### Étape 1.3 — Validation formulaire (BDD)

**RED :**
- [x] `tests/features/troc-form-validation.feature.test.ts` — champs obligatoires, format téléphone camerounais, santé batterie

**GREEN :**
- [x] Extraire `validateTrocForm()` dans `utils/trocFormValidation.ts` depuis les tests

#### Étape 1.4 — Base de données
- [x] SQL `CREATE TABLE trade_in_requests` généré dans `supabase/migrations/trade_in_requests.sql`
- [x] Exécuter le SQL dans Supabase Dashboard

---

### Phase 2 — Services : IMEI + Gemini + persistance

> Les services appellent des APIs externes → on utilise des **mocks** (`vi.mock()`).  
> Règle : on mocke aux frontières (Gemini API, Supabase, Cloudinary), jamais le code métier.

#### Étape 2.1 — checkImei() (Edge Function proxy)

**RED :**
- [x] `tests/features/troc-imei.feature.test.ts` — activer les scénarios IMEI (clean / blacklisted / check_failed / format invalide)
- [x] `tests/unit/trocEvaluationService.test.ts` — mock `supabase.functions.invoke`

```typescript
// Exemple de mock Supabase Edge Function
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}))

// Dans le test :
vi.mocked(supabase.functions.invoke).mockResolvedValue({
  data: { status: 'clean' }, error: null
})
```

**GREEN :**
- [x] `supabase/functions/check-imei/index.ts` — Edge Function (imei24.com free tier, clé via secret IMEI_API_KEY)
- [x] `services/trocEvaluationService.ts` — implémenter `checkImei()`

#### Étape 2.2 — evaluateDeviceWithVision() (Gemini Vision)

**RED :**
- [x] `tests/unit/trocEvaluationService.test.ts` — ajouter scénarios Gemini avec mock :

```typescript
// Mock du module Gemini
vi.mock('../../services/geminiService', () => ({
  evaluateDeviceWithVision: vi.fn()
}))

// Scenario : IMEI blacklisté → Gemini ne doit PAS être appelé
it('Given IMEI blacklisté, Then Gemini ne doit pas être appelé', async () => {
  mockCheckImei.mockResolvedValue({ status: 'blacklisted' })
  await evaluateDevice(form, photos, 'blacklisted')
  expect(mockGemini).not.toHaveBeenCalled()
})

// Scenario : Gemini renvoie JSON invalide → erreur propre
it('Given Gemini plante, Then une erreur propre est propagée', async () => {
  mockGemini.mockRejectedValue(new Error('API unavailable'))
  await expect(evaluateDevice(form, photos, 'clean')).rejects.toThrow()
})
```

**GREEN :**
- [x] `services/geminiService.ts` — ajouter `evaluateDeviceWithVision()`
- [x] `services/trocEvaluationService.ts` — implémenter `evaluateDevice()`

#### Étape 2.3 — saveTradeInRequest() (persistance Supabase)

**RED :**
- [x] `tests/unit/trocEvaluationService.test.ts` — ajouter scénarios persistance avec mock Supabase :

```typescript
// Mock Supabase insert
vi.mocked(supabase.from).mockReturnValue({
  insert: vi.fn().mockResolvedValue({ data: [{ id: 'TRC-123', voucher_reference: 'TROC-2026-00001' }], error: null })
})

// Scenario : sauvegarde avec les bons champs
it('Given évaluation score=80, When je sauvegarde, Then insert est appelé avec offer_type="buyback"', async () => {
  const result = await saveTradeInRequest(form, photoUrls, evaluation, 'clean')
  expect(insertMock).toHaveBeenCalledWith(
    expect.objectContaining({ offer_type: 'buyback', ai_score: 80 })
  )
})
```

**GREEN :**
- [x] `services/trocEvaluationService.ts` — implémenter `saveTradeInRequest()`

---

### Phase 3 — Hook : useTradeIn (machine d'état)

> Le hook orchestre les services — on mock tous les services, on teste les transitions d'état.

**RED :**
- [x] `tests/unit/useTradeIn.test.ts` — tester la machine d'état avec `renderHook` :

```typescript
// Mock tous les services
vi.mock('../../services/trocEvaluationService')

// Scenario : transition form → photos
it('Given formulaire valide, When goToPhotos(), Then step passe à "photos"', async () => {
  const { result } = renderHook(() => useTradeIn())
  act(() => result.current.updateForm(validForm))
  act(() => result.current.goToPhotos())
  expect(result.current.step).toBe('photos')
})

// Scenario : IMEI blacklisté bloque l'évaluation
it('Given IMEI blacklisté, When runEvaluation(), Then offerType="refused" sans appel Gemini', async () => {
  mockCheckImei.mockResolvedValue({ status: 'blacklisted' })
  // ...
})

// Scenario : erreur Gemini → état d'erreur visible
it('Given Gemini échoue, Then error est non null et step reste "imei"', async () => {
  mockGemini.mockRejectedValue(new Error('timeout'))
  // ...
})
```

**GREEN :**
- [x] `hooks/useTradeIn.ts` — implémenter la machine d'état complète

---

### Phase 4 — Composants UI

> Tests de rendu et d'interaction avec @testing-library/react.  
> On teste le comportement visible, pas l'implémentation interne.

**RED (par composant) :**

- [ ] `tests/components/SmartTrocForm.test.tsx`
```typescript
// Scenario : bouton "Continuer" désactivé si champs manquants
it('Given champs vides, Then bouton "Continuer" est désactivé', () => {
  render(<SmartTrocForm ... />)
  expect(screen.getByRole('button', { name: /continuer/i })).toBeDisabled()
})
```

- [ ] `tests/components/ImeiChecker.test.tsx`
```typescript
// Scenario : badge vert si statut clean
it('Given imeiStatus="clean", Then badge vert est affiché', () => {
  render(<ImeiChecker imeiStatus="clean" ... />)
  expect(screen.getByText(/vérifié/i)).toBeInTheDocument()
})
```

- [ ] `tests/components/EvaluationResult.test.tsx`
```typescript
// Scenario : score rouge → bouton cash absent (refus)
it('Given score=15 (rouge), Then bouton "Encaisser" est absent', () => {
  render(<EvaluationResult result={{ scoreColor: 'red', offerType: 'spare_parts', offerCash: 5000 }} ... />)
  expect(screen.queryByRole('button', { name: /encaisser/i })).not.toBeInTheDocument()
})
```

**RED :**
- [x] `tests/components/TrocStepper.test.tsx` — 3 tests step active/completed
- [x] `tests/components/SmartTrocForm.test.tsx` — 7 tests form validation & interactions
- [x] `tests/components/PhotoUploader.test.tsx` — 7 tests photo count, limit, spinner
- [x] `tests/components/ImeiChecker.test.tsx` — 8 tests status badges (clean/blacklisted/check_failed)
- [x] `tests/components/EvaluationResult.test.tsx` — 9 tests score display, offer buttons, refused state
- [x] `tests/components/TrocVoucher.test.tsx` — 8 tests voucher reference, 30-day validity, print

**GREEN :**
- [x] Implémenter chaque composant pour faire passer ses tests
- [x] `TrocStepper.tsx`, `SmartTrocForm.tsx`, `PhotoUploader.tsx`, `ImeiChecker.tsx`
- [x] `EvaluationResult.tsx`, `TrocVoucher.tsx`
- [x] Câbler dans `pages/TrocPage.tsx`

**Résultat :** 42 tests composants ✅ GREEN — 178 tests totaux au vert

---

### Phase 5 — Admin

**RED :**
- [x] `tests/unit/useTrocManager.test.ts` — 17 tests : fetch, filtres, recherche, updateStatus avec mock Supabase
- [x] `tests/components/TrocTab.test.tsx` — 11 tests : tableau, badge score, filtres, search, actions

**GREEN :**
- [x] `hooks/admin/useTrocManager.ts` — fetch, filter, search, updateStatus, realtime channel
- [x] `components/admin/tabs/TrocTab.tsx` — tableau admin, filtre statut, recherche, actions Valider/Terminer
- [x] Modifier `Sidebar.tsx` — ajout item "Smart Troc" (ArrowLeftRight icon)
- [x] Modifier `BottomNav.tsx` — ajout item "Troc"
- [x] Modifier `AdminPanel.tsx` — import + hook + tab router
- [x] Modifier `hooks/admin/useAdminData.ts` — subscription realtime trade_in_requests → notif "Nouvelle Demande Troc"

**Résultat :** 28 tests Phase 5 ✅ GREEN — 206 tests totaux au vert

---

### Phase 6 — Finalisation & tests E2E

- [x] `components/TrocSection.tsx` — ancien simulateur A/B/C/D supprimé, CTA pointe vers `/troc`
- [x] `tests/e2e/smartTroc.e2e.test.tsx` — 11 tests E2E : form → photos → IMEI skip → évaluation → résultat → bon + flow refus
- [x] Couverture globale : **95.74% statements** — objectif ≥ 80% ✅

**Résultat final : 217/217 tests au vert — 16 fichiers de tests**

---

### Récapitulatif des fichiers de tests à créer

```
tests/
  setup.ts                                         ✅ fait
  features/
    troc-scoring.feature.test.ts                   ✅ fait (RED→GREEN)
    troc-pricing.feature.test.ts                   ✅ fait (RED→GREEN)
    troc-imei.feature.test.ts                      ✅ fait (placeholders actifs en Phase 2)
    troc-form-validation.feature.test.ts           ✅ fait (RED→GREEN)
  unit/
    trocPricing.test.ts                            ✅ fait (RED→GREEN→REFACTOR)
    trocEvaluationService.test.ts                  ✅ fait (RED→GREEN)
    useTradeIn.test.ts                             ✅ fait (RED→GREEN)
    useTrocManager.test.ts                         ⬜ Phase 5
  components/
    TrocStepper.test.tsx                           ✅ fait (RED→GREEN)
    SmartTrocForm.test.tsx                         ✅ fait (RED→GREEN)
    PhotoUploader.test.tsx                         ✅ fait (RED→GREEN)
    ImeiChecker.test.tsx                           ✅ fait (RED→GREEN)
    EvaluationResult.test.tsx                      ✅ fait (RED→GREEN)
    TrocVoucher.test.tsx                           ✅ fait (RED→GREEN)
    TrocTab.test.tsx                               ⬜ Phase 5
```

---

## 16. Décisions d'architecture

| Décision | Raison |
|----------|--------|
| **Gemini Vision** (pas GPT-4o) | Déjà dans le stack, multimodal natif, coût minimal |
| **Photos en base64 avant Cloudinary** | Les `File` sont en mémoire dans le hook — évite un double RTT réseau pour envoyer à Gemini |
| **Edge Function pour IMEI** | La clé API ne peut pas être côté client — même pattern que `send-invoice` déjà en place |
| **`check_failed` non bloquant** | Si l'API IMEI est indisponible, le flow continue avec mention "vérification manuelle" — aucune friction inutile |
| **Cloudinary** (pas Supabase Storage) | `uploadService.ts` déjà établi et fonctionnel — ne pas dévier sans gain |
| **Score 0–100** (pas grades A/B/C) | Plus nuancé, piloté directement par Gemini, les grades deviennent une vue dérivée |
| **`offer_credit = cash × 1.10`** | Stocké en DB au moment de l'évaluation — immunisé aux futurs changements de règle |
| **Pas de Redux/Zustand** | Cohérent avec l'existant — hooks custom suffisent pour ce scope |
| **RLS `anon INSERT`** | Le troc est public (pas d'auth requise) — staff only pour read/update |
