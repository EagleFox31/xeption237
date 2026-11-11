# PASSATION — rapport journalier Telegram (daily digest)

## 2026-11-07 03:58 — Daily digest : migration, format Telegram, bouton Vu (branche claude/daily-digest-ca6b98)

- Livré (3 commits, rien poussé, rien déployé) : `supabase/migrations/20261107_001_notify_daily_digest.sql`
  (`notify_daily_digest(p_day)`, cron `daily-digest-evening` 19:00 UTC), `docs/adr/ADR-001-daily-digest-telegram.md`,
  `_shared/staffNotify.ts`, `_shared/staffNotifyChannels/telegram.ts`, `_shared/telegramDigestAck.ts`,
  `telegram-bot-entry/index.ts` (branche groupe), `services/notificationService.ts`, `tests/notify-daily-digest.test.ts`,
  docs NOTIFICATIONS / SECRETS_ET_VARIABLES / README.
- Preuves : `npx vitest run tests/notify-daily-digest.test.ts` + 5 suites voisines = 75/75 ; suite complète 611/612
  (1 échec préexistant `tests/staff-notification-actor.test.ts`, migration non touchée ; 9 suites React ne chargent pas
  car `react` absent du node_modules de ce worktree). `tsc --strict` OK sur les 3 modules `_shared`. **Deno absent** sur
  la machine : `deno check telegram-bot-entry/index.ts` non exécuté.
- À déployer (Anjl) : `npm run db:apply -- supabase/migrations/20261107_001_notify_daily_digest.sql` puis
  `select public.notify_daily_digest();` deux fois (N puis 0) ; `npx supabase functions deploy notify-staff` et
  `telegram-bot-entry` (`--project-ref tawnusmfyvugqczaydat --no-verify-jwt --use-api --workdir .`) ; si
  `TELEGRAM_EVENT_TYPES` est défini en prod, y ajouter `daily_digest`.
- Reste : commandes bot `/jour` et `/ventes`, relais WhatsApp (type à accepter côté Trigenys Notify).

## 2026-11-07 04:02 — Déployé en prod (migration + notify-staff + telegram-bot-entry)

- Migration `20261107_001_notify_daily_digest.sql` appliquée par Anjl via `db:apply` (Postgres direct), enregistrée dans
  `schema_migrations`. Vérifié en lecture : `notify_daily_digest` SECURITY DEFINER présent, `_format_xaf` présent,
  cron `daily-digest-evening` `0 19 * * *` actif. Aucun `daily_digest` encore inséré.
- Fonctions `notify-staff` et `telegram-bot-entry` déployées avec les flags projet (bundle incluant `telegramDigestAck.ts`).
- Reste à faire : double appel manuel `select public.notify_daily_digest();` (N puis 0), contrôle du rendu dans le groupe
  Telegram et du bouton Vu ; vérifier `TELEGRAM_EVENT_TYPES` en prod ; merger la branche dans le checkout principal.

## 2026-11-07 04:09 — Test prod du digest : OK

- `select public.notify_daily_digest()` → 3 (Mfoundi Mall, Olembe, Siège) puis 0 : idempotence confirmée.
- 3 lignes `admin_notifications` (`daily_digest.<CODE>.2026-11-07`, ~200 car.), 3 `notification_deliveries` telegram
  `sent_at` posé, `attempts=1`, `last_error` null : messages partis dans le groupe staff.
- À contrôler par Anjl dans Telegram : rendu multi-lignes et clic « ✅ Vu » (bouton retiré, `read_at` posé).
- Reste : merger `claude/daily-digest-ca6b98` dans le checkout principal ; `/jour`, `/ventes`, relais WhatsApp.

## 2026-11-09 09:15 — Reprise des rapports de caisse WhatsApp (backfill `store_cash_reports`)

- Export WhatsApp du groupe admin (zip de Anjl) → parseur déterministe, aucune donnée envoyée à un tiers.
  Nouveaux modules : `scripts/lib/whatsappExport.mjs` (découpage messages), `scripts/lib/cashReportText.mjs`
  (sections, montants, vendeurs, dettes), `scripts/lib/cashReportStoreResolver.mjs` (boutique via ligne
  « Boutique », sinon vote des opérateurs du staff, sinon `--author-map`), CLI `scripts/import-whatsapp-cash-reports.mjs`.
