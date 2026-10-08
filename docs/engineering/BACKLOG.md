# Backlog technique — Xeption 237

> Dernière mise à jour : 2026-10-08

---

## En cours / branche active : `wip/troc-multi-device-v3-clean`

### Issue #3 — EPIC Smart Troc : réduire la friction mobile

| # | Tâche | État | Bloquant |
|---|---|---|---|
| 3.1 | Tunnel séquentiel 6 étapes | ✅ Fait | — |
| 3.2 | WhatsApp pré-rempli (nom client + appareil + modèle) | 🔧 À faire | Rien, on peut démarrer |
| 3.3 | Analytics d'entonnoir (événement par étape) | 🔧 À faire | Choix outil (voir ci-dessous) |
| 3.4 | Réduction texte marketing TrocPage | 🔧 À faire | Rien |
| 3.5 | Tests QA mobile e2e | ✅ Fait (`e2e/smart-troc.spec.ts`) | — |

---

### Nouveau — Pubs Facebook → Boutique (Dynamic Ads)

#### Ce qu'on peut faire sans accès Facebook

| Tâche | Fichiers concernés | État |
|---|---|---|
| Open Graph produit (`og:price:amount`, `og:availability`, `og:image`) sur chaque fiche | `utils/seo.tsx`, `pages/ProductDetail` ou équivalent | 🔧 À faire |
| Gestion UTM sur les URLs produit (`?utm_source=facebook&utm_medium=paid&utm_campaign=...`) | `App.tsx` ou router | 🔧 À faire |
| Flux catalogue produit exportable (JSON ou CSV) pour import dans Meta Business | API Supabase → endpoint ou script | 🔧 À faire |

#### Ce qu'il faut récupérer côté Facebook (accès requis)

| Info à récupérer | Où la trouver | Pourquoi |
|---|---|---|
| **Pixel ID** | Meta Business Manager → Sources de données → Pixels | Pour coller `fbq('init', 'PIXEL_ID')` dans `index.html` |
| **App ID Facebook** (optionnel) | Meta for Developers → Mes apps | Pour `og:app_id` dans les balises Open Graph |
| **Catalog ID** | Commerce Manager → Catalogues | Pour lier les Dynamic Ads au bon catalogue produit |
| **Accès à la page Facebook** `xeptioon` | En tant qu'admin de la page | Pour créer les campagnes et lier le Pixel à la page |
| **Compte publicitaire actif** | Meta Business Manager → Comptes publicitaires | Pour que les campagnes puissent tourner (carte de paiement associée) |

> Une fois le Pixel ID récupéré, le reste (balises, événements `ViewContent`/`Purchase`) se fait en 1h de code.

---

### Issue #19 — Feedback loop

| Tâche | État |
|---|---|
| Template FEEDBACK_LOG.md + 3 exemples Smart Troc | ✅ Fait (`docs/engineering/FEEDBACK_LOG.md`) |

---

### PR #1 — Release: paid Xeption scope without ERP

- Ouverte depuis le 5 sept., 1/2 checks qui fail — à investiguer avant merge.

---

## Décisions en attente

| Décision | Options | Impact |
|---|---|---|
| Outil analytics entonnoir | Supabase RPC custom / Plausible / Posthog | Bloque tâche 3.3 |
| Migration `20260401_004_market_price_cache.sql` | Appliquer ou archiver ? | Bloque rien pour l'instant |
