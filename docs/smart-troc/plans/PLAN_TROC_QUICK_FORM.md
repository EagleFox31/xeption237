# Plan — Smart Troc Quick Form

> **Objectif** : Formulaire minimal — 3 champs + 1 question.
> L'IA fait le reste sur les photos.
>
> **Date** : 2026-06-11
> **Statut** : 🔄 En cours

## Flow

1. Nom + numéro + IMEI → "Vérifier"
2. IMEI check → marque + modèle auto-remplis
3. "Ça s'allume ?" → si non, blocker
4. "Passer aux photos" → goToPhotos()

Puis : Photos → (IMEI déjà fait, skip auto) → Paiement → Évaluation

## Fallback IMEI non reconnu
Si l'IMEI est valide mais le modèle inconnu → petit champ "Quel modèle ?" apparaît.
Si check_failed → message info + champ modèle obligatoire.
Si blacklisté → blocker dur.

## Fichiers
- Créer : `components/troc/TrocQuickForm.tsx`
- Modifier : `pages/TrocPage.tsx`
  - Toggle : SmartTrocForm (classique) vs TrocQuickForm (nouveau)
  - useEffect : si step==='imei' && imeiStatus==='valid' && useQuickForm → auto goToPayment()
