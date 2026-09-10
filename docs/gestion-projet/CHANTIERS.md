# Chantiers Xeption 237 — tableau de bord

> Vue d’ensemble pour la direction et l’équipe technique.  
> Dernière revue : **9 juillet 2026**.

---

## Synthèse exécutive

| Zone | Avancement | Bloquant prod ? |
|------|------------|-----------------|
| **Boutique publique** | ~85 % | Non |
| **ERP staff** (`/admin`) | ~75 % | Non (usage quotidien OK) |
| **Smart Troc** (`/troc`) | ~70 % | Non (parcours principal OK) |
| **Xeption Certif** | ~40 % | Non |
| **Studio** (`/studio`) | ~60 % | Non |
| **Sécurité / RLS** | ~40 % | **Oui à moyen terme** |
| **Compte client** | 0 % | Non (stratégie seulement) |

**En une phrase** : la boutique et l’ERP tournent ; le Troc encaisse ; il reste surtout la **sécurité fine par rôle**, la **monétisation Troc avancée**, et le **compte client**.

---

## 1. ERP staff (`/admin`)

### 1.1 Livré ✅

| Sujet | Détail |
|-------|--------|
| Menu groupé | `adminMenuConfig.ts` — Ventes, Catalogue, Opérations, Clients & Équipe |
| Commandes + factures | Un seul onglet `orders` ; PDF après validation (`confirmed`+) |
| Structure catalogue | Page hiérarchique Type → Marque → Gamme |
| Rôles métier | `vendeur`, `responsable`, `direction`, `super_admin` (+ migration slugs legacy) |
| Connexion staff | Parcours 2 étapes, preview profil, captcha prod |
| Création membre | Wizard 3 étapes (profil → identité → validation) |
| Auth automatique | Edge function `create-staff-auth`, mot de passe équipe `123456` |
| Display name Auth | RPC `sync_staff_auth_display_name` + backfill |
| Sidebar | Nom + rôle réels (plus « Staff Xeption ») |
| Menus par rôle | `utils/adminAccess.ts` — filtre sidebar, mobile, garde URL |
| Accueil par rôle | Vendeur → caisse ; responsable/direction → commandes ou accueil |
| Trigger legacy | Suppression `on_staff_created` / `sync_staff_to_auth` (bug `username`) |
| Textes FR | Statuts commande en français, aide compacte, pas de jargon UI |

### 1.2 À faire 🔴 / 🟡

| Priorité | Sujet | Statut | Notes |
|----------|-------|--------|-------|
| **P0** | RLS par rôle en base | 🔴 | Menu UI seul ≠ sécurité ; un vendeur ne doit pas modifier `staff` via API |
| **P1** | Tests manuels par rôle | 🟡 | Vendeur test `vendeur@xeption.shop`, responsable, direction, Jennifer |
| **P1** | Nettoyage titres dupliqués | 🔴 | Header `AdminPageHeader` + h2 dans certains tabs |
| **P2** | Notifications par rôle | 🔴 | Lien notif vers onglet interdit si rôle insuffisant (partiellement fait) |
| **P2** | Colonne `staff.password` en prod | 🟡 | Migration T1 prévue ; colonne peut encore exister — cleanup optionnel |
| **P3** | Guide staff intégré | 🔴 | Ancien onglet `guide` retiré du menu groupé ? |
| **P3** | Landing mobile cohérente | 🟡 | Quick tabs filtrés par rôle — OK ; à valider sur le terrain |

### 1.3 Matrice menus (référence)

| Onglet | Vendeur | Responsable | Direction / Super admin |
|--------|:-------:|:-----------:|:-----------------------:|
| Tableau de bord | ✅ | ✅ | ✅ |
| Vente boutique | ✅ | ✅ | ✅ |
| Commandes & factures | ✅ | ✅ | ✅ |
| Inventaire | ✅ | ✅ | ✅ |
| Import photos | ✅ | ✅ | ✅ |
| Clients | ✅ | ✅ | ✅ |
| Packs promo | ❌ | ✅ | ✅ |
| Zones & livraison | ❌ | ✅ | ✅ |
| Dossiers Troc | ❌ | ✅ | ✅ |
| Atelier SAV | ❌ | ✅ | ✅ |
| Structure catalogue | ❌ | ❌ | ✅ |
| Équipe | ❌ | ❌ | ✅ |

**Fichiers clés** : `constants/staffRoles.ts`, `utils/adminAccess.ts`, `components/admin/layout/adminMenuConfig.ts`

---

## 2. Smart Troc (`/troc`)

### 2.1 Livré ✅

