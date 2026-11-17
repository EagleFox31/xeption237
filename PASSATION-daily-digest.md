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

## 2026-11-11 15:01 — Boutiques renommées en prod (autorisé)

- Migration 20261111_003_store_names_official_points.sql appliquée via db:apply (UPDATE par code, idempotent) : MFOUNDI → « Mfoundi-Mall 1038 », MF1092 → « Mfoundi-Mall 1092 », OLEMBE → « Olembé gare routière ». Vérifié en base.
- « siege » (nom de test selon le user) NON désactivé : is_default et porteur du stock principal (217 store_stock, 259 mouvements, 9 commandes). Sa suppression = transfert de stock vers Mfoundi-Mall 1038 + bascule du défaut, à cadrer à part.
- Réponse envoyée au boss dans « Xeption app test » (noms enregistrés, siège retiré des bilans). À tenir : exclure le siège des bilans tant qu il existe.
- Préfixes 20261111 : _001 et _002 sur la branche WhatsApp (PR 52), _003 ici.

## 2026-11-11 15:15 — Branche poussée et fusionnée dans main (879e1b8)

- Migration 20261111_003 (noms officiels des boutiques) et passation désormais sur origin/main. Prod et git alignés.
- Session « Retirer le magasin test Siège » lancée par le user (local_98d711d6) : travaille dans son propre worktree, rapportera ici.
- Reste : PR 52 (WhatsApp, migrations 20261111_001/_002) à fusionner ; bilan WhatsApp périodique non cadré.

## 2026-11-11 15:18 — Le boss précise : Mfoundi-Mall 1092 = siège

- Second message du boss dans le groupe test : « Mfoundi-Mall 1092 (siège) ». Le siège n est donc pas un nom de test : c est la boutique 1092. Session « Retirer le magasin Siège » (local_98d711d6) prévenue : cible du stock et du défaut = MF1092, pas MFOUNDI.
- Ma réponse de 14:01 au boss (« Siège était un nom de test ») est à rectifier : attendre l accord du user pour répondre.

## 2026-11-11 15:20 — Plan de retrait du siège reçu, recadré sur MF1092

- Session Siège : option A (migration 20261111_004 : transfert stock 217 lignes / 2 634 unités + 1 réservation, bascule is_default, siege inactif « Ancien siège (archivé) », fallbacks SQL via _default_store_id(), bot Telegram « siege » en dur à corriger + redéploiement telegram-bot-entry). Recadrée : cible MF1092 et non MFOUNDI. Note partagée : retrait-magasin-siege.md. En attente du « J autorise » du user.

## 2026-11-11 15:26 — Retrait du siège autorisé, session coupée par la limite de modèle

- User : « J autorise » l option A vers MF1092, transmis à la session Siège (local_98d711d6, worktree sharp-rhodes-803414, branche claude/sharp-rhodes-803414).
- La session s est arrêtée sur la limite du modèle Fable. Prod intacte (siege toujours is_default avec 217 lignes de stock). Son worktree contient, non commités et non appliqués : supabase/migrations/20261111_005_merge_siege_into_mf1092.sql + modification de telegram-bot-entry/index.ts.
- Changement de modèle de cette session refusé par le mode auto : le user doit passer la session sur Opus 5.5 dans l app et lui dire de continuer.
- Réponse au boss envoyée (« Mfoundi-Mall 1092 est le siège », correction du message précédent).
- Préfixe 20261111_003 en double en prod (cash_movements_and_gap sur PR 52 et store_names_official_points sur main) : versions distinctes dans schema_migrations, donc sans effet sur le suivi ; ne pas renommer (fichiers appliqués figés). À consigner dans ERRORS_LOG.

## 2026-11-11 18:51 — Siège fusionné dans MF1092 (vérifié en prod)

- Session Siège (branche claude/sharp-rhodes-803414, commit c11f208) : migration 20261111_005_merge_siege_into_mf1092.sql appliquée, telegram-bot-entry redéployé. Vérifié en lecture : MF1092 « Mfoundi-Mall 1092 » is_default, 217 lignes / 2 634 unités ; siege « Ancien siège (archivé) » inactif, stock vide.
- Non poussé : branche claude/sharp-rhodes-803414 (code en prod hors git, à pousser/fusionner sur accord). Suite proposée par la session : la redistribution du bot vise encore siege.
- Ici : commit 76ab75b (ERRORS_LOG préfixe en double) + passations non poussés.

