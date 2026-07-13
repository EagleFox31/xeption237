# Stratégie de Rétention Client — Xeption Network 237

> Analyse des gaps par rapport à la concurrence locale (Jumia Cameroun, revendeurs WhatsApp)
> et internationale (Amazon, AliExpress, Back Market).
> Rédigée le 11 juin 2026.

---

## Ce que le projet fait déjà bien

Avant les manques : Smart Troc IA, paiements locaux (OM/MoMo), SAV intégré, admin riche, SEO solide, chatbot Gemini, livraison nationale sur 19 villes. La base est sérieuse et différenciante.

Le risque actuel : Xeption **attire** les clients grâce à son positionnement premium, mais n'a pas encore les mécanismes pour les **retenir** après le premier achat. Un client qui achète une fois est un prospect pour Jumia lors de son prochain achat.

---

## Gaps Critiques (🔴 Urgents)

### 1. Comptes clients acheteurs

**Problème :** L'auth Supabase est réservée au staff. Un client qui achète aujourd'hui ne peut pas revoir son historique de commandes, retrouver ses infos de livraison pré-remplies, suivre plusieurs commandes simultanément, ni accéder à ses tickets SAV depuis un espace personnel.

**Concurrence :** Jumia, Amazon, AliExpress ont tous un espace client complet.

**Impact rétention :** Un client sans compte est un étranger à chaque visite. Il n'a aucune raison structurelle de revenir *sur ce site* plutôt que de chercher ailleurs.

**À implémenter :**
- Inscription/connexion client (email ou téléphone)
- Tableau de bord client : commandes, Troc, SAV, points fidélité
- Pré-remplissage des infos au checkout (nom, ville, téléphone)
- Historique complet avec statuts en temps réel

---

### 2. WhatsApp Business API — notifications transactionnelles

**Problème :** Le projet a un lien WhatsApp statique, mais aucune intégration API. Pour la cible camerounaise (18–40 ans), WhatsApp est LE canal de communication dominant — il bat l'email sans discussion.

**Concurrence locale :** Les revendeurs WhatsApp au Cameroun battent les sites e-commerce sur la réactivité. C'est le canal dominant.

**À implémenter :**
- Confirmation de commande via WhatsApp (immédiate)
- Notification d'expédition : "Votre commande est en route, livraison prévue demain"
- Alerte SAV : "Votre réparation est terminée, passez récupérer votre appareil"
- Notification Troc : "Votre évaluation est validée, crédit disponible"
- Relance panier abandonné (24h après abandon)

**Prestataires compatibles Cameroun :** Twilio, 360dialog, WhatsApp Business Cloud API (Meta).

---

### 3. Récupération de panier abandonné

**Problème :** Le panier est persisté en localStorage, mais si un client quitte au moment du checkout, rien ne le rappelle. Sur e-commerce, ~70% des paniers sont abandonnés. Récupérer 10% de ces paniers = +7% de CA.

