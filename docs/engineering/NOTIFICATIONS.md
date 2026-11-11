# Notifications admin — contrat & matrice

> Issue de référence : [#17 — Scope and implement Xeption customer/admin notifications](https://github.com/EagleFox31/xeption237/issues/17).
> État de ce doc : **MVP livré** (persistance DB + dédup + SMART TROC slice). Les extensions email/SMS et notifs customer sont dans la roadmap plus bas.

## Modèle de données

Table `admin_notifications` (migration `20260923_006_admin_notifications.sql`) :

| Colonne | Type | Rôle |
|---|---|---|
| `id` | UUID | PK |
| `dedup_key` | TEXT UNIQUE | signature stable de l'événement (ex: `troc.submitted.<request_id>`) → prévient les doublons |
| `event_type` | TEXT | type structuré (`troc_submitted`, `order_created`, etc.) — pilote le routing UI |
| `title`, `message` | TEXT | corps affiché |
| `link_to_tab` | TEXT | onglet admin cible (deep-link UI) |
| `link_to_id` | TEXT | ID de l'entité pointée (ouverture modal détail) |
| `target_role` | TEXT | `NULL` = toute l'équipe staff. Sinon rôle requis (ex: `direction`) |
| `created_at` | TIMESTAMPTZ | horodatage |
| `read_at` | TIMESTAMPTZ | **team-shared** : quand un staff marque lu, c'est lu pour toute l'équipe |
| `created_by` | TEXT | `trigger` \| `system` \| email staff |

### Pourquoi `read_at` team-shared

Chez Xeption l'équipe staff est petite (~3–5 personnes). Un modèle per-user demanderait une table de jointure `notification_reads(notification_id, user_id, read_at)` et plus de logique UI. Pour l'instant, la convention "qui lit en premier déclare l'équipe informée" est suffisante. **Évolution per-user** : à mettre si le staff passe à 20+ personnes ou si des conflits de visibilité apparaissent.

## Dédup : comment ça marche

Chaque événement susceptible de créer une notification définit une `dedup_key` **déterministe** à partir de ses attributs stables :

| Événement | Convention `dedup_key` |
|---|---|
| Soumission troc client | `troc.submitted.<request_id>` |
| Troc clôturé | `troc.completed.<request_id>` |
| Troc refusé | `troc.refused.<request_id>` |
| Commande créée | `order.created.<order_id>` |
| Commande payée en ligne | `order_paid.<order_id>` |

L'INSERT utilise `ON CONFLICT (dedup_key) DO NOTHING`. Résultat :
- Rejeu du trigger sur la même transition → aucune duplication
- Appel manuel depuis le code client qui crée la même notif → aucune duplication
- Sync offline qui réapplique des évènements → aucune duplication

## Flux de création

Deux chemins, un seul contrat :

```
┌────────────────────┐          ┌──────────────────────┐
│  Trigger DB        │  INSERT  │                      │
│  (anonymous OK via │─────────▶│  admin_notifications │
│   SECURITY DEFINER)│          │  (UNIQUE dedup_key)  │
└────────────────────┘          │                      │
                                │                      │
┌────────────────────┐          │                      │
│  Service client    │  INSERT  │                      │
│  createNotification│─────────▶│                      │
│  (staff auth, RLS) │          └──────────────────────┘
└────────────────────┘                     │
                                           ▼
                               ┌──────────────────────┐
                               │  Supabase Realtime   │
                               │  (postgres_changes)  │
                               └──────────────────────┘
                                           │
                                           ▼
                               ┌──────────────────────┐
                               │ useAdminNotifications│
                               │   → toast + drawer   │
                               └──────────────────────┘
```

## Contrat non-régressif

**Un échec de notification ne doit JAMAIS casser la transaction métier qui l'a déclenchée.**

Garanties :
1. **Trigger DB** : encapsulé dans `BEGIN ... EXCEPTION WHEN OTHERS` → tout échec logge un `WARNING` et laisse la transaction parente aboutir.
2. **Service client** (`createNotification`) : capture `error`, loggue en `console.warn`, retourne `null`. Jamais de `throw`.
3. **Hook** (`useAdminNotifications`) : fallback silencieux si Supabase down. L'app continue, les notifs vivent le temps de la session.

## Matrice — Événement → Recipient → Channel

> Statut : **MVP** = livré. **Roadmap** = planifié mais non implémenté.

| Événement | Déclencheur | Recipient (`target_role`) | Channel | Statut |
|---|---|---|---|---|
| `order_created` | Trigger DB `trg_notify_order_created` sur `orders` | tous staff | in-app + Telegram + WhatsApp | ✅ Livré |
| `troc_submitted` | Trigger DB sur `trade_in_requests` (`pending`) | tous staff | in-app + Telegram + WhatsApp | ✅ Livré |
| `troc_completed` | Trigger DB sur `trade_in_requests` (`completed`) | tous staff | in-app + Telegram | ✅ MVP |
| `troc_refused` | Trigger DB sur `trade_in_requests` (`refused`) | tous staff | in-app + Telegram | ✅ MVP |
| `pos_sale` | RPC `telegram_staff_complete_sale` (vente comptoir du bot Telegram) | tous staff | in-app + groupe Telegram | ✅ |
| `order_paid` | Confirmation paiement en ligne CamPay (`patchOrderPaymentPaid`) | tous staff | in-app + Telegram + WhatsApp | ✅ Livré |
| `order_shipped` | Admin action manuelle | **client (email)** | email | 🟡 Roadmap |
| `sync_success` / `sync_failure` | Hook `useOfflinePos` (déjà intégré via shim) | vendeur concerné | in-app (silencieux pour `success`) | ✅ MVP (via shim legacy) |
| `stock_low` / `stock_out` | Trigger DB sur `products.stock` (franchissement du seuil 2, puis 0) | tous staff | in-app + Telegram + WhatsApp | ✅ |
| `marketplace_listed` | Trigger DB sur `marketplace_listings` (INSERT) | tous staff | in-app + Telegram | ✅ |
| `product_missing_image` | Trigger DB sur `products` (INSERT ou `image` vidée/invalide), 1 fois par jour et par produit | tous staff | in-app + Telegram | ✅ |
| `stock_correction` | RPC `telegram_staff_stock_correct` (bot : « ✏️ Corriger le stock », chiffre compté + motif), 1 par correction | tous staff | in-app + Telegram | ✅ |
| `store_cash_report` | Clôture journalière de caisse (`actionCashReportSubmit`) | tous staff | in-app + groupe Telegram + WhatsApp (Trigenys Notify) | ✅ |
| `troc_stale` | pg_cron horaire `notify_time_based_reminders()` (dossier troc sans contact depuis > 48 h, créé il y a < 14 j) | responsable | in-app + Telegram | ✅ Livré |
| `voucher_expiring` | pg_cron horaire `notify_time_based_reminders()` (bon troc expirant dans < 48 h, statut actif) | responsable | in-app + Telegram + WhatsApp | ✅ Livré |
| `debt_overdue` | pg_cron horaire `notify_time_based_reminders()` (résumé hebdo par boutique des dettes > 7 j) | tous staff | in-app + Telegram + WhatsApp (`finance.debt_overdue`, depuis le 02/11/2026) | ✅ Livré |
| `daily_digest` | pg_cron `daily-digest-evening` 21:00 UTC (22 h Douala, depuis `20261111_002` ; 20 h auparavant) → `notify_daily_digest()` : bilan du jour par boutique active (ventes, canaux, caisse, dettes, trocs, objectifs), dedup `daily_digest.<store_code>.<YYYY-MM-DD>` | responsable | in-app + Telegram (bouton « ✅ Vu » → `ack_staff_notification_from_telegram`) ; WhatsApp non (type non accepté par Trigenys Notify) | ✅ Livré le 07/11/2026 (ADR-001). Depuis le 10/11/2026 (`20261110_001`) : « Dettes en cours » = `store_debts` ouvertes, sinon repli sur le `debts_snapshot` du dernier rapport de caisse (import WhatsApp), avec la date du rapport. Depuis le 11/11/2026 (`20261111_003`) : « Mouvements caisse : +entrées · −sorties », « ⚠ Écart de caisse » si ouverture + entrées − sorties ≠ clôture, et variation du reste dettes vs rapport précédent |
| `stock_alert` | (remplacé par `stock_low` / `stock_out`) | — | — | — |
| `security_alert` | `useAdminData` sur `security_events` (déjà intégré via shim) | `direction`+ | in-app | ✅ MVP (via shim legacy) |

### Répartition des canaux : Telegram vs WhatsApp

- **Groupe Telegram (Opérations & Actions interactives)** :
  - Reçoit **tous** les événements du système (`TELEGRAM_EVENT_TYPES` complet).
  - Porte les flux interactifs avec boutons en ligne : création de produit (`prodReviewCb`), validation (`prodPublishCb`), masquage (`prodUnpublishCb`), suppression (`prodRejectConfirmCb`), tickets de caisse comptoir, clôtures de caisse.
- **Bouton d'envoi de reçu client WhatsApp (Bot Telegram - Vente comptoir)** :
  - Sur chaque vente comptoir enregistrée (`actionSaleComplete`), comme le téléphone client y est obligatoire, le bot Telegram propose systématiquement au vendeur un bouton interactif `📲 Envoyer le reçu au client`.
  - Ce bouton ouvre l'application WhatsApp du vendeur avec un message pré-rempli (`wa.me`) contenant le reçu détaillé (tronqué à 1 600 caractères max), sans envoi automatique backend (zéro risque de signalement spam ou de ban de numéro boutique).
- **Groupe WhatsApp (Urgences commerciales, Stocks critiques & Clôtures)** :
  - Événements configurés (`WAHA_DEFAULT_EVENT_TYPES = ['order_created', 'order_paid', 'troc_submitted', 'voucher_expiring', 'stock_out', 'stock_low', 'store_cash_report', 'debt_overdue']`).
  - ⚠️ Chaque alias de `NOTIFY_EVENT_ALIASES` doit aussi figurer dans `ALLOWED_TYPES` de Trigenys Notify (`src/core/dispatch.ts`), sinon l'envoi est refusé en **HTTP 400** (`notify_http_400` dans `notification_deliveries.last_error`). Garde-fou : test miroir dans `tests/waha-notify-channel.test.ts`.
  - Rappel dettes : uniquement le nom de la boutique, le nombre de dettes de plus de 7 jours et le reste à encaisser (aucun nom client).
  - Protégé contre la fuite de données personnelles (enveloppe canonique Trigenys Notify sans noms ni numéros clients).
  - Clôtures de caisse : mappées sur l'événement canonique `cash_report.closed` avec les faits métier (`closingCashXaf`, `totalInflowXaf`, `totalOutflowXaf`, `actor`), bridgées vers le bon groupe WhatsApp par Trigenys Notify.

### Ingestion automatique des rapports de caisse WhatsApp (`whatsapp-cash-webhook`)

Sens **entrant** : les rapports « 📊 RAPPORT DU jj/mm/aaaa » postés par les boutiques dans le groupe WhatsApp
caisse sont écrits dans `store_cash_reports` (`source = 'whatsapp_live'`) sans export manuel.
Décision et alternatives : [ADR-002](../adr/ADR-002-whatsapp-cash-webhook.md).

- **Flux** : WAHA (`trigenys-notify`, VPS OVH) → webhook `POST /functions/v1/whatsapp-cash-webhook` →
  `_shared/whatsappCashReport/` (filtrage, parseur, boutique, plan d'écriture) → `store_cash_reports`.
  Le parseur est **le même code** que le script de reprise `scripts/import-whatsapp-cash-reports.mjs`
  (shims `scripts/lib/cashReportText.mjs`, `cashReportStoreResolver.mjs`).
- **Authentification** : `WHATSAPP_CASH_WEBHOOK_HMAC_KEY` (HMAC-SHA512 du corps brut, en-têtes WAHA
  `X-Webhook-Hmac` / `X-Webhook-Hmac-Algorithm`) ; à défaut `WHATSAPP_CASH_WEBHOOK_SECRET` attendu dans
  `X-Webhook-Secret` (`customHeaders` WAHA). Aucun des deux → 503, signature invalide → 401.
- **Filtrage** : événements `message` / `message.any`, expéditeur `…@g.us` uniquement, groupe dans
  `WHATSAPP_CASH_GROUP_IDS` si renseigné, texte reconnu rapport (`isCashReportMessage`). Tout le reste →
  200 `ignored` (WAHA ne rejoue pas).
- **Boutique** : ligne « Boutique … » → vote des opérateurs connus (`staff.store_id`) → carte
  `WHATSAPP_CASH_AUTHOR_STORES` (`{"2376XXXXXXXX":"MFOUNDI"}`). Non résolue → 200 `skipped`.
- **Date** : titre du rapport ; sinon date d'envoi (`Africa/Douala`) avec `date_from_message` ; écart
  titre / envoi → `date_differs_from_message`.
- **Idempotence** (`planUpsert`) sur `(store_id, report_date)` : absent → `insert` ; `whatsapp_live` ou
  `whatsapp_backfill` différent → `update`, identique → `unchanged` ; **`bot` → `protected`, jamais réécrit**.
  Le script de reprise, lui, ne réécrit que `whatsapp_backfill` : il signale les lignes `whatsapp_live`
  comme protégées. Erreur base → 500 (WAHA rejoue, l'écriture reste idempotente).
- **Confidentialité** : logs et réponses = action, code boutique, date, avertissements, identifiant WAHA.
  Jamais le texte du message ni un nom.

**Déploiement — une commande, idempotente** (`scripts/deploy-whatsapp-cash-webhook.mjs`) :

```bash
npm run deploy:whatsapp-cash              # plan : lecture seule, montre l'état réel et les actions restantes
npm run deploy:whatsapp-cash -- --apply   # exécute uniquement ce qui manque
```

Le script inspecte puis réconcilie, dans l'ordre : **migration** `20261111_001` (sautée si tracée dans
`schema_migrations`) → **secrets** Supabase (comparés par empreinte SHA-256 ; `WHATSAPP_CASH_WEBHOOK_HMAC_KEY`
générée si absente ; `WHATSAPP_CASH_GROUP_IDS` / `WHATSAPP_CASH_AUTHOR_STORES` pilotés seulement si fournis via
`--group=<id>@g.us` ou `.env`) → **fonction** (`functions deploy … --no-verify-jwt --use-api`, seulement si les sources sont plus récentes que le
déploiement, ou `--redeploy`) → **webhook WAHA**
sur le VPS via SSH (l'API WAHA n'écoute que sur `127.0.0.1:3000` ; clé API lue dans l'env du conteneur côté VPS,
clé HMAC transmise par stdin). Seule **notre** entrée de `config.webhooks` est ajoutée ou alignée ; les autres
webhooks de la session sont conservés. Un second `--apply` convergé = zéro écriture.

- Session WAHA : la seule en `WORKING` par défaut, sinon `--session=<nom>` (ou `WAHA_SESSION`). ⚠️ `PUT /api/sessions`
  **redémarre la session** (quelques secondes sans réception).
- Clé HMAC déjà en place côté Supabase mais inconnue localement : la fournir dans l'env (`WHATSAPP_CASH_WEBHOOK_HMAC_KEY`)
  ou `--rotate-key` (régénère et aligne les deux côtés). `--skip-vps` / `--skip-deploy` pour une étape seule.
- Accès requis : `DATABASE_URL` (ou `SUPABASE_DB_PASSWORD`) dans `.env` (depuis un worktree git, celui du
  dépôt principal est repris automatiquement), CLI Supabase connectée, clé SSH
  `~/.ssh/id_ed25519_fleet_vps` (surcharges : `WAHA_VPS_SSH`, `WAHA_VPS_SSH_KEY`, `WAHA_CONTAINER`, `WAHA_LOCAL_URL`).
- Rien n'est affiché en clair : empreintes seulement. L'identifiant du groupe (`…@g.us`) se lit dans
  `GET /api/<session>/groups`. Vérification : `select source, count(*) from store_cash_reports group by 1`.

### Événements SMART TROC intermédiaires (`accepted → contacted → appointment`)

**Choix conscient : pas de notification push.** Rationale :
- Ces transitions sont *team-internal* (le staff décide quand il passe à l'étape suivante).
- Les voir dans un push alourdirait l'inbox sans valeur ajoutée.
- Elles sont **traçables** dans la timeline du modal `TrocDetailsModal` (livré par #11) et dans le dashboard conversion (livré par #12).

La relance pour un troc sans contact depuis 48 h (créé il y a moins de 14 jours) est assurée par le job pg_cron `time-based-reminders-hourly` appelant `public.notify_time_based_reminders()` (Lot 1, événement `troc_stale`).

## Relais externes multi-canal (Telegram, puis WhatsApp…)

Migration `20261020_002_staff_notification_deliveries.sql` + Edge Function `notify-staff`.

- `admin_notifications` = boîte d'envoi, indépendante des canaux. `notification_deliveries`
  trace l'envoi par `(notification_id, channel)`.
- pg_cron (`notify-staff-every-minute`) appelle `notify-staff` tant qu'une notification a moins de 24 h.
  Pour chaque canal configuré : `claim_notification_deliveries(channel, event_types)` réclame
  (`FOR UPDATE SKIP LOCKED`, 5 essais max), l'adaptateur envoie, puis `sent_at` est posé.
  Échec → `last_error`, nouvel essai à la minute suivante.
- Contrat d'un canal : `StaffNotifyChannel` (`_shared/staffNotify.ts`). Adaptateurs dans
  `_shared/staffNotifyChannels/` (Telegram : `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
  `TELEGRAM_EVENT_TYPES` optionnel). Un canal sans ses secrets est ignoré.
- **Ajouter WhatsApp** : écrire `staffNotifyChannels/whatsapp.ts` (`createWhatsAppChannel(env, fetch)`,
  texte via `formatPlainNotification`), l'ajouter dans `buildChannels()` de `notify-staff`, poser ses
  secrets. Aucune migration.
- Lien du bouton (`notificationLink`) : `link_to_tab` + `link_to_id` → `/admin/<onglet>/<id>` pour
  `inventory` (ouvre la fiche produit) et `troc` (ouvre le dossier) ; sinon l'onglet seul. L'admin lit
  l'id via `parseAdminItemIdFromPath` (`utils/adminRoutes.ts`), ouvre l'élément puis revient à
  `/admin/<onglet>`. Le tiroir de notifications in-app suit le même chemin.
- Les jobs cron (`notify-staff-every-minute`, `snapshot-market-prices-weekly`) lisent `CRON_SECRET`
  dans Vault (`cron_secret`), jamais en clair dans une migration. Rotation :
  `node scripts/rotate-cron-secret.mjs` (Vault + secret Edge, valeur jamais affichée).

## Comment ajouter un nouvel événement

1. **Choisir une `dedup_key` déterministe** (basée sur l'ID de l'entité + le type d'événement).
2. **Si l'événement est métier (trigger DB)** : étendre `notify_trade_in_status_change` ou créer un nouveau trigger équivalent dans une migration.
3. **Si l'événement est UI (staff click)** : appeler `createNotification({ eventType, title, message, dedupKey, linkToTab, linkToId })` depuis le composant.
4. **Mettre à jour cette matrice** ↑ et le type `NotificationEventType` dans `services/notificationService.ts`.

## Roadmap (hors MVP #17)

- **Email customer** pour `order_shipped`, `troc_completed` quand le client a fourni un email → nouveau canal via Edge Function + template.
- **SMS WhatsApp** pour les CTAs clients (déjà en place via `whatsappShare.ts`, à harmoniser).
- **Notifs per-user** si l'équipe staff dépasse 10 personnes (table `notification_reads`).
- **Préférences utilisateur** (opt-out par type) → table `staff_notification_preferences`.
- **Rapports de caisse WhatsApp** : ingestion automatique livrée (`whatsapp_live`, [ADR-002](../adr/ADR-002-whatsapp-cash-webhook.md)) ; déploiement en une commande : `npm run deploy:whatsapp-cash -- --apply` (plan sans `--apply`). Ensuite : alerte si une boutique n'a rien posté à 21 h.
- **Digest quotidien** : livré sur Telegram (`daily_digest`, voir [ADR-001](../adr/ADR-001-daily-digest-telegram.md)). Reste à faire : commandes bot `/jour` et `/ventes` (bilan à la demande), relais WhatsApp quand Trigenys Notify acceptera le type, variante email `direction`.
