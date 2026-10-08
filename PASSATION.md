# PASSATION — Xeption 237
> Dernière mise à jour : 2026-10-08

## Objectif en cours
Finaliser le tracking GTM/GA4 (events Troc alignés) et cadrer le chantier marketplace C2C.

## Fait (cette session)
- `utils/analytics.ts` — helper `pushEvent()` centralisé (dataLayer)
- `pages/TrocPage.tsx:142-150` — ajout events `troc_start` (mount) + `troc_choice` (sélection device)
- `pages/TrocPage.tsx:178-190` — corrigé `troc_step_view` (event unique + param `troc_step`, au lieu de 7 events séparés qui ne matchaient aucun trigger GTM)
- `hooks/useTradeIn.ts` — events métier : `troc_photos_uploaded`, `troc_imei_checked`, `troc_payment_initiated`, `troc_payment_paid`, `troc_result_shown`, `troc_offer_accepted`, `troc_offer_refused`, `troc_voucher_generated`
- `docs/engineering/MARKETPLACE_PLAN.md` — plan complet (concurrence CM, grading Backmarket, trust & safety, phasage V1→V3)
- Commit `e4f613f` sur `wip/troc-multi-device-v3-clean` (pas pushé)

## Décisions prises
- **GTM** : triggers nommés `troc_step_view` + variable `DL - troc_step` → on envoie UN event avec paramètre, pas 7 events distincts. Idem pour `troc_choice` (variable `DL - troc_choice`)
- **Flux GA4 `G-50XP8798T1`** appartient bien à la propriété `xeption-app` (517083441), il était juste mal nommé `adacorp-edu`. Le boss a renommé en `xeption` → config GTM n'a pas besoin d'être changée
- **Compte GA4 à utiliser** : `jlawrynn` (377238101) → propriété `xeption-app`. Le compte `Xeption Network` (256936160) n'a que Facebook/mariagecheck/storybrain, pas pertinent
- **Marketplace V1** : contact WhatsApp direct (comme CoinAfrique), escrow repoussé en V2
- **Marketplace différenciation** : IMEI vérifié + grading uniforme — aucun concurrent CM ne le fait

## Reste à faire
1. ~~Pousser `wip/troc-multi-device-v3-clean`~~ — fait (b9fa2a7)
2. Vérifier dans GTM Preview que les events `troc_*` arrivent bien côté GA4 Realtime — à faire après merge dans main
3. Événements `marketplace_*` (6 triggers GTM) : dormants, à activer quand la feature marketplace démarre
4. Discuter MARKETPLACE_PLAN.md avec le boss — 6 arbitrages listés section 9 (modèle transac, commission, positionnement, modération, KYC, nom)
5. ~~Deploy edge function `product-catalog`~~ — fait (2026-10-08)
6. **PR #1 "Release: paid Xeption scope without ERP"** — en attente paiement boss. 1/2 checks CI fail (pas de `gh` CLI pour investiguer). Reprendre quand le boss valide le paiement.
7. Migration `20260401_004_market_price_cache.sql` — pas encore livrée, intentionnel
8. ~~Fichiers non commités~~ — fait (342a319)

## Pièges / contexte
- **Repo** : `xeption237/` est sous-dossier du monorepo `xeption-app/` — toujours `git` depuis `xeption237/`
- **Remote** : `https://github.com/EagleFox31/xeption237.git`
- **Branche courante** : `wip/troc-multi-device-v3-clean`
- **GTM** : conteneur `GTM-TQ9JZ5DF`, compte Xeption `6378376268`
- **GA4** : propriété `xeption-app` (517083441), flux `G-50XP8798T1` renommé `xeption`
- **Vérifier GTM preview** : `tagmanager.google.com` → Prévisualiser → ouvrir site → faire action Troc → GA4 Realtime
- **Deploy EF** : `npx supabase functions deploy <nom> --project-ref tawnusmfyvugqczaydat --no-verify-jwt --use-api --workdir .`
- **Build** : `npm run build` dans `xeption237/`
- **Stack** : React 18 + Vite + TypeScript + Tailwind CDN + Supabase
- **AGENTS.md** à lire avant action non triviale (conventions xeption237)
- **Erreur TS pré-existante** `hooks/useTradeIn.ts:357` sur `evaluateDevice('valid', ...)` — pas liée au tracking, bug typage à part