## 2026-11-11 21:16 — Siège et notes fusionnés dans main

- Poussé : claude/sharp-rhodes-803414 (c11f208) et claude/daily-digest-ca6b98. origin/main = 586515f (contient la migration 20261111_005 et le correctif telegram-bot-entry déjà en prod).
- Conflit ERRORS_LOG résolu en gardant les deux entrées (préfixe en double + verify-erp-step2).
- Reste : PR 52 (WhatsApp, branche claude/wonderful-haslett-3e2f95, migrations 20261111_001/_002/_003 en prod) non fusionnée ; redistribution du bot vise encore siege (session Siège) ; cadence du bilan WhatsApp non choisie.

## 2026-11-13 23:58 — Brief semaine 09-13/11 (lecture seule)

- Rapports du groupe « Administration XEPTION » bien ingérés en base (source whatsapp_live du 11 au 13/11, backfill avant).
- Anomalies vues : entrées Olembé 12/11 = 65 001 et 13/11 = 27 001 au lieu de 65 000 / 27 000 (le « 1 » de « iphone 17 PM » coupé sur deux lignes est compté comme montant) ; rapports « mfoundi mall » rangés sur MFOUNDI (Mfoundi-Mall 1038) alors que le stock est sur MF1092 ; ouverture Mall 12/11 = 315 000 contre clôture 11/11 = 315 500.
- Rien corrigé, rien commité.

## 2026-11-14 00:18 — Maquette du bilan hebdomadaire montrée (non envoyée)

- Pas de bilan hebdo existant : seul le digest quotidien 22 h (PR 52, non fusionnée). Maquette semaine 09-13/11 montrée à Anjl au format validé, sans noms de clients.
- Prochaine étape si validé : jour et heure d'envoi, groupe cible, puis module _shared + cron, sur la base du digest de la PR 52.

## 2026-11-14 00:20 — Question ouverte : un ou deux rapports Mfoundi Mall

- Mfoundi Mall = 2 boutiques (1038 et 1092). Les rapports WhatsApp disent seulement « Boutique mfoundi mall » ; tous sont rangés sur MFOUNDI (1038), un seul backfill 06/11 sur MF1092. Question posée à Anjl : rapport commun aux deux boutiques ou une seule boutique qui rapporte ? Bilan hebdo en attente de la réponse.

## 2026-11-14 00:21 — Bilan hebdo test envoyé dans Xeption app test

- Maquette semaine 09-13/11 envoyée (HTTP 201), Mfoundi Mall traité comme un seul rapport (question 1038/1092 non tranchée par Anjl). Attente retour avant de coder le module hebdo (après fusion PR 52).

## 2026-11-14 01:35 — Anjl demande pourquoi le bilan hebdo n'est pas automatisé

- Réponse : jamais demandé ni codé jusqu'ici, format à valider, dépend du digest de la PR 52 non fusionnée. Proposé de le coder maintenant (samedi 20 h, groupe test d'abord).

## 2026-11-14 12:43 — Bilan hebdomadaire codé (commit local, rien déployé)

