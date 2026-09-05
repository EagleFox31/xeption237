# Strategie IA Xeption 237

Document de cadrage pour l'usage de l'IA dans Xeption 237.

## 1. Usages IA actuels dans le projet

### Chat client
- Fichier principal: `services/geminiService.ts`
- UI: `components/AiConsultant.tsx`
- Usage: assistant commercial public pour guider un visiteur selon budget, besoin et catégorie produit.
- Nature: génération texte conversationnelle.

### Enrichissement fiche produit
- Fichier principal: `services/geminiService.ts`
- UI admin: `components/AdminPanel.tsx`
- Usage: génération de description, verdict court, pros/cons et specs.
- Nature: génération texte structurée.

### Génération d'avis/commentaires produit
- Fichier principal: `services/reviewGenerator.ts`
- Usage: génération d'avis synthétiques de preuve sociale.
- Nature: génération texte structurée.

### Analyse photo Smart Troc
- Fichier principal: `supabase/functions/evaluate-device/index.ts`
- Usage: analyser les photos d'un appareil et produire un score + justification.
- Nature: vision multimodale.

### Vérification IMEI / identification marque-modèle
- Fichier principal: `supabase/functions/check-imei/index.ts`
- Front: `hooks/useTradeIn.ts`
- Usage: vérifier la validité IMEI, essayer d'identifier la marque et le modèle, et en premium vérifier le blacklist status.
- Nature: orchestration hybride, pas seulement IA.

### Intelligence prix marché
- Fichier principal: `supabase/functions/market-price-intel/index.ts`
- Usage: estimer un prix de référence à partir d'offres web et d'un traitement de consolidation.
- Nature: scraping + scoring + éventuellement IA.

## 2. Réalité technique importante

Il ne faut pas confondre trois choses:

- `Scraping`: le code va chercher des pages, snippets ou API.
- `RAG`: on injecte à l'IA des données récupérées ou internes.
- `Persona`: on donne à l'IA un rôle métier spécialisé pour traiter ces données.

Conclusion:
- Gemini ne scrape pas "tout seul" dans ce projet.
- Le code doit d'abord collecter les informations.
- Ensuite un persona spécialisé peut raisonner dessus.

## 3. Mon avis pragmatique sur les versions gratuites

### Fiches produit + avis
- Les versions gratuites suffisent largement au début.
- Ce sont des actions admin, peu fréquentes et non déclenchées par tous les visiteurs.
- Risque principal: faible.
- Priorité abonnement: basse.

### Chat client
- Le gratuit peut suffire au lancement.
- C'est la première fonctionnalité susceptible de heurter les quotas si beaucoup de visiteurs cliquent dessus.
- Le coût unitaire reste modéré, mais le volume peut exploser vite.
- Priorité abonnement: moyenne.

### Analyse photo troc
- Cela reste tenable au début.
- C'est plus coûteux que le chat texte, car on envoie plusieurs images.
- C'est probablement la fonctionnalité IA la plus lourde côté Gemini dans le produit.
- Priorité abonnement: moyenne à haute si Smart Troc prend du trafic.

### IMEI premium
- Ce n'est pas seulement de l'IA, c'est surtout un coût service externe.
- Si on veut de la vraie vérification premium répétée, la démo gratuite ne suffit pas.
- C'est la première brique à prévoir en payant si le module troc devient opérationnel.
- Priorité abonnement: haute.

### Vidéo marketing
- Ce n'est pas vital au lancement.
- C'est la fonctionnalité la plus coûteuse du repo si elle est utilisée.
- À réserver à des usages internes ou marketing ponctuels.
- Priorité abonnement: conditionnelle, mais coût élevé.

## 4. Ce qui consomme le plus

Ordre approximatif de risque/coût:

1. IMEI premium via service externe
2. Analyse photo troc
3. Chat client public
4. Génération fiches produit
5. Génération avis/commentaires

Nuance:
- en coût brut Gemini, l'analyse photo dépasse souvent le chat texte.
- en risque opérationnel, l'IMEI premium est souvent le premier poste à payer.

## 5. Recommandation budget

### Début de projet / trafic faible
- Rester en gratuit pour fiches produit, avis et chat.
- Garder l'analyse photo active mais surveiller le volume.
- N'activer l'IMEI premium que pour les tests utiles ou les cas métier importants.

### Lancement public réel
- Activer la facturation Gemini.
- Garder des garde-fous sur le chat public.
- Prévoir un budget IMEI premium si Smart Troc fait partie de la promesse produit.

### Phase de montée
- Mettre en cache agressivement.
- Limiter les appels non indispensables.
- Isoler les tâches IA par cas d'usage au lieu d'un agent générique unique.

## 6. Architecture recommandée: personas + RAG par tâche

Le bon modèle n'est pas "une IA qui fait tout".

Le bon modèle est:
- une collecte de données par tâche
- un persona spécialisé par tâche
- un RAG propre à la tâche
- une sortie JSON structurée
- des règles métier côté code

## 7. Persona + RAG recommandés par fonctionnalité

### A. IMEI Resolver

#### Objectif
Identifier marque/modèle et niveau de confiance, sans dépendre d'un seul site fragile.

#### Persona
`IMEI Resolver`

Mission:
- déterminer la marque et le modèle les plus probables à partir du TAC, de l'historique et des sources collectées
- ne jamais inventer
- fournir une hypothèse avec confiance et preuves

#### RAG
- cache TAC interne
- seed KB TAC -> modèle
- historique interne `trade_in_requests`
- résultat imeicheck premium
- snippets/pages de sources récupérées par le backend

