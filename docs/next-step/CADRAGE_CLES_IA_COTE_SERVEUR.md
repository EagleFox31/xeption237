# Cadrage — sortir les clés IA du navigateur

**Date** : 2026-08-24
**Origine** : constat fait pendant la remise en service du pipeline vision
(`docs/engineering/PLAN_FIX_PIPELINE_VISION.md`).
**Statut** : à arbitrer. Rien n'est engagé.

---

## 0. En deux phrases

Les clés Gemini et OpenRouter sont livrées **en clair dans le JavaScript du
site** : n'importe qui peut les extraire et dépenser les crédits. En instruisant
le sujet, j'ai trouvé que le périmètre est plus large que les deux canaux de
secours du troc — **cinq points d'appel**, dont **trois fonctionnalités
actuellement hors service** pour la même raison que la panne d'aujourd'hui.

---

## 1. Le problème de fond

Vérifié sur le bundle construit (`dist/assets/index-*.js`) :

```
VITE_OPENROUTER_API_KEY  >>> PRESENTE EN CLAIR DANS LE BUNDLE <<<
VITE_GEMINI_API_KEY      >>> PRESENTE EN CLAIR DANS LE BUNDLE <<<
```

Ce n'est pas une erreur de configuration : le préfixe `VITE_` **signifie**
« remplacé à la compilation et livré au navigateur ». Il n'y a pas de réglage
qui rende une variable `VITE_` privée. Tant que l'appel part du navigateur, la
clé part avec.

**Ce que ça coûte concrètement.** Un visiteur ouvre les sources, copie la clé,
et l'utilise pour son propre compte. Sur Gemini, la facture suit l'usage. Sur
OpenRouter, les crédits chargés partent. Aucune alerte ne se déclenche : de
l'extérieur, ces appels ressemblent aux nôtres.

**Ce qui rend le risque réel aujourd'hui plutôt que théorique** : le site est en
préproduction, sans vraies ventes. Les clés valent donc peu **maintenant**. Le
jour où le tier payant Gemini est activé pour absorber le trafic (point déjà
prévu dans la stratégie vision), la même clé exposée devient une facture ouverte.
Le bon moment pour refermer, c'est avant ce basculement.

---

## 2. Le périmètre réel : cinq points d'appel, pas deux

| # | Fichier | Usage | Clé | État |
|---|---|---|---|---|
| 1 | `services/openRouterVisionClient.ts` | Secours préflight photo | OpenRouter | fonctionne |
| 2 | `services/trocVisionProvider.ts` → `geminiClient` | Secours vision navigateur | Gemini | **HS** — modèle retiré |
| 3 | `services/geminiService.ts` → `AiConsultant.tsx` | Chatbot conseil d'achat, **site public** | Gemini | **HS** — modèle retiré |
| 4 | `services/geminiService.ts` → `ProductEditorOverlay.tsx` | Génération de description produit, admin | **DeepSeek** | fonctionne |
| 5 | `services/geminiService.ts` → `productIngestionFunnel.ts` | Entonnoir d'import catalogue, admin | **DeepSeek** | fonctionne |
| 6 | `services/deepseekClient.ts` | Clé DeepSeek, lue côté navigateur | DeepSeek | à traiter comme les autres |

### 2.1 Deux fonctionnalités sont à terre en ce moment

`services/geminiClient.ts` code en dur les **mêmes modèles retirés** que ceux qui
ont fait tomber le pipeline vision :

```ts
export const GEMINI_TEXT_MODEL = 'gemini-2.0-flash';          // retiré
export const GEMINI_CREDIBILITY_MODEL = 'gemini-2.0-flash-lite'; // retiré
```

Vérifié en exerçant l'API avec la clé du front — et non en consultant
`models.list`, qui ment (cf. `ERRORS_LOG.md`) :

```
gemini-2.0-flash        HTTP 404  "This model is no longer available"
gemini-2.0-flash-lite   HTTP 404  "This model is no longer available"
gemini-3.5-flash        répond
gemini-flash-lite-latest répond
```

Conséquence : le **chatbot du site public** et le **secours vision navigateur**
échouent à chaque appel. Ce n'est pas une régression d'aujourd'hui — c'est la
même cause, sur des fichiers que la correction du pipeline vision n'a pas touchés.

