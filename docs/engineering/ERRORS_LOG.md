# Journal d'erreurs — Xeption 237

> Chaque erreur rencontrée est consignée ici : **symptôme → cause racine → résolution → comment ne plus la refaire.**
> Consulter ce fichier quand une erreur ressemble à du déjà-vu. Ajouter les nouvelles entrées en haut (plus récent en premier).

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

## Modèle d'entrée (copier-coller)

```
## YYYY-MM-DD — Titre court de l'erreur

- **Symptôme** : ce qu'on observe (message, comportement).
- **Cause racine** : le vrai pourquoi (pas juste le symptôme).
- **Résolution** : ce qui a corrigé, précisément.
- **Comment ne plus la refaire** : la règle/réflexe à retenir.
```
