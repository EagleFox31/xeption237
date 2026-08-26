# Site vitrine « Prestations de services informatiques » — décision d'architecture

> Question posée (2026-08-25) : le boss rappelle que Xeption ne fait pas que de l'e-commerce, mais aussi de la **prestation de services informatiques**. Faut-il un nouveau domaine `.cm`, un sous-domaine, ou une section du site actuel ?
>
> **Réponse courte : sous-dossier `/services` sur `www.xeptionetwork.shop`.** Ni `.cm`, ni sous-domaine.

---

## 1. Les trois options, comparées honnêtement

| | **A. Sous-dossier** `xeptionetwork.shop/services` | **B. Sous-domaine** `services.xeptionetwork.shop` | **C. Nouveau domaine** `xeption.cm` |
|---|---|---|---|
| Autorité SEO | **Hérite du #1 déjà acquis** sur « xeption » | Traité par Google comme un site quasi distinct → repart quasi de zéro | Repart **de zéro**, 6–12 mois avant de ranker |
| Coût | 0 F | 0 F (DNS) | Domaine + renouvellement + certificats + maintenance |
| Travail technique | ~1 semaine (routes + contenu) | 1 semaine + config DNS/Vercel + duplication du design system | 3–4 semaines (2ᵉ projet, 2ᵉ déploiement, 2ᵉ SEO, 2ᵉ analytics) |
| Google Business Profile | **1 seule fiche renforcée** (catégories secondaires) | 1 fiche, lien ambigu | Risque de **2 fiches concurrentes** = signal local dilué |
| Marque | Un seul nom, un seul lien à retenir | « c'est un autre site ? » | Deux marques à financer |
| Cannibalisation | Aucune | Faible | **Forte** (les deux se battent sur « xeption ») |

**Verdict : A.** Google, depuis ~2019, sait faire remonter un sous-dossier aussi bien qu'un domaine ; l'inverse n'est pas vrai — un domaine neuf n'hérite de rien.

### Pourquoi le `.cm` est un mauvais réflexe ici

Le site **ranke déjà #1 sur « xeption »** et la fiche Google Business est tenue (⭐5,0, Mfoundi Mall). Ouvrir un `.cm` détruit cet acquis en le partageant entre deux domaines. Le seul « raté » historique venait d'un test **Gemini** (grounding approximatif), pas de la vraie visibilité. Ce qui déplace l'aiguille sur les moteurs génératifs, ce sont les **citations tierces** (presse, annuaires CM), pas un TLD. → décision déjà arbitrée, on ne la rouvre pas.

### Le sous-domaine, dans quels cas seulement ?

Un sous-domaine ne se justifie que si : stack différente (WordPress/Webflow à côté du React), **équipe différente**, ou volonté d'**isoler juridiquement** l'activité services (entité distincte, facturation séparée, marque propre type « Xeption Solutions »). Aucune de ces trois conditions n'est réunie aujourd'hui : même dev, même stack Vite/React, même société.

👉 **Si le boss crée un jour une entité juridique séparée pour le B2B**, alors on rediscute — et ce sera un sous-domaine, pas un `.cm`.

*Pour mémoire, si l'option B revenait : sur Vercel c'est Settings → Domains → ajouter `services.xeptionetwork.shop`, puis un CNAME `services → cname.vercel-dns.com` chez le registrar. 10 minutes. La difficulté n'est pas technique, elle est SEO.*

### L'objection légitime : `.shop` fait « boutique »

C'est le seul vrai argument contre A. Réponse : sur une carte de visite B2B, on n'écrit pas le TLD nu mais **`xeptionetwork.shop/services`**, et l'e-mail reste `@xeptionetwork.shop`. Si la perception gêne vraiment le boss, l'achat **défensif** du `.com` en **redirection 301** vers le `.shop` est possible — mais c'est du confort de marque, **pas une action SEO**, et ça n'apporte aucun trafic en soi. Ce n'est pas prioritaire.

---

## 2. Ce qui existe déjà dans le code (à réutiliser, pas à réécrire)

| Brique | Fichier | Réutilisation |
|---|---|---|
| Routage SPA | `App.tsx` (lignes ~326-380) | ajouter `/services` et `/services/:slug` |
| Nav | `components/Header.tsx` (`navItems`, ~l.301) | ajouter l'entrée « Services » |
| SEO par page | `utils/seo.tsx` — `PageSEO`, `JsonLd`, `breadcrumbJsonLd`, `faqJsonLd` | tel quel |
| Organisation schema.org | `index.html` (nœud `#organization`, `ElectronicsStore`) | **ne pas redéclarer** — référencer par `@id` |
| Fond clair institutionnel | `constants/backgroundImages.ts` → `LIGHT_BACKGROUND_ROUTES` | ajouter `/services` |
| Typo institutionnelle | `constants/institutionalPageStyles.ts` | tel quel (contraste déjà validé) |
| SAV / réparation | `components/RepairSection.tsx`, `pages/SavPage.tsx` | **le SAV reste le SAV** (après-vente client) ≠ prestation vendue |

⚠️ **Piège n°1 du projet** : c'est une **SPA Vite**, donc une page n'existe pour Google/les LLM **que si elle est prérendue**. Toute route ajoutée doit l'être **aux deux endroits** :

- `scripts/prerender.mjs` → const `STATIC_ROUTES`
- `scripts/generateSitemap.js` → const `staticRoutes`