> **Correction du 2026-08-24.** Une première version de ce document annonçait
> *trois* fonctionnalités HS, en y ajoutant la génération de descriptions produit.
> C'était faux : `generateProductDetails` appelle `deepseekChatJson`, pas Gemini.
> J'avais déduit le fournisseur du fait que ces composants importent
> `geminiService`, sans vérifier quelle fonction utilise quel fournisseur — alors
> que le commentaire au-dessus de la fonction le dit explicitement.
>
> À retenir : **le nom d'un module ne dit pas ce que chacune de ses fonctions
> appelle.** Et `VITE_DEEPSEEK_API_KEY` s'ajoute à la liste des clés à sortir du
> navigateur — elle n'est pas dans le `.env` local, donc cette fonctionnalité est
> inutilisable ici, mais le problème d'exposition est le même en production.

> C'est probablement l'explication de « seul le chatbot Gemini a raté » noté dans
> l'audit de découvrabilité.

### 2.2 Code mort trouvé au passage

`components/AdminPanel.tsx` (à ne pas confondre avec `components/admin/AdminPanel.tsx`,
qui est celui réellement routé) n'est référencé nulle part. Il importe
`generateMarketingVideo` depuis `geminiService`, **fonction qui n'existe pas** :
l'appel lèverait « is not a function ». À supprimer.

---

## 3. Ce qui marche déjà, et sert de modèle

`evaluate-device` fait exactement ce qu'il faut : la clé vit dans les secrets
Supabase, le navigateur n'envoie que des URLs de photos, et depuis aujourd'hui la
fonction porte une chaîne de modèles, un budget de temps et un contrôle de santé
qui exerce réellement la capacité.

Le chantier consiste donc à **étendre un motif éprouvé**, pas à en inventer un.

---

## 4. Le piège à ne pas rater : déplacer la clé ne suffit pas

Une Edge Function appelable anonymement avec la clé à l'intérieur, c'est la même
faille avec une étape de plus : au lieu de voler la clé, on appelle le proxy en
boucle. Le chatbot est sur le **site public, sans authentification** — c'est la
surface la plus exposée.

~~Aucune des 15 Edge Functions n'implémente de limitation de débit.~~
**Périmé au 2026-08-24, 17h47** : le lot 1 a été engagé en parallèle.
`supabase/functions/_shared/rateLimit.ts` existe, avec une fenêtre par buckets
sur `sessionKey` + IP, et il est câblé dans `check-imei`, `evaluate-device` et
`market-price-intel`.

⚠️ **La migration `20260824_030_ai_usage_quota.sql` est encore EN ATTENTE.** Le
module échoue *ouvert* (`consumeBucket` renvoie `null` si la RPC manque, et il
faut `count != null` pour bloquer) : déployer avant la migration ne verrouille
donc personne. Mais tant qu'elle n'est pas appliquée, **le quota ne s'applique
pas et rien ne le signale** — même profil que le `healthCheck` qui répondait
« ready » pendant la panne. À appliquer avant de considérer le lot 1 comme fait.

Trois niveaux possibles, du plus simple au plus solide :

| niveau | mécanisme | coût | tient contre |
|---|---|---|---|
| A | Quota par `sessionKey` + IP en base, fenêtre glissante | faible | l'abus opportuniste |
| B | A + hCaptcha sur le chatbot (déjà une dépendance du projet) | moyen | le script automatisé |
| C | B + authentification requise pour l'admin | — | déjà acquis côté admin |

Recommandation : **A pour tout, B en plus pour le chatbot public**. Les points 4
et 5 (admin) sont déjà derrière une authentification, donc A suffit.

---

## 5. Options d'architecture

### Option 1 — Une Edge Function proxy générique `ai-proxy`
Un point d'entrée, un paramètre `task` (`chat` / `product-details` / `vision-preflight`).

*Pour* : un seul endroit à sécuriser, à limiter, à journaliser. Un seul déploiement.
*Contre* : si le proxy accepte un prompt libre venu du client, on a construit une
passerelle ouverte vers Gemini — la faille reprise sous une autre forme. **Le
prompt doit être construit côté serveur**, le client n'envoyant que des données.

### Option 2 — Une fonction par usage (`ai-chat`, `ai-product-details`)
*Pour* : chaque fonction n'expose que ce dont elle a besoin, prompts figés côté serveur, quotas ajustés à l'usage.
*Contre* : plus de fonctions à maintenir et à déployer.

### Option 3 — Ne rien déplacer, restreindre les clés
Restriction par référent HTTP côté Google, clé OpenRouter à budget plafonné.

