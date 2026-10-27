# Journal d'erreurs — Xeption 237

> Chaque erreur rencontrée est consignée ici : **symptôme → cause racine → résolution → comment ne plus la refaire.**
> Consulter ce fichier quand une erreur ressemble à du déjà-vu. Ajouter les nouvelles entrées en haut (plus récent en premier).

---

## 2026-10-27 — Sécurité : tables caisse/dettes ouvertes à tout utilisateur connecté (clients compris)

- **Symptôme :** revue du module caisse du bot : `store_debts`, `store_cash_reports`, `store_cash_drafts` avaient des policies `FOR ALL TO authenticated USING (true) WITH CHECK (true)`. Un client connecté (lien magique du formulaire troc, `hooks/useTradeIn.ts`) pouvait lire et modifier dettes (noms, téléphones) et rapports de caisse.
- **Cause racine :** confusion « authenticated = staff ». Dans ce projet, les clients sont aussi `authenticated` ; seul `public.is_staff_member()` identifie le staff. La migration `20261023_005` a en plus été éditée après application (disque ≠ prod).
- **Résolution :** `20261027_001_store_cash_rls_staff_only.sql` : suppression des policies ouvertes, `REVOKE ALL` à `PUBLIC`/`anon`/`authenticated`, accès complet `service_role` (bot), lecture seule staff via `is_staff_member()`.
- **Comment ne plus la refaire :** règle 1 et 2 de `AGENTS.md` § « Règles de livraison — tout agent » ; `npm run db:inventory` après toute migration qui crée une table ou une policy.

---

## 2026-10-23 — Notifications : Clôture de caisse non diffusée sur WhatsApp par absence d'alias Trigenys Notify et attente passive d'un clic manuel

- **Symptôme :** Lors de la validation de clôture de caisse dans le bot Telegram, le rapport partait bien dans le groupe Telegram Staff, mais pour WhatsApp le système proposait uniquement un bouton d'ouverture manuelle de lien wa.me, sans diffusion d'événement automatique vers le groupe WhatsApp de l'équipe.
- **Cause racine :**
  1. `store_cash_report` n'était pas déclaré dans `WAHA_DEFAULT_EVENT_TYPES` ni mappé dans `NOTIFY_EVENT_ALIASES` de l'adaptateur Trigenys Notify (`_shared/staffNotifyChannels/waha.ts`).
  2. `toNotifyEvent` rejetait les notifications financières avec `UNSUPPORTED_NOTIFY_EVENT`.
  3. L'action de soumission `actionCashReportSubmit` se contentait d'une insertion en base sans émission directe vers le point d'ingestion Trigenys Notify (`DISPATCH_URL`).
- **Résolution :**
  1. Ajout de `store_cash_report: 'cash_report.closed'` dans `NOTIFY_EVENT_ALIASES` et dans `WAHA_DEFAULT_EVENT_TYPES`.
  2. Extraction canonique des faits financiers dans `staffNotifyFacts.ts` (`closingCashXaf`, `totalInflowXaf`, `totalOutflowXaf`, `actor`).
  3. Déclenchement automatique de l'événement dès validation de la clôture via `wahaChannel.send(...)` vers Trigenys Notify, qui prend le relais pour router vers le groupe WhatsApp dédié.
- **Comment ne plus la refaire :** Ne jamais forcer un caissier à faire du copier-coller ou du partage manuel pour un processus critique d'entreprise. Tout événement métier de clôture doit être émis comme un événement canonique dans la file outbox et acheminé automatiquement par le bus multi-canal (Telegram + Trigenys Notify / WhatsApp).

---

## 2026-10-23 — Bot Telegram : Absence de validation typée dans les wizards de saisie et troncature des abréviations de montants (k/M)

- **Symptôme :**
  1. Lors de la saisie d'un rapport de caisse / dette client, la saisie `125k` était tronquée à `125 FCFA` au lieu de `125 000 FCFA` par `parseFloat`.
  2. À l'étape demandant le produit/modèle d'appareil, la saisie d'un montant (ex: `250k`) était prise aveuglément comme nom de modèle (`Raoul Kamba — 250k`) sans vérification dans le catalogue de stock.
