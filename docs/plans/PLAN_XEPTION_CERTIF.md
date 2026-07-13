# Plan — Xeption Certif

> **Objectif** : Ajout du flow "Vérifier un appareil" en parallèle du Smart Troc.
> Produit : IMEI check + certificat PDF/QR payant (300F).
>
> **Date** : 2026-06-11
> **Statut** : 🔄 En cours

---

## Architecture

### Entrée unique : sélection d'intention

Avant le choix du device, l'utilisateur choisit ce qu'il veut faire :

```
┌─────────────────────────┐   ┌─────────────────────────┐
│  TROQUER                │   │  VÉRIFIER               │
│  mon appareil           │   │  un appareil             │
│  Estimation IA + offre  │   │  IMEI · Blacklist ·      │
│  [Téléphone seul]       │   │  Certificat PDF          │
└─────────────────────────┘   └─────────────────────────┘
```

- **Troquer** → device type selection (existant) → Smart Troc flow (inchangé)
- **Vérifier** → `ImeiCertifFlow` directement (pas de device type, IMEI = device agnostic)

### State dans TrocPage

```tsx
intent: 'troc' | 'certif' | null   // null = sélection intention
selectedDeviceType: 'phone' | null  // uniquement pour 'troc'
```

---

## Flow "Vérifier" — 4 étapes

```
form → checking → payment → certificate
```

### Étape 1 : form
- Prénom
- Téléphone
- IMEI (avec le même hint *#06#)
- Bouton "Vérifier gratuitement" → lance le check

### Étape 2 : checking → résultat
- Spinner pendant le check
- Résultat : appareil identifié / blacklisté / non reconnu
- Si blacklisté → message bloquant (pas de certificat possible)
- Sinon → bouton "Obtenir le certificat — 300F"

### Étape 3 : payment
- Réutilise `TrocPayment` avec `initialPhone`
- Montant fixe : 300F (pas de choix de tier)
- Après paiement → lance le vrai check complet (ou utilise celui déjà fait)

### Étape 4 : certificate
- Affichage du certificat dans la page
- Bouton "Télécharger / Imprimer le PDF"
- QR code pointant vers une URL de vérification (ou encodé dans le PDF)
- Données : IMEI, marque/modèle, statut blacklist, date, référence paiement

---

## Fichiers

### Créer
- `components/certif/ImeiCertifFlow.tsx` — composant self-contained avec state interne
- `utils/certifGenerator.ts` — génère le HTML du certificat PDF (similaire à `tradeInVoucherGenerator.ts`)

### Modifier
- `pages/TrocPage.tsx`
  - Ajouter `intent: 'troc' | 'certif' | null`
  - Sélection d'intention avant device type
  - Brancher `ImeiCertifFlow` quand `intent === 'certif'`

### Réutiliser sans modification
- `TrocPayment.tsx` (paiement CamPay)
- `check-imei` edge function
- `create-payment` edge function
- `cameroonOperators.ts`

---

## Prix

| Produit | Prix |
|---|---|
| Check unique + certificat | 300F |
| Pack revendeur (10 checks) | 2 500F — à implémenter plus tard |

---

## Ce qu'on ne fait PAS dans ce sprint
- Pas de page dédiée `/certif` (tout dans TrocPage pour l'instant)
- Pas de pack revendeur (tunnel séparé, après validation)
- Pas de QR URL vérifiable en ligne (QR encode juste les données locales)
