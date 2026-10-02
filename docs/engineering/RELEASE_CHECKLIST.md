# Checklist de release Xeption 237

> **Usage** : à exécuter avant chaque mise en prod. Objectif : zéro régression sur les flows critiques (SMART TROC, order, paiement, admin).
> Durée totale : **~20 minutes** si tout est vert. En cas de rouge → correction + redémarrage de la checklist.

## 1. Pré-release — code

- [ ] Branche à jour avec `main` (pas de divergence)
- [ ] Pas de secrets commités (grep `.env` dans le diff final)
- [ ] Pas de `console.log` oublié dans du code non-service (`services/`, `utils/`) et pas de `debugger`
- [ ] CHANGELOG ou commit messages descriptifs (le CTO doit comprendre le diff en 30s)

## 2. Tests automatiques

```bash
npm test                            # Vitest full → doit être 100% vert
npm test -- troc                    # Focus SMART TROC
npm test -- integration             # Tests d'intégration (atomic sales, etc.)
```

- [ ] **Suite Vitest full passe à 100%**
- [ ] Pas de test skipped non-justifié (`.skip` ou `.todo`) ajouté dans ce PR
- [ ] Coverage des fichiers touchés par le PR ≥ équivalent à avant

## 3. TypeScript

```bash
npx tsc --noEmit -p .
```

- [ ] Zéro erreur TypeScript dans le code applicatif (ignorer `vite.config.d.ts` et `node_modules`)
- [ ] Zéro `@ts-ignore` ajouté sans commentaire explicatif
- [ ] Zéro `as any` ajouté sans justification en commentaire

## 4. Build de production

```bash
npm run build
```

- [ ] Build réussit sans warning rouge
- [ ] Taille du bundle principal (`dist/assets/*.js`) < 1 Mo gzip (si > → investiguer `rollup-plugin-visualizer`)
- [ ] Les routes lazy-loadées (`React.lazy`) sont correctement scindées (pas de regression)

## 5. Migrations DB

Si le PR contient des migrations SQL :

- [ ] Migration **nommée avec la date ISO** (`YYYYMMDD_NNN_description.sql`)
- [ ] Migration **idempotente** (`IF NOT EXISTS`, `DROP ... IF EXISTS`, `CREATE OR REPLACE`)
- [ ] Migration **enveloppée** dans `BEGIN; ... COMMIT;`
- [ ] Testée en local avant push : `npm run db:apply -- supabase/migrations/<nouveau>.sql`
- [ ] Si touche la RLS → la policy est validée manuellement avec un JWT de rôle non-staff (voir `AUDIT_BD_SECURITE_2026-08-21.md`)
- [ ] Si touche un trigger → le trigger est **non-bloquant** (encapsulé `BEGIN/EXCEPTION`) pour les flows où une erreur de notification ne doit pas rollback la transaction métier (contrat `NOTIFICATIONS.md`)

## 6. Edge Functions

Si le PR touche à `supabase/functions/` :

- [ ] Déploiement avec la commande projet exacte (cf. `AGENTS.md` §140) :
  ```
  npx supabase functions deploy <nom> --project-ref tawnusmfyvugqczaydat --no-verify-jwt --use-api --workdir .
  ```
- [ ] Variables d'env attendues (`CAMPAY_API_TOKEN`, etc.) présentes côté Supabase dashboard
- [ ] Test manuel de la fonction en prod (payload réel ou doublon)

## 7. Smoke test SMART TROC (OBLIGATOIRE)

**Suivre la checklist dédiée** : [`MOBILE_QA_SMART_TROC.md`](./MOBILE_QA_SMART_TROC.md) §3 (smoke test parcours critique, 10 min).

- [ ] Profile Android petit (360×640) : parcours complet OK
- [ ] GA4 Debug View : events SMART TROC reçus (`troc_start`, `troc_step_view`, `troc_payment_paid`)
- [ ] Aucune erreur rouge dans la console navigateur pendant le parcours

## 8. Smoke test commerce (OBLIGATOIRE)

- [ ] Homepage charge en < 3s sur mobile 4G simulé (DevTools Network throttling)
- [ ] Ajouter 1 produit au panier → total correct → checkout chargé
- [ ] Pas d'erreur sur `/shop`, `/product/*`
- [ ] Admin login + accès à `/admin` (si staff token valide)
- [ ] Pas de scroll horizontal sur homepage mobile

## 9. Observabilité post-déploiement (5 min après le push)

- [ ] Vérifier dans **Vercel Logs** qu'il n'y a pas de 500 explosant au boot
- [ ] GA4 Realtime : au moins 1 user actif après avoir visité la prod
- [ ] Supabase Dashboard → Logs : pas d'erreur RLS/policy massive

## 10. Rollback plan

- [ ] Le commit avant la release est identifié (hash noté quelque part)
- [ ] En cas de régression détectée dans l'heure → `git revert <hash>` + push + redeploy Vercel. Les migrations DB doivent être **réversibles** OU **additives uniquement** (voir §5).

---

## Automatisations futures (hors scope immédiat)

- **CI Vitest** (GitHub Actions) : block le merge si tests cassent
- **Lighthouse CI** mobile sur `/`, `/shop`, `/troc` : block si perf score < 70
- **Supabase diff** automatisé (`npm run db:verify`) dans la CI pour signaler les divergences

Ces automatisations transformeraient cette checklist en gate CI/CD. Pas encore en place car la team est petite et la convention projet est "manual gate pragmatique" pour l'instant.