- **Cause racine :**
  1. `parseAmount` utilisait un parsing primitif sans gestion des multiplicateurs courants (`k`, `M`, `million`).
  2. Absence de validation contextuelle par étape dans les prompts conversationnels Telegram (aucun garde-fou vérifiant si la chaîne est un montant, un nom ou un modèle).
  3. Absence de vérification catalogue pour qualifier les produits (in-catalogue vs hors catalogue).
- **Résolution :**
  1. `parseAmount` étendu avec multiplicateurs `k` (x1 000), `m`/`M`/`million` (x1 000 000), gestion des décimales et des additions (`125k + 25k`).
  2. `isLikelyAmount` et `isValidCustomerName` intégrés à `parseCustomerNameAndPhone` et au routeur Telegram pour rejeter les montants saisis à la place d'un nom ou d'un produit, avec réitération du prompt sans perte du draft.
  3. Interrogation du catalogue via `telegram_search_products_fuzzy` : si absent, suffixage systématique par `(Hors catalogue)` et notification explicite du vendeur.
- **Comment ne plus la refaire :** Règle d'or de conception bot/wizard : chaque invite utilisateur doit avoir un type de domaine strict (Name, Product, Amount, Phone). Ne jamais avancer d'étape si la saisie correspond au type d'une autre étape (ex. montant au lieu de produit). Consigner et tester unitairement chaque helper de parsing dans `tests/telegram-cash-report.test.ts`.

---

## 2026-10-22 — CI ciblée stockage : lockfile désynchronisé et postbuild dépendant des secrets

- **Symptôme :** la première validation du pilote Trigenys Storage échoue avant la compilation : npm ci refuse le package-lock.json existant (@emnapi/core et @emnapi/wasi-threads manquants). Après passage à npm install, la compilation Vite réussit, mais npm run build exécute le postbuild lié à Supabase et échoue car le runner de PR n'a volontairement pas les secrets .env de production.
- **Cause racine :** dette antérieure de synchronisation du lockfile, et CI pilote déclenchant une étape d'exploitation Supabase qui n'est pas nécessaire pour tester un changement uploadService.ts ; périmètre de validation trop large (anti-pattern RAIDER).
- **Résolution du pilote :** CI limitée à npm install --ignore-scripts + npx vite build ; aucun secret Supabase injecté dans GitHub Actions.
- **Prévention :** distinguer frontend build et postbuild Supabase ; corriger séparément le lockfile pour restaurer npm ci et la reproductibilité. Conserver VITE_TRIGENYS_STORAGE_ENABLED à false jusqu'à la validation E2E de l'upload staff.

---

## 2026-10-22 — Alertes WhatsApp génériques et horodatage instable

**Symptôme** : les alertes WhatsApp ne précisent pas le produit, le stock restant ni l'auteur, contrairement au message déjà enregistré pour Telegram. Un réessai de l'adaptateur recrée aussi la date de l'événement, ce qui peut être rejeté par l'empreinte immuable du destinataire après une livraison partielle.

**Cause racine** : le producteur supprimait tous les détails et utilisait l'heure d'envoi ; Trigenys Notify ne recevait donc qu'un type d'alerte générique.

**Résolution** : extraire seulement les faits métier reconnus de l'instantané de notification, relire sa date de création en un lot pour WhatsApp, puis formater les champs contrôlés dans Trigenys Notify. Aucun corps libre ni fragment client/contact n'est recopié. Le relais et la mise en forme Telegram restent inchangés.

**Comment ne plus la refaire** : tests de contrat entre source et destinataire, invariance du payload pendant les réessais, refus des instantanés sans date persistée, quantité zéro, détails troc/marketplace sans identité client, et nom de produit avec modèle/année qui ne doit pas être pris pour un numéro de téléphone. Déployer d'abord le consommateur compatible. Aucun ancien stock n'est affiché sans instantané qui le capture.


