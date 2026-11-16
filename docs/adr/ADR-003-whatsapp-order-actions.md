# ADR-003 — Actions sur les alertes commande dans le groupe WhatsApp staff

- **Statut** : accepté — 2026-11-16 (proposé le 2026-11-14). Mise en œuvre par étapes, voir « Déploiement ». Le contrat dépend d'une évolution
  de Trigenys Notify (dépôt `Trigenys/trigenys-notify`), qui doit l'accepter dans son propre ADR.
- **Contexte** : depuis la PR #57, une alerte commande sur Telegram porte des boutons : ✅ Livrée,
  📵 Injoignable et ❌ Annuler (motif pris dans une liste fermée), plus un lien « 💬 WhatsApp
  client ». Le clic appelle la RPC `telegram_staff_order_action`, puis le bot complète le message
  d'une ligne de suivi. Le groupe WhatsApp staff reçoit les mêmes alertes par Notify, mais en
  lecture seule. Ce groupe n'a pas de boutons : WAHA NOWEB ne peut pas envoyer de boutons
  interactifs fiables, et l'API officielle est hors périmètre.

## Contraintes constatées (Notify `main`, 0004a2c)

- **Producteur seulement.** Xeption ne détient ni la clé WAHA, ni la session, ni les groupes.
  Ne jamais rouvrir un chemin WAHA direct en parallèle (`central-whatsapp-dispatch.md`).
- **Pas d'identifiant de message retourné.** `POST /v1/dispatch/xeption/whatsapp` répond
  `202 {accepted, eventId, recipients, acceptedRecipients}`. Le corps WAHA de `sendText` est
  ignoré, et `notify_whatsapp_receipts` ne stocke pas l'identifiant du message.
- **Plusieurs groupes.** Une alerte part vers tous les groupes approuvés. Il y a donc un
  identifiant de message par groupe.
- **Webhook entrant existant.** Notify reçoit déjà les webhooks WAHA signés
  (`/v1/whatsapp/groups/webhook`) : HMAC-SHA512 en hex, horodatage contrôlé à ±5 min,
  `WAHA_WEBHOOK_HMAC_KEY`. Seuls les événements de groupe sont traités pour l'instant.
- **Données client.** Les données client quittent Xeption seulement dans `order.created`
  (Notify ADR-002, `staffNotifyFacts.ts`). Une ligne de suivi n'en contient aucune.
- **Identité staff.** La RPC Telegram identifie l'auteur par `telegram_staff_links`. Rien ne relie
  aujourd'hui un numéro WhatsApp à un membre du staff : `staff` n'a pas de colonne téléphone.

## Options

