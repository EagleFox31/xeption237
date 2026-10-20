> **Architecture corrigée (20/10/2026).** Trigenys Notify est le responsable central des canaux WhatsApp. Xeption conserve la file `admin_notifications` / `notification_deliveries` et envoie un événement canonique à `https://trigenys-notify-staging-api.lawrynnjennifer.workers.dev/v1/dispatch/xeption/whatsapp`. Aucun appel direct de Xeption vers WAHA ni clé fournisseur WAHA côté Xeption. Voir [Trigenys Notify](https://github.com/Trigenys/trigenys-notify/blob/main/docs/central-whatsapp-dispatch.md).

**Configuration Xeption restante :** `WAHA_ENABLED=true` uniquement après la bascule, et `XEPTION_NOTIFY_INGEST_KEY` (secret partagé avec le Worker Trigenys Notify, distinct de `WAHA_API_KEY`). Les anciens secrets `WAHA_BASE_URL`, `WAHA_API_KEY`, `WAHA_SESSION`, `WAHA_STAFF_GROUP_ID` saisis dans Supabase ne sont plus consommés par le nouvel adaptateur ; les retirer après validation. Le texte des étapes historiques ci-dessous est conservé à titre de contexte et **ne doit pas servir de procédure de déploiement**.

---

# Trigenys Notify → WhatsApp via WAHA (OVH)

État au 20/10/2026 : le VPS OVH dispose de Docker, WAHA NOWEB et de la session `trigenys-test` au statut WORKING. Un message privé et un message de test dans TRIGENYS GROUP ont été **reçus**. L'API WAHA écoute **seulement sur 127.0.0.1:3000**. Ce document ne suppose PAS que le relais automatique est déjà actif.

## Source de vérité

Xeption conserve `admin_notifications` + `notification_deliveries` + `notify-staff` (pg_cron chaque minute). Trigenys Notify fournit le moteur WhatsApp externe ; le relais Xeption ajoute uniquement le canal `whatsapp_waha`. Aucun second moteur Telegram, aucune nouvelle base ou job cron.

Le fichier `_shared/staffNotifyChannels/waha.ts` est **désactivé par défaut**. Tant que les secrets d'intégration ne sont pas posés, aucun message WhatsApp n'est envoyé automatiquement.

## Étape 1 — Accès HTTPS externe restreint (encore à réaliser)

Supabase ne peut pas joindre `127.0.0.1:3000` sur le VPS. Prévoir un nom DNS HTTPS pointant vers l'IPv4 du VPS et un reverse proxy sur les ports 80/443. Privilégier un sous-domaine dédié, par ex. `notify-waha.trigenys.com`, dès que son DNS est disponible. En attendant, un sous-domaine de test à résolution IP de type `<IP-avec-tirets>.sslip.io` peut éviter de payer un nom de domaine, sous réserve de disponibilité DNS/certificat.

**Sécurité obligatoire :**
- WAHA reste bindé à `127.0.0.1:3000` ; ne jamais publier le port 3000.
- Le proxy ne laisse passer **que** `POST /api/sendText` vers WAHA ; le Dashboard, les sessions, les contacts et les QR codes doivent rester locaux via le tunnel SSH.
- HTTPS valide, en-tête `X-Api-Key` obligatoire, secret d'au moins 32 caractères. Jamais d'accès API WAHA par HTTP en clair.
- Prévoir rate limits, logs sans body/clé et surveillance de l'état de la session.

Il n'est **pas nécessaire** d'attacher un sous-domaine Cloudflare à Trigenys Notify pour cette étape : Supabase appellera directement l'API sécurisée exposée par le proxy. Une Cloudflare Tunnel + Access avec authentification machine-to-machine constitue une option plus protectrice lorsque la gestion DNS/Access sera disponible.

## Étape 2 — Secrets dans Xeption Supabase (sans les publier)

Sur l'Edge Function `notify-staff` du projet Xeption, renseigner via le coffre-fort de secrets Supabase :

| Secret | Valeur |
|---|---|
| `WAHA_ENABLED` | `true`, à mettre **en dernier** |
| `WAHA_BASE_URL` | origine HTTPS du proxy dédié, **sans** chemin ni slash |
| `WAHA_API_KEY` | **même clé** que `WAHA_API_KEY` du `.env` du VPS ; ne pas copier en GitHub |
| `WAHA_SESSION` | `trigenys-test` |
| `WAHA_STAFF_GROUP_ID` | identifiant `@g.us` du groupe de test découvert via WAHA |
| `WAHA_EVENT_TYPES` | ex. `stock_low,stock_out,product_missing_image` |

Copier le group ID depuis la sortie de WAHA sur le VPS ou son API locale. Vérifier qu'il correspond bien au groupe où le message de test est arrivé. Ne pas confondre avec le compte WhatsApp connecté.

**Règle anti-déluge :** `claim_notification_deliveries` crée automatiquement des livraisons pour les notifications des **24 dernières heures** au premier lancement d'un nouveau canal. Avant le premier `WAHA_ENABLED=true`, choisir explicitement si ces notifications doivent être envoyées. Si non, amorcer les `notification_deliveries` anciennes comme envoyées, uniquement pour `whatsapp_waha`, via une migration/transaction de déploiement contrôlée (ne modifier aucun autre canal).

## Étape 3 — Déploiement et test sans spam

1. Fusionner la PR sur Xeption, vérifier tests et déployer l'Edge Function `notify-staff` depuis le commit exact ; elle reste désactivée pour WAHA.
2. Installer le proxy HTTPS du VPS ; vérifier qu'aucun endpoint de gestion WAHA n'est ouvert au public.
3. Poser les secrets, amorcer l'outbox si nécessaire, activer `WAHA_ENABLED=true`.
4. Générer une seule notification staff contrôlée (`stock_low` d'un produit de test) ; attendre une minute.
5. Vérifier le canal `whatsapp_waha` dans `notification_deliveries` et la réception dans le groupe. Confirmer que Telegram ne s'est pas envoyé en doublon et que les clients ne sont pas exposés.
6. Sur échec, remettre `WAHA_ENABLED=false` puis diagnostiquer `last_error` (sans clé API ni contenus privés).

Les appels sont *at-least-once* : si WAHA accepte un message mais que l'update de `sent_at` échoue, un réessai ultérieur peut exceptionnellement répéter ce message ; la déduplication n'est pas strictement « exactement une fois » sans clé idempotente côté fournisseur.

## Notifications envoyées dans le groupe

Le canal WAHA **ignore volontairement** les champs libres `title`, `message` de Xeption et affiche un libellé métier fixe + lien vers l'ERP. Cela évite de divulguer noms, numéros de téléphone et détails de dossiers de troc à tous les participants du groupe. Les accès ERP restent contrôlés par son authentification.

La configuration WhatsApp ne change pas l'association ERP ↔ Telegram prise en charge séparément.