## 2026-10-20 — Migration `20261020_005` : délimiteur `$` au lieu de `$$`

**Symptôme** : `npm run db:apply` → `syntax error at or near "$"` (ligne `AS $`). La transaction
a échoué en bloc, rien n'a été appliqué.

**Cause racine** : 2 des 3 fonctions de la migration avaient `AS $` / `$;` au lieu de `AS $$` /
`$$;` — `$$` mangé à l'écriture du fichier (expansion shell : `$$` = PID). Ni les tests de la PR
ni la CI ne parsent le SQL : l'erreur n'apparaît qu'à l'exécution sur Postgres.

**Résolution** : délimiteurs corrigés, migration appliquée et vérifiée (2 tables, 3 RPC
exécutables par `service_role` seulement).

**Comment ne plus la refaire** : `tests/unit/migrationDollarQuotes.test.ts` refuse tout
délimiteur `$` isolé dans `supabase/migrations/`. Écrire le SQL avec l'outil d'écriture de
fichier (jamais via un heredoc ou une chaîne shell non quotée).

---

## 2026-10-19 — `gtm-setup-tags.mjs` : IDs GTM faux dans l'en-tête du script

- **Symptôme** : preflight du script en échec trois fois de suite : `Account ID 6578376268 PAS trouvé`, puis `Container ID 284954836 PAS trouvé`, puis `Workspace ID 2 PAS trouvé`.
- **Cause racine** : les IDs écrits en dur dans l'en-tête comme exemple de commande avaient été mal recopiés (account `6378376268`, container `264934838`). Le workspace, lui, change après chaque publication GTM (2 → 5) : une valeur figée finit forcément périmée.
- **Résolution** : en-tête corrigé avec l'account et le container ; relance avec `GTM_WORKSPACE_ID=5`. Le preflight (lecture seule, liste les IDs réels) a évité toute écriture au mauvais endroit.
- **Comment ne plus la refaire** : prendre les IDs dans l'URL GTM (`#/container/accounts/<account>/containers/<container>/workspaces/<ws>`) au moment de lancer le script, sans se fier à un exemple écrit. Toujours garder le preflight lecture seule avant les écritures distantes.

---

## 2026-09-23 — Double-submission : `useState` lâche face au double-tap

- **Symptôme (potentiel)** : race window entre le click utilisateur et le flip du state `isProcessing`. Entre `onClick → setIsProcessing(true)` et le re-render du bouton `disabled`, React batche l'update : ~0–50 ms où un deuxième click peut passer. Risque : deux appels à `create_order_atomic` → deux commandes créées, deux débits stock, deux factures.
- **Cause racine** : la seule garde côté client était un `useState([isProcessing])` propagé par les règles de rendu React. useState est asynchrone (batched updates). Un `useRef` est synchrone.
- **Résolution** : garde `useRef<Promise | null>` dans `useOrderProcess.submitOrder`. Si une requête est en vol, les suivantes **retournent la même promesse** → RPC appelée une seule fois, UI voit un résultat positif sur toutes les soumissions parasites. Testé manuellement par double-tap rapide.
- **Comment ne plus la refaire** : **toute action irréversible côté serveur** (payment, commande, stock, notification externe, email, publication) **doit être protégée par un `useRef` synchrone côté UI** en plus du `useState([isLoading])` pour l'UX. Pattern à reprendre : `inFlightRef` qui porte la promesse en cours. Documenté dans `QA_ORDER_FLOW.md` §2.

---

## 2026-09-23 — Migration : FK UUID → table dont `id` est en fait TEXT (CHECK compatibility)