**À implémenter :**
- Capture email/téléphone dès la 1ère étape du checkout (avant paiement)
- Message WhatsApp ou email "Vous avez oublié quelque chose" (délai 2–4h)
- Message de relance J+1 : "Votre panier expire bientôt"
- Offre de conversion optionnelle : "-5% si vous finalisez aujourd'hui" (à activer manuellement depuis l'admin)

---

### 4. Avis clients vérifiés (remplacer les avis IA)

**Problème :** Les avis affichés sont générés par Gemini. En 2026, les acheteurs tech vérifient les avis, les comparent, et cherchent les avis 1–2 étoiles. Des faux avis détectés = perte de confiance totale et irréversible.

**Règle métier décidée :** Un produit n'affiche ses avis que si au moins **2 achats vérifiés** ont été enregistrés pour ce produit.

**À implémenter :**
- Demande d'avis automatique 7 jours après livraison confirmée (WhatsApp ou email)
- Formulaire simple : note (1–5 étoiles) + commentaire libre + photo optionnelle
- Badge "Achat vérifié" affiché sous chaque avis
- Affichage conditionnel : section avis visible uniquement si `verified_reviews_count >= 2`
- Les avis IA synthétiques peuvent rester en attendant mais clairement différenciés (ex. "Synthèse IA de la presse tech") ou retirés

---

## Gaps de Différenciation (🟠 Court terme)

### 5. Wishlist / Produits sauvegardés

**Problème :** Un client qui voit un iPhone à 450 000 XAF mais n'a pas l'argent maintenant n'a nulle part où le sauvegarder. Il reviendra ? Peu probable. La wishlist est le meilleur indicateur d'intention d'achat différée.

**À implémenter :**
- Bouton cœur ♡ sur chaque fiche produit et dans le catalogue
- Wishlist persistée côté compte client (ou localStorage si non connecté)
- Notification optionnelle : "Un produit de votre wishlist est en promo"
- Notification : "Stock limité sur un produit sauvegardé (plus que X unités)"

---

### 6. Programme de fidélité — Xeption Points

**Problème :** Aucun mécanisme de récompense pour les clients récurrents. Cité dans la roadmap mais non implémenté.

**Concurrence :** Jumia Loyalty (points), AliExpress Coins, Amazon Prime.

**Proposition — Système Xeption Points :**

| Action | Points gagnés |
|--------|--------------|
| Achat produit | 1 pt par 100 XAF dépensé |
| Troc complété | 500 pts bonus |
| Avis vérifié déposé | 200 pts |
| Parrainage converti | 1 000 pts |
| Anniversaire compte | 500 pts |

| Palier | Seuil | Avantage |
|--------|-------|----------|
| Bronze | 0 pts | Accès standard |
| Silver | 5 000 pts | Livraison express offerte 1x/mois |
| Gold | 15 000 pts | -5% sur tous les achats |
| Elite | 50 000 pts | Accès early à nouveaux produits + SAV prioritaire |

- 1 000 pts = 500 XAF de réduction (taux de conversion : 0.5 XAF/pt)
- Points valables 12 mois

---

### 7. Paiement en plusieurs fois

**Problème :** Pour des appareils à 200 000–800 000 XAF, le frein numéro 1 est le prix. La concurrence locale (boutiques physiques) propose souvent des facilités de paiement.

**À implémenter :**
- Paiement en **2x** : 50% à la commande + 50% à la livraison
- Paiement en **3x** : paiement mensuel via OM/MoMo
- Affichage du prix mensuel sur les fiches produit : "Ou 3x 83 333 XAF sans frais"
- Partenaires à explorer : YUP Cameroun, Bizao, arrangement interne admin-validé

---

### 8. Programme de parrainage

**Problème :** Aucun mécanisme de bouche-à-oreille structuré. Compatible avec la culture de recommandation locale au Cameroun.

**À implémenter :**
- Lien de parrainage unique par compte client
- Récompense double : parrain **+5 000 XAF** de crédit, filleul **-5 000 XAF** sur 1ère commande (seuil minimum 50 000 XAF)
- Tableau de bord parrainage dans l'espace client
- Partage facile via WhatsApp (bouton natif)
- Limite anti-abus : 1 parrainage actif par numéro de téléphone

---

## Gaps Moyen Terme (🟡)

### 9. Comparateur de produits

**Problème :** La cible tech compare systématiquement avant d'acheter (GSMArena, GSMchoice, etc.). Garder l'utilisateur sur Xeption pendant cette phase de comparaison = gain de conversion.

**À implémenter :**
- Bouton "Comparer" sur fiches produit (jusqu'à 3 produits)
- Tableau de comparaison côte à côte : processeur, RAM, stockage, batterie, prix, garantie
- Mise en surbrillance automatique du meilleur score par critère

---

### 10. Version bilingue FR / EN

**Problème :** Le projet livre maintenant à Buea, Bamenda, Limbe, Kumba — villes anglophones. L'application est 100% en français. Jumia est bilingue.

**À implémenter :**
- Toggle FR/EN dans le header (persisté dans localStorage ou compte client)
- Traduction des pages clés en priorité : Home, Shop, fiche produit, Checkout, Troc
- Les contenus dynamiques (descriptions produits) peuvent rester en FR dans un premier temps avec mention "version anglaise à venir"
- Pages légales et CGV à traduire en phase 2

---

### 11. Alertes prix / retour en stock

**Problème :** Un client intéressé par un produit épuisé n'a aucun moyen d'être alerté. Il ira voir ailleurs et ne reviendra pas.

**À implémenter :**
- Bouton "Me prévenir quand disponible" sur produit en rupture de stock
- Alerte "Le prix a baissé sur un produit de votre wishlist" (déclenché quand `isPromo` passe à `true` ou prix réduit > 5%)
- Envoi via WhatsApp ou email selon préférence client

---

### 12. Live chat support humain

**Problème :** Le chatbot Gemini est excellent pour la discovery produit, mais quand un client a un problème urgent (paiement bloqué, commande non reçue), il veut un humain.

**À implémenter :**
- Intégration d'un live chat léger (Tawk.to gratuit, ou WhatsApp Business pour le support)
- Horaires de disponibilité clairement affichés : "Support dispo Lun–Sam 8h–20h"
- Indicateur temps de réponse moyen : "Réponse en moins de 15 min"
- Escalade automatique depuis le chatbot IA vers un humain si l'IA détecte une insatisfaction

---

### 13. Recommandations produits dynamiques

**Problème :** Les "related items" actuels sont statiques par catégorie. Pas de recommandation personnalisée basée sur le comportement.

**À implémenter (ordre de priorité) :**
1. "Fréquemment achetés ensemble" (phone + coque + écouteurs) — règles manuelles admin
2. "Clients qui ont acheté X ont aussi acheté Y" — calculé sur historique commandes
3. "Complète ton setup" — bundle suggéré dynamique
4. Historique de navigation "Récemment consultés" (localStorage)

---

### 14. Tracking livraison en temps réel

**Problème :** Le tracking actuel montre des statuts (confirmed → shipped → delivered), mais pas une localisation en temps réel. Glovo et Yango affichent la position du livreur — c'est devenu un standard en Afrique.

**À implémenter (en 2 phases) :**
- **Phase 1** : Mises à jour fréquentes des statuts depuis l'app livreur (formulaire simple sur mobile livreur)
- **Phase 2** : Partage de position GPS du livreur via WhatsApp ("Votre livreur est à 10 min")

---

## Récapitulatif Priorisation

| # | Feature | Impact Rétention | Effort | Priorité |
|---|---------|-----------------|--------|----------|
| 1 | Comptes clients acheteurs | ⭐⭐⭐⭐⭐ | Moyen | 🔴 Urgent |
| 2 | WhatsApp Business API (notifications) | ⭐⭐⭐⭐⭐ | Moyen | 🔴 Urgent |
| 3 | Récupération panier abandonné | ⭐⭐⭐⭐⭐ | Faible | 🔴 Urgent |
| 4 | Avis clients vérifiés (min. 2 achats) | ⭐⭐⭐⭐⭐ | Faible | 🔴 Urgent |
| 5 | Wishlist / produits sauvegardés | ⭐⭐⭐⭐ | Faible | 🟠 Court terme |
| 6 | Programme de fidélité Xeption Points | ⭐⭐⭐⭐ | Moyen | 🟠 Court terme |
| 7 | Paiement en 2x / 3x | ⭐⭐⭐⭐ | Moyen | 🟠 Court terme |
| 8 | Programme de parrainage | ⭐⭐⭐⭐ | Faible | 🟠 Court terme |
| 9 | Comparateur de produits | ⭐⭐⭐ | Moyen | 🟡 Moyen terme |
| 10 | Version bilingue FR / EN | ⭐⭐⭐ | Élevé | 🟡 Moyen terme |
| 11 | Alertes prix / retour en stock | ⭐⭐⭐ | Faible | 🟡 Moyen terme |
| 12 | Live chat support humain | ⭐⭐⭐ | Faible | 🟡 Moyen terme |
| 13 | Recommandations dynamiques | ⭐⭐⭐ | Élevé | 🟡 Moyen terme |
| 14 | Tracking livraison temps réel | ⭐⭐⭐ | Élevé | 🟡 Moyen terme |

---

## Positionnement vs Concurrence

| Feature | Xeption (actuel) | Xeption (cible) | Jumia CM | Amazon |
|---------|-----------------|-----------------|----------|--------|
| Compte client | ❌ | ✅ | ✅ | ✅ |
| WhatsApp notifications | ❌ | ✅ | ⚠️ partiel | ❌ |
| Avis vérifiés | ❌ (IA) | ✅ | ✅ | ✅ |
| Wishlist | ❌ | ✅ | ✅ | ✅ |
| Fidélité / points | ❌ | ✅ | ✅ | ✅ |
| Paiement mobile local | ✅ | ✅ | ✅ | ❌ |
| Smart Troc IA | ✅ | ✅ | ❌ | ❌ |
| SAV intégré | ✅ | ✅ | ⚠️ | ✅ |
| Chatbot IA contextuel | ✅ | ✅ | ❌ | ⚠️ |
| Comparateur produits | ❌ | ✅ | ⚠️ | ✅ |
| Bilingue FR/EN | ❌ | ✅ | ✅ | ✅ |
| Paiement en 3x | ❌ | ✅ | ⚠️ | ✅ |
| Parrainage | ❌ | ✅ | ⚠️ | ⚠️ |

---

## Les 3 actions à lancer en premier

1. **Comptes clients** — sans ça, tout le reste (points, wishlist, avis, parrainage) est techniquement impossible. C'est le socle.
2. **WhatsApp Business API** — rester dans le quotidien du client après l'achat. C'est ce que les boutiques physiques font naturellement. Digitaliser ce lien = avantage concurrentiel fort au Cameroun.
3. **Avis vérifiés** — remplacer les avis IA par de vrais avis acheteurs avec la règle des 2 achats minimum. La confiance long terme en dépend.
