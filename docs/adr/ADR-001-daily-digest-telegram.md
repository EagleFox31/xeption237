# ADR-001 — Rapport journalier du bot Telegram : fonction SQL + pg_cron + outbox

- **Statut** : accepté — 2026-11-07
- **Contexte** : la direction veut un bilan de chaque boutique chaque soir dans le groupe staff
  Telegram (ventes, canaux de paiement, caisse clôturée ou non, dettes, trocs en attente,
  objectifs). La chaîne sortante existante est : `admin_notifications` (dedup_key UNIQUE) →
  outbox `notification_deliveries` (`claim_notification_deliveries`) → Edge Function
  `notify-staff` (pg_cron chaque minute) → adaptateur `staffNotifyChannels/telegram.ts`.
  Règle du dépôt (`docs/plans/PLAN_AUTOMATISATIONS_TELEGRAM_WHATSAPP.md`) : aucun appel
  Telegram direct depuis du nouveau code.

## Décision

Le digest est produit **en base** par `public.notify_daily_digest(p_day date DEFAULT NULL)`
(SECURITY DEFINER, service_role seulement, même style que `notify_time_based_reminders`),
planifiée par pg_cron sous le nom `daily-digest-evening` (`0 19 * * *` UTC = 20 h Douala ; décalée à 22 h Douala — `0 21 * * *` UTC — par `20261111_002`, les rapports WhatsApp du soir arrivant après 20 h).
Elle insère **une notification par boutique active** avec
`event_type = 'daily_digest'` et `dedup_key = 'daily_digest.<store_code>.<YYYY-MM-DD>'`
(date Africa/Douala), `ON CONFLICT (dedup_key) DO NOTHING`. L'envoi Telegram reste à la
charge de l'outbox et de `notify-staff` ; le format dédié vit dans `_shared/staffNotify.ts`
(`dailyDigestLines`) et le bouton « ✅ Vu » appelle la RPC existante
`ack_staff_notification_from_telegram` depuis `telegram-bot-entry`.

Choix de données :

| Bloc | Source | Règle |
|---|---|---|
| Ventes | `orders_reportable` | commandes sans `store_id` rattachées à la boutique `is_default` |
| Canaux | `order_payments` (`status = 'paid'`) | sinon repli sur `orders.payment_method` |
| Caisse | `store_cash_reports` (store, date) | clôturée si une ligne existe ; depuis `20261111_003` : mouvements (+entrées · −sorties) et « ⚠ Écart de caisse » si ouverture + entrées − sorties ≠ clôture |
| Dettes | `store_debts` (`active`, `partial`) | nombre + reste à encaisser |
| Trocs | `trade_in_requests` | statuts ouverts, compteur global (pas de boutique sur un troc) |
| Objectifs | `sales_targets` (`scope_type = 'store'`) | jour / semaine / mois actifs, CA via `orders_reportable` |

Paramètres nommés dans le `DECLARE` (fuseau, statuts, libellés de canaux) ; l'horaire du
cron est une constante du bloc de planification. Aucun nombre magique dans le corps.

## Alternatives écartées

- **Edge Function dédiée qui appelle `sendMessage`** : contredit la règle outbox, perd la
  dédup et le rejeu sûr de `notification_deliveries`.
- **Agrégation côté `notify-staff` au moment de l'envoi** : la fonction n'a pas de notion
  de « journée » ni d'idempotence par boutique ; le SQL est testable par un simple `select`.
- **Réutiliser `get_sales_targets_progress()`** : elle lit `auth.jwt()` et refuse un appel
  cron ; les objectifs boutique sont donc recalculés directement.
- **Table de configuration pour l'heure et les seuils** : YAGNI tant qu'un seul horaire
  existe ; une constante nommée est plus simple à relire et à tester.

## Conséquences

- Nouveau type `daily_digest` : ajouté à `DEFAULT_STAFF_EVENT_TYPES` et
  `NotificationEventType`. Si `TELEGRAM_EVENT_TYPES` est surchargé en prod, y ajouter
  `daily_digest` (sinon le canal l'ignore). WhatsApp (WAHA) non concerné : Trigenys Notify
  n'accepte pas encore ce type (voir `tests/waha-notify-channel.test.ts`).
- `target_role = 'responsable'` : le bouton « Vu » est réservé aux responsables et à la
  direction (la RPC renvoie `42501` pour un vendeur).
- Un soir sans vente produit quand même un digest (« 0 vente ») : l'absence de message
  signalerait une panne, pas une journée calme.

## Vérification

Le dépôt n'a pas de harnais SQL exécutable en CI ; les tests Vitest vérifient la
structure de la migration et le format. Contrôle manuel après `npm run db:apply` :

```sql
select public.notify_daily_digest();          -- renvoie N = nombre de boutiques actives
select public.notify_daily_digest();          -- renvoie 0 : rien d'inséré
select dedup_key, title from public.admin_notifications
 where event_type = 'daily_digest' order by created_at desc limit 5;
```

## Amendement 2026-11-10 — source des dettes

`notify_daily_digest` lisait uniquement `store_debts` (bot caisse). Les dettes des rapports WhatsApp importés
(`store_cash_reports.debts_snapshot`) n'apparaissaient donc pas. Migration `20261110_001` : par boutique,
`store_debts` prime ; sans dette ouverte, repli sur le `debts_snapshot` (reste > 0) du dernier rapport daté
`<= jour`, avec la date du rapport dans la ligne. Pas de cumul des deux sources (évite les doublons au
prochain import). Alternative écartée : recopier le snapshot dans `store_debts` (doublons à chaque import).