- **Symptôme** : `apply-migration` sortait un `✗` nu (sans message), puis après fix du quoting du path, le CLI Supabase révélait : `ERROR 42804: foreign key constraint "..._fkey" cannot be implemented. Key columns "request_id" and "id" are of incompatible types: uuid and text.` Migration `trade_in_status_history` déclarait `request_id UUID REFERENCES trade_in_requests(id)`.
- **Cause racine** : `trade_in_requests.id` est `TEXT` (contient des valeurs qui RESSEMBLENT à des UUID). Confusion « ressemble à » → « est ». La convention AGENTS.md ligne 125 l'avait anticipé : « products.id est text (valeurs de forme UUID), alors que trade_in_requests.trade_in_model_id est uuid. Le type d'une colonne de liaison doit matcher exactement la colonne référencée ». Je ne l'avais pas introspecté avant d'écrire la migration.
- **Résolution** : `request_id TEXT NOT NULL REFERENCES public.trade_in_requests(id) ON DELETE CASCADE`.
- **Comment ne plus la refaire** : **avant toute FK, requêter `information_schema.columns` sur la colonne cible** — ne jamais supposer `uuid` par convention. Commande à sauver : `select column_name, udt_name from information_schema.columns where table_schema='public' and table_name='<table>' and column_name='id'`. Si prod bloqué pour auto-mode, extraire du dump migrations ou demander explicitement au user de valider.

---

## 2026-09-23 — Supabase CLI Windows : path avec espaces tronqué silencieusement

- **Symptôme** : `apply-migration.mjs` affichait `failed to read SQL file: open C:\Users\jakaa\Documents\Projets: The system cannot find the file specified.` sur un chemin `C:\Users\jakaa\Documents\Projets Dell XPS\xeption-app\...`. Le CLI tronquait au premier espace, cherchait un fichier `Projets` au lieu de `Projets Dell XPS\...\migration.sql`. Avant ça, le script affichait un `✗` nu quand pg timeout (ETIMEDOUT sur le pooler), masquant la cause réelle.
- **Cause racine** : `spawnSync('npx', [..., '-f', filePath], { shell: true })` sur Windows concatène les args avec des espaces simples. Si `filePath` contient un espace, le shell le découpe en plusieurs args. Le CLI Supabase (binaire Go) reçoit alors `-f` + `C:\Users\jakaa\Documents\Projets` + le reste comme args séparés et perdus.
- **Résolution** : patcher `scripts/apply-migration.mjs` pour quoter les paths contenant des espaces avant de les passer à `spawnSync` en mode shell. `const quoted = filePath.includes(' ') ? '"' + filePath + '"' : filePath;`.
- **Comment ne plus la refaire** : **`shell: true` + args array = piège sur Windows**. Soit on quote manuellement, soit on passe `shell: false` et un vrai array d'args (mais alors `npx` doit être résolu via son chemin absolu). Règle : tout `spawnSync(..., { shell: true })` qui reçoit un path utilisateur DOIT quoter ce path. Les projets ouverts dans `Projets Dell XPS\` sont la norme chez ce user — le path avec espaces n'est pas une édge case.

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

---

## 2026-09-07 — Le tunnel de commande public est cassé, et personne ne l'a vu

**Symptôme** : aucune commande ne peut être passée depuis le site. `orders`,
`order_items` et `stock_reservations` sont à **0 ligne**.

**Cause** : dans `create_order_atomic`, la réservation de stock est faite AVANT
la création de la commande :

```
ligne 25  PERFORM public._store_reserve_line(store_id, product_id, qty, p_order_id, ...)
ligne 28  INSERT INTO orders (...)
```

`stock_reservations.order_id` référence `orders(id)` par une clé étrangère
**non différée** — vérifiée immédiatement. La réservation échoue donc toujours,
le bloc `EXCEPTION` de la fonction avale l'erreur et renvoie
`{success:false, error:"...violates foreign key constraint..."}`.

**Ce qui l'a rendu invisible** : la fonction ne lève pas, elle *retourne* un
échec. Aucune trace côté base, aucune alerte. Et `orders` à zéro se lisait
comme « boutique récente » plutôt que comme « rien ne passe » — d'autant qu'une
migration de purge existe (`20260824_002_purge_test_orders_before_launch`), ce
qui fournissait une explication plausible et fausse.

