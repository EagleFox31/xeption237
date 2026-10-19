# Analytics — GA4 + Meta Pixel via GTM

Stack : **1 seul snippet GTM** dans le site. GTM redistribue vers **GA4** (funnel, audience,
rapports e-commerce) et **Meta Pixel** (retargeting Facebook/Instagram, custom audiences).
Changer un tag = manipuler l'UI GTM, **pas** de redéploiement du site.

## Setup côté comptes

### 1. Google Tag Manager

1. Créer un container Web sur [tagmanager.google.com](https://tagmanager.google.com/).
2. Copier l'ID (`GTM-XXXXXXX`) → `.env` → `VITE_GTM_ID=GTM-XXXXXXX`.
3. Rebuild + redéploy.

### 2. GA4

1. Créer une propriété GA4 sur [analytics.google.com](https://analytics.google.com/) — noter
   le Measurement ID (`G-XXXXXXX`).
2. Dans GTM : **Tags → New → Google Analytics: GA4 Configuration**. Coller le Measurement ID.
   Trigger : **All Pages**.
3. Ajouter un tag **GA4 Event** pour chaque event custom qu'on veut voir dans GA4 :
   - Trigger : Custom Event → nom exact de l'event (`troc_step_view`, `troc_payment_paid`, etc.)
   - Event parameters : mapper les params (troc_step, value, currency, etc.)
4. **Publier** le container GTM (bouton Submit → Publish).

### 3. Meta Pixel

Pixel dédié **Xeption 237** : `1085399414289859` (portefeuille Team Trigenys).
⚠ Ne jamais utiliser le pixel « Atelier Maître » (`2270650607049039`) — autre app.

**Automatisé** : `META_PIXEL_ID=1085399414289859 node scripts/gtm-setup-tags.mjs` (avec les
variables GTM habituelles) crée, en plus des balises GA4 et sans les modifier :
- `Meta - Pixel base` (Custom HTML, All Pages, une fois par chargement) ;
- `Meta - PageView (SPA)` sur le trigger `History Change - SPA` (navigations React Router) ;
- `Meta - ViewContent` / `AddToCart` / `InitiateCheckout` / `Purchase` sur les triggers
  `CE - view_item` / `add_to_cart` / `begin_checkout` / `purchase`, lus depuis `{{DL - ecommerce}}`.
  `Purchase` porte `eventID = purchase_<transaction_id>` pour la déduplication avec l'API Conversions.

Idempotent (skip par nom). Puis GTM → Prévisualiser → Publier. Vérifier dans Events Manager → Tester les événements.

### 4. API Conversions Meta (côté serveur)

Le pixel navigateur est bloqué par les bloqueurs de pubs et la protection contre le suivi.
`Purchase` est donc aussi envoyé depuis Supabase :

- `useOrderProcess` → après la RPC `create_order_atomic`, appel non bloquant de l'Edge Function
  [`meta-capi`](../../supabase/functions/meta-capi/index.ts) avec `{ orderId, fbp, fbc, eventSourceUrl }`.
- La fonction **relit la commande en base** (montant, contact, articles), hache email / téléphone
  (E.164 237) / ville en SHA-256 ([`_shared/metaCapi.ts`](../../supabase/functions/_shared/metaCapi.ts),
  testé par `tests/unit/metaCapi.test.ts`), ajoute IP + user agent, puis POST Graph API.
- `event_id = purchase_<orderId>` = `eventID` de la balise GTM → Meta déduplique.
- Refuse les commandes de plus d'une heure (anti-rejeu).

Secrets Supabase : `META_CAPI_TOKEN` (obligatoire, sinon 503 sans effet), `META_PIXEL_ID`
(défaut `1085399414289859`), `META_TEST_EVENT_CODE` (optionnel : tant qu'il est posé, tout part
dans « Événements de test » — **le retirer après validation**).

Mapping cible complet (events custom non encore automatisés) :
   - `troc_payment_paid` → `Purchase` (value = amount, currency = XAF)
   - `troc_result_shown` → `Lead` (SMART TROC = génération de lead qualifié)
   - `marketplace_listing_published` → `Purchase` (frais publication)
   - `view_item` → `ViewContent`
   - `add_to_cart` → `AddToCart`
   - `purchase` → `Purchase` (transaction e-commerce)

## Events instrumentés côté code

Tout passe par [`utils/analytics.ts`](../../utils/analytics.ts) → `dataLayer.push(...)`.
Silencieux (log console) si `VITE_GTM_ID` absent.

### SMART TROC — funnel (issue #6)

| Event | Où | Payload |
|---|---|---|
| `troc_start` | `TrocPage` mount | — |
| `troc_step_view` | changement de step | `troc_step` |
| `troc_photos_uploaded` | upload OK | `photos_count` |
| `troc_imei_checked` | IMEI vérifié | `imei_status` |
| `troc_payment_initiated` | Campay initié | `value`, `currency`, `troc_tier` |
| `troc_payment_paid` | Campay confirmé | `value`, `currency`, `troc_tier` |
| `troc_result_shown` | résultat éval | `grade`, `value`, `currency` |
| `troc_offer_accepted` | user accepte | `grade`, `value`, `currency` |
| `troc_offer_refused` | user refuse | `reason` |
| `troc_voucher_generated` | bon créé | `voucher_ref` |
| `troc_choice` | choix final | `troc_choice` : `sell_to_xeption` \| `marketplace` \| `exchange` |

### Marketplace

| Event | Où | Payload |
|---|---|---|
| `marketplace_browse_view` | browse page fetch OK | `listings_count` |
| `marketplace_contact_seller` | clic "Je veux ça" | `listing_id`, `value` |
| `marketplace_listing_step` | changement d'étape formulaire | `listing_step` |
| `marketplace_payment_initiated` | Campay 100/200/500/1000 XAF initié | `value`, `price_max` |
| `marketplace_listing_published` | annonce publiée | `value`, `price_max` |

### E-commerce GA4 standard (issue #16)

Format `ecommerce: { currency, value, items: [{ item_id, item_name, item_brand, item_category, price, quantity }] }`.

| Event | Où | Meta équivalent |
|---|---|---|
| `view_item` | `ProductPage` product résolu | `ViewContent` |
| `add_to_cart` | `App.addToCart` | `AddToCart` |
| `begin_checkout` | `useOrderProcess.submitOrder` | `InitiateCheckout` |
| `purchase` | `useOrderProcess` après RPC OK | `Purchase` |

## Debug local

En dev (`import.meta.env.DEV === true`), chaque event est loggé dans la console :

```
[analytics] troc_step_view { event: 'troc_step_view', troc_step: 'photos' }
```

Pour tester le pipeline complet en dev, mettre `VITE_GTM_ID=GTM-XXXXXXX` dans `.env` et
ouvrir [Tag Assistant](https://tagassistant.google.com/) sur le site.

## Pourquoi GTM et pas GA4 direct ?

- 1 seul snippet dans le site → moins de perf impact, moins de code à maintenir
- Ajouter/retirer un tag (Meta Pixel, TikTok Pixel, LinkedIn Insight, Hotjar…) = 5 min sans redéploiement
- Mapping event → tag centralisé dans GTM UI → équipe marketing autonome
- Prévisualisation avant publication (GTM Preview mode)