*Pour* : quelques minutes de travail.
*Contre* : la restriction par référent se contourne trivialement (un en-tête se
falsifie). Ça réduit l'abus opportuniste, pas l'abus déterminé. **Utile comme
mesure d'attente, pas comme solution.**

**Recommandation : option 2**, avec les prompts construits côté serveur — les
personas existent déjà dans `supabase/functions/_shared/personas/`, ce qui rend
le déplacement naturel.

---

## 6. Découpage proposé

### Lot 0 — Remise en service, sans rien déplacer *(le plus urgent)*
Corriger les modèles retirés dans `services/geminiClient.ts` et
`services/geminiService.ts:109`, en réutilisant la logique de chaîne déjà écrite
pour `evaluate-device`. Supprimer `components/AdminPanel.tsx` (code mort).

> Rend le chatbot et la génération de descriptions fonctionnels **immédiatement**,
> indépendamment de la décision sur les clés. Ne referme aucune faille.

### Lot 1 — Garde-fou anti-abus
Table de quota (`ai_usage_quota`), fenêtre glissante par `sessionKey` + IP,
fonction partagée `_shared/rateLimit.ts`. À poser **avant** les proxies, sinon
ils ouvrent une passerelle non bridée.

### Lot 2 — `ai-chat` : sortir le chatbot public
Le plus exposé, donc le premier. Prompt et catalogue côté serveur ; le client
n'envoie que le message et l'historique. hCaptcha au-delà d'un seuil.

### Lot 3 — `ai-product-details` : descriptions produit
Couvre les points 4 et 5 d'un coup (l'éditeur admin et l'entonnoir d'import
appellent la même fonction). Déjà derrière authentification.

### Lot 4 — Canaux de secours vision
Deux voies, à arbitrer :
- **Supprimer** le secours Gemini navigateur — il n'a jamais été qu'un « dernier
  recours dev » (son propre commentaire le dit) et il double une famille déjà
  couverte par le canal principal ; il n'apporte donc **aucune résilience réelle**.
- **Déplacer** le secours OpenRouter dans `evaluate-device`, qui deviendrait le
  seul point d'appel vision. C'est aussi la seule façon de donner enfin un
  secours non-Gemini à l'**évaluation payante**, qui n'en a toujours aucun.

### Lot 5 — Nettoyage
Retirer `VITE_GEMINI_API_KEY` et `VITE_OPENROUTER_API_KEY` de `.env`, de
`vite-env.d.ts` et du `define` dans `vite.config.ts`, **puis révoquer et
recréer les deux clés** — celles qui ont circulé dans un bundle sont à
considérer comme compromises.

---

## 7. Décisions à prendre

1. **Révoquer la clé OpenRouter maintenant, ou attendre le lot 5 ?**
   Dépend d'une chose : la preview est-elle accessible publiquement ? Si oui,
   révoquer aujourd'hui. Sinon, l'exposition est limitée à cette machine et peut
   attendre.
2. **Lot 0 seul, ou tout le chantier ?** Le lot 0 remet trois fonctionnalités en
   service sans rien déplacer. C'est un choix légitime si la priorité est le
   lancement.
3. **Le secours vision navigateur : supprimer ou déplacer ?** (lot 4)
4. **hCaptcha sur le chatbot** : accepté ou jugé trop intrusif pour l'usage ?

---

## 8. Ce que je ne sais pas encore

- Le **volume d'appels réel** du chatbot en production : il conditionne le
  dimensionnement des quotas. Aucune donnée, le site n'a pas encore tourné.
- Le **coût mensuel** après bascule sur le tier payant. À estimer une fois les
  modèles arrêtés — `docs/engineering/COUTS_INFRA_BOSS.md` est le bon endroit.
- ~~Si `getShoppingAdvice` envoie tout le catalogue dans le prompt~~ — vérifié :
  non. `selectRelevantProducts` filtre sur le stock, score la pertinence et
  tronque à `MAX_CONTEXT_PRODUCTS = 8`. Le prompt reste borné, la facture par message
  aussi. Rien à corriger de ce côté.

---

## 9. Vérification, à chaque lot

1. Lot 0 : chatbot répond sur le site, description produit générée depuis l'admin.
2. Lot 1 : au-delà du quota, l'appel est refusé proprement — message clair, pas d'erreur brute.
3. Lots 2-3 : `grep` sur le bundle construit ne trouve plus aucune clé.
4. Lot 5 : les anciennes clés révoquées ne fonctionnent plus ; le site fonctionne toujours.
