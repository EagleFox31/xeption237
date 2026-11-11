# Passation — Ingestion automatique des rapports caisse WhatsApp

Fichier en ajout seulement : chaque session ajoute une entrée `## AAAA-MM-JJ HH:MM — sujet` à la fin.

## 2026-11-11 08:20 — Webhook WAHA → `store_cash_reports` (code livré, rien déployé)

**Objectif** : supprimer l'export manuel de la discussion WhatsApp. Les rapports postés dans le groupe
caisse arrivent dans `store_cash_reports` avec `source = 'whatsapp_live'`. Décision : ADR-002
(`docs/adr/ADR-002-whatsapp-cash-webhook.md`). Doc d'exploitation : `docs/engineering/NOTIFICATIONS.md`,
section « Ingestion automatique des rapports de caisse WhatsApp ».

**Livré sur la branche `claude/wonderful-haslett-3e2f95`** :
- `supabase/functions/_shared/whatsappCashReport/{text,parser,storeResolver,webhookAuth,ingest}.ts`
  — parseur porté en TS (fidèle à `cashReportText.mjs`), résolution boutique, auth webhook, plan d'écriture.
- `scripts/lib/{cashReportText,cashReportStoreResolver}.mjs` → shims qui ré-exportent le TS ;
  `scripts/lib/whatsappExport.mjs` importe `normalizeLine`/`foldText` du TS. Le script
  `import-whatsapp-cash-reports.mjs` est inchangé et reste utilisable en secours.
- `supabase/functions/whatsapp-cash-webhook/index.ts` — Edge Function (routage seulement).
- `supabase/migrations/20261111_001_store_cash_reports_source_whatsapp_live.sql` — **non appliquée**.
- `tests/whatsapp-cash-webhook.test.ts` (21 tests, données synthétiques) ; `tests/whatsapp-cash-import.test.ts`
  toujours vert (14). `deno check` OK.

**Rien n'est déployé (ni Supabase ni VPS).** Ordre à respecter :

1. Migration (avant la fonction, sinon ses inserts sont rejetés par la contrainte CHECK) :
   `npm run db:apply -- supabase/migrations/20261111_001_store_cash_reports_source_whatsapp_live.sql`
   puis `npm run db:status`.
2. Secrets Supabase (générer la clé : `openssl rand -hex 32`, ≥ 32 caractères) :
   `npx supabase secrets set WHATSAPP_CASH_WEBHOOK_HMAC_KEY=<clé> --project-ref tawnusmfyvugqczaydat`
   Optionnels : `WHATSAPP_CASH_GROUP_IDS=<id>@g.us` (restreint au groupe caisse — recommandé),
   `WHATSAPP_CASH_AUTHOR_STORES='{"2376XXXXXXXX":"MFOUNDI"}'` (repli numéro → code boutique quand le
   message ne nomme pas la boutique et qu'aucun opérateur n'est reconnu).