Oublier ça = page invisible, quel que soit le contenu.

---

## 3. Architecture retenue

```
/services                              ← hub vitrine (le « site vitrine »)
  /services/maintenance-parc           ← 1 page par prestation, 1 URL = 1 intention
  /services/installation-reseau
  /services/videosurveillance
  /services/equipement-entreprise
  /services/...
/services/devis                        ← formulaire de demande de devis (le seul CTA qui compte)
```

**Une page par prestation**, pas une page fourre-tout : chaque prestation vise une requête différente (« maintenance informatique Yaoundé », « installation caméra surveillance entreprise Cameroun »…). Une page unique ne peut ranker que sur une seule d'entre elles.

**Source de contenu** : `constants/services.ts` (statique, typé) — pas de table Supabase au départ. Le contenu bouge 2×/an, la base n'apporterait que de la complexité. On migrera en base le jour où le boss veut éditer depuis le Studio.

Chaque entrée : `slug`, `title`, `pitch`, `problemeClient`, `livrables[]`, `pourQui`, `delai`, `modeleTarifaire` (forfait / au ticket / abonnement mensuel), `faq[]`, `references[]`.

---

## 4. Le SEO/GEO propre à une page service (là où on gagne vraiment)

1. **JSON-LD `Service`** — nouveau helper `serviceJsonLd` dans `utils/seo.tsx` :
   `@type: Service`, `serviceType`, `provider: { "@id": ".../#organization" }`, `areaServed: ["Yaoundé","Douala","Cameroun"]`, `offers` avec `priceCurrency: XAF`.
   → référencer l'organisation par `@id` (règle déjà écrite dans `utils/seo.tsx` : pas de second nœud Organization).
2. **`hasOfferCatalog`** sur le nœud `#organization` d'`index.html` : liste les prestations → c'est ce que les LLM lisent pour répondre « qui fait de la maintenance informatique à Yaoundé ? ».
3. **`ProfessionalService`** en nœud enfant (`parentOrganization: {@id: #organization}`) : aujourd'hui l'entreprise n'est typée que `ElectronicsStore`, ce qui **cache l'activité services** aux moteurs.
4. **FAQ JSON-LD** par prestation (helper `faqJsonLd` déjà présent) — fort levier d'extraction générative.
5. **Breadcrumb** Accueil › Services › [prestation] (helper déjà présent).
6. **Google Business Profile** — *le levier le plus rentable de toute cette liste, et il est gratuit* : la catégorie principale actuelle (« Magasin d'accessoires pour téléphones mobiles ») **sous-vend déjà l'activité**. Ajouter en catégories secondaires : *Service de réparation d'ordinateurs*, *Consultant en informatique*, *Service d'installation de systèmes de sécurité* (selon les prestations réelles). Une requête « maintenance informatique Yaoundé » se joue dans le pack local, pas sur la page.

---

## 5. Conversion : ce n'est pas un panier, c'est un lead

`pages/ContactPage.tsx` est aujourd'hui **statique** (lien WhatsApp + `mailto:`), sans formulaire ni table de leads. Pour du B2B c'est insuffisant : une demande de devis qui part en WhatsApp ne laisse aucune trace exploitable.

À prévoir :

- table `service_leads` (entreprise, contact, prestation, taille du parc, message, source) — **avec RLS dès la création** (`insert` public via anon, `select` réservé au staff). Le projet a déjà un historique de tables sans RLS : ne pas en ajouter une.
- double CTA : **WhatsApp** (canal dominant au CM, réponse immédiate) **+** formulaire (traçabilité, relance).
- notification staff à la réception (réutiliser le canal de `utils/notify.ts` / l'Edge Function existante).

---

## 6. Plan d'exécution

| # | Étape | Dépend de |
|---|---|---|
| 0 | **Récupérer du boss la liste réelle des prestations** + 2-3 références clients | boss |
| 1 | `constants/services.ts` (contenu typé) | 0 |
| 2 | `pages/ServicesPage.tsx` (hub) + `pages/ServiceDetailPage.tsx` | 1 |
| 3 | Routes `App.tsx` + entrée nav `Header.tsx` + `LIGHT_BACKGROUND_ROUTES` | 2 |
| 4 | `serviceJsonLd` dans `utils/seo.tsx` + `hasOfferCatalog`/`ProfessionalService` dans `index.html` | 2 |
| 5 | **`STATIC_ROUTES` (prerender) + `staticRoutes` (sitemap)** ← ne pas oublier | 3 |
| 6 | Table `service_leads` + RLS + formulaire devis + notification | 3 |
| 7 | Google Business Profile : catégories secondaires (action du boss, 10 min) | 0 |
| 8 | Citations tierces : annuaires CM, presse locale, pointant vers `/services` | 2 |

L'étape **0 bloque tout le contenu** — mais rien d'autre. Les étapes 3, 4, 5 sont de la plomberie qui peut être posée dès que la structure des pages est là.

---

## 7. Ce qu'on ne fait pas

- ❌ Acheter `xeption.cm` ou tout autre `.cm` (décision déjà arbitrée).
- ❌ Sous-domaine `services.` (aucune des trois conditions qui le justifieraient n'est réunie).
- ❌ Un CMS séparé (WordPress/Webflow) : 2ᵉ stack à maintenir, design system dupliqué.
- ❌ Fusionner « SAV » et « Services » : l'un est du service après-vente client, l'autre une prestation vendue. Deux intentions, deux pages.
