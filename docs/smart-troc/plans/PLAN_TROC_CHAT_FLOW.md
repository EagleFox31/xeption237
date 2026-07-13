# Plan — Troc Chat Flow (UX conversationnelle)

> **Objectif** : Remplacer le formulaire monolithique `SmartTrocForm` par un flow conversationnel
> scripté. Le bot pose les questions une par une, l'user répond via boutons/texte.
> Même données en sortie → zéro changement backend.
>
> **Auteur** : Claude Code
> **Date** : 2026-06-11
> **Statut** : 🔄 V2 en cours — chat intégral (photos + IMEI inline)

---

## Contexte

`SmartTrocForm.tsx` est un mur de ~20 champs sur un seul écran (543 lignes). C'est le principal
point d'abandon du flow Troc. L'objectif est de le rendre ludique et simple à suivre sans
toucher au backend.

---

## Ton et vocabulaire

- Chaleureux, direct, pas condescendant
- Phrases courtes — pas de discours
- Pas de jargon technique brut ("acquisitionCondition") → reformuler naturellement
- Pas d'argot non plus — accessible à tout le monde

## Script de conversation — ordre optimisé (blockers en premier)

| # | Message bot | Type | Champs `TrocDeviceForm` |
|---|-------------|------|------------------------|
| 1 | "Commençons par toi — ton nom et ton numéro." | Champs inline | `customerName`, `customerPhone`, `customerEmail` |
| 2 | "C'est quel téléphone ? La marque d'abord." | Boutons rapides | `deviceBrand` |
| 3 | "Le modèle exactement ?" | Texte + autocomplete | `deviceModel` |
| 4 | "Avant d'aller plus loin — il s'allume bien ? Pas de dégâts d'eau ?" | 2 toggles ⚡ BLOCKERS | `powersOn`, `hasWaterDamage` |
| 5 | "L'écran, il est dans quel état ?" | 4 boutons | `screenCondition` |
| 6 | "Le dos et les côtés ?" | 4 boutons | `bodyCondition` |
| 7 | "Stockage et RAM ? (si tu sais)" | 2 selectors + "Je sais pas" | `deviceStorage`, `deviceRam` |
| 8 | "Tu l'as eu neuf ou d'occasion ?" | 2 boutons | `acquisitionCondition` |
| 9 | "Tu te souviens à peu près quand tu l'as acheté ?" | Date + "Je ne sais pas" | `purchaseDate`, `purchaseDateUnknown` |
| 10 | "La batterie est à quel niveau ?" | Slider 0–100 % | `batteryHealth` |
| 11 | "Il se charge bien ? La biométrie marche ? Le compte Google/iCloud est retiré ?" | 3 toggles Oui/Non | `chargesNormally`, `biometricsWork`, `accountUnlocked` |
| 12 | "La caméra ? Des réparations déjà faites ?" | 2 selectors inline | `cameraCondition`, `previousRepairs` |
| 13 | "Dernière chose — t'as la boîte ou la facture ?" | Boutons multi-sélection | `hasOriginalBox`, `hasInvoice` |

→ CTA **"C'est bon. On passe aux photos →"**

### Règles de blocage

