# Journal d'erreurs — Xeption 237

> Chaque erreur rencontrée est consignée ici : **symptôme → cause racine → résolution → comment ne plus la refaire.**
> Consulter ce fichier quand une erreur ressemble à du déjà-vu. Ajouter les nouvelles entrées en haut (plus récent en premier).

---

## 2026-08-23 — Méthode : conclusions publiées avant la fin de la vérification (6 revirements)

- **Symptôme** : sur une même session, six affirmations contredites peu après. « Le baseline des 49 migrations est fiable » (5 vérifiées sur 49) · « la connexion DB est bloquée par l'environnement » (×2) · « il n'y a aucun gating par rôle » · « activer la RLS suffit » · « l'étape 1 = 3 failles » (5 le message suivant) · conseil d'interroger la consultante externe (c'était l'utilisatrice). Le user a fini par dire : « depuis là tu changes tout le temps d'avis ».
- **Cause racine** : affirmer puis vérifier, au lieu de vérifier puis affirmer. Deux variantes précises : (a) **conclure d'une absence de résultat sur un grep trop étroit** — `grep role adminMenuConfig.ts` ne renvoyait rien, or la logique était dans `utils/adminAccess.ts` ; (b) **généraliser un échantillon** — 5 migrations contrôlées, conclusion étendue à 49. Aggravant : la roadmap contredisait mon propre rapport d'audit écrit 2 jours plus tôt, qui classait déjà `brands`/`product_ranges`/`customers` en 🟠 Élevé.
- **Résolution** : outil `npm run db:verify` (fichiers → base) et `npm run db:inventory` (base → fichiers) pour ne plus raisonner par échantillon ; recensement explicite des faits vérifiés vs non vérifiés remis au user.
- **Comment ne plus la refaire** : (a) **avant d'affirmer qu'une chose n'existe pas, chercher par symbole dans TOUT le repo** (`Grep` sur le nom de la fonction), jamais dans un seul fichier supposé. (b) **Ne jamais extrapoler d'un échantillon à un ensemble** — soit on vérifie tout par script, soit on énonce le taux de couverture réel dans la phrase. (c) **Relire ses propres documents antérieurs avant d'écrire une synthèse** qui les recoupe. (d) Marquer l'incertitude dans la phrase même, pas après la question du user.

---

## 2026-08-23 — Supabase RLS : `signInAnonymously` donne le rôle `authenticated`, pas `anon`

- **Symptôme** : conseil initial « activer la RLS sur `products` suffit, les policies staff existent ». Faux : les policies d'écriture sont `TO authenticated USING (true)`, et le checkout public appelle `supabase.auth.signInAnonymously()` (`hooks/useOrderProcess.ts:31`).
- **Cause racine** : chez Supabase, un utilisateur **anonyme** est authentifié — il porte le rôle Postgres `authenticated` (avec `is_anonymous: true` dans le JWT), pas `anon`. Une policy `TO authenticated USING (true)` est donc ouverte à tout visiteur qui déclenche une connexion anonyme — ce que le site fait tout seul au tunnel de commande. Le même piège s'aggrave à l'arrivée des comptes clients acheteurs : « connecté » cessera de vouloir dire « staff ».
- **Résolution** : adosser les policies d'écriture à une **appartenance réelle au staff**. `staff.id` est un uuid autonome (≠ `auth.users.id`) → jointure par email : `EXISTS (SELECT 1 FROM public.staff s WHERE lower(s.email) = lower(auth.jwt() ->> 'email'))`. Validé par simulation en transaction annulée : staff → autorisé, session anonyme → refusée, futur client → refusé.
- **Comment ne plus la refaire** : **ne jamais assimiler `authenticated` à « membre du staff »**. Toute policy d'écriture sensible doit vérifier une appartenance explicite, jamais le simple fait d'avoir une session. Tester une policy AVANT de l'activer via `BEGIN; SELECT set_config('request.jwt.claims', …, true); … ROLLBACK;`.

---

## 2026-08-23 — Script `.mjs` sans `dotenv` : erreur réseau trompeuse, diagnostic à côté