- Dry-run par défaut ; `--apply` = upsert idempotent sur UNIQUE(store_id, report_date) restreint à
  `source='whatsapp_backfill'` et `IS DISTINCT FROM` (second passage = zéro écriture ; saisies bot jamais écrasées).
- Dry-run final : 711 messages, 326 rapports, 271 prêts (MFOUNDI 126 j, OLEMBE 145 j), 19 doublons remplacés,
  36 en `conflict`, période 2026-05-21 → 2026-11-07. Fichiers de revue (JSON + CSV anonyme) dans le dossier `--out`.
- ⚠️ Décision Anjl : MFOUNDI du 14/10 au 06/11 (17 jours) + OLEMBE 23/06 ont **deux rapports par jour de deux
  auteurs** avec des chaînes de caisse différentes (ex. 44 500 → 71 000 vs 0 → 12 000) : deux caisses/points de
  vente ? Ces jours ne sont **pas importés** (statut `conflict`) tant que la règle n'est pas fixée (second store ? priorité à un auteur ?).
- Migration locale **non appliquée** : `supabase/migrations/20261109_001_store_cash_reports_source.sql`
  (colonnes `source` default 'bot', `source_ref`, CHECK). Ordre : `npm run db:apply -- <fichier>` puis
  `node scripts/import-whatsapp-cash-reports.mjs <export.txt> --apply`.
- Fix partagé `parseAmount` (« 243,000 » = 243 000) dans `_shared/telegramCashReport.ts` → **redéployer
  `telegram-bot-entry`** pour que le bot en profite. Tests : `tests/whatsapp-cash-import.test.ts` (10 verts).
- Avertissements restants (revue, non bloquants) : balance_mismatch 93 (arithmétique des rapports eux-mêmes),
  inflow_total_mismatch 61, outflow_total_mismatch 33, debt_line_unparsed 25, inflow_line_unparsed 15.
- Rien poussé, rien déployé, aucune écriture en base.

## 2026-11-09 09:40 — Migration appliquée ; conflits MFOUNDI = deux caisses

- Anjl a appliqué `20261109_001_store_cash_reports_source.sql` (db:apply OK, enregistrée). Import `--apply` pas encore lancé.
- Les 36 rapports en `conflict` ne sont pas des doublons : ligne « Boutique MF 1092 » (une caisse, 1-2 opérateurs,
  chaîne de solde continue 12 000 → 11 000 → 19 000 …) vs « Boutique mfoundi mall » (3 opérateurs, autre chaîne).
  Résolus tous deux sur MFOUNDI (opérateurs/auteur). Décision attendue : créer une boutique « MF 1092 » dans `stores`
  (le resolver la reconnaîtra par le token « 1092 ») puis relancer le dry-run, sinon laisser ces jours de côté.
- Quelques totaux d'entrées aberrants (> 10 M) dans ces rapports = lignes mal lues, déjà signalées `inflow_total_mismatch`, à revoir dans le CSV.

## 2026-11-09 09:41 — Boutique MF 1092 : migration écrite, à appliquer par Anjl

- Décision Anjl : créer la seconde caisse du Mfoundi Mall dans `stores`. Migration
  `supabase/migrations/20261109_002_store_mf_1092.sql` (code `MF1092`, nom « MF 1092 », idempotente).
  Le nom ne contient pas « Mfoundi » : sinon la ligne « Boutique mfoundi mall » deviendrait ambiguë
  pour le resolver (deux boutiques touchées → aucune). Test ajouté (`tests/whatsapp-cash-import.test.ts`, 11 verts).
- **Non appliquée** : `db:apply` refusé en mode auto (écriture prod). Anjl l'applique, puis relance le dry-run,
  puis `--apply`, puis un second `--apply` (doit écrire 0 ligne).