**Comment il a été trouvé** : en refusant un test creux. J'avais « vérifié » que
le checkout marchait en lisant le drapeau `SECURITY DEFINER` dans le catalogue —
ce qui ne prouve rien. Le user a demandé un vrai test. Passer une vraie commande
en tant que visiteur anonyme, dans une transaction annulée, a montré l'échec en
une seconde.

**Comment ne plus la refaire** : ne jamais conclure qu'un chemin fonctionne en
lisant sa configuration. Un chemin critique se teste en le parcourant. Et quand
une table centrale est vide, chercher pourquoi avant d'accepter la première
explication qui arrange.

**Correction vérifiée** (transaction annulée) : déplacer `INSERT INTO orders`
avant la boucle de réservation. Résultat : `{"success":true}`, 1 commande,
1 article, 1 réservation de stock.

---

## 2026-09-09 — RPC `market_reference_price` : 401 Unauthorized pour les utilisateurs anonymes (Smart Troc)

- **Symptôme** : dans la console navigateur lors de l'évaluation du Smart Troc : `POST https://...supabase.co/rest/v1/rpc/market_reference_price 401 (Unauthorized)` suivi de `[marketReference] lecture impossible : permission denied for function market_reference_price`.
- **Cause racine** : la migration initiale `20260825_001_market_used_and_reference_prices.sql` déclarait `REVOKE ALL ON FUNCTION public.market_reference_price(...) FROM anon` et uniquement `GRANT EXECUTE ... TO authenticated`. Or, les visiteurs du tunnel Smart Troc naviguent avec le rôle public `anon`. La fonction est pourtant `SECURITY DEFINER` et conçue spécifiquement pour exposer une médiane agrégée sans donner accès à la table privée `market_reference_prices`.
- **Résolution** : migration `20260909_002_grant_market_reference_price_anon.sql` appliquée : `GRANT EXECUTE ON FUNCTION public.market_reference_price(TEXT, TEXT, TEXT) TO anon;`. Test direct avec la clé publique validé (`error: null`).
- **Comment ne plus la refaire** : lorsqu'une fonction `SECURITY DEFINER` agrégée est créée pour être consommée par le front public (tunnel troc, boutique), s'assurer que `anon` possède le droit `EXECUTE` si les visiteurs non connectés doivent la consommer.




---

## 2026-10-19 — Fiches produits : traçabilité fournisseur publiée et specs clonées entre modèles

**Symptôme** : 85 fiches affichaient en boutique et dans le JSON-LD une spec « Source »
(« MFOUNDI MALL - IPHONE »…) ; des Galaxy Watch annonçaient un écran « OLED Retina » et la
compatibilité iOS ; un Galaxy Fit3 portait les specs d'une Watch4 ; une note interne
(« Source text had '515g'… ») et la promo d'un autre revendeur apparaissaient en description.

**Cause racine** : `products.specs` mélange données client et traçabilité d'import
(`utils/mfoundiCatalogParser.ts` pose `Source`), et chaque vue rendait le tableau brut. Les
fiches créées par copie d'une fiche voisine (ou générées) n'étaient relues par personne contre la
fiche constructeur.

**Résolution** : `utils/publicSpecs.ts` (`getPublicSpecs` / `isInternalSpec`) filtre les specs
internes et vides dans toutes les vues publiques (fiche desktop et mobile, JSON-LD, FAQ, résumé
carte, points forts), sans toucher aux données. Migration `20261019_005_fiches_produits_qualite` :
46 fiches corrigées depuis GSMArena / constructeurs, lignes d'origine sauvegardées dans
`archived_rows` (reason `audit fiches 19/10/2026`).