| Option | Pour | Contre |
|---|---|---|
| A. Webhook WAHA direct vers Xeption (modèle PR #52) | Livrable sans toucher Notify | Second consommateur de la session WAHA ; Xeption doit connaître le groupe et la configuration WAHA, ce qui contredit le cutover |
| **B. Réactions reçues par Notify puis relayées à Xeption** | Respecte la frontière actuelle ; webhook signé déjà en place ; réutilisable par d'autres produits | Trois évolutions côté Notify |
| C. Commandes texte (« livrée 1234 ») | Pas de corrélation de message | Saisie sujette aux erreurs ; bruit dans le groupe |

## Décision : option B

### 1. Gestes dans le groupe

On réagit au message d'alerte, comme on cliquerait un bouton.

| Réaction | Action RPC | Condition |
|---|---|---|
| ✅ | `delivered` | commande déjà payée |
| 💵 | `cash_delivered` | paiement en espèces à la livraison |
| 📵 | `unreachable` | tout staff lié |
| ❌ | `cancelled` | rang responsable ou plus ; la ligne de suivi demande le motif |

Pour le motif d'annulation, l'auteur **répond** (citation) à l'alerte par un chiffre de 1 à 5,
dans l'ordre de `ORDER_CANCEL_REASONS`, dans les 10 minutes qui suivent son ❌. Une autre
réaction ou un texte libre ne font rien : aucun motif libre n'entre en base. Retirer une
réaction n'annule pas l'action ; il faut corriger sur la fiche.

### 2. Évolutions du contrat Notify

1. **Corrélation.** Notify lit `id` dans la réponse WAHA `sendText`. Il l'enregistre dans
   `notify_whatsapp_receipts.provider_message_id`, avec une colonne nullable et un index
   `(session, provider_message_id)`. Il ne le renvoie pas à Xeption : la correspondance reste chez
   Notify, ce qui garde à Xeption son rôle de producteur.
2. **Réactions entrantes.** Le webhook WAHA signé accepte en plus `message.reaction` et les
   réponses `message`, uniquement pour les groupes approuvés. Notify retrouve le reçu et donc
   `(project, event_id)`. Il ignore tout ce qui ne correspond à rien, et ne journalise ni
   numéro ni texte.
3. **Relais vers Xeption.** Notify appelle une fonction Xeption dédiée, nouvelle :
   `POST /functions/v1/notify-staff-action`. Corps :
   `{version:1, id, eventId, groupKey, actor:{fingerprint}, gesture:'reaction'|'reply', value}`.
   - `id` est l'identifiant WAHA de l'événement et sert d'idempotence.
   - `eventId` vaut `admin_notifications.id`.
   - `actor.fingerprint` est un HMAC, avec la clé du projet, du numéro de l'auteur. Le numéro en
     clair ne sort jamais de Notify, sur le modèle de `whatsapp-direct`.
   - Authentification par signature HMAC-SHA512 du corps brut avec horodatage, comme
     `webhookAuth.ts` de la PR #52, avec une clé dédiée `XEPTION_NOTIFY_ACTION_KEY` de 32
     caractères minimum. Elle est distincte de la clé d'ingestion.
4. **Ligne de suivi sortante.** Un nouveau type `order.action_recorded` entre dans
   `ALLOWED_TYPES`. Ses `facts` se limitent à : action, motif (liste fermée), numéro de tentative,
   prénom du staff, heure. Il ne porte aucune donnée client. Notify l'envoie **en réponse
   citée** au message d'origine, grâce au reçu du point 1 : WAHA ne sait pas modifier un message
   déjà envoyé.

### 3. Côté Xeption

1. **Lien numéro → staff.** Nouvelle table `whatsapp_staff_links(fingerprint, staff_id,
   linked_at, revoked_at)`, accessible au service_role seul. Le lien se crée depuis l'ERP
   (« Lier mon WhatsApp »). L'ERP génère un code à usage unique valable 10 min, stocké en
   SHA-256, comme `create_telegram_link_code`. Le staff envoie ce code dans le groupe ; Notify
   relaie `gesture:'link'` avec l'empreinte, et Xeption brûle le code. Le numéro n'est jamais
   stocké chez Xeption.
2. **Une seule règle métier.** La RPC actuelle devient `staff_order_action_core(p_order_id,
   p_action, p_staff_id, p_reason)`. Elle reprend les gardes de rang, la machine d'états et
   l'audit. `telegram_staff_order_action` et la nouvelle `whatsapp_staff_order_action` se
   contentent d'identifier le staff, puis l'appellent. La signature Telegram ne change pas : non
   régression.
3. **Module pur partagé.** Le mapping des gestes, le calcul des actions possibles et le texte des
   lignes de suivi sortent de `telegramOrderActions.ts` vers `_shared/orderActions.ts`. Les deux
   adaptateurs, Telegram et WhatsApp, s'appuient dessus.
4. **Idempotence.** Une table `staff_action_receipts(source, external_id)` à clé unique empêche
   une même réaction d'agir deux fois. Un ✅ posé sur une commande déjà livrée est un no-op.
   Il est signalé une seule fois, puis ignoré.
5. **Contact client.** Le lien `wa.me` du client reste réservé au message `order.created`
   (Notify ADR-002). Les lignes de suivi et les autres alertes ne pointent que vers la fiche ERP.

## Sécurité

- Personne ne peut agir sans un lien actif. Un membre du groupe sans lien voit sa réaction
  ignorée. Il reçoit au plus un rappel « lie ton WhatsApp depuis l'ERP » par jour.
- Deux contrôles indépendants : la signature Notify vers Xeption, puis l'identité vérifiée par
  Xeption. Notify ne décide jamais d'un droit.
- WAHA reste un fournisseur non officiel. Toute réaction est rejouable, d'où l'idempotence par
  `external_id`.

## Déploiement

1. Notify : colonne `provider_message_id` et enregistrement de l'identifiant. Aucun effet visible.
2. Xeption : migrations (core, liens, reçus), fonction `notify-staff-action` désactivée par
   `WHATSAPP_ACTIONS_ENABLED=false`, puis liaison du staff.
3. Notify : relais des réactions et type `order.action_recorded`. On déploie le consommateur
   compatible avant le producteur.
   Prérequis à vérifier avant l'étape 3 : l'engine NOWEB de la session `trigenys-test` émet bien
   `message.reaction` et le champ de citation des réponses (`docs/waha-smoke-test.md`).
4. Test contrôlé sur le groupe `Xeption app test` : une commande de test, une réaction par geste.
   Ensuite seulement, activation.

## Conséquences RAIDER

- **R / A** : relais générique côté Notify, qui associe un geste à un événement d'un projet.
  Aucun code propre à Xeption chez Notify, en dehors de la configuration.
- **I** : idempotence par `external_id`, et les transitions déjà appliquées sont des no-op.
- **D** : le contrat Telegram et `ORDER_CANCEL_REASONS` ne changent pas. Les tests existants
  restent la référence.
- **E** : moindre privilège avec des RPC service_role seul ; aucun numéro chez Xeption, aucun
  secret journalisé.
- **Rétroactif** : les alertes envoyées avant l'étape 1 n'ont pas d'identifiant enregistré.
  Elles restent en lecture seule.