- Simulation sur le dernier JSON de revue : les 36 `conflict` se répartissent MF1092 18 / MFOUNDI 16 / OLEMBE 2.
  Restent en double le même jour : OLEMBE 2026-06-23 (vrai conflit, laissé de côté), MFOUNDI 2026-10-30 et
  2026-11-04, MF1092 2026-10-30 (même auteur → la déduplication normale tranchera au dry-run).

## 2026-11-09 09:50 — MF 1092 appliquée, dry-run OK, bug TDZ corrigé, `--apply` à relancer

- Anjl a appliqué `20261109_002_store_mf_1092.sql`. Dry-run : 326 rapports, MF1092 19 j / MFOUNDI 139 j /
  OLEMBE 145 j, ready=303, superseded=19, **conflict=4** (était 36).
- Premier `--apply` planté : `UPSERT_SQL` déclaré après le flux module-level (TDZ). Corrigé (constante
  remontée), `node --check` + 11 tests verts, dry-run identique. Entrée ERRORS_LOG ajoutée.
- `--apply` non relancé par la session (écriture prod refusée en mode auto) : Anjl relance deux fois,
  la seconde doit donner `0 créés, 0 mis à jour`.

## 2026-11-09 10:01 — Backfill WhatsApp importé en prod (303 rapports)

- `--apply` lancé par Anjl : **303 créés, 0 mis à jour, 0 protégés**. Vérifié en base (lecture seule) :
  MF1092 19 (14/10 → 06/11), MFOUNDI 139 (26/05 → 07/11), OLEMBE 145 (21/05 → 06/11), tous `source=whatsapp_backfill` ;
  la seule ligne `bot` (siège, 23/10) intacte ; 0 doublon (store, date).
- Second `--apply` (preuve zéro écriture) **pas encore lancé** : attendu `0 créés, 0 mis à jour, 303 inchangés`.
- Laissés de côté : 4 `conflict` (OLEMBE 23/06 ×2, MFOUNDI 30/10 et 04/11 double saisie même auteur, cf. CSV
  `%TEMP%\xeption-whatsapp-cash-import\whatsapp-cash-reports-review.csv`), 19 `superseded` (normal).
- Reste pour Anjl : redéployer `telegram-bot-entry` (fix parseAmount), relire les `inflow_total_mismatch` > 10 M
  dans le CSV, fusionner `claude/daily-digest-ca6b98` dans main. Rien poussé.

## 2026-11-09 10:10 — Idempotence prouvée : second `--apply` = 0 écriture

- Second passage : **0 créés, 0 mis à jour, 303 inchangés, 0 protégés**. Backfill WhatsApp terminé.
- Branche `claude/daily-digest-ca6b98` complète et propre, rien poussé. Reste à Anjl : redéployer
  `telegram-bot-entry` (parseAmount), revue CSV (4 conflits, totaux > 10 M), fusion dans main.

## 2026-11-09 10:49 — Edge Functions déployées, prod alignée sur la branche

- Anjl a déployé `telegram-bot-entry` (parseAmount, bouton Vu du bilan) et `notify-staff` (relais outbox,
  format dédié du bilan du jour). Il n'existe pas de fonction `notify-daily-digest` : le digest est la fonction
  SQL `notify_daily_digest` + job cron `daily-digest-evening` (migration 20261107_001, déjà appliquée).
- État : tout ce qui est déployé est dans git (branche `claude/daily-digest-ca6b98`). Rien poussé ni fusionné.
- Prochaine étape : contrôle visuel du premier bilan ce soir à 20 h (Douala) dans Telegram, puis fusion dans main.

## 2026-11-09 10:51 — Script de bilan `npm run cash:summary`

- Nouveau `scripts/cash-reports-summary.mjs` (lecture seule) : bilan par boutique et par mois, dettes au dernier
  rapport, jours suspects (entrées > 5 M XAF par défaut, `--max-day`) exclus des totaux. Options `--since`,
  `--until`, `--store=CODE`, `--source`.