3. Fonction : `npx supabase functions deploy whatsapp-cash-webhook --project-ref tawnusmfyvugqczaydat --no-verify-jwt --use-api --workdir .`
4. **VPS (accord explicite d'Anjl requis)** — ajouter le webhook à la session WAHA `trigenys-notify`
   sans écraser ceux de Trigenys Notify : `GET /api/sessions/<WAHA_SESSION>` → recopier `config.webhooks`,
   y **ajouter** `{ "url": "https://tawnusmfyvugqczaydat.supabase.co/functions/v1/whatsapp-cash-webhook",
   "events": ["message"], "hmac": { "key": "<même clé>" }, "retries": { "policy": "exponential", "delaySeconds": 2, "attempts": 5 } }`
   → `PUT /api/sessions/<WAHA_SESSION>` avec la config complète. Détail dans NOTIFICATIONS.md.
5. Vérifier : poster un rapport de test dans le groupe → log de la fonction (`action`, `store`,
   `report_date`, `warnings`) et `select source, count(*) from store_cash_reports group by 1`.

**Points d'attention** :
- `WHATSAPP_CASH_GROUP_IDS` vide = tous les groupes de la session sont écoutés (filtrage par contenu seul).
- Une ligne `bot` (saisie Telegram) n'est jamais réécrite ; le webhook répond `protected`.
- WAHA rejoue sur 5xx : seules les erreurs base renvoient 500 ; signature invalide = 401 sans retry utile.
- La tâche demandait `docs/engineering/adr/` ; le dépôt utilise déjà `docs/adr/` (ADR-001) → même dossier.

## 2026-11-11 08:38 — Déploiement en une commande (`npm run deploy:whatsapp-cash`)

Anjl : « y a pas une commande pour gérer ça ? » → `scripts/deploy-whatsapp-cash-webhook.mjs` (npm
`deploy:whatsapp-cash`). Plan par défaut (lecture seule), `--apply` pour exécuter ; idempotent sur les 4
étapes : migration (sautée si tracée), secrets (empreinte SHA-256 ; HMAC générée si absente), fonction,
webhook WAHA via SSH sur le VPS (API en loopback ; clé API lue côté VPS, clé HMAC par stdin ; seule notre
entrée `config.webhooks` est touchée). Options : `--session`, `--group`, `--rotate-key`, `--skip-vps`,
`--skip-deploy`. Doc : NOTIFICATIONS.md, section « Déploiement — une commande ».

**Plan exécuté (preuve, rien appliqué)** : migration non appliquée · HMAC à créer · fonction absente ·
webhook absent de la session WAHA réelle **`trigenys-test`** (seule session WORKING, aucun webhook
existant — la passation précédente parlait de `trigenys-notify`, qui n'existe pas sur ce WAHA).

**Pièges** : le worktree n'a pas de `.env` (celui du dépôt principal : `../../../.env`) → lancer depuis le
dépôt principal ou charger l'env. Le PUT WAHA redémarre la session. Si la clé HMAC existe déjà côté
Supabase sans être connue localement et que WAHA n'a pas encore le webhook : env `WHATSAPP_CASH_WEBHOOK_HMAC_KEY`
ou `--rotate-key`.

**Reste à faire par Anjl** : `npm run deploy:whatsapp-cash -- --apply` (accord VPS implicite dans la commande),
puis test réel : rapport posté dans le groupe → ligne `whatsapp_live`.

## 2026-11-11 08:47 — `.env` du dépôt principal repris depuis un worktree

Anjl a lancé le plan depuis le worktree → « Accès base absent ». Correctif dans le script : si `.env` manque,
il prend celui du dépôt principal (`git rev-parse --git-common-dir`) et affiche la ligne `env : <chemin>`.
Plan rejoué depuis le worktree : 4 actions restantes, rien appliqué. Prochaine étape inchangée :
`npm run deploy:whatsapp-cash -- --apply` par Anjl.

## 2026-11-11 08:54 — DÉPLOYÉ en prod (`--apply` lancé par Anjl) et convergé

- Migration `20261111_001` appliquée et tracée ; secret `WHATSAPP_CASH_WEBHOOK_HMAC_KEY` créé (valeur
  connue seulement de Supabase et de WAHA, pas dans `.env`) ; fonction `whatsapp-cash-webhook` v1 ACTIVE ;
  webhook ajouté à la session WAHA `trigenys-test` (WORKING après redémarrage, hmac + retries conformes).
- Tout ce qui est déployé est commité sur `claude/wonderful-haslett-3e2f95` (f2c3244, 0de9bb4, 78fcc65 + ce commit).
- Étape fonction rendue idempotente : déploiement seulement si les sources (`functions/<fn>` + `_shared`)
  sont plus récentes que `updated_at` de la fonction déployée, ou `--redeploy`. Second plan = « Tout est
  déjà en place » (zéro écriture).
- Non fait : `WHATSAPP_CASH_GROUP_IDS` (la session écoute tous ses groupes, filtrage par contenu seul) →
  `npm run deploy:whatsapp-cash -- --apply --group=<id>@g.us` quand l'id du groupe caisse est connu.
- **Prochaine étape** : test réel — poster un rapport dans le groupe, puis
  `select source, count(*) from store_cash_reports group by 1` doit montrer `whatsapp_live`.
  Ensuite (roadmap) : alerte si une boutique n'a rien posté à 21 h.

## 2026-11-11 09:00 — Verrou : le numéro WAHA n'est pas dans le groupe caisse

Le numéro de la session WAHA `trigenys-test` n'est pas membre du groupe « administration xeption » :
aucun message n'arrivera au webhook tant qu'il n'y est pas. Recommandation donnée à Anjl : demander au
boss d'ajouter ce numéro au groupe (WAHA CORE = une seule session ; brancher le numéro perso d'Anjl
obligerait à remplacer `trigenys-test`, utilisé par Trigenys Notify, et ferait transiter tout son WhatsApp
perso par le VPS). Une fois ajouté : relever l'id du groupe (`GET /api/trigenys-test/groups`) puis
`npm run deploy:whatsapp-cash -- --apply --group=<id>@g.us`, et tester avec un rapport posté.

## 2026-11-11 09:15 — Message au boss rédigé (ajout du numéro WAHA au groupe)

Message fourni à Anjl pour demander au boss l'ajout du numéro de la session `trigenys-test` (nom affiché
« Trigenys Group », lu via `GET /api/sessions/trigenys-test` → `me.id`) au groupe « administration xeption ».
En attente de l'ajout. Ensuite : `GET /api/trigenys-test/groups` pour l'id, puis
`npm run deploy:whatsapp-cash -- --apply --group=<id>@g.us`, puis rapport de test → ligne `whatsapp_live`.

