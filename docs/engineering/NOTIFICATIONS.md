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
| Commande créée *(futur)* | `order.created.<order_id>` |

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
| `troc_submitted` | Trigger DB sur `trade_in_requests` (`pending`) | tous staff | in-app | ✅ MVP |
| `troc_completed` | Trigger DB sur `trade_in_requests` (`completed`) | tous staff | in-app | ✅ MVP |
| `troc_refused` | Trigger DB sur `trade_in_requests` (`refused`) | tous staff | in-app | ✅ MVP |
| `order_created` | Client code `useOrderProcess` success | tous staff | in-app | 🟡 Roadmap |
| `order_paid` | Client code (webhook paiement) | tous staff | in-app + email | 🟡 Roadmap |
| `order_shipped` | Admin action manuelle | **client (email)** | email | 🟡 Roadmap |
| `sync_success` / `sync_failure` | Hook `useOfflinePos` (déjà intégré via shim) | vendeur concerné | in-app (silencieux pour `success`) | ✅ MVP (via shim legacy) |
| `stock_alert` | RPC stock sur seuil bas | `responsable`+ | in-app | 🟡 Roadmap |
| `security_alert` | `useAdminData` sur `security_events` (déjà intégré via shim) | `direction`+ | in-app | ✅ MVP (via shim legacy) |

### Événements SMART TROC intermédiaires (`accepted → contacted → appointment`)

**Choix conscient : pas de notification push.** Rationale :
- Ces transitions sont *team-internal* (le staff décide quand il passe à l'étape suivante).
- Les voir dans un push alourdirait l'inbox sans valeur ajoutée.
- Elles sont **traçables** dans la timeline du modal `TrocDetailsModal` (livré par #11) et dans le dashboard conversion (livré par #12).

Si le besoin d'une notif intermédiaire émerge (ex: "le dossier n'a pas été contacté depuis 48h"), c'est un cas de notification *dérivée du temps* — pas de l'événement — et doit passer par un cron DB plutôt que ce trigger. Hors MVP #17.

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
- **Digest quotidien** par email aux `direction` → cron Edge Function.
