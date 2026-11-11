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