## 2026-11-11 09:19 — Message envoyé dans le groupe de test via WAHA

À la demande d'Anjl, le message au boss a été posté par la session `trigenys-test` dans le groupe « Xeption app test »
(`120363432964279423@g.us`, POST `/api/sendText`, HTTP 201). Ce groupe de test est le seul groupe de la session ;
il peut servir de cible `--group=` pour un test de bout en bout avant l'ajout au vrai groupe caisse.

## 2026-11-11 10:03 — Test bout en bout : un message envoyé PAR le bot ne déclenche pas le webhook

Rapport synthétique (« RAPPORT DU 01/01/2020 », Boutique Siège, montants fictifs) posté dans « Xeption app test »
via `POST /api/sendText` (HTTP 201) → aucune ligne `whatsapp_live` après 30 s (307 lignes `whatsapp_backfill`, inchangé).
Cause attendue : l'événement WAHA `message` exclut les messages `fromMe` (seul `message.any` les inclut) et le
webhook est abonné à `message` seulement — comportement voulu en prod (le bot n'a pas à ingérer ses propres
messages). Le test valide doit donc être posté par un autre membre du groupe (Anjl, depuis son téléphone).
Logs WAHA non relus : SSH VPS « Connection reset » après plusieurs connexions rapprochées (anti-bruteforce
probable) — réessayer plus tard. Aucune ligne de test à nettoyer en base.

## 2026-11-11 10:08 — Webhook livré et répondu 200, mais rapport de test ignoré (boutique « Siège » non résolue)

Anjl a posté le rapport de test depuis son téléphone : WAHA a bien envoyé l'événement `message` à la fonction
(logs WAHA 09:05 UTC, « POST request was sent with status code: 200 ») → la chaîne WAHA → HMAC → fonction
fonctionne. Aucune ligne créée car le texte disait « Boutique Siège » : `siege` est dans `GENERIC_STORE_WORDS`
(storeResolver), donc `store_unresolved` (200 skipped). Vérifié localement : « Siège » → null, « Olembe » → OLEMBE.
Pas un bug (le siège n'est pas une boutique de vente). Prochaine étape : refaire le test avec « Boutique Olembe »,
date 01/01/2020, puis supprimer la ligne de test (`source = whatsapp_live`, report_date 2020-01-01).

## 2026-11-11 10:15 — TEST BOUT EN BOUT RÉUSSI (groupe « Xeption app test »)

Rapport de test « Boutique Olembe », RAPPORT DU 01/01/2020, posté par Anjl depuis son téléphone → ligne
`store_cash_reports` `source = whatsapp_live` créée (OLEMBE, 2020-01-01, opening 10 000, entrées 5 000,
sorties 1 000, reste 14 000, items et opérateurs parsés, `source_ref = waha:<id message>`). Ligne de test supprimée
ensuite (delete ciblé par id) ; base revenue à 307 lignes `whatsapp_backfill`.

**État** : tout déployé, converge, fonctionnel. **Verrou restant** : le numéro WAHA (+237 670 754 372, « Trigenys
Group ») doit être ajouté par le boss au groupe « administration xeption » (message de demande posté dans le groupe
de test). Dès l'ajout : `GET /api/trigenys-test/groups` → id du groupe caisse, puis
`npm run deploy:whatsapp-cash -- --apply --group=<id>@g.us` pour restreindre l'écoute à ce groupe.
Leçon : « Siège » est un mot générique du résolveur → un rapport « Boutique Siège » est ignoré (voulu).

## 2026-11-11 10:18 — PR ouverte : EagleFox31/xeption237#52

Branche `claude/wonderful-haslett-3e2f95` poussée, PR #52 vers `main` (prête, pas brouillon, section RAIDER review).
Verrou inchangé : ajout du numéro WAHA au groupe « administration xeption » par le boss, puis
`npm run deploy:whatsapp-cash -- --apply --group=<id>@g.us`.