- Étape 4 : `powersOn === false` → bulle rouge + flow stoppé (avant de remplir l'état physique)
- Étape 4 : `hasWaterDamage === true` → bulle rouge + flow stoppé
- Étape 11 : `accountUnlocked === false` → bulle ambre (non bloquant, on continue)

---

## Architecture

### Fichiers à créer

```
xeption237/components/troc/chat/
  TrocChatFlow.tsx        — orchestrateur principal, remplace SmartTrocForm
  ChatBubble.tsx          — bulle de message (bot à gauche, user à droite)
  ChatQuickReply.tsx      — rangée de boutons réponse
  ChatTextInput.tsx       — champ texte + autocomplete (marque / modèle)
  ChatInlineFields.tsx    — 2+ champs côte à côte dans une bulle (nom+tel, stockage+RAM)
```

### Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `pages/TrocPage.tsx` | Ajouter un toggle bouton "Essayer le nouveau flow" — les deux coexistent, `SmartTrocForm` reste par défaut |

### Fichiers non touchés

- `hooks/useTradeIn.ts` — aucun changement
- `supabase/functions/*` — aucun changement
- `components/troc/PhotoUploader.tsx`, `ImeiChecker.tsx`, `TierSelector.tsx`, `EvaluationResult.tsx`, `TrocVoucher.tsx` — aucun changement
- `TrocStepper.tsx` — aucun changement
- `types.ts` — aucun changement

---

## Comportement UX

- Chaque nouvelle question bot apparaît avec un **typing indicator** (3 points animés, ~600ms) puis fade-in
- La réponse de l'user s'affiche en **bulle dorée à droite** → question suivante s'enchaîne automatiquement
- Les réponses précédentes restent visibles mais **grisées** (historique de la conversation visible)
- **Auto-scroll** vers le bas à chaque nouveau message
- Blocker détecté → bulle rouge + flow stoppé
- Le bouton CTA final n'apparaît qu'au **dernier message** validé

---

## Interface du composant principal

```tsx
// TrocChatFlow.tsx — même interface que SmartTrocForm, drop-in replacement
interface TrocChatFlowProps {
  form: TrocDeviceForm;
  onChange: (form: TrocDeviceForm) => void;
  onNext: () => void;
  setBasePrice?: (price: number) => void;
}
```

---

## Checklist d'implémentation

### Sous-composants

- [x] `ChatBubble.tsx` — bulle bot (gauche, fond blanc/5) + bulle user (droite, fond gold/20)
- [x] `ChatQuickReply.tsx` — rangée de boutons, sélection met le bouton en gold et enchaîne (inline dans TrocChatFlow)
- [x] `ChatTextInput.tsx` — input texte + dropdown autocomplete (inline dans TrocChatFlow)
- [x] `ChatInlineFields.tsx` — layout 2 colonnes pour les doubles champs dans une même bulle (inline dans TrocChatFlow)

### Orchestrateur

- [x] `TrocChatFlow.tsx` — state machine : `stepIndex`, `history[]`, `isTyping`, `blocked`
- [x] Script des 13 steps défini comme tableau de configuration (`BOT_MESSAGES` + `STEP_ORDER`)
- [x] Logique de blockers (powersOn, hasWaterDamage) — stop au step 4 avec bulle rouge
- [x] Logique de notice info (accountUnlocked) — bulle ambre non bloquante step 11
- [x] Auto-scroll `useEffect` sur chaque nouveau message
- [x] Typing indicator (3 dots animés avant chaque message bot, délai 700ms)
- [x] Bulle de récap finale + bouton "Ajouter les photos →"

### Intégration

- [x] Toggle "Nouveau flow ✨" / "Formulaire classique" dans `pages/TrocPage.tsx` (step form uniquement)
- [x] `SmartTrocForm` reste par défaut — `TrocChatFlow` accessible via le toggle
- [ ] Test visuel complet du flow (happy path + blocker)
- [ ] Test sur mobile 360px

---

## Estimation

| Tâche | Durée |
|-------|-------|
| Sous-composants chat (4 fichiers) | ~2h |
| `TrocChatFlow.tsx` orchestrateur + script 13 steps | ~2h |
| Intégration `TrocPage` + tests visuels | ~1h |
| **Total** | **~5h** |

---

## Compatibilité stash multi-device

Le stash `wip smart troc multi-device` a extrait `SmartTrocForm` → `forms/PhoneTrocForm.tsx`.
`TrocChatFlow` peut remplacer `PhoneTrocForm` directement si le stash est un jour repris.
L'architecture engine (`phoneEngine`, `resolveTradeInEngine`) reste compatible.

---

*Dernière mise à jour : 2026-06-11*