- Résultat : 19 jours suspects (MFOUNDI 17, MF1092 2), ex. 840 M le 05/07 — lignes mal lues par l'import
  (déjà signalées `inflow_total_mismatch`). Hors ces jours : MFOUNDI ≈ 58,9 M d'entrées sur 139 j,
  OLEMBE ≈ 2,9 M sur 145 j, MF1092 ≈ 1 M sur 19 j ; dettes restantes 4,08 M (MFOUNDI) + 77 k (OLEMBE).
- Suite possible : corriger le parseur (préférer le total déclaré quand la somme des lignes s'en écarte
  fortement) puis relancer `--apply` : l'upsert ne réécrira que les lignes changées.

## 2026-11-09 11:00 — Parseur : numéros de modèle collés au prix, corrigé

- Cause des 19 jours aberrants : « Ryzen 5 100 000 » lu 5 100 000, « Elitebook 840 200 000 » lu 840 M.
  Fix dans `scripts/lib/cashReportText.mjs` : relectures alternatives + `reconcileItemsWithDeclaredTotal`
  (le total déclaré de la section tranche). Tests 14/14 verts ; dry-run : 0 ligne > 2 M, 0 jour > 5 M,
  `inflow_total_mismatch` 66 → 30. Entrée ERRORS_LOG ajoutée.
