# Plan — remise en service du pipeline vision (Smart Troc)

**Date** : 2026-08-24
**Symptôme utilisateur** : « Impossible de vérifier vos photos pour le moment. »
**Statut** : corrigé, déployé et vérifié le 2026-08-24.

---

## 1. Diagnostic

Trois ruptures indépendantes, tombées en même temps. Elles décapitent le canal
principal **et** son secours, d'où le message générique.

| # | Console | Cause vérifiée |
|---|---|---|
| 1 | `evaluate-device` → **400** | La fonction **déployée** est plus vieille que le dépôt : elle ignore `preflight` et `healthCheck`, donc exige `batteryHealth` même pour un pré-check photo. |
| 2 | `evaluate-device` → **502** | `gemini_http_404` : `gemini-2.0-flash` et `gemini-2.0-flash-lite` sont codés en dur et **ne sont plus servis** par Google. |
| 3 | `openrouter.ai` → **404** | `No endpoints found for nvidia/nemotron-nano-12b-v2-vl:free` — slug retiré. |

Vérifications effectuées :

```
{ healthCheck: true }                → 400 "photoUrls doit être un tableau"
{ preflight: true, ... }             → 400 "deviceInfo.batteryHealth invalide"
{ ...batteryHealth: 88 }             → 502 {"code":"gemini_http_404"}
```

La liste des modèles servis par la clé confirme l'absence des deux slugs Gemini.

### Le vrai défaut de conception

Le repli existant est **au niveau des clés** (`GEMINI_API_KEY` →
`GEMINI_API_KEY_FALLBACK`), déclenché par `shouldTryFallback` sur 429 / 503 / 5xx.

Un **404 « modèle retiré » n'est pas rattrapable en changeant de clé** : même
modèle, même 404. La panne d'aujourd'hui n'avait donc aucun chemin de secours.
Un slug de modèle figé en dur est une bombe à retardement ; c'est ce point qu'il
faut corriger, pas seulement la valeur du slug.

---

## 2. Modèles de remplacement — testés avec une vraie image

| modèle | latence | résultat |
|---|---|---|
| `gemini-flash-lite-latest` | 2,0 s | `{"vu":"Logo lumineux Xeption"}` ✓ |
| `gemini-3.5-flash-lite` | 1,1 s | JSON valide ✓ |
| `gemini-2.5-flash` | 2,2 s | ✓ |
| `gemini-flash-latest` | — | 503 « forte demande » (transitoire) |
| `gemini-2.5-flash-lite` | — | 404, retiré |

Côté OpenRouter, `dots-studio/dots-3-note-preview:free` répond correctement mais
consomme **846 tokens de raisonnement** : avec le `max_tokens: 900` actuel, il ne
reste rien pour la réponse → `empty_response`.

Les alias (`-latest`) ne peuvent pas être retirés silencieusement — mais ils sont
congestionnés. L'ordre finalement retenu (§5.3) place donc des modèles éprouvés
en tête et garde l'alias en dernier recours.

> Ce tableau a été établi avec la clé du **front**. La §5.1 explique pourquoi il
> ne vaut pas pour l'Edge Function.

---

## 3. Correctifs

### 3.1 Chaîne de modèles au lieu d'un slug figé — `evaluate-device`

- `GEMINI_MODELS` et `GEMINI_CREDIBILITY_MODELS` : listes séparées par virgules,
  pilotables par variable d'environnement.
- Défauts retenus : voir **§5.3** — les valeurs envisagées ici reposaient sur des
  tests menés avec la mauvaise clé et ont dû être revues.
- Boucle sur les modèles autour du mécanisme clé primaire/secours existant.
- Passage au modèle suivant sur **tout échec sauf 401/403**. La règle initialement
  prévue (404/400 seulement) était trop étroite : un 503 « forte demande » vise un
  modèle précis, un autre modèle a d'autres capacités.
- **Budget global de 45 s**, évalué aussi *entre les deux clés*. Sans cela, deux
  clés à 30 s de délai épuisaient le budget sur le premier modèle et le suivant
  n'était jamais essayé — mesuré à 60 s pour un seul modèle.
- Le 502 remonte désormais `modelsTried` et le message de l'API : sans eux, une
  erreur ne dit pas si la chaîne de repli a joué.