**Comment ne plus la refaire** : toute nouvelle vue publique de specs passe par
`getPublicSpecs` (test `tests/unit/publicSpecs.test.ts`) ; une spec de traçabilité ajoutée à
l'import s'ajoute à `INTERNAL_SPEC_LABELS`. Une fiche copiée d'une autre se vérifie spec par spec
contre la fiche constructeur avant publication.

## 2026-10-20 — Migration appliquée signalée « MODIFIÉ » après un rebase (fins de ligne CRLF)

**Symptôme** : juste après `db:apply` de `20261020_015_telegram_staff_hr.sql`, un `git pull --rebase`
a réécrit le fichier en CRLF (`core.autocrlf=true`). `db:status` l'a alors marqué « MODIFIÉ », et
un `db:apply` suivant l'aurait refusé, alors que son contenu Git n'avait pas changé. Les tests qui
lisaient le SQL avec `\n` en dur ont aussi échoué.

**Cause racine** : le checksum de `scripts/apply-migration.mjs` portait sur les octets bruts du
fichier, fins de ligne comprises, alors que ces fins de ligne dépendent du checkout.

**Résolution** : `sameChecksum()` compare la valeur enregistrée aux variantes brute, LF et CRLF.
L'enregistrement reste inchangé (SHA brut), donc les checksums existants restent valides. Les
tests de `tests/telegram-staff-hr.test.ts` normalisent `\r\n` avant de comparer.

**Comment ne plus la refaire** : un test qui lit un fichier source normalise les fins de ligne.
Un « MODIFIÉ » sur une migration qu'on n'a pas éditée se vérifie d'abord avec `git diff` : s'il est
vide, c'est un artefact de checkout et non une divergence.

## 2026-10-20 — Objectif hebdomadaire impossible à enregistrer depuis l'ERP

**Symptôme** : l'onglet Objectifs de l'ERP propose « Cette semaine », mais l'enregistrement échoue
avec « Paramètres invalides ». Seul le bot Telegram (écriture directe en service_role) pouvait
créer un objectif `weekly`.

**Cause racine** : `20260906_001_objectifs_hebdomadaires.sql` a ajouté `weekly` à la contrainte
`sales_targets_period_kind_check` et à `get_sales_targets_progress`, mais pas à la validation de
`upsert_sales_target` (`20260824_025`). Élargir un énum a laissé un de ses consommateurs en retard.

**Résolution** : `20261020_016_upsert_sales_target_weekly.sql` reprend le corps de prod et ajoute
`weekly` à la liste.

**Comment ne plus la refaire** : `tests/upsert-sales-target-weekly.test.ts` vérifie que chaque clé
de `TARGET_PERIOD_LABELS` est acceptée par la RPC. Pour élargir une valeur d'énum, chercher toutes
les fonctions qui la valident (`pg_get_functiondef ~ '<ancienne liste>'`) avant de déclarer fini.

## 2026-10-21 — Bot : « Ventes du jour » toujours vide, ventes comptoir non marquées payées

**Symptôme** : l'écran 📊 Ventes du jour du bot affichait 0 commande. Les ventes comptoir (ERP et
bot) étaient créées avec `payment_status = 'pending'`, alors que l'argent est reçu sur place : le
retour SAV (« commande livrée et payée uniquement ») les aurait refusées.

**Cause racine** : `screenSalesToday` interrogeait `orders.total_amount` / `orders.created_at`,
colonnes qui n'existent pas (les vraies sont `total` / `date`) ; l'erreur PostgREST était ignorée.
`complete_pos_sale_atomic` n'a jamais renseigné `payment_status`, resté au DEFAULT `'pending'`.

**Résolution** : requête sur `total` / `date` hors commandes annulées ou retournées ;
`20261021_001_pos_sale_paid.sql` crée les ventes livrées en `paid` avec `paid_at`. Aucune vente
POS existante en prod : pas de rattrapage.

**Comment ne plus la refaire** : `tests/telegram-staff-sale-migration.test.ts` vérifie les colonnes
lues par l'écran et le statut payé. Leçon : toute requête PostgREST écrite à la main se vérifie
contre `information_schema.columns` avant le commit.