#### Sortie attendue
```json
{
  "brand": "Samsung",
  "model": "Galaxy S21 Plus 5G",
  "canonicalModel": "Samsung Galaxy S21 Plus 5G",
  "confidence": 0.91,
  "decision": "auto_match",
  "evidence": [
    {"source": "imeicheck", "weight": 0.98},
    {"source": "tac_cache", "weight": 0.90}
  ],
  "notes": "Correspondance forte sur TAC et historique"
}
```

#### Règle métier
- `confidence >= 0.85`: auto-match
- `0.60 à 0.84`: revue manuelle
- `< 0.60`: non fiable

### B. Product Enricher

#### Objectif
Aider l'admin à remplir une fiche produit cohérente et propre.

#### Persona
`Product Enricher`

Mission:
- transformer une fiche brute en contenu e-commerce exploitable
- rester aligné au ton Xeption
- ne pas inventer des specs critiques si elles ne sont pas sourcées

#### RAG
- catalogue produit interne
- marque, gamme, catégorie
- specs existantes en base
- éventuelles sources web récupérées côté backend
- règles de ton éditorial Xeption

#### Sortie attendue
- description
- reviewShort
- pros
- cons
- specs
- champs à vérifier manuellement

### C. Review Synthesizer

#### Objectif
Produire ou résumer de la preuve sociale crédible sans dériver en hallucinations.

#### Persona
`Review Synthesizer`

Mission:
- générer des avis plausibles ou résumer des avis existants
- conserver un ton local crédible
- éviter le spam d'avis artificiels

#### RAG
- avis internes
- avis sourcés disponibles
- catégorie produit
- positionnement prix
- règles de langage local

#### Recommandation
- préférer résumé/synthèse si des sources existent
- éviter une génération massive "from scratch" pour toutes les fiches

### D. Sales Guide

#### Objectif
Guider le visiteur selon budget, usage et disponibilité catalogue.

#### Persona
`Sales Guide`

Mission:
- qualifier le besoin
- proposer peu d'options mais les bonnes
- pousser les produits réellement disponibles

#### RAG
- catalogue réel
- stocks
- prix
- packs
- garanties
- FAQ livraison/paiement

#### Règle métier
- jamais recommander un produit hors stock
- prioriser disponibilité et marge raisonnable

### E. Troc Vision Analyst

#### Objectif
Analyser les photos d'un appareil pour l'estimation de reprise.

#### Persona
`Troc Vision Analyst`

Mission:
- décrire l'état réel visible
- relever les contradictions entre déclaratif et photos
- produire un score exploitable par le pricing

#### RAG
- photos envoyées
- fiche déclarative appareil
- grille interne de scoring
- exemples annotés historiques si disponibles plus tard

#### Point critique
- c'est une fonction coûteuse
- elle mérite cache, fallback et usage parcimonieux

### F. Market Price Analyst

#### Objectif
Estimer un prix de marché de référence propre au contexte Cameroun.

#### Persona
`Market Price Analyst`

Mission:
- agréger des offres hétérogènes
- filtrer les faux positifs
- proposer un prix de référence et un niveau de confiance

#### RAG
- offres scrapées
- historique de ventes internes
- Argus interne
- règles de filtrage par stockage/RAM/gamme

#### Règle métier
- l'IA propose
- le code décide

## 8. Ce que je recommande concrètement

### À court terme
- garder Gemini pour chat, fiches, avis, vision
- payer uniquement si le volume commence à monter
- prioriser le budget IMEI premium avant les autres dépenses IA

### À moyen terme
- sortir un orchestrateur par tâche
- ajouter un vrai schéma de sortie JSON pour chaque persona
- séparer collecte, raisonnement, décision

### À long terme
- construire un vrai RAG interne Xeption:
- catalogue canonique
- historique troc
- historique prix
- historique produits
- FAQ et règles métier

## 9. Décision finale recommandée

- Oui, il faut aller vers `persona + RAG par tâche`.
- Non, il ne faut pas centraliser tout dans un seul agent "magique".
- Oui, les versions gratuites suffisent pour démarrer sur la plupart des usages.
- Non, elles ne suffiront probablement pas longtemps si le chat public et Smart Troc prennent du trafic.
- Oui, l'IMEI premium doit être vu comme un poste payant distinct, prioritaire si le troc devient un vrai service.

## 10. Priorité de mise en œuvre

1. `IMEI Resolver v2`
2. `Sales Guide` connecté au vrai catalogue
3. `Product Enricher` avec sortie stricte
4. `Troc Vision Analyst` avec cache/fallback renforcé
5. `Review Synthesizer` recentré sur résumé plutôt que génération libre

## 11. Décision d'exécution retenue

Pour éviter de disperser l'effort, l'ordre retenu est le suivant:

### Phase 1
- Construire `IMEI Resolver` en premier.
- Objectif: fiabiliser la marque/modèle et casser la dépendance à un seul provider fragile.
- Mise en œuvre: persona dédié + contrat JSON + fallback Gemini + preuves structurées.

### Phase 2
- Construire `Sales Guide`.
- Objectif: brancher le chat sur le vrai catalogue, le stock et les règles commerciales.

### Phase 3
- Construire `Product Enricher`.
- Objectif: fiabiliser la génération de fiches sans hallucination de specs critiques.

### Phase 4
- Construire `Troc Vision Analyst`.
- Objectif: rendre l'analyse photo plus explicable, plus stable et plus cacheable.

### Phase 5
- Construire `Review Synthesizer`.
- Objectif: préférer la synthèse de preuves sociales à la génération libre massive.

## 12. Ce qui est déjà lancé

Le premier socle concret a été retenu sur `IMEI Resolver`:
- extraction du persona hors du corps métier,
- prompt spécialisé dédié,
- sortie JSON normalisée,
- parseur réutilisable côté Edge Function.

Ce socle doit maintenant servir de pattern pour les personas suivants.
