# Plan — Paiement Smart Troc (OM / MOMO)

## Contexte

Avant de voir l'estimation de son appareil, le client paie **150 XAF** via Orange Money ou MTN Mobile Money.  
Ce montant filtre les curieux et valide l'intention sérieuse de venir en boutique.

---

## Provider : NotchPay

- Basé à Yaoundé, supporte OM + MOMO Cameroun natif
- API REST simple, webhook fiable
- Commission ~1.5% → sur 300 XAF ≈ 4-5 XAF de frais
- Secrets Supabase requis : `NOTCHPAY_PUBLIC_KEY`, `NOTCHPAY_PRIVATE_KEY`

---

## Flow complet

```
[1] Appareil  →  [2] Photos  →  [3] IMEI  →  [4] Paiement  →  [5] Résultat  →  [6] Bon
```

**Étape 4 — Paiement :**
1. Front appelle `create-payment` (edge function) avec `sessionKey` + montant
2. Edge function crée une transaction NotchPay → reçoit `payment_url` + `reference`
3. Front affiche : saisie numéro téléphone OM/MOMO + bouton "Payer 300 XAF"
4. NotchPay envoie USSD sur le téléphone du client
5. Client confirme sur son téléphone
6. NotchPay appelle `payment-webhook` (edge function)
7. Webhook écrit `payment_status = 'paid'` dans `troc_payments`
8. Front poll toutes les 3s → détecte `paid` → lance l'évaluation Gemini

---

## Architecture backend (Edge Functions)

### `create-payment`
- Reçoit : `{ sessionKey, phone, channel: 'om' | 'momo' }`
- Appelle `POST https://api.notchpay.co/payments/initialize`
- Crée une ligne dans `troc_payments` avec `status = 'pending'`
- Retourne : `{ reference, paymentUrl? }`

### `payment-webhook`
- Reçoit le callback NotchPay (POST signé)
- Vérifie la signature HMAC avec `NOTCHPAY_PRIVATE_KEY`
- Met à jour `troc_payments.status = 'paid'` + `paid_at`
- Non-bloquant pour l'évaluation (le front poll)

---

## DB — table `troc_payments`

```sql
CREATE TABLE troc_payments (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_key     TEXT NOT NULL,
  reference       TEXT NOT NULL UNIQUE,   -- référence NotchPay
  amount          INT NOT NULL DEFAULT 300,
  currency        TEXT NOT NULL DEFAULT 'XAF',
  channel         TEXT CHECK (channel IN ('om', 'momo', 'card')),
  phone           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  notchpay_status TEXT,                   -- statut brut retourné par NotchPay
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Front — nouveaux fichiers

| Fichier | Rôle |
|---|---|
| `components/troc/TrocPayment.tsx` | Écran paiement (saisie numéro + bouton + polling) |
| `hooks/useTradeIn.ts` | Ajout step `payment`, `goToPayment()`, `pollPayment()` |
| `services/trocEvaluationService.ts` | `createPayment()`, `getPaymentStatus()` |

---

## Gestion des cas limites

| Cas | Comportement |
|---|---|
| Client ne paie pas dans 10 min | `status = 'expired'`, bouton "Réessayer" |
| Paiement échoué (solde insuffisant) | Message clair + bouton "Changer de numéro" |
| Webhook reçu en double | `ON CONFLICT (reference) DO NOTHING` |
| Client rafraîchit la page | `sessionKey` dans sessionStorage → reprend au bon step |

---

## Secrets Supabase à configurer

```bash
supabase secrets set NOTCHPAY_PUBLIC_KEY=pk_xxxxxx
supabase secrets set NOTCHPAY_PRIVATE_KEY=sk_xxxxxx
```

---

## Ordre d'implémentation

1. Migration SQL `troc_payments`
2. Edge function `create-payment`
3. Edge function `payment-webhook`
4. `types.ts` + `trocEvaluationService.ts`
5. Composant `TrocPayment.tsx`
6. `useTradeIn.ts` + `TrocPage.tsx`
