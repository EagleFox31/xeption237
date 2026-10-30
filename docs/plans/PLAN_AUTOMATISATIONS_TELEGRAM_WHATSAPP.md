# Plan d'exécution — automatisations Telegram & WhatsApp restantes

> **Exécutant** : Gemini · **Superviseur / relecteur** : Claude · **Validation prod** : l'utilisateur
> **Date** : 2026-10-27 · **Statut** : à démarrer (Lot 1 en premier)

## 0. Règles du jeu (non négociables)

Lire d'abord `AGENTS.md` (§ « Règles de livraison — tout agent ») et `docs/engineering/NOTIFICATIONS.md`.

- **Un lot = une branche = une PR** (`feat/auto-<lot>`), petits commits, identité EagleFox31, aucun trailer
  ni mention d'IA. Exclure `package-lock.json`, `public/sitemap.xml`, `PASSATION.md`.
- **Points d'arrêt obligatoires** — s'arrêter et demander la relecture du superviseur :
  - 🛑 **R1** avant d'écrire une migration : coller la sortie de `npm run db:introspect -- <table>`.
  - 🛑 **R2** avant `npm run db:apply` : migration + tests prêts, PR ouverte.
  - 🛑 **R3** avant tout `supabase functions deploy` : code commité, tests verts. Le déploiement est lancé
    ou validé par l'utilisateur.
- Migrations : préfixe `AAAAMMJJ_NNN` unique (lister `supabase/migrations/<date>_*`), idempotentes,
  additives ; toute fonction `SECURITY DEFINER` → `REVOKE ALL … FROM PUBLIC, anon` + `GRANT` explicite
  (le test `tests/migrations-security-definer-acl.test.ts` doit rester vert).
- Modules : logique dans `supabase/functions/_shared/<feature>.ts` + tests ; `telegram-bot-entry/index.ts`
  ne fait que router. Pas d'import `utils/` depuis `supabase/functions/`.
- Notifications : passer par `admin_notifications` (+ `dedup_key` déterministe) → `notify-staff` relaie.
  Ne jamais appeler Telegram/WAHA en direct depuis un nouveau code.
- **Données** : aucun vrai nom / téléphone / IMEI dans tests, docs, logs. Le groupe WhatsApp ne reçoit
  jamais de données client (enveloppe canonique Trigenys Notify).
- Nouveau type d'événement = l'ajouter à la matrice de `NOTIFICATIONS.md`, à `NotificationEventType`
  (`services/notificationService.ts`), et l'annoncer (règle 5).
- Constantes nommées (seuils en jours, etc.), jamais de nombres magiques ; fuseau `Africa/Douala`.
- Tout incident → `docs/engineering/ERRORS_LOG.md`.
- Réseau local : `$env:GODEBUG="tlsmlkem=0,tlskyber=0"` (Supabase CLI) et
  `$env:NODE_OPTIONS="--tls-max-v1.2"` (scripts Node).

**Compte rendu attendu à chaque fin de lot** : fichiers touchés, migrations (appliquées ou non),
`npx vitest run <tests>` avec résultat, `db:status`/`db:verify`, déployé ou non.

---

## Lot 1 — Rappels staff liés au temps (priorité 1)

Aujourd'hui, toutes les notifications naissent d'un événement. Il manque les rappels « rien ne s'est
passé depuis X ». Mécanisme : **une fonction SQL appelée par pg_cron** (toutes les heures) qui insère
dans `admin_notifications` avec une `dedup_key` qui empêche les doublons.

| Rappel | Condition | `event_type` | `dedup_key` | Canal |
|---|---|---|---|---|
| Troc non contacté | `trade_in_requests.status` ∈ (`pending`, `accepted`) depuis > `TROC_STALE_HOURS` (48) | `troc_stale` | `troc_stale.<id>` (1 seule fois) | in-app + Telegram |
| Bon troc bientôt expiré | `voucher_expires_at` dans < `VOUCHER_EXPIRY_WARN_HOURS` (48) et dossier non `completed` | `voucher_expiring` | `voucher_expiring.<id>` | in-app + Telegram + WhatsApp |
| Dette client ancienne | `store_debts.status` ∈ (`active`, `partial`) et `created_at` > `DEBT_REMINDER_DAYS` (7) | `debt_overdue` | `debt_overdue.<id>.<semaine ISO>` (1 par semaine) | in-app + Telegram |

À faire :
1. 🛑 R1 : introspecter `trade_in_requests`, `store_debts`, `admin_notifications`. Vérifier les colonnes
   réelles de date de changement de statut (sinon utiliser `updated_at` et le documenter).
   Vérifier comment les jobs cron existants lisent `CRON_SECRET` (Vault `cron_secret`) et sont créés.
2. Migration : fonction `public.notify_time_based_reminders()` (`SECURITY DEFINER`, `search_path` fixé,
   `INSERT … ON CONFLICT (dedup_key) DO NOTHING`), REVOKE/GRANT, job pg_cron
   `time-based-reminders-hourly` (unschedule puis schedule = idempotent).
   `store_debts` n'a pas de date d'échéance : **ne pas ajouter de colonne** dans ce lot (ancienneté seule).
3. Lien des notifications : `link_to_tab` = `troc` (+ id) ou l'onglet caisse/dettes existant.
4. WhatsApp : ajouter `voucher_expiring` à `WAHA_DEFAULT_EVENT_TYPES` (`_shared/staffNotifyChannels/waha.ts`)
   avec un libellé métier fixe sans données client ; mettre à jour son test.