- Commit `771b3aa` sur `claude/daily-digest-ca6b98` : migration `20261114_001_weekly_digest.sql` (fonction `notify_weekly_digest` + cron `weekly-digest-monday` lundi 07:00 UTC = 08 h Douala), module `_shared/weeklyDigest.ts`, câblage Telegram/texte brut, `weekly_digest` dans les défauts, ADR-002, NOTIFICATIONS.md, `tests/weekly-digest.test.ts` (ajouté avec -f).
- Planning passé de samedi 20 h à lundi 08 h : rapports reçus après 20 h, samedi incomplet sinon.
- Aperçu validé sur la prod en transaction READ ONLY (bloc DO, rien écrit) pour les semaines 45 et 46 : chiffres conformes au bilan de test, sauf dettes Mall +75 000 F (base = dernier rapport avant la semaine) au lieu de +110 000 F dans la maquette manuelle.
- Tests : weekly + daily 37/37. Suite complète : 14 échecs **préexistants** (13 `react` absent du worktree, 1 `staff-notification-actor` qui échoue aussi sans ce commit).
- **Non fait / à Anjl** : `npm run db:apply -- supabase/migrations/20261114_001_weekly_digest.sql`, redéployer `notify-staff`, ajouter `weekly_digest` à `TELEGRAM_EVENT_TYPES` s'il est surchargé. Non poussé.
- Suites : WhatsApp (type à ajouter dans trigenys-notify), in-app sans retours ligne (`NotificationDrawer` n'a pas `whitespace-pre-line`, vaut aussi pour le daily), écarts de 1 F d'Olembé (parseur).

## 2026-11-14 12:50 — Bilan hebdo poussé et fusionné dans main ; WhatsApp manquant

- `origin/main` = `70edeef` (fast-forward depuis la branche), branche `claude/daily-digest-ca6b98` poussée. Migration `20261114_001` toujours **non appliquée**, `notify-staff` non redéployé.
- Anjl reproche que le bilan n'aille pas sur WhatsApp (demande d'origine). Cause : WhatsApp passe par Trigenys Notify, qui refuse tout type hors `ALLOWED_TYPES` (`src/core/dispatch.ts`) et ne rend que des faits sur liste blanche (`src/core/message-facts.ts`, `contracts.ts`). Prochaine étape proposée : ajouter `report.weekly_digest` dans trigenys-notify (type, rendu du texte complet, tests) + alias et type par défaut côté `waha.ts` dans Xeption. Attention : d'autres sessions ont des worktrees ouverts dans trigenys-notify (`order-outcome-events`, `whatsapp-direct-dispatch-af8be9`).

## 2026-11-14 13:02 — Bilan hebdo sur WhatsApp codé (local, non poussé)

- trigenys-notify, worktree `.claude/worktrees/weekly-digest`, branche `feat/xeption-weekly-digest`, commit `6bf4d10` (non poussé) : type `report.weekly_digest` (faits `digestPeriod`/`digestSections` sur liste blanche, contacts refusés), filtre déclaratif `WAHA_EVENT_GROUPS_JSON` (restreint, n'ajoute jamais, 503 si mal formé), var prod = groupe Xeption app test. `npm test` 112/112.
- Xeption (cette branche, commit local) : alias `weekly_digest → report.weekly_digest` dans `waha.ts`, type par défaut WAHA, faits via `weeklyDigestFacts()` + `trimWeeklyDigest()` (≤ 4000 octets, pas d'actionUrl). Vitest : aucun nouvel échec (14 fichiers déjà KO : React absent du worktree + staff-notification-actor). `deno check` : 2 erreurs `Cannot find name 'Deno'` préexistantes (config lib), pas liées.
- Docs : ADR-002 point 5 révisé, NOTIFICATIONS.md mis à jour.
- Déploiement (Anjl) : 1) Worker Notify ; 2) vérifier route D1 du groupe test pour xeption ; 3) `npm run db:apply -- supabase/migrations/20261114_001_...` ; 4) redéployer `notify-staff` ; 5) ajouter `weekly_digest` à `WAHA_EVENT_TYPES`/`TELEGRAM_EVENT_TYPES` s'ils sont surchargés.
- Rien poussé, rien déployé.

## 2026-11-16 10:21 — PR ouvertes pour le bilan WhatsApp

- Branches poussées. PR Trigenys/trigenys-notify#66 (feat/xeption-weekly-digest, 6bf4d10) et EagleFox31/xeption237#59 (claude/daily-digest-ca6b98, d3bcaac). Non fusionnées, rien déployé.
- Prochaine étape : revue/merge de #66 puis déploiement Worker, route D1 groupe test, migration 20261114_001, notify-staff (ordre dans la PR #59).

## 2026-11-16 10:54 — Bilan WhatsApp fusionné dans main (non déployé)

- Trigenys/trigenys-notify#66 fusionnée (f139ccb) après résolution du conflit avec les types order.* (union, 118/118). EagleFox31/xeption237#59 fusionnée (23e51ca) : conflit waha.ts/test résolu en union, et `weekly_digest` retiré de `WAHA_EXCLUDED_EVENT_TYPES` (ajouté sur main entre-temps) puisqu’il a son alias. Tests bilan + canal WAHA 42/42 ; suite complète : 15 fichiers KO hors périmètre (React absent du worktree, uploadTrocPhotos venu de main).
- Rien déployé. Ordre : Worker Notify → route D1 groupe test → migration 20261114_001 → notify-staff.

## 2026-11-16 10:55 — Pas de déploiement automatique