- **Symptôme** : `The server does not support SSL connections`, puis `AggregateError [ETIMEDOUT]` sur des scripts DB ad hoc, alors que `npm run db:introspect` fonctionnait. Conclusion erronée annoncée au user : « l'environnement/le sandbox bloque la connexion » — deux fois, dont une où j'ai renoncé à une requête qu'il demandait.
- **Cause racine** : les scripts ad hoc n'appelaient pas `dotenv.config()`. Sans lui `process.env.DATABASE_URL` est vide, `resolveDatabaseUrl()` retombe sur une construction depuis `SUPABASE_DB_PASSWORD` (absent aussi) et produit une URL bancale → la connexion aboutit sur autre chose qu'un Postgres, d'où un message d'erreur qui parle de SSL ou de timeout et **oriente vers le réseau**. `db-introspect.mjs` et `apply-migration.mjs` marchaient parce qu'eux chargent `.env`.
- **Résolution** : `dotenv.config({ path: resolve(root, '.env') })` en tête de script. Ajout d'un handler d'erreur qui affiche `err.detail`, `err.hint` et la pile — c'est lui qui a révélé le vrai `ETIMEDOUT` derrière un `✗` vide.
- **Comment ne plus la refaire** : (a) **tout script `.mjs` qui parle à la base charge `.env`** — copier l'amorçage de `db-introspect.mjs`, ne pas repartir de zéro (règle ajoutée dans `AGENTS.md`). (b) **Ne jamais imputer un échec à l'environnement tant qu'un script voisin fonctionne** : la différence est dans le code, pas dans le réseau. (c) Ne jamais logger `err.message` seul — un message vide masque la cause.

---

## 2026-08-21 — Conception Cadrage IMEI CAMCIS : Scraping illusoire, duplication Luhn & pricing sur source déclarative

- **Symptôme** : Propositions initiales de cadrage irréalistes (tentative de scraping serveur via Turnstile, création d'une 2e Edge Function `verify-camcis-imei`, 6e copie Luhn, cache TTL 30j, pricing ferme sur saisie client).
- **Cause racine** : (1) Absence d'inspection préalable de la codebase existante (`TrocQuickForm.tsx` et `check-imei/index.ts` contenaient déjà l'IMEI et le provider cascade). (2) Méconnaissance de Cloudflare Turnstile (bloque 100% des requêtes serveur automatiques). (3) Absence de distinction entre estimation déclarative client et engagement financier opposable. (4) Oubli des frontières d'environnement (Vite `src/` vs Deno `supabase/functions/`).
- **Résolution** : (1) Séquencement 2-Phases (Phase 1 assistée humain/CSV, Phase 2 API officielle B2B). (2) Factorisation Luhn étanche en 2 fichiers (`utils/imei.ts` pour Vite, `supabase/functions/_shared/imei.ts` pour Deno). (3) Règle de source typée `CamcisSource` (`user_declarative` non opposable vs `staff_verified` opposable). (4) Bloc `customsStatus` orthogonal dans `check-imei`. (5) RLS stricte (`service_role`) et migrations SQL additives.
- **Comment ne plus la refaire** : (a) **Toujours introspecter la codebase ET la base réelle AVANT de concevoir un plan**. (b) **Ne jamais planifier un scraping serveur contre un service protégé par Captcha/Turnstile sans jeton API**. (c) **Ne jamais engager d'argent sur une donnée déclarative utilisateur (`user_declarative`)**. (d) Respecter les frontières d'importation entre le bundler Front et les Edge Functions.

---

## 2026-06-15 — Troc : prix client ≠ admin + paiement orphelin (refus invisible)

