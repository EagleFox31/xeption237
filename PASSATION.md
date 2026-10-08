# PASSATION — Xeption 237
> Dernière mise à jour : 2026-10-03

## Objectif en cours
Pousser tout le travail local sur GitHub pour reprendre sur une autre machine.

## Fait
- CTA "Laisser un avis sur Google" ajouté post-commande et post-bon Troc
  - `components/Checkout.tsx:1347` — écran `renderSuccess()`
  - `components/troc/TrocVoucher.tsx:619` — avant "Nouvelle estimation"
  - Lien : `https://g.page/r/CSff_llXZOOuEAI/review`
- Tout le WIP local commité et pushé sur 5 branches GitHub :

| Branche | Contenu |
|---------|---------|
| `main` | Production stable |
| `feat/google-review-cta` | CTA avis Google ← **à merger en priorité** |
| `wip/troc-page-product-grid` | Refonte TrocPage + grille produits + media optimization |
| `wip/troc-multi-device-v1-gateway` | 1er scaffold gateway multi-device Troc |
| `wip/troc-multi-device-v2` | Refactor ImeiChecker + SmartTrocForm + useTradeIn |
| `wip/troc-multi-device-v3-clean` | Version la plus avancée — DeviceCategorySelector + PhoneTrocForm + engine architecture |

- Les stashs locaux ont été vidés (tous convertis en branches).

## Décisions prises
- **Place ID Google** : obtenu via GBP dashboard → lien court `g.page/r/...` (pas de conversion CID manuel, trop fragile).
- **CTA discret** : bordure or / fond or/10 — pas de plein or pour ne pas concurrencer le CTA principal.
- **Branches séparées** : `feat/` pour livrable, `wip/` pour travaux en cours — ne pas merger les `wip/` sans review.
- **Issue #19 (feedback loop)** : discutée, pas encore implémentée — template FEEDBACK_LOG.md à créer.

## Reste à faire
1. **Sur nouvelle machine** : `git clone https://github.com/EagleFox31/xeption237.git && npm install`
2. **Merger `feat/google-review-cta`** dans `main` (PR déjà créée sur GitHub)
3. **Choisir quelle branche `wip/troc-multi-device-*` continuer** — v3-clean est la plus avancée
4. **Issue #19** : créer `docs/engineering/FEEDBACK_LOG.md` avec template + premier exemple SMART TROC
3. **Étape 10 ERP** : RLS par rôle en base (`docs/next-step/ROADMAP_ERP.md` §10)
4. **Migration en attente** : `20260401_004_market_price_cache.sql` jamais appliquée

## Pièges / contexte
- **Repo** : `xeption237/` est le sous-dossier du monorepo — toujours faire `cd xeption237` avant git.
- **Remote** : `https://github.com/EagleFox31/xeption237.git`
- **Deploy Edge Functions** : `npx supabase functions deploy <nom> --project-ref tawnusmfyvugqczaydat --no-verify-jwt --use-api --workdir .`
- **Migrations** : `npm run db:apply -- supabase/migrations/xxx.sql` (jamais éditer une migration existante)
- **Build** : `npm run build` dans `xeption237/`
- **Tests** : `npm test`
- **Stack** : React 18 + Vite + TypeScript + Tailwind CDN + Supabase
- **Branche courante** : `wip/troc-multi-device-v3-clean` (machine de départ)