- Vérifié : merge sur main ne déploie ni le Worker Notify prod (seul `appfactory-infrastructure.yml` provisionne le staging, sur changement de `.appfactory/worker.json`), ni Supabase (aucun workflow functions/migrations ; Vercel = front seulement). Déploiement manuel requis, en attente d’accord d’Anjl.

## 2026-11-16 11:14 — Bilan hebdo WhatsApp DÉPLOYÉ (accord Anjl « deploie alors »)

- Worker Notify `trigenys-notify-staging-api` déployé depuis main f139ccb (version 4e2f2f59…), seul delta depuis le déploiement de 09:45 = PR #66. `WAHA_EVENT_GROUPS_JSON` = groupe test seulement.
- D1 (lecture) : seule route xeption = groupe test, enabled=1, state=available.
- Migration `20261114_001_weekly_digest.sql` appliquée (db:apply), cron `weekly-digest-monday` `0 7 * * 1` actif, EXECUTE refusé à anon/authenticated.
- `notify-staff` redéployé (flags projet). Aucune surcharge `*_EVENT_TYPES` dans les secrets : défauts actifs.
- Premier envoi automatique : lundi 23/11 08 h Douala (le créneau du 16/11 était passé). Envoi immédiat possible : `SELECT public.notify_weekly_digest();` (non fait, à proposer).
- Ouvrir à Administration : ajouter son id dans `WAHA_EVENT_GROUPS_JSON` ET router le groupe vers xeption dans D1 (absent aujourd’hui).

## 2026-11-16 11:25 — Bilan W46 envoyé, samedi Mfoundi manquant

- `notify_weekly_digest()` déclenché (accord « Oui, envoie-le ») : notif `weekly_digest.2026-W46` livrée telegram 10:24:01 + whatsapp_waha 10:24:04, sans erreur.
- Remarque Anjl « prend en compte samedi » : la semaine ISO inclut le samedi (Olembé compté) ; Mfoundi-Mall 1038 n'a AUCUN rapport le 14/11 en base → bilan affiche « caisse vendredi soir » + « pas de rapport samedi ».
- Demandé à la session ingestion (local_0d6f2e42) de vérifier/ingérer le rapport 1038 du 14/11. Ensuite, re-générer = supprimer la ligne `weekly_digest.2026-W46` puis rappeler la fonction : écriture prod, sur accord explicite seulement.
- Demande Anjl : sonder @gltich dans le groupe test sur le format du bilan. Notify ne gère pas de texte libre ni de mention ; il faut le numéro de gltich et un canal d'envoi validé (pas d'appel WAHA direct dans du nouveau code).
- `scripts/.tmp-weekly-send.mjs` supprimé.

## 2026-11-16 11:45 — Retour gltich : 1092 absent du bilan