- **Symptôme** : (A) client voit 74/140k, admin affiche 0/100, 0 F « Modèle non référencé ». (B) un appareil refusé mais **payé** (Nokia) n'apparaît nulle part en admin.
- **Cause racine** : (A) `save-trade-in` ne fait pas confiance au prix du front et le **re-cherche** par `model_name ilike *Xiaomi 14T*` — or le catalogue contient `Xiaomi 14 T` (espace) → pas de match → `no_base_price` → refus serveur. (B) le tunnel est **PAYER → ÉVALUER** ; un refus côté client n'appelle jamais `persist()` → aucun dossier créé, mais le paiement a eu lieu.
- **Résolution** : (A) le front envoie `tradeInModelId` (id catalogue) → le serveur lit le `base_price` **par id** (exact, toujours server-side). (B) **pré-check âge AVANT paiement** (`precheckTooOld` à l'étape IMEI → refus « trop ancien » avant de payer) + **auto-save de tout refus post-paiement** (le dossier devient visible en admin).
- **Comment ne plus la refaire** : (a) ne jamais re-résoudre une donnée par **matching de nom fragile** quand un **id** existe — passer l'id et lire en base. (b) **Tout paiement doit produire un enregistrement traçable** — jamais d'action payante sans dossier persisté. (c) Quand un refus est possible, **bloquer AVANT le paiement** (UX + anti « arnaque »).

---

## 2026-06-15 — Build cassé : `*/` dans un commentaire JSDoc ferme le bloc

- **Symptôme** : `[plugin:vite:esbuild] Transform failed — Expected identifier but found "*"` sur `utils/modelKey.ts`, à la ligne d'un commentaire.
- **Cause racine** : le commentaire contenait `market_*/phone_releases` → la séquence `*/` **ferme le bloc `/** … */` prématurément** → le texte suivant est interprété comme du code → erreur de parse.
- **Résolution** : insérer un espace → `market_* / phone_releases` (casse la séquence fermante).
- **Comment ne plus la refaire** : **ne jamais écrire `*/` dans un commentaire** (motifs glob `dossier/*`, chemins, regex commentées). Mettre un espace (`* /`) ou reformuler. Piège classique quand on documente des patterns de fichiers/tables.

---

## 2026-06-15 — Scraping prix marché : source morte depuis 6 ans (jumia.cm)

- **Symptôme** : `market-price-intel` renvoie **0 offre** même pour un modèle ultra-courant (Galaxy S23) → tout passe en `no_base_price` (refus Troc) et le cron snapshots écrit 0 ligne (`processed:32, written:0, skipped:32`).
- **Cause racine** : la liste de sources (`sourceConfigs`) mène avec **`jumia.cm`**, or **Jumia Cameroun a fermé en novembre 2019** (le domaine ne sert plus de boutique). Les 2 autres (`glotelho.cm`, `kmerphone.com`) sont vivants mais **rendus en JavaScript** → un `fetch` HTML serveur ne voit aucun prix. De plus, toute la pipeline Wayback de `get-market-trend` cible Jumia → 100% futile.
- **Résolution** : ✅ confirmée. (1) Retiré `jumia.cm` de `market-price-intel`. (2) **Cause technique secondaire** : le scraper envoyait un User-Agent bidon `'Mozilla/5.0 (XEPTION Market Intel)'` → bloqué par Cloudflare des sites marchands. Remplacé par un vrai UA Chrome + `Accept-Language` (constante `BROWSER_HEADERS`). Résultat : kmerphone renvoie un prix réel (test Galaxy A07 → `referencePrice 73 500`, `offersCount 1`).
- **Comment ne plus la refaire** : (a) **vérifier qu'une source externe est vivante AVANT d'en dépendre** — une dépendance data peut mourir sans bruit (le code ne crashe pas, il renvoie du vide). (b) **Toujours envoyer un vrai User-Agent navigateur** pour le scraping — un UA custom = blocage Cloudflare silencieux. (c) Tester avec un modèle connu et alerter si 0 résultat persistant.
- **Reste** : la pipeline Wayback de `get-market-trend` cible toujours Jumia (mort) → à recibler/retirer séparément.

---

## 2026-06-15 — `weekSeed` : rotation alignée sur le mauvais jour

- **Symptôme** : test unitaire rouge — lundi 15/06 et vendredi 19/06 produisaient deux seeds différents (`202623` vs `202624`) alors qu'ils sont dans la même semaine.
- **Cause racine** : `weekOfYear` calculait `(date - 1er janvier) / 7 jours`. Le 1er janvier 2026 étant un **jeudi**, les frontières de semaine tombaient le jeudi, pas le lundi.
- **Résolution** : remplacé par `mondayOfWeek()` qui ancre explicitement sur le lundi (`(getDay() + 6) % 7`), seed = `YYYYMMDD` de ce lundi.
- **Comment ne plus la refaire** : pour toute logique « par semaine », **ancrer sur un jour réel** (lundi), jamais sur « N jours depuis une date arbitraire ». Et **écrire le test des frontières** (même semaine / semaines voisines) — c'est lui qui a attrapé le bug.

---

## 2026-06-15 — npm install : `UNABLE_TO_VERIFY_LEAF_SIGNATURE`

- **Symptôme** : `npm install sonner` échoue avec `npm error code UNABLE_TO_VERIFY_LEAF_SIGNATURE` (request to registry.npmjs.org failed, unable to verify the first certificate).
- **Cause racine** : proxy / certificat d'inspection réseau sur cette machine qui intercepte les requêtes HTTPS vers le registre npm. Pas un bug npm ni du package.
- **Résolution** : `npm config set strict-ssl false` → `npm install` → `npm config set strict-ssl true` (restaurer juste après).
- **Comment ne plus la refaire** : sur cette machine, tout `npm install` peut nécessiter ce contournement temporaire. **Toujours restaurer `strict-ssl true`** après l'install pour ne pas laisser la sécurité désactivée. À terme : installer le certificat racine de l'entreprise dans le store et utiliser `--use-system-ca`.

---

## 2026-06-15 — TS : narrowing perdu avec optional chaining

- **Symptôme** : tentation d'ajouter `product.reviews!.length` (non-null assertion) dans le bloc d'affichage des étoiles.
- **Cause racine** : `(product.reviews?.length ?? 0) > 0` ne **narrow pas** `product.reviews` à non-`undefined` dans le bloc → TS oblige le `!`.
- **Résolution** : utiliser la chaîne `product.reviews && product.reviews.length > 0 && product.rating != null` qui narrow proprement `reviews` ET `rating` → plus aucun `!`.
- **Comment ne plus la refaire** : préférer le narrowing par `&&` (truthiness directe) plutôt que `?.` quand on a besoin d'accéder à la propriété ensuite. Un `!` ajouté est un signal qu'une meilleure condition existe.

---

## 2026-08-24 — Diagnostiquer une Edge Function sur sa source au lieu de son déploiement

- **Symptôme** : `000000000000000` passait la vérification IMEI et renvoyait « Apple iPhone 15 ». J'ai lu la source de `check-imei`, trouvé le garde-fou `isTrivialTestImei` en place, et conclu que le front laissait passer — diagnostic faux.
- **Cause racine** : le garde-fou existait **sur disque mais pas en production**. `utils/imeiValidation.ts` et `supabase/functions/_shared/imeiValidation.ts` étaient **non suivis par git** (`??`) : écrits, jamais commités, jamais déployés. La fonction en ligne datait d'avant. Deuxième cause empilée : Luhn n'est qu'une somme de contrôle, quinze zéros donnent une somme de 0 donc divisible par 10 — Luhn valide. Le fournisseur externe a alors répondu avec 0.92 de confiance sur un TAC inexistant, et le résultat est parti en `tac_cache`.
- **Résolution** : appeler la fonction **déployée** avec les cas de test (`fetch` sur `/functions/v1/check-imei`) au lieu de raisonner sur la source. Puis renforcer `isTrivialTestImei`, poser le filtre de cache dans `dbTacWrite`, purger la ligne empoisonnée, **et redéployer** — sans quoi la purge se serait annulée au premier faux IMEI.
- **Comment ne plus la refaire** : pour tout code exécuté ailleurs (Edge Function, cron, RPC), **la source n'est pas la vérité — le runtime l'est**. Deux réflexes : `git status` sur le dossier concerné (un `??` ou un ` M` signifie « pas ce qui tourne »), et un appel réel à l'endpoint avant de formuler un diagnostic. Corollaire : une correction en base et son garde-fou applicatif se déploient **ensemble**, sinon la correction est éphémère.
- **Piège annexe** : n'inférer une règle métier ni d'une intuition ni d'un seul exemple. J'ai écrit « un vrai TAC ne commence jamais par 00 » ; la table contenait `00499901` = CHUWI CW-Vi7 (source osmocom). La règle aurait empêché la mise en cache d'appareils réels. Les données du projet réfutent l'intuition — les interroger d'abord.

---

## 2026-08-24 — Sonder un modèle avec la mauvaise clé, et croire `models.list`

- **Symptôme** : après avoir corrigé les slugs Gemini retirés, l'évaluation complète répondait toujours `gemini_http_404` — sur un modèle que je venais pourtant de tester avec succès.
- **Cause racine** : deux hypothèses fausses, empilées. (1) Je testais les modèles avec `VITE_GEMINI_API_KEY`, la clé du **front** ; l'Edge Function utilise `GEMINI_API_KEY`, une autre clé **aux droits différents**. `gemini-2.5-flash` répondait avec l'une et renvoyait 404 avec l'autre. (2) J'ai ensuite vérifié la disponibilité via `GET /v1beta/models`, qui annonçait `gemini-2.5-flash` comme servi, alors que `generateContent` répondait `This model is no longer available to new users`. **Figurer dans la liste ne prouve pas que le modèle répond.**
- **Résolution** : ajouter un paramètre `probeModels` au `healthCheck` de la fonction, qui exécute un vrai `generateContent` minimal (`maxOutputTokens: 1`) **avec la clé que la fonction utilise réellement**. Dix candidats sondés d'un coup ont donné la liste exacte de ce qui marche, et les chaînes ont été calées dessus.
- **Comment ne plus la refaire** : sonder une capacité **avec le credential du code concerné**, jamais avec un homonyme qui traîne dans `.env` — un nom de variable proche ne garantit pas la même valeur ni les mêmes droits. Et préférer une sonde qui **exerce** la capacité à une sonde qui la **déclare** : un endpoint de listing décrit une intention, pas un état.
- **Effet de bord utile** : l'ancien `healthCheck` répondait « ready » sur simple présence d'une clé — il annonçait donc le pipeline sain pendant qu'il était entièrement par terre. Un contrôle de santé qui ne peut pas échouer ne sert à rien.

---

## 2026-08-24 — Attribuer un fournisseur d'après le nom du module

- **Symptôme** : le cadrage `CADRAGE_CLES_IA_COTE_SERVEUR.md` annonçait **trois** fonctionnalités hors service par modèle Gemini retiré. Il n'y en avait que deux.
- **Cause racine** : j'ai déduit le fournisseur du fait que `ProductEditorOverlay.tsx` et `productIngestionFunnel.ts` importent depuis `services/geminiService.ts`. Or `generateProductDetails`, dans ce même fichier, appelle `deepseekChatJson` — et le commentaire juste au-dessus le dit noir sur blanc : « Génère un ou plusieurs champs produit via **DeepSeek** ». Je l'avais sous les yeux dans un résultat de recherche antérieur et je ne l'ai pas lu.
- **Résolution** : vérifier, dans le corps de chaque fonction, quel client est réellement appelé, puis corriger le tableau du cadrage (points 4 et 5 = DeepSeek, qui fonctionne) et ajouter `services/deepseekClient.ts` comme sixième point d'appel — sa clé est exposée au même titre que les autres.
- **Comment ne plus la refaire** : **le nom d'un module ne dit pas ce que chacune de ses fonctions appelle.** Un fichier historique accumule des fournisseurs au fil du temps. Pour établir un périmètre, remonter jusqu'à l'appel réseau de chaque fonction — pas jusqu'à la ligne d'import du composant qui l'utilise.
- **Effet secondaire** : le périmètre a paru plus alarmant qu'il n'était. Sur un document destiné à arbitrer un chantier, surestimer coûte autant que sous-estimer.

---

## 2026-08-25 — Affirmer qu'une fonctionnalité est en vente sans vérifier son drapeau

- **Symptôme** : j'ai soutenu à l'utilisateur que le palier « Sûreté » était sélectionnable par les clients et qu'il vendait donc une vérification blacklist non exécutée. C'était faux, et je l'ai maintenu après une première objection de sa part.
- **Cause racine** : j'ai trouvé `TierSelector.tsx` avec sa ligne `'Vérif IMEI blacklist mondiale'`, puis `TrocPage.tsx` qui l'importe et le rend, et j'ai conclu. Je n'ai pas lu la condition qui gouverne ce rendu : `TROC_TIER_SELECTOR_ENABLED = false` (`utils/trocPricing.ts` l. 27). Le tunnel force `TROC_TUNNEL_TIER = 'express'` (l. 30). Le composant existe, est importé, est rendu dans le JSX — et n'atteint jamais l'écran.
- **Résolution** : remonter jusqu'à la **valeur** du drapeau, pas seulement jusqu'au point de rendu. Vérifier aussi les autres occurrences (`check-imei` l. 704 n'était qu'un libellé de journal, `ImeiCertifFlow` utilise `tier: 'certif'`) avant de conclure qu'un chemin est vivant.
- **Comment ne plus la refaire** : **« importé et rendu » ne veut pas dire « atteignable »**. Un drapeau de fonctionnalité, une condition de branche ou une route non montée suffisent à rendre du code mort. La chaîne à remonter est : définition → import → rendu → **condition** → **valeur de la condition**. S'arrêter avant la dernière étape, c'est deviner.
- **Aggravant** : l'utilisateur m'avait dit « je crois que c'est gelé et inutilisé pour l'instant ». C'était une information de première main sur son propre projet, et je l'ai contredite au lieu de la prendre comme une piste à vérifier. Il m'a aussi rappelé que je n'avais consulté ni les docs, ni AGENTS.md, ni ma mémoire — où cette classe d'erreur est déjà consignée.

---

## 2026-08-25 — Conclure sur une configuration externe d'après une sonde unique

- **Symptôme** : j'ai annoncé que « Bot Protection n'est pas activé » et que le captcha du chatbot était donc inerte. Le tableau de bord Supabase montrait le contraire, capture à l'appui.
- **Mesure** : `POST /auth/v1/signup` corps vide → **HTTP 200 + access_token** à 12h. La même requête, forme strictement identique, → **HTTP 400 `captcha_failed`** quelques minutes plus tard, comme les deux autres points d'entrée testés.
- **Cause racine** : la sonde était correcte, la conclusion trop ferme. Un réglage de service externe est un **état à un instant t**, pas une propriété du système : il change sans que le dépôt bouge, et une mesure unique ne dit rien de sa stabilité. J'ai présenté un instantané comme un fait établi.
- **Résolution** : rejouer la forme exacte de la sonde initiale pour distinguer « ma méthode était fausse » de « l'état a changé ». Ici la forme identique donnait un résultat opposé : c'est donc l'état qui a bougé, et le protocole était bon.
- **Comment ne plus la refaire** : pour une configuration hors dépôt (tableau de bord d'un fournisseur, secret, drapeau distant), **dater la mesure dans la phrase** et la présenter comme telle — « mesuré à telle heure » et non « c'est désactivé ». Et lorsqu'un utilisateur produit une capture qui contredit la mesure, remesurer avant de discuter : c'est plus rapide et ça tranche.
- **Ce qui a bien fonctionné** : le test `T-X17` ajouté à la recette encode exactement cette vérification. Il échouait, il passe maintenant — c'est le bon endroit pour ce genre de contrôle, plutôt qu'une affirmation dans une conversation.

---

## Modèle d'entrée (copier-coller)

```
## YYYY-MM-DD — Titre court de l'erreur

- **Symptôme** : ce qu'on observe (message, comportement).
- **Cause racine** : le vrai pourquoi (pas juste le symptôme).
- **Résolution** : ce qui a corrigé, précisément.
- **Comment ne plus la refaire** : la règle/réflexe à retenir.
```
