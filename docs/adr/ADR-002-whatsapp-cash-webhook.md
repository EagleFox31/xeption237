# ADR-002 — Ingestion automatique des rapports de caisse WhatsApp

- **Statut** : accepté (2026-11-11), code livré, déploiement en attente (voir `PASSATION-whatsapp-cash.md`).
- **Contexte** : les boutiques postent chaque soir leur rapport de caisse dans le groupe WhatsApp.
  Jusqu'ici ces rapports entraient dans `store_cash_reports` par un **export manuel** de la discussion
  (fichier `.txt`) rejoué avec `scripts/import-whatsapp-cash-reports.mjs` (source `whatsapp_backfill`).
  Le digest quotidien (ADR-001) et son repli « dettes » dépendent de ces lignes : sans import, il travaille
  sur des données vieilles de plusieurs jours. Un relais WAHA (`trigenys-notify`, VPS OVH) existe déjà
  pour l'envoi sortant ; il faut le réutiliser pour l'entrant.

## Décision

**Webhook WAHA → Edge Function `whatsapp-cash-webhook`**, qui réutilise le parseur existant porté en
TypeScript partagé (`supabase/functions/_shared/whatsappCashReport/`). Le script Node de reprise
importe désormais ce même code (shims `.mjs`) : une seule implémentation du parsing.

| Option | Verdict | Raison en une ligne |
|---|---|---|
| **(a) Webhook WAHA → Edge Function** | **Retenue** | Zéro nouveau service, zéro polling, livraison en secondes, retries WAHA + écriture idempotente ; le parseur est déjà du TS « pur » portable |
| (b) Worker Node sur le VPS interrogeant l'API WAHA | Écartée | Un conteneur de plus sur une machine à 3,7 Go de RAM, un curseur de lecture à persister, et la clé `service_role` à sortir de Supabase |

Choix retenu : **(a)** — même infra que la notification sortante, idempotence par `(store_id, report_date)`,
secret vérifié à la réception (HMAC-SHA512 WAHA en priorité, sinon en-tête de secret partagé).

## Alternatives écartées

- **Polling de l'API WAHA depuis une Edge Function cron** : latence d'une heure et curseur à stocker,
  pour éviter un webhook que WAHA fournit nativement.
- **Faire poster le rapport dans le bot Telegram** : changerait l'habitude des boutiques ; la saisie bot
  (`source = 'bot'`) reste possible et **prime** toujours sur l'ingestion WhatsApp.

## Conséquences

- Nouvelle valeur `store_cash_reports.source = 'whatsapp_live'` (migration `20261111_001`, élargit la
  contrainte CHECK, additive).
- Règles d'écriture (`planUpsert`) : ligne absente → insert ; ligne `whatsapp_live` / `whatsapp_backfill`
  au contenu différent → update ; identique → no-op ; ligne `bot` → jamais réécrite.
- Le script de reprise `import-whatsapp-cash-reports.mjs` ne réécrit toujours que `whatsapp_backfill` :
  une ligne `whatsapp_live` y apparaît comme « protégée ». L'export manuel devient un outil de secours.
- `report_date` : date du titre « RAPPORT DU jj/mm/aaaa » en priorité, sinon date d'envoi du message
  (fuseau `Africa/Douala`), avec avertissement dans la réponse et le log.
- Boutique : ligne « Boutique … », sinon vote des opérateurs connus dans `staff`, sinon carte
  `WHATSAPP_CASH_AUTHOR_STORES` (numéro d'auteur → code boutique). Non résolue → message ignoré (200,
  `store_unresolved`) et loggé sans contenu.
- Les logs et réponses ne contiennent ni texte de message ni donnée nominative (identifiant WAHA seulement).

## Vérification

- `npx vitest run tests/whatsapp-cash-import.test.ts tests/whatsapp-cash-webhook.test.ts` (35 tests) :
  parseur partagé, authentification HMAC / secret, filtrage des livraisons, dates, plan d'écriture.
- `deno check supabase/functions/whatsapp-cash-webhook/index.ts`.
- Après déploiement : `npm run db:status` (migration `20261111_001` appliquée), puis
  `select source, count(*) from store_cash_reports group by 1` doit montrer des lignes `whatsapp_live`
  après la première clôture postée dans le groupe.