- Session parente prévenue de l'étendue des travaux (message livré). Elle signale que `notify-staff` en
  prod = fusion origin/main + cette branche (bouton « Vu » conservé + lien commande de la PR #48) ; elle
  demande de merger la branche dans main (seul conflit : ERRORS_LOG, union) puis déployer depuis main.
- **Prochaine étape (Anjl)** : `node scripts/import-whatsapp-cash-reports.mjs "<export.txt>" --apply`
  (attendu ≈ 30 mis à jour, reste inchangé ; 2e passage = 0 écriture), puis `npm run cash:summary`
  (0 jour suspect attendu). Ensuite merge de `claude/daily-digest-ca6b98` dans main.

## 2026-11-09 11:05 — Verrou prod : notify-staff dépend du merge de cette branche

- Confirmé par « xeption code » : `notify-staff` en prod = fusion temporaire main (PR #48, d121889) +
  cette branche ; un deploy depuis main seul retirerait le bouton « Vu ». Priorité dès l'accord d'Anjl :
  push + merge de `claude/daily-digest-ca6b98` dans main (conflit ERRORS_LOG → union), puis deploy
  depuis main. En attente d'Anjl : --apply de l'import, puis merge.

## 2026-11-09 11:15 — Branche mergée dans main (accord Anjl) et poussée

- `origin/main` fusionné dans la branche (conflit ERRORS_LOG résolu en union, c45e5d4), branche poussée,
  `origin/main` avancé en fast-forward d121889 → c45e5d4. Verrou notify-staff levé : main contient
  bouton « Vu » + lien commande ; tout deploy peut partir de main.
- Tests : whatsapp-cash-import 14/14, notify-daily-digest verts. Échecs restants hors périmètre :
  « Cannot find package react » (node_modules incomplet dans ce worktree) et
  `staff-notification-actor` (fins de ligne CRLF sur une migration de main, non touchée ici).
- **Reste pour Anjl** : `--apply` de l'import (≈ 30 rapports corrigés) puis `npm run cash:summary` ;
  vérifier le premier bilan Telegram à 20 h Douala.

## 2026-11-09 11:25 — Import corrigé appliqué en prod (autorisation Anjl)

- `--apply` : 0 créés, 30 mis à jour, 273 inchangés, 0 protégés ; second passage : 0 écriture (idempotent).
- `cash:summary` : 0 jour suspect. MFOUNDI 139 j, entrées 40,8 M / sorties 37,9 M (les 58,9 M « hors
  suspects » d'avant incluaient des jours < 5 M eux aussi gonflés, ex. « Ryzen 3 150 000 ») ; OLEMBE 2,9 M ;
  MF1092 1,8 M / 3,1 M ; dettes restantes 4,08 M + 77 k.
- Tout est sur `origin/main`. Reste : vérifier le premier bilan Telegram à 20 h Douala ; revoir les
  4 conflits du CSV de revue (OLEMBE 23/06, MFOUNDI 30/10 et 04/11) si besoin.

## 2026-11-10 20:05 — Dettes de test dans le bilan Telegram (diagnostic, rien modifié)

- Anjl signale que le bilan affiche encore ses dettes de test. Cause : `notify_daily_digest` lit
  `public.store_debts` (statuts active/partial) = table de travail du bot, où ne restent que
  3 lignes de test sur `siege` (créées le 23/10, reste 330 000). Les dettes réelles importées depuis
  WhatsApp sont dans `store_cash_reports.debts_snapshot` du dernier rapport (MFOUNDI 27 lignes /
  4 082 500, OLEMBE 8 / 77 000) et ne sont lues que par `cash:summary`.
- Options proposées à Anjl (aucune appliquée) : (1) supprimer les 3 lignes de test de `store_debts`
  (écriture prod, autorisation requise) ; (2) NOUVELLE migration : repli sur le `debts_snapshot` du
  dernier rapport quand un magasin n'a aucune dette ouverte dans `store_debts` (à annoncer dans
  `docs/engineering/NOTIFICATIONS.md`) ; (3) backfill de `store_debts` depuis le snapshot (déconseillé :
  doublons au prochain import). Recommandation : 1 + 2.

## 2026-11-10 21:32 — Purge des dettes de test + migration de repli snapshot (choix Anjl)

- Prod : 3 lignes `store_debts` du siège supprimées (aucune table ne les référence) → table vide.
- Nouvelle migration `supabase/migrations/20261110_001_daily_digest_debts_snapshot_fallback.sql` (NON appliquée,
  Anjl applique via `npm run db:apply -- supabase/migrations/20261110_001_daily_digest_debts_snapshot_fallback.sql`) :
  dettes = `store_debts` ouvertes, sinon `debts_snapshot` (reste > 0) du dernier rapport <= jour, avec
  « (rapport du JJ/MM) ». Tests `tests/notify-daily-digest.test.ts` 25/25 ; doc NOTIFICATIONS.md + ADR-001 amendé ;
  ERRORS_LOG.
- Tant que la migration n'est pas appliquée, le bilan de ce soir affichera « Dettes en cours : aucune ».
- Branche locale en avance sur origin/main (pas de push sans accord).

## 2026-11-10 23:54 — Nouvel export WhatsApp (jusqu'au 10/11) : dry-run OK, apply en attente d'autorisation

- Zip Anjl : `~/Downloads/Discussion WhatsApp avec Administration XEPTION.zip`, extrait dans le scratchpad
  (`wa-export-20261110/`, chemin du .txt dans `path.txt`, revue dans `review/`).
- Dry-run : 330 rapports, ready=307 (+4 vs dernier apply : MFOUNDI 09 et 10/11, OLEMBE 09 et 10/11), mêmes
  4 conflits. Les 4 nouveaux jours sont cohérents (entrées/sorties = totaux déclarés, soldes chaînés) ;
  OLEMBE 10/11 : total sorties déclaré 100 vs 1 000 calculé (coquille du rapport, solde cohérent).
  MFOUNDI 10/11 : 28 dettes, reste 4 047 500 (le `debt_line_unparsed` est le même cas que le 06/11).
- `--apply` refusé par le classifieur (écriture prod) → demander « j'autorise » à Anjl, puis second passage
  (0 écriture attendu) et `npm run cash:summary`.
- Toujours à faire par Anjl : appliquer la migration `20261110_001` (repli dettes) ; push non fait.

## 2026-11-11 00:04 — Import WhatsApp jusqu'au 10/11 appliqué (autorisation Anjl)

- `--apply` : 4 créés, 0 mis à jour, 303 inchangés, 0 protégés. Second passage lancé en arrière-plan
  (0 écriture attendu, résultat dans l'entrée suivante).
- `cash:summary` : 0 jour suspect. MFOUNDI 141 j, entrées 41,7 M / sorties 38,4 M, dernier solde 493 000 ;
  OLEMBE 147 j, dernier solde 31 000 ; dettes au dernier rapport MFOUNDI 28 / 4 047 500, OLEMBE 8 / 77 000.
- Reste pour Anjl : appliquer la migration `20261110_001` (repli dettes), autoriser le push de la branche.

## 2026-11-11 00:09 — Second passage import

- Import : 0 créés, 0 mis à jour, 307 inchangés, 0 protégés (saisie bot, non écrasés). → idempotent confirmé.

## 2026-11-11 07:24 — Branche poussée, main avancé (autorisation Anjl « Oui, push et merge »)

- origin/main avait reçu PR #42 (SEO/GEO) → fusionné dans la branche sans conflit (ERRORS_LOG : union des
  entrées), tests digest + import 39/39. Branche et `origin/main` = `594abec`.
- En prod : import WhatsApp à jour au 10/11, dettes de test purgées. **Non appliqué** : migration
  `20261110_001_daily_digest_debts_snapshot_fallback.sql` (Anjl : `npm run db:apply -- supabase/migrations/20261110_001_daily_digest_debts_snapshot_fallback.sql`).
  Tant qu'elle n'est pas appliquée, le bilan affiche « Dettes en cours : aucune ».
- Ce commit de passation n'est pas poussé (push uniquement sur accord).

## 2026-11-11 07:35 — Migration 20261110_001 appliquée par Anjl (db:apply, via Postgres direct)

- Vérifié en lecture : la fonction en base contient le repli snapshot, `store_debts` prime, ACL limitée à
  postgres + service_role. Simulation de la ligne dettes : MFOUNDI 28 / 4 047 500 (rapport du 10/11),
  OLEMBE 8 / 77 000 (10/11), MF1092 et siège « aucune ».
- Note : la CLI Supabase n'est pas liée dans ce worktree (« Cannot find project ref »), le script a basculé sur
  Postgres direct ; l'avertissement captcha de la vérification `create_order_atomic` est sans rapport.
- Prochaine vérification : bilan Telegram de 20 h Douala. Prod = git (origin/main 594abec + cette passation non poussée).

## 2026-11-11 07:53 — Bilan global des rapports de caisse (artifact) et piste d'automatisation WhatsApp

- Bilan global 21/05 → 10/11/2026 livré comme tableau de bord Claude (type Data, privé tant que non partagé) :
  https://claude.ai/artifact/YJkBfa7k6E652JijRy63cR — totaux par boutique, mensuel, dettes fin de mois,
  jour de semaine, part « sortie de boss », couverture. Données = instantané lecture seule de
  `store_cash_reports` (agrégats seulement, aucun nom/téléphone client) attaché au tableau en JSON.
  Le tableau n'est pas relié en direct à la base : à régénérer si besoin (script d'agrégation dans le
  scratchpad de session, non versionné).
- Chiffres clés : MFOUNDI 141 jours, 41,7 M entrées / 38,4 M sorties, dettes 4 047 500 au 10/11 (pic
  5 172 500 le 29/10) ; OLEMBE 147 jours, 2,9 M / 3,0 M, 57 jours à 0 ; MF1092 19 jours depuis le 14/10,
  silence depuis le 06/11 ; siège 1 rapport (23/10, bot).
- Export manuel WhatsApp : proposition de session « Ingestion automatique des rapports caisse WhatsApp »
  (webhook WAHA → Edge Function ou worker VPS, parseur réutilisé, rien déployé sans accord). Alternative
  immédiate sans code : le staff poste le rapport dans le bot Telegram caisse (source `bot`).
- Toujours à observer : bilan Telegram de 20 h Douala. Commits de passation non poussés.

## 2026-11-11 07:55 — Push et fusion (fast-forward) dans main

- origin/main = 7573f40 (= origin/claude/daily-digest-ca6b98). Prod et git alignés.
- Session « Ingestion automatique des rapports caisse WhatsApp » démarrée par Anjl (local_0d6f2e42), travaille
  sur sa propre branche ; elle rendra compte ici.
- Reste : observer le bilan Telegram de 20 h Douala.

## 2026-11-11 07:57 — Partage du bilan

- Bilan artifact partageable via le bouton Partager de claude.ai (privé par défaut). Pour une vue dans l'ERP : carte de session « Page bilan caisse dans l'ERP admin » proposée (lecture directe de store_cash_reports, staff direction).

## 2026-11-11 08:24 — Retours des deux sessions filles

- WhatsApp : commit f2c3244 sur claude/wonderful-haslett-3e2f95 (Edge Function whatsapp-cash-webhook, parseur TS partagé, migration 20261111_001, ADR-002), rien déployé ni poussé.
- ERP : commit 181580f sur claude/ecstatic-mendel-e0d052 (onglet admin Bilan caisse, 23 tests), migration RLS 20261111_001 non appliquée ; la session attend l'accord d'Anjl.
- CONFLIT : les deux branches utilisent le préfixe 20261111_001 → renommer l'une en 20261111_002 avant fusion. Rien fusionné ici.

## 2026-11-11 10:20 — PR ouvertes par les sessions filles

- ERP Bilan caisse : PR sur claude/ecstatic-mendel-e0d052 ; rapport test siège du 23/10 supprimé en prod par cette session (le bilan artifact du 11/11 montre encore la ligne siège : instantané).
- WhatsApp : PR sur claude/wonderful-haslett-3e2f95. Conflit de préfixe 20261111_001 entre les deux PR à régler avant la seconde fusion.

## 2026-11-11 10:45 — Test bilan WhatsApp envoyé

- Bilan caisse (format WhatsApp, marqué « message test ») envoyé dans le groupe « Xeption app test » via l API WAHA locale du VPS OVH (session trigenys-test, POST /api/sendText, HTTP 201). Envoi manuel : le canal notify du dépôt n accepte pas de texte libre (types d événements allowlistés).
- Si un bilan WhatsApp périodique est voulu : nouveau type d événement dans Trigenys Notify + fonction planifiée, à cadrer (hebdo / mensuel).
- Commits passation 32ef9a5, c741395, aaaa078 non poussés. Conflit de préfixe 20261111_001 à régler avant fusion de la PR WhatsApp.

## 2026-11-11 12:41 — Bilan WhatsApp : version sobre

- Retour user : trop d emoji. Version sans emoji (titres en gras, séparateurs « · », liste « À noter ») renvoyée dans « Xeption app test » (HTTP 201). Convention à garder pour tout message staff WhatsApp : zéro emoji, gras pour les titres de section.

## 2026-11-11 12:44 — Bilan WhatsApp : une donnée par ligne

- Retour user : le séparateur « · » est peu lisible sur WhatsApp. Nouvelle version envoyée dans le groupe test (HTTP 201) : une donnée par ligne, « | » uniquement sur la ligne de synthèse. Convention : pas de « · », pas d emoji.

## 2026-11-11 14:56 — Format bilan WhatsApp validé

- Format validé par le user : pas d emoji, titres en gras, une donnée par ligne, « | » seulement sur la ligne de synthèse, bloc « À noter » en fin. Modèle de référence : docs/engineering/WHATSAPP_BILAN_FORMAT.txt (chiffres du 11/11, à titre d exemple).
- Session WhatsApp : digest passé à 22 h Douala, migration 20261111_002 appliquée en prod, PR #52 à jour (a01983e) → conflit de préfixe réglé.
- Bilan WhatsApp périodique : cadence pas encore choisie, rien lancé.

## 2026-11-11 14:57 — Message du boss : 3 points de vente actuels

- Le boss a posté dans « Xeption app test » la liste des 3 points actuels : Mfoundi-Mall 1038, Mfoundi-Mall 1092, Olembé gare routière.
- Table stores (prod, lecture seule) : MFOUNDI « Mfoundi Mall », MF1092 « MF 1092 », OLEMBE « Olembe », siege « Xeption — Siège » (is_default, pas un point de vente). Proposition : aligner les 3 libellés name sur ceux du boss (UPDATE prod, sur « J autorise »), codes inchangés ; siège à garder comme entité par défaut ou à désactiver, à trancher.
