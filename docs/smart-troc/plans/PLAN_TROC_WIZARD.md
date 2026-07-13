# Plan — Smart Troc Wizard

> **Objectif** : Remplacer le formulaire monolithique SmartTrocForm (540 lignes, ~20 champs)
> par un wizard 4 étapes — une idée par écran, navigation Suivant/Retour, validation locale.
> Même sortie → même backend, zéro changement DB.
>
> **Auteur** : Claude Code
> **Date** : 2026-06-11
> **Statut** : 🔄 En cours

---

## Pourquoi wizard et pas chatbot

- Collecte de données structurées → wizard, pas chat (NNG)
- Le chat est pertinent pour le support, pas pour les formulaires
- Un wizard a un indicateur de progression clair, une navigation retour, des groupes logiques

---

## Étapes du wizard (4 écrans)

| # | Titre | Champs |
|---|-------|--------|
| 1 | **Toi** | `customerName`, `customerPhone`, `customerEmail` (opt.) |
| 2 | **L'appareil** | `deviceBrand`, `deviceModel`, `acquisitionCondition`, `purchaseDate` (année) |
| 3 | **L'état** | `screenCondition`, `bodyCondition`, `batteryHealth` |
| 4 | **Ça marche ?** | `powersOn`, `hasWaterDamage` (blockers), `chargesNormally`, `biometricsWork` |

→ `onNext()` → étapes existantes : IMEI → Photos → Paiement → Résultat

---

## Architecture

### Fichier à créer

```
xeption237/components/troc/TrocWizard.tsx
```

- Props identiques à SmartTrocForm : `{ form, onChange, onNext, setBasePrice? }`
- State local : `wizardStep` (1–4)
- Mini stepper interne (4 bullets + label)
- Validation par step avant d'avancer
- Blockers détectés au step 4 : si powersOn=false ou hasWaterDamage=true → message d'arrêt

### Fichier à modifier

| Fichier | Changement |
|---------|-----------|
| `pages/TrocPage.tsx` | Remplacer `SmartTrocForm` par `TrocWizard`, supprimer le toggle chat |

### Fichiers non touchés

- `SmartTrocForm.tsx` — gardé mais plus utilisé dans le flow principal
- `TrocChatFlow.tsx` — gardé mais plus utilisé (dead code pour l'instant)
- `hooks/useTradeIn.ts` — aucun changement
- Tout le reste du flow (PhotoUploader, ImeiChecker…) — aucun changement

---

## UX par step

### Step 1 — Toi
- 2 champs texte (nom, téléphone) + 1 optionnel (email)
- Validation : nom ≥ 2 chars, téléphone camerounais valide

### Step 2 — L'appareil
- Marque : boutons rapides (7 marques) + input autocomplete
- Modèle : input + dropdown autocomplete Argus
- Acquisition : 2 boutons (Neuf / D'occasion)
- Année d'achat : boutons année (2019–2025 + Avant + Je sais pas)

### Step 3 — L'état
- Écran : 4 cartes visuelles avec label descriptif
- Boîtier : 4 cartes visuelles
- Batterie : slider avec label dynamique

### Step 4 — Ça marche ?
- 4 toggles Oui/Non : s'allume, dégâts d'eau, charge, biométrie
- Si powersOn=false ou hasWaterDamage=true : bannière rouge + bouton désactivé

---

## Checklist

- [ ] `TrocWizard.tsx` — composant 4 steps
- [ ] Stepper interne (bullets 1-4)
- [ ] Step 1 : identité + validation
- [ ] Step 2 : marque + modèle + acquisition + année
- [ ] Step 3 : état physique (cartes + slider)
- [ ] Step 4 : fonctionnement + blockers
- [ ] Intégration TrocPage (remplace SmartTrocForm, supprime toggle chat)

---

*Dernière mise à jour : 2026-06-11*