## 2026-10-21 — Recherche Telegram exposée à la clé anon (near miss)

**Symptôme** : après `20261021_002`, `telegram_search_products_fuzzy` était exécutable par
PUBLIC, `anon` et `authenticated`, et `telegram_staff_product_lookup` par `authenticated` (ACL
vérifiée en prod).

**Cause racine** : la migration a fait un `GRANT … TO service_role, authenticated, anon` sans
`REVOKE … FROM PUBLIC` (Postgres accorde EXECUTE à PUBLIC par défaut), contrairement à la règle
des RPC du bot. Le contrôle « compte lié » repose sur un `telegram_user_id` non secret : il ne
protège rien hors du bot.

**Résolution** : `20261021_003_telegram_search_acl.sql` ramène les deux fonctions à `service_role`.

**Comment ne plus la refaire** : `tests/telegram-search-fuzzy.test.ts` vérifie le REVOKE/GRANT.
Toute RPC `telegram_*` : `REVOKE ALL … FROM PUBLIC, anon, authenticated` puis `GRANT … TO
service_role`, jamais `anon`.

## 2026-10-21 — Publication Telegram exécutable par anon (récidive, faille réelle)

**Symptôme** : après `20261021_008_telegram_product_direction_publish`, `telegram_staff_product_publish`,
`_reject` et `_pending_products_count` étaient exécutables par `anon` et `authenticated` (ACL vérifiée
en prod). Avec l'identifiant Telegram (non secret) d'un membre de la direction, n'importe qui pouvait
passer le prix d'un produit **déjà en ligne** à 500 FCFA. Le refus, lui, échouait toujours : il supprimait
dans `store_stock_movements` (table inexistante) et aurait effacé l'historique de stock.

**Cause racine** : même oubli que le near miss précédent (`GRANT … TO authenticated` sans `REVOKE … FROM
PUBLIC, anon`). La règle était écrite mais aucun contrôle ne couvrait les nouvelles migrations.
Le schéma (nom de table, FK sur `products`) n'avait pas été introspecté avant d'écrire le DELETE.

**Résolution** : `20261021_009_telegram_product_publish_acl.sql` (REVOKE, service_role seul ; publier
refuse un produit déjà publié) et `20261021_010_telegram_product_reject_traced.sql` (refus = sortie de
stock tracée par `_store_stock_delta` + `products.rejected_at`, aucun DELETE ; refusé si déjà vendu).

**Comment ne plus la refaire** : erreur répétée → contrôle automatique.
`tests/migrations-security-definer-acl.test.ts` échoue si une fonction `SECURITY DEFINER` d'une
migration ≥ `20261021` n'est pas révoquée de `PUBLIC, anon`, ou si un `GRANT … anon` n'est pas annulé
ensuite. Jamais de DELETE sur des tables de stock : on compense par un mouvement.

## 2026-10-27 — Migration R2 interrompue : `fetch failed` (TLS post-quantique, Node 24)

**Symptôme** : `migrate-cloudinary-to-r2.mjs --apply` réussit 3 lignes puis « relecture … impossible » en série ;
les relances échouent sur « Secret de stockage indisponible ». On a d'abord cru à une clé révoquée.

**Cause racine** : Node 24 (OpenSSL 3.5) envoie un ClientHello post-quantique (ML-KEM) que le réseau local
coupe (`ECONNRESET`, alors que TCP 443 passe). Même cause que le « TLS handshake timeout » du Supabase CLI (Go).
Le script masquait l'erreur réelle (message générique).

**Résolution** : `NODE_OPTIONS=--tls-max-v1.2` (ou courbe `X25519:P-256`) ; le script affiche désormais
`error.message` sur la relecture et la récupération du secret.

**Comment ne plus la refaire** : erreur réseau Node (`fetch failed`/`ECONNRESET`) → tester d'abord TLS avant de
soupçonner les clés ; les scripts ne remplacent jamais une erreur par un message générique.