- gltich (groupe test) : « Je ne vois pas Mfoundi-Mall siège (1092) ». MF1092 actif, aucun rapport en base depuis le 06/11 ; `notify_weekly_digest` ne boucle que sur les magasins actifs AYANT un rapport → 1092 disparaît sans mention.
- Correctif proposé (non écrit, attend OK Anjl) : nouvelle migration `CREATE OR REPLACE` ajoutant en « À noter » « <magasin> : aucun rapport cette semaine » pour tout magasin actif sans rapport.
- Session ingestion : 1038 du 14/11 ingéré (backfill 10:31 UTC). Cause : indice « mfoundi mall » ambigu 1038/1092 → store_unresolved. Prévention à décider par Anjl (rattacher Jordan/Engelbert/Sefora à MFOUNDI dans staff, ou mapper l'auteur dans WHATSAPP_CASH_AUTHOR_STORES). Question 1092 (07–15/11) envoyée, en attente.
- Régénération W46 (supprimer ligne `weekly_digest.2026-W46` + rappeler la fonction) : écriture prod, accord explicite requis.

## 2026-11-16 11:34 — Réponse envoyée à gltich (groupe test)

- Message : 1092 sans rapport en base depuis le 06/11 ; demander « 1038 » ou « 1092 » dans l’en-tête des rapports ; bilan corrigé à renvoyer (promis dans le groupe).
- En attente : réponse ingestion sur 1092 (07–15/11) ; OK Anjl pour migration « aucun rapport cette semaine » + régénération W46.

## 2026-11-16 11:36 — 1092 : rien posté du 07 au 15/11

- Session ingestion : aucun rapport 1092 (en-tête « Boutique MF 1092 ») posté depuis le 06/11 → base correcte. Ma réponse à gltich attribuait l’absence à l’ambiguïté : inexact pour 1092 (vrai seulement pour 1038 du 14/11).
- Prochaine étape (accord Anjl requis) : migration « <magasin> : aucun rapport cette semaine » pour magasins actifs sans rapport, puis régénération W46 (inclura samedi 1038 + mention 1092).

## 2026-11-16 11:45 — Question posée à gltich

- Groupe test : correction (1092 n’a rien posté depuis le 06/11) + « mfoundi mall » sans numéro = 1038 ou 1092 par défaut ? Réponse attendue → à transmettre à la session ingestion (règle d’alias), puis migration « aucun rapport » + régénération W46 sur accord Anjl.

## 2026-11-16 11:53 — Réponse gltich : « On va préciser désormais »

- Les équipes mettront 1038/1092 dans l’en-tête. Pas de défaut validé ; transmis à la session ingestion (info). Leçon : surveiller moi-même les réponses dans le groupe après une question, ne pas attendre qu’Anjl le signale.

## %Y-%m-%d %H:%M — Migration 20261116_001 écrite (accord « ok accordé »)

- `supabase/migrations/20261116_001_weekly_digest_silent_stores.sql` : CREATE OR REPLACE notify_weekly_digest + ligne « <boutique> : aucun rapport cette semaine. » pour magasins actifs sans rapport. Tests `tests/weekly-digest.test.ts` (5 nouveaux) : 47/47 avec waha-notify-channel.
- `db:apply` REFUSÉ par le garde-fou de permission : à lancer par Anjl. Puis régénération W46 (supprimer la ligne `weekly_digest.2026-W46` + `SELECT public.notify_weekly_digest();`), non faite.
- Filet « mfoundi mall » sans numéro → 1038 : transmis à la session ingestion avec l’accord d’Anjl.
- Rien commité.

## 2026-11-16 12:04 — Correctif horodatage

- L’entrée précédente « %Y-%m-%d %H:%M — Migration 20261116_001 écrite » date en réalité du 2026-11-16 12:04.

## 2026-11-16 12:08 — W46 régénéré avec la boutique silencieuse

- Migration 20261116_001 appliquée par Anjl (db:status : APPLIQUÉE, db:verify : 0 absent).
- Ancienne notification W46 conservée, dedup_key renommée en weekly_digest.2026-W46.v1 (pas de suppression).
- notify_weekly_digest('2026-11-15') rappelée : nouvelle notification envoyée sur telegram et whatsapp_waha à 12:08, attempts 1, aucune erreur. Le samedi est inclus et la ligne « Mfoundi-Mall 1092 : aucun rapport cette semaine. » apparaît.
- Message reçu dans le groupe test ; surveillance des réponses en cours.
- Non commité : migration, tests/weekly-digest.test.ts (git add -f), passation.

## 2026-11-16 12:13 — PR #60 ouverte, filet 1038 prêt côté ingestion

- Commit 0879e9e poussé, PR https://github.com/EagleFox31/xeption237/pull/60 ouverte (CI en cours). Migration déjà appliquée, W46 renvoyé.
- Session ingestion : filet « mfoundi mall » sans numéro → 1038 codé (commit bea524a, PR #52), NON déployé. Activation = secret WHATSAPP_CASH_HINT_DEFAULTS={"mfoundi":"MFOUNDI"} + redéploiement whatsapp-cash-webhook, sur accord d'Anjl.
- Surveillance du groupe test en cours (réponse gltich).
- Prochaine étape : fusion de #60 si accord, activation du filet si accord.

## 2026-11-16 12:16 — Filet 1038 déployé, question images

- Session ingestion : filet « mfoundi mall » sans numéro → MFOUNDI déployé en prod (secret WHATSAPP_CASH_HINT_DEFAULTS, whatsapp-cash-webhook v4, commit bea524a, PR #52). À vérifier sur le prochain rapport réel.
- PR #60 ouverte, fusion en attente d'accord.
- Anjl demande des messages avec images : WAHA du VPS = CORE (2026.10.1, NOWEB), envoi d'images a priori réservé à WAHA Plus. Options proposées : WAHA Plus, lien avec aperçu, ou photo via Telegram. En attente de l'exemple visuel d'Anjl (non reçu).

## 2026-11-16 12:38 — Écarts 1 F Olembé = ligne coupée

- Cause : « iphone 17 PM » coupé sur 2 lignes dans les rapports Olembé du 12/11 et 13/11 → item fantôme de 1 F. Correctif du parseur transmis à la session ingestion (correction des rapports et déploiement soumis à l'accord d'Anjl).
- Aucune réponse dans le groupe test 30 min après le renvoi de W46 ; surveillance réarmée.
- PR #60 : fusion en attente d'accord. Question images : en attente de l'exemple d'Anjl.

## 2026-11-16 13:08 — Surveillance du groupe arrêtée

- 1 h sans réponse dans le groupe test après W46 v2 ; surveillance non réarmée (relancer à la demande).
- Correctif parseur 1 F : commit 8b974fe (PR #52), non déployé ; redéploiement webhook + correction des 2 rapports Olembé en attente d'accord d'Anjl.
- PR #60 : fusion en attente d'accord.

## 2026-11-16 14:26 — Correctif 1 F déployé et rapports Olembé corrigés

- Session ingestion (accord Anjl « Oui, les deux ») : webhook redéployé avec 8b974fe, rapports Olembé 12/11 et 13/11 corrigés (items fusionnés, total_inflow −1 F). Vérifié en base ici.
- Le bilan W46 déjà envoyé mentionne encore les écarts de 1 F (pas de renvoi sans demande).
- PR #60 : fusion en attente d'accord.

## 2026-11-16 14:32 — PR #60 fusionnée

- PR #60 fusionnée (merge b2dbc34), CI verte. Migration 20261116_001 déjà en prod.
- Entrées de passation postérieures au commit 0879e9e : locales, non commitées.
- Restant : question images WhatsApp (WAHA CORE) en attente de l'exemple d'Anjl.

## 2026-11-16 16:09 — État Xeption transmis à la session Notify #68

- notify-staff-action déployé (PR #61), migration whatsapp_order_actions_core appliquée, secret XEPTION_NOTIFY_ACTION_KEY présent ; WHATSAPP_ACTIONS_ENABLED absent → 503 CHANNEL_DISABLED.
- Contrat conforme ; écarts signalés : 413 à traiter en abandon, champs ok/changed/action en plus dans la réponse.
- Doublon de préfixe 20261116_001 (actions WhatsApp + bilan hebdo) : signalé, rien renommé.

## 2026-11-16 21:42 — Test réel des actions WhatsApp lancé

- Contrat d'empreinte en prod côté Notify (trigenys-notify#71, bb2158d) ; Xeption #62 en prod, WHATSAPP_ACTIONS_ENABLED=true.
- Anjl a validé le test réel (« ok testons ») ; il est mené par la session Notify #68 sur le groupe « Xeption app test ». xeption code prévenu.
- Retour arrière : WHATSAPP_ACTIONS_ENABLED=false. Restant ici : question images (exemple d'Anjl).

## 2026-11-16 21:44 — Test réel : en attente d'Anjl

- Notify #68 suit les logs du Worker (30 min). Il faut une nouvelle commande de test puis une réaction 📵 d'Anjl sous l'alerte (les anciennes alertes ne sont pas réutilisables).

## 2026-11-16 21:54 — Test réel : alerte ORD-TEST-NF68 dans le groupe

- Commande fictive ORD-TEST-NF68 (eventId c2b789cd-…) créée par xeption code ; alerte reçue dans « Xeption app test ».
- Attente : réaction 📵 d'Anjl sous l'alerte. Notify #68 vérifie puis prévient ; je transmets alors la fin à xeption code (qui annule la commande fictive).

## 2026-11-17 18:11 — Bon de vente Pixel 8 Pro au-dessus du prix boutique

- Dossier TRC-1794932672 (17/11) : crédit 365 000, cash 305 000, bon affiché 275-330 k (×0,9, MobileVenteVoucher). Boutique : Pixel 8 Pro 205-280 k.
- Cause : Pixel 8 Pro absent de trade_in_models → save-trade-in replie sur market-price-intel (referencePrice ~600 k) ; aucun plafond par rapport à notre propre prix de vente.
- Test Notify #68 : surveillance terminée sans geste reçu ; Anjl doit retirer puis remettre 📵.
- Proposé : plafond serveur+client sur le prix de vente boutique + ajouter le modèle au catalogue. Rien codé.

## 2026-11-17 18:17 — Plafond prix boutique : code et tests prêts, rien de commité ni déployé

- Branche `fix/troc-offer-shop-price-cap`. Helper `utils/shopPriceCap.ts` + copie `_shared/shopPriceCap.ts`,
  branché dans `trocPricing.ts`, `trocEvaluationService.ts` et `save-trade-in`.
- `tests/shop-price-cap.test.ts` : 11/11 verts (à ajouter avec `git add -f`). Suite complète : échecs préexistants
  sans lien (paquets `react`/jsdom absents du `node_modules` du worktree).
- ADR-004 (statut proposé) + entrée ERRORS_LOG. Pixel 8 Pro excellent : crédit plafonné à 140 000.
- Reste : accord d'Anjl pour le commit, déploiement de `save-trade-in` par Anjl, puis recalcul de TRC-1794932672.
- Test Notify #68 (réaction 📵 sur ORD-TEST-NF68) toujours en attente ; prévenir « xeption code » à la fin.

## 2026-11-17 18:20 — Plafond prix boutique commité et déployé

- Commit f6a0e2a sur `fix/troc-offer-shop-price-cap` (non poussé, pas de PR). Déployé avec l'accord d'Anjl :
  `save-trade-in` (OPTIONS 200). Aucune migration.
- Vérifié en lecture seule : prix boutique Pixel 8 Pro 205 000 / 260 000 / 280 000, plafond attendu 140 000 de crédit.
- Le front (calcul affiché au client) ne profite du plafond qu'après merge et déploiement de l'app.
- Reste : push et PR (accord d'Anjl), recalcul de TRC-1794932672, Pixel 8 Pro dans `trade_in_models`.

## 2026-11-17 18:37 — Troc : prix de base dérivé du catalogue boutique (ADR-005)

- Branche `feat/troc-catalog-link`, partie de `fix/troc-offer-shop-price-cap` (PR #63, non fusionnée).
- Un modèle absent de `trade_in_models` mais vendu en boutique prend comme base
  prix boutique le plus bas × 1,7 (`utils/basePriceResolution.ts` + copie `_shared/`), avant
  `market-price-intel`. Pixel 8 Pro : base 345 000 au lieu de 1 090 000.
- `npm run troc:catalog-gaps` (lecture seule) : calibrage du ratio + 121/151 produits boutique sans
  entrée de reprise, avec le `base_price` proposé.
- Rien déployé, aucune migration. À déployer par Anjl : `save-trade-in` (après fusion de #63).
## 2026-11-17 18:37 — Refus de bon troc débloqué (RLS historique)

- Migration `20261117_001_trade_in_status_history_definer.sql` appliquée en prod (accord Anjl « Oui, applique ») via `db:apply` ; enregistrée dans `schema_migrations` ; `log_trade_in_status_change()` = `prosecdef=true`, `search_path=public, pg_temp`.
- Branche `fix/troc-status-history-rls` (commit 46a89e4 + cette passation), non poussée, pas de PR.
- À faire : Anjl re-clique « Refuser l'échange » dans l'ERP pour confirmer ; proposer push + PR.
- Message @glitch (bon BON-1794932672 revu) : pas encore envoyé. Méthode déjà utilisée : WAHA sur le VPS (`/api/sendText`, session `trigenys-test`). SSH du VPS en « connection reset » à 18:35 ; il manque l'id du groupe staff et celui de glitch pour la mention.

## 2026-11-17 18:50 — Refus troc confirmé en ERP

- Anjl confirme : le refus d'un bon passe dans l'ERP après la migration `20261117_001`.
- Branche `fix/troc-status-history-rls` (46a89e4, 7a1a05d, cette entrée) : à pousser + PR sur accord.
- Restent : message @glitch (SSH du VPS en « connection reset », id du groupe staff et de glitch à récupérer via WAHA), PR #63 à fusionner, branche `feat/troc-catalog-link` (c6e649d) de la session catalogue, non poussée.

## 2026-11-17 19:05 — Message @glitch envoyé

- SSH du VPS revenu. Message « bon BON-1794932672 revu » envoyé via WAHA (`trigenys-test`, groupe « Xeption app test », mention `23797686684@c.us`) : HTTP 201.
- Reste : push + PR de `fix/troc-status-history-rls` sur accord ; PR #63 puis #64 à fusionner.