| Sujet | Détail |
|-------|--------|
| Paliers tarifaires | Express 150 / Premium 500 / Sûreté 1 000 FCFA (`utils/trocPricing.ts`) |
| UI paliers | `TierSelector`, montant dynamique dans `TrocPayment` |
| CTA landing | Bouton large, copy, logos MoMo/OM, « À partir de 150 F » |
| Paiement | Edge `create-payment`, webhook, statuts `troc_payments` |
| Admin Troc | `TrocWorkspaceTab` — dossiers reprise + paiements unifiés |
| Prix serveur | `tradeInModelId` + `base_price` côté serveur (plus d’écart client/admin) |
| Refus post-paiement | Auto-save + pré-check âge avant paiement |
| Cote marché (backend) | Edge `get-market-trend`, tables snapshots, cache 7 j |
| Badge cote | `MarketTrendBadge.tsx` (masqué si confiance faible) |
| IMEI | `check-imei`, niveaux basic/premium selon palier |
| Wizard / forms | `TrocWizard`, `SmartTrocForm`, flow chat partiel |
| CGV paliers | `TrocServiceFeesLegal` dans pages légales |

### 2.2 À faire 🔴 / 🟡 / ⏸️

| Priorité | Sujet | Statut | Notes |
|----------|-------|--------|-------|
| ⏸️ | Décisions CEO copy | ⏸️ | « 98 % précision », « certifié », compteur fictif vs réel — voir roadmap V2 |
| **P1** | Campagnes promo +10 % | 🔴 | Table `troc_promo_campaigns` absente ; pas d’admin promo |
| **P1** | Compteur mensuel réel | 🟡 | `TrocMonthlyCounter` stub ; hook `useTrocMonthlyCounter` à brancher |
| **P1** | Combobox marque | 🔴 | Modèle filtrable OK ; marque encore en select |
| **P2** | Certificats PDF Troc | 🔴 | Génération + `/verify/:token` |
| **P2** | Palier Sûreté — monitoring IMEI | 🔴 | Quotas, compteur appels premium, alerte coûts |
| **P2** | `save-trade-in` — date achat nullable | 🟡 | Pénalité âge si date inconnue |
| **P3** | E2E Playwright | 🔴 | Après stabilisation flows |
| **P3** | Cron snapshots prix | 🔴 | Plan `PLAN_CRON_PRICE_SNAPSHOTS.md` — déploiement humain |
| **P3** | Bing Search API (cote marché) | ⏸️ | Optionnel ; secret `BING_SEARCH_API_KEY` |
| **P3** | Funnel analytics admin | 🔴 | Landing → Form → Photos → IMEI → Paiement → Voucher |

### 2.3 Décisions produit en attente (CEO)

- [ ] Reformuler « Précision 98 % » → « Diagnostic intelligent »
- [ ] Reformuler « Certificat certifié » → « Rapport d’expertise XEPTION »
- [ ] Compteur « +2 500 évalués » : réel Supabase (seuil 500) vs fictif
- [ ] Offre +10 % crédit boutique : campagnes datées vs règle permanente
- [ ] Valider contenus des 3 paliers 150 / 500 / 1 000 FCFA

**Docs** : [`smart-troc/roadmap/SMART_TROC_ROADMAP_V2.md`](../smart-troc/roadmap/SMART_TROC_ROADMAP_V2.md), [`smart-troc/roadmap/SMART_TROC_AGENT_SYNC.md`](../smart-troc/roadmap/SMART_TROC_AGENT_SYNC.md)

---

## 3. Xeption Certif

**Objectif** : vérifier un IMEI + certificat PDF payant (300 F), en parallèle du Troc.

| Sujet | Statut | Notes |
|-------|--------|-------|
| Sélection intention Troc / Vérifier | ✅ | `TrocPage.tsx` — `intent: 'troc' \| 'certif'` |
| `ImeiCertifFlow` | 🟡 | Composant branché ; flow 4 étapes à finaliser |
| Paiement 300 F | 🟡 | Réutilise `TrocPayment` — à tester bout en bout |
| Certificat PDF + QR | 🔴 | Non livré |
| Page publique `/verify/:token` | 🔴 | Non livré |

**Doc** : [`plans/PLAN_XEPTION_CERTIF.md`](../plans/PLAN_XEPTION_CERTIF.md)

---

## 4. Studio créateur (`/studio`)

> Séparé de l’ERP quotidien. Réservé super admin technique (Jennifer).

| Sujet | Statut | Notes |
|-------|--------|-------|
| Accès super admin | ✅ | `VITE_SUPER_ADMIN_EMAILS`, route `/studio` |
| Ingestion catalogue | 🟡 | Scripts funnel, enrichissement IA |
| Menu Studio | 🟡 | `studioMenuConfig.ts` |
| Ne pas mélanger avec ERP | ✅ | Règle AGENTS.md |

---

## 5. Boutique publique

| Sujet | Statut | Notes |
|-------|--------|-------|
| Catalogue, fiches produit | ✅ | `getProductDisplayName`, marques canoniques |
| Shop mobile (filtres natifs) | ✅ | |
| Checkout / commandes | 🟡 | RPC `create_order_atomic` corrigée ; tracking à durcir |
| SEO | 🟡 | `utils/seo.tsx`, sitemap, IndexNow |
| Livraison 19 villes | ✅ | |
| Compte client (historique, SAV) | 🔴 | Stratégie [`RETENTION_CLIENT.md`](../strategy/RETENTION_CLIENT.md) — **pas codé** |
| Paiement en ligne boutique | 🟡 | Partiel ; partenaires YUP/Bizao à explorer |