5. Tests : test SQL ou test Vitest sur le texte de la migration (dédup, REVOKE) + test du libellé WAHA.
6. Docs : matrice `NOTIFICATIONS.md` (3 lignes, statut ✅), suppression de la mention « Hors MVP » § troc.

**Critères d'acceptation** : relancer la fonction deux fois = zéro doublon ; un dossier rappelé ne l'est
plus ensuite (troc, bon) ; une dette reçoit au plus un rappel par semaine ; aucune donnée client sur WhatsApp.

---

## Lot 2 — Reçu client WhatsApp après vente comptoir (priorité 2)

Le bot demande déjà « prénom + numéro WhatsApp du client » (`_shared/telegramSale.ts`) mais n'envoie rien.

**Choix imposé** : **lien `wa.me` pré-rempli** affiché au vendeur dans le bot (bouton
« 📲 Envoyer le reçu au client ») — le vendeur l'ouvre et envoie depuis le WhatsApp de la boutique.
**Pas d'envoi WAHA vers des numéros clients** (consentement + risque de bannissement du numéro).

À faire :
1. `_shared/saleReceipt.ts` : `formatSaleReceiptText(sale)` (lignes, remise, total, moyen de paiement,
   boutique, date, référence) et `buildWhatsAppReceiptLink(phone, text)` (normalisation `237`, encodage URL).
   Fonctions pures, testées (numéro invalide → pas de bouton, texte > limite → tronqué proprement).
2. Brancher le bouton après `telegram_staff_complete_sale` réussi, uniquement si un numéro valide a été saisi.
3. Ne rien stocker de plus en base dans ce lot.

**Critères** : tests verts ; reçu lisible en français ; aucun numéro réel dans les tests.

---

## Lot 3 — Paiement mixte au comptoir (priorité 3)

Aujourd'hui `payment_method` est unique (`PAY_CODES` : CASH / OM / MOMO).

1. 🛑 R1 : introspecter `telegram_staff_complete_sale` (définition actuelle), les tables de vente et
   `order_payments` (table créée à la main, sans migration : la lire, ne pas la recréer).
2. Proposer **au superviseur** (avant de coder) le modèle : réutiliser `order_payments` (plusieurs lignes par vente)
   vs colonne JSON. Rester rétrocompatible : une vente à un seul moyen = comportement identique.
3. Bot : écran « Paiement mixte » → saisie montant espèces, le reste en OM/MoMo ; somme = total exigée.
4. Le rapport de caisse journalier (`telegramCashReport.ts`) doit ventiler correctement les montants.

**Critères** : anciens tests de vente/caisse verts sans modification ; nouveaux tests pour la ventilation.

---

## Lot 4 — Vente avec reprise (bon troc déduit) (priorité 4)

1. Dans le tunnel de vente : « 🔁 Bon troc » → saisie de `voucher_reference` → contrôle (dossier `validated`,
   non expiré via la logique de `utils/trocVoucher.ts` portée côté Deno dans `_shared/`, non déjà utilisé).
2. Reste à encaisser = total − valeur du bon ; le dossier passe à `completed` dans **la même transaction**
   que la vente (RPC). Réutiliser `voucher_reference` / `status` / `admin_notes`, ne pas créer de système de bon.
3. 🛑 R1 + proposition de design au superviseur avant de toucher la RPC de vente.

**Critères** : un bon ne peut servir qu'une fois ; bon expiré refusé avec message clair ; `troc_completed`
émis normalement.

---

## Lot 5 — Notification `order_paid` (priorité 5)

1. Repérer où le webhook de paiement en ligne (CamPay) marque la commande payée.
2. Émettre `order_paid` via `admin_notifications` (`dedup_key` = `order_paid.<order_id>`), Telegram +
   WhatsApp (libellé fixe sans données client).
3. Tests sur l'idempotence (webhook rejoué = une seule notification).

---

## Hors périmètre (ne pas faire sans nouvelle décision)

- Envoi WhatsApp automatique vers des clients (WAHA) : nécessite opt-in, modèle de consentement et
  numéro dédié.
- Facture PDF, réservation avec acompte, transfert inter-boutiques : à cadrer séparément.
- `order_shipped` / emails client.

## Suivi

| Lot | Branche | PR | R1 | R2 | R3 | Statut |
|---|---|---|---|---|---|---|
| 1 Rappels | feat/auto-lot1 | #33 | ✅ | ✅ | — (SQL seul) | ✅ appliqué 2026-10-27, fusionné |
| 2 Reçu WhatsApp | feat/auto-lot2 | #34 | — | — | ✅ | ✅ fusionné, `telegram-bot-entry` déployé 2026-10-28 (test panier lourd à faire) |
| 3 Paiement mixte | feat/auto-lot3 | #35 | ✅ | ✅ | ✅ | ✅ appliqué 2026-10-29, fusionné et déployé |
| 4 Bon troc en vente | feat/auto-lot4 | #36 | ✅ | ✅ | ✅ | ✅ appliqué 2026-10-29, fusionné et déployé |
| 5 order_paid | feat/auto-lot5 | #37 | — (sans migration) | — | ✅ | ✅ fusionné, `payment-webhook`, `get-payment-status`, `notify-staff` déployés 2026-10-30 (limite acceptée : notification perdue sans nouvel essai si son insertion échoue) |