### 3.2 Slug OpenRouter + diagnosticabilité — `openRouterVisionClient.ts`

- Défaut : `dots-studio/dots-3-note-preview:free`, toujours surchargeable par
  `VITE_OPENROUTER_VISION_MODEL`.
- `max_tokens` relevé de 900 à 2500 pour tolérer un modèle à raisonnement.
- **Faire remonter le message de l'API** au lieu de le jeter : aujourd'hui
  `throw new Error('openrouter_http_404')` perd le « No endpoints found for … »
  qui donnait la réponse immédiatement.

### 3.3 Redéploiement

`evaluate-device` n'a jamais été déployée depuis les commits qui ajoutent
`preflight` et `healthCheck`. Sans redéploiement, les correctifs restent inertes
— exactement l'erreur consignée le matin même dans `ERRORS_LOG.md`.

---

## 4. Hors périmètre — à cadrer séparément

**Les clés API partent en clair dans le bundle navigateur.** Vérifié sur
`dist/assets/index-*.js` : `VITE_OPENROUTER_API_KEY` et `VITE_GEMINI_API_KEY`
sont inlinées. Le préfixe `VITE_` signifie « livré au navigateur » ; n'importe
qui peut les extraire et dépenser les crédits.

C'est inhérent au fait d'appeler OpenRouter et Gemini **depuis le navigateur**.
Le canal principal, lui, passe bien par une Edge Function. Les deux canaux de
secours devraient suivre le même chemin.

Si la preview est publiquement accessible, **la clé OpenRouter est à révoquer**.

---

## 5. Ce que l'application a révélé en plus

Deux découvertes ont invalidé des hypothèses posées en section 2.

### 5.1 Les clés n'ont pas les mêmes droits

Je testais les modèles avec `VITE_GEMINI_API_KEY` (clé du front). L'Edge Function
utilise `GEMINI_API_KEY`, une **autre clé, aux droits différents**. `gemini-2.5-flash`
répondait parfaitement avec la première et renvoyait 404 avec la seconde.

Toute sonde de modèle doit se faire **avec la clé réellement utilisée** par le
code concerné. D'où le paramètre `probeModels` ajouté au `healthCheck`.

### 5.2 `models.list` ment

Premier réflexe : vérifier la disponibilité via `GET /v1beta/models`. La liste
annonçait `gemini-2.5-flash` comme servi ; l'appel `generateContent` répondait
`This model is no longer available to new users`.

**Figurer dans la liste ne prouve pas que le modèle répond.** Le `healthCheck`
sonde donc par un vrai `generateContent` minimal (`maxOutputTokens: 1`), pas par
la liste. C'est le contrôle qui manquait : l'ancien répondait « ready » pendant
que tout le pipeline était par terre.

### 5.3 Chaînes retenues, sondées avec la bonne clé

```
gemini-3.5-flash        ok        gemini-2.5-flash       404 (retiré)
gemini-3.6-flash        ok        gemini-2.5-flash-lite  404 (retiré)
gemini-3.5-flash-lite   ok        gemini-flash-latest    timeout (congestion)
gemini-flash-lite-latest ok       gemini-3.7-flash       timeout
```

- **Évaluation complète** : `gemini-3.5-flash` → `gemini-3.6-flash` → `gemini-flash-latest`
- **Préflight** : `gemini-flash-lite-latest` → `gemini-3.5-flash-lite`

L'alias congestionné passe en **dernier** : en tête de chaîne il consommait tout
le budget de temps avant que le modèle suivant soit essayé.

---

## 6. Vérification finale

| appel | avant | après |
|---|---|---|
| `healthCheck` | 400 « photoUrls doit être un tableau » | 200, avec l'état réel de chaque modèle |
| préflight | 400 « batteryHealth invalide » | **200 en 1,4 s**, décision rendue |
| éval complète | 502 `gemini_http_404`, 60 s | **200 en 3,5 s** |
| secours OpenRouter | 404 « No endpoints found » | 200, JSON valide (26,8 s) |

Le secours OpenRouter consomme **1101 tokens de raisonnement** : l'ancienne
limite de 900 le condamnait à `empty_response` même une fois le slug corrigé.

`npx vite build` vert.