---

## 6. Sécurité & infra

Référence : [`plans/PLAN_REMEDIATION_XEPTION237.md`](../plans/PLAN_REMEDIATION_XEPTION237.md)

### P0 — Sécurité immédiate

| ID | Sujet | Statut |
|----|-------|--------|
| T1 | Auth staff sans password clair | ✅ Front OK ; migration DB à confirmer partout |
| T2 | Retirer clé Gemini du front | 🟡 Partiel — Edge Functions pour IA sensible |
| T3 | RLS durcies (orders, staff, …) | 🔴 Policies `USING (true)` à revoir |
| T4 | RPC `create_order_atomic` versionnée | ✅ |
| T17 | CSP, HSTS, headers | 🔴 |
| T18 | Rate limit, anti-énumération | 🔴 |
| T19 | Logs sécurité + alerting | 🔴 |
| T20 | Threat modeling / mini pentest | 🔴 |

### Infra & coûts

| Sujet | Statut | Doc |
|-------|--------|-----|
| Coûts mensuels (Supabase, Bing, IMEI premium) | 📝 | [`engineering/COUTS_INFRA_BOSS.md`](../engineering/COUTS_INFRA_BOSS.md) |
| Journal d’erreurs | ✅ | [`engineering/ERRORS_LOG.md`](../engineering/ERRORS_LOG.md) |
| Migrations prod | 🟡 | Souvent via Postgres direct (CLI path Windows cassé) |

---

## 7. Catalogue & données

| Sujet | Statut | Notes |
|-------|--------|-------|
| Slugs catégories (`phones`, `tablettes`, …) | ✅ | `constants/dbSchema.ts` |
| Enrichissement IA specs | 🟡 | DeepSeek, scripts batch |
| Doublons Mfoundi / merges | 🟡 | Scripts one-shot |
| `phone_releases` | 🟡 | Migration + import |
| Revue trimestrielle `base_price` Troc | ⏸️ | Process humain — [`STRATEGIE_PRIX_REPRISE_CEO.md`](../smart-troc/plans/STRATEGIE_PRIX_REPRISE_CEO.md) |

---

## 8. Design & UX

| Sujet | Statut | Notes |
|-------|--------|-------|
| Design system admin | 🟡 | [`design-system/MASTER.md`](../../design-system/MASTER.md) + `adminUi.ts` |
| Skill ui-ux-pro-max | ✅ | `.cursor/skills/ui-ux-pro-max/` |
| Règles Cursor admin | ✅ | `.cursor/rules/admin-ux-and-db.mdc` |
| Polish Troc conversion (Sprint 1 roadmap) | 🟡 | CTA fait ; promo / compteur pas finis |

---

## 9. Ordre de reprise recommandé

Pour maximiser l’impact avec le moins de risque :

1. **RLS staff + rôles** — sécuriser ce que le menu masque déjà (1–2 j)
2. **Tests ERP par rôle** — valider vendeur / responsable / direction en prod (0,5 j)
3. **Certif bout en bout** — monétisation 300 F (2–3 j)
4. **Campagnes promo Troc** — table + admin + CTA (2–3 j)
5. **Compte client MVP** — historique commandes (5–8 j)
6. **Durcissement sécu P0 restant** — CSP, rate limit (continu)

---

## 10. Équipe staff (référence prod)

| Nom | Email | Rôle ERP | Mot de passe Auth |
|-----|-------|----------|-------------------|
| Jennifer | lawrynnjennifer@gmail.com | Super admin (Studio) | `123456` |
| Jordan | jordanladzou@gmail.com | Direction | `123456` |
| Le Boss | admin@xeption.cm | Direction | `123456` |
| Manager Vente | vente@xeption.cm | Responsable | `123456` |
| Vendeur (test) | vendeur@xeption.shop | Vendeur | `123456` (si créé) |

Connexion : `/admin` → email ou prénom → `123456`.  
Sync Auth : Équipe → clé ou **Tout synchroniser**.

---

## Liens utiles

| Ressource | Chemin |
|-----------|--------|
| Instructions agent | [`AGENTS.md`](../../AGENTS.md) |
| Index doc | [`docs/README.md`](../README.md) |
| Roadmap Troc V2 | [`smart-troc/roadmap/SMART_TROC_ROADMAP_V2.md`](../smart-troc/roadmap/SMART_TROC_ROADMAP_V2.md) |
| Remédiation sécu | [`plans/PLAN_REMEDIATION_XEPTION237.md`](../plans/PLAN_REMEDIATION_XEPTION237.md) |
| Rétention client | [`strategy/RETENTION_CLIENT.md`](../strategy/RETENTION_CLIENT.md) |
| Historique ERP staff | [`HISTORIQUE_ERP_STAFF.md`](./HISTORIQUE_ERP_STAFF.md) |
