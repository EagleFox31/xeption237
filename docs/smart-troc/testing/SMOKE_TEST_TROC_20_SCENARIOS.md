# SMART TROC - 22 Scenarios de Test (20 + 2 guardrails business)

Date: 2026-04-01  
Portee: parcours `Appareil -> Photos -> IMEI -> Resultat -> Bon`

## Preconditions

1. Front en local lance: `npm run dev`
2. Fonctions edge deployees:
```powershell
supabase functions deploy check-imei --project-ref tawnusmfyvugqczaydat --no-verify-jwt --use-api --workdir .
supabase functions deploy save-trade-in --project-ref tawnusmfyvugqczaydat --no-verify-jwt --use-api --workdir .
```
3. Au moins 3 IMEI de test:
- IMEI valide et propre
- IMEI valide mais mismatch attendu
- IMEI invalide (checksum faux)
4. SQL de controle:
```sql
select id, created_at, device_brand, device_model, imei, imei_status, ai_score, offer_cash, offer_credit, offer_type, status
from trade_in_requests
order by created_at desc
limit 50;
```

## Scenarios

### S01 - Champs obligatoires appareil vides
1. Aller a `Appareil`
2. Laisser marque/modele vides
3. Cliquer `Suivant`
Resultat attendu:
- Blocage sur l'etape
- Messages de validation visibles

### S02 - Photos non chargees
1. Remplir `Appareil`
2. Aller a `Photos`
3. Ne charger aucune image
4. Cliquer `Suivant`
Resultat attendu:
- Blocage sur l'etape photos
- Message "au moins une photo"

### S03 - IMEI court (moins de 15)
1. Aller a `IMEI`
2. Saisir 14 chiffres
3. Cliquer `Verifier`
Resultat attendu:
- Erreur IMEI invalide
- Evaluation auto impossible

### S04 - IMEI 15 chiffres mais checksum faux
1. Saisir un IMEI 15 chiffres invalide
2. Cliquer `Verifier`
Resultat attendu:
- Statut `check_failed`
- Message demandant verification manuelle

### S05 - IMEI blackliste
1. Saisir IMEI blackliste de test
2. Cliquer `Verifier`
Resultat attendu:
- Statut rouge (blacklisted)
- Bouton `Lancer l'evaluation` desactive

### S06 - IMEI propre + provider match marque/modele
1. Saisir IMEI propre avec device info provider
2. Mettre la meme marque/modele dans le formulaire
3. Cliquer `Verifier`
Resultat attendu:
- `imeiStatus = not_blacklisted`
- `imeiMatchState = match`
- Evaluation auto active

### S07 - IMEI propre + provider mismatch
1. Saisir IMEI propre avec device info provider
2. Mettre une marque/modele differente
3. Cliquer `Verifier`
Resultat attendu:
- `imeiMatchState = mismatch`
- Message anti-fraude clair
- Evaluation auto desactivee

### S08 - Provider sans model + aucun historique TAC
1. Saisir IMEI propre dont provider renvoie `deviceInfo = null`
2. Pas d'historique TAC en base
3. Cliquer `Verifier`
Resultat attendu:
- Source = declared
- Etat = `not_verified`
- Evaluation auto desactivee

### S09 - Historique TAC faible (1-2 cas)
1. IMEI sans info provider
2. Historique TAC count < 3
3. Cliquer `Verifier`
Resultat attendu:
- Source = historical
- Message "evidence insuffisante"
- Evaluation auto desactivee

### S10 - Historique TAC fort (>=3) + match
1. IMEI sans info provider
2. Historique TAC count >= 3
3. Marque/modele declaree conforme
Resultat attendu:
- `imeiMatchState = match`
- Evaluation auto active

### S11 - Historique TAC fort (>=3) + mismatch
1. IMEI sans info provider
2. Historique TAC count >= 3
3. Marque/modele declaree differente
Resultat attendu:
- `imeiMatchState = mismatch`
- Blocage evaluation auto

### S12 - Utiliser le bouton Passer
1. Aller a `IMEI`
2. Cliquer `Passer`
Resultat attendu:
- Message verification manuelle
- Evaluation auto reste bloquee

### S13 - Forcer evaluation sans preuve
1. Rester en etat `mismatch` ou `not_verified`
2. Cliquer `Lancer l'evaluation`
Resultat attendu:
- Action refusee
- Message explicite anti-fraude

### S14 - Evaluation auto complete avec preuve OK
1. Obtenir etat `not_blacklisted + match`
2. Cliquer `Lancer l'evaluation`
Resultat attendu:
- Passage a l'etape `Resultat`
- Score + offre + justification affiches

### S15 - Mode IA desactive (fallback local)
1. `VITE_ENABLE_TROC_AI=false`
2. Lancer evaluation valide
Resultat attendu:
- Calcul effectue en mode heuristique local
- Aucun crash IA

### S16 - Mode IA active mais Gemini indisponible
1. `VITE_ENABLE_TROC_AI=true`
2. Provoquer echec Gemini (cle invalide/reseau)
3. Lancer evaluation
Resultat attendu:
- Fallback local automatique
- Resultat produit sans bloquer utilisateur

### S17 - Prix de base nul
1. Lancer une evaluation avec `basePrice = 0`
Resultat attendu:
- `offer_cash = 0`
- `offer_credit = 0`
- `offer_type = refused`

### S18 - Score vert (>=70)
1. Evaluation avec score >= 70
2. `basePrice > 0`
Resultat attendu:
- `offer_type = buyback`
- Arrondis corrects (pas de decimales incoherentes)

### S19 - Score orange et rouge
1. Cas score 40-69
2. Cas score 0-39
Resultat attendu:
- Orange -> `partial_credit`
- Rouge -> `spare_parts`

### S20 - Sauvegarde finale en base
1. Aller jusqu'a `Resultat`
2. Valider l'offre
Resultat attendu:
- `save-trade-in` renvoie un `id`
- Ligne inseree dans `trade_in_requests`
- Colonnes critiques renseignees (`imei_status`, `ai_score`, `offer_*`)

### S21 - Plafond d'offre (cap business)
1. Preparer un cas qui produirait une offre tres haute (score eleve + basePrice eleve).
2. Lancer l'evaluation puis valider.
Resultat attendu:
- L'offre finale ne depasse jamais le plafond configure (ex: `MAX_OFFER_XAF`).
- Si le brut depasse le plafond, le montant est coupe au plafond.
- Le comportement est trace dans les logs (cap applique).

### S22 - Validation manuelle au-dessus d'un seuil
1. Preparer un cas avec offre finale > seuil manuel (ex: `MANUAL_REVIEW_THRESHOLD_XAF`).
2. Valider l'offre.
Resultat attendu:
- Le dossier n'est pas traite en auto complet.
- Le statut passe en attente revue manuelle (ex: `pending_manual_review`) ou equivalent.
- Le voucher/paiement n'est pas finalise tant que la revue manuelle n'est pas faite.

## Requetes SQL de verification rapide

```sql
select id, imei, imei_status, device_brand, device_model, ai_score, offer_cash, offer_credit, offer_type, status, created_at
from trade_in_requests
order by created_at desc
limit 50;
```

```sql
select imei_status, count(*)
from trade_in_requests
group by imei_status
order by count(*) desc;
```

```sql
select offer_type, count(*), avg(ai_score)
from trade_in_requests
group by offer_type
order by count(*) desc;
```
