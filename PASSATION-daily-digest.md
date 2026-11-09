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
