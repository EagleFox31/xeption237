# 💰 Coûts d'infrastructure — Xeption 237

> Document de décision pour la direction. Estimation des dépenses nécessaires pour que la plateforme tourne en production de façon fiable.
> Conversion utilisée : **1 USD ≈ 600 FCFA** (à ajuster selon le taux réel au paiement).
> Dernière mise à jour : 2026-06-15.

---

## 1. Résumé exécutif

| Phase | Coût mensuel estimé | Commentaire |
|---|---|---|
| **Minimum pour lancer** (faible volume) | **~0 – 10 000 FCFA / mois** | La plupart des services ont un palier gratuit suffisant au démarrage. |
| **Production stable** (volume réel) | **~30 000 – 70 000 FCFA / mois** | Quand on dépasse les paliers gratuits (Supabase, Cloudinary, IA). |
| **Frais ponctuels (one-time)** | **~10 – 70 000 FCFA** | Crédit OpenRouter + domaine(s). |
| **Frais transactionnels** | **~2–3 % par paiement** | Commission CamPay sur chaque encaissement Mobile Money. |

👉 **Recommandation immédiate : débloquer ~6 000 FCFA (10 USD) de crédit OpenRouter** pour sécuriser le contrôle photo du Troc. Risque financier quasi nul, bénéfice direct sur le chemin qui engage l'argent racheté.

---

## 2. Dépenses récurrentes (mensuelles)

| Service | Rôle | Palier gratuit | Coût si dépassé | Quand ça devient payant |
|---|---|---|---|---|
| **Supabase** | Base de données, Auth staff, Edge Functions, temps réel | Oui (généreux) | ~15 000 FCFA/mois (Pro, 25 USD) | DB > 500 Mo, ou trop d'appels Edge / bande passante |
| **Google Gemini** | Vision (éval Troc payante), recherche prix marché, enrichissement fiches | Oui mais **plafonné** (req/min, req/jour) | Paiement à l'usage, fraction de centime par appel | Dès qu'on dépasse le quota gratuit en production |
| **Cloudinary** | Hébergement images produits + vidéo de fond du site | Oui (25 crédits/mois) | Plan payant (~50 000 FCFA/mois) | **La vidéo de fond consomme beaucoup de bande passante** → risque de dépassement rapide |
| **DeepSeek** | Génération texte (descriptions, specs produits) | Non, mais **très bon marché** | Quelques centaines à milliers de FCFA/mois | Selon volume d'enrichissement catalogue |
| **Hébergement frontend (Vercel)** | Mise en ligne du site | Oui (Hobby) | ~12 000 FCFA/mois (Pro, 20 USD) | Usage commercial intensif / équipe |
| **hCaptcha** | Anti-bot formulaires | Oui | — | Usage normal couvert par le gratuit |

---

## 3. Services à l'usage / par requête

| Service | Rôle | Modèle de coût | À confirmer |
|---|---|---|---|
| **OpenRouter** | Secours du contrôle photo Troc (diversification fournisseur) | Crédit prépayé (~6 000 FCFA / 10 USD débloque les plafonds) | ✅ Testé et fonctionnel en gratuit |
| **IMEI Check** (imeicheck.net) | Vérification IMEI volé/blacklisté lors du Troc | Abonnement ou paiement par requête | ⚠️ **Confirmer le plan et le tarif réel** |
| **Bing Search API** (Azure) | Recherche prix marché concurrents (estimation Troc) | Payant (Microsoft a réduit/retiré le free tier en 2025) | ⚠️ **Vérifier si la clé est active et le coût** |

---

## 4. Frais transactionnels (paiements)

| Service | Rôle | Coût |
|---|---|---|
| **CamPay** (campay.net) | Encaissement Mobile Money (Orange Money, MTN MoMo) — frais Troc + commandes | **Commission ~2–3 % par transaction** (pas d'abonnement fixe). À confirmer le taux négocié. |

> ⚠️ Ce n'est pas un coût fixe : il est proportionnel au chiffre d'affaires encaissé. À intégrer dans la marge.

---

## 5. Frais ponctuels (one-time / annuels)

| Poste | Coût estimé | Note |
|---|---|---|
| **Crédit OpenRouter initial** | ~6 000 FCFA (10 USD) | Priorité immédiate |
| **Domaine `.shop`** (xeptionetwork.shop) | ~3 000 – 20 000 FCFA/an | Variable selon renouvellement |
| **Domaine `.cm`** (si souhaité, ex. xeption.cm) | ~30 000 – 60 000 FCFA/an | Les domaines `.cm` sont chers |

---

## 6. Le point le plus important pour la direction

**Le Smart Troc engage de l'argent réel** : la vision IA décide du montant racheté au client. Deux priorités de fiabilité :

1. **Sécuriser le contrôle photo (preflight)** → ✅ fait, validé gratuitement via OpenRouter. Coût : ~6 000 FCFA de crédit pour passer en production sereine.
2. **L'évaluation complète payante dépend aujourd'hui d'un seul fournisseur (Google Gemini), sans secours.** Si Google bloque la clé ou la facturation (carte internationale exigée), cette étape tombe. → Prévoir : (a) activer la **facturation Gemini payante** pour éviter le throttling, (b) à terme, un second fournisseur de secours sur cette étape.

⚠️ **Contrainte Cameroun** : la facturation Google Cloud et Azure (Bing) exige souvent une **carte bancaire internationale**. À anticiper côté direction.

---

## 7. Décisions demandées à la direction

- [ ] ✅ **Créditer 10 USD sur OpenRouter** (priorité 1, risque nul)
- [ ] Activer la facturation **Google Cloud / Gemini** (carte internationale)
- [ ] Confirmer le **taux de commission CamPay** négocié
- [ ] Confirmer le **plan IMEI Check** (imeicheck.net) actif et son coût
- [ ] Vérifier la **clé Bing Search API** (active ? coût ?)
- [ ] Surveiller la **consommation Cloudinary** (vidéo de fond = poste à risque)

---

> 📌 Les montants « à confirmer » dépendent de contrats/clés que je n'ai pas pu vérifier depuis le code seul. Les volumes réels (nombre de Trocs/mois, trafic) affineront les estimations « production stable ». Ce document liste tout ce qui *peut* coûter — pas tout ne sera activé immédiatement.
