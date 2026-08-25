# Secrets et variables — où va quoi, et pourquoi

**Date** : 2026-08-25

Trois destinations, trois niveaux d'exposition. Mettre une variable au mauvais
endroit est le principal risque de ce projet.

| destination | qui la lit | qui peut la voir |
|---|---|---|
| **Secrets Supabase** | Edge Functions (Deno) | personne, côté serveur |
| **`.env` local / secret CI** | scripts Node | toi, et le runner GitHub |
| **Préfixe `VITE_`** | le navigateur | **tout le monde** |

> **La règle qui compte** : `VITE_` signifie « recopié dans le JavaScript livré ».
> Ce n'est pas un réglage, c'est la définition du préfixe. Une clé de service
> nommée `VITE_…` serait publiée sur le site à la première mise en ligne.

---

## 1. Pour activer le workflow de rendu — **un seul secret**

**Nom** : `DATABASE_URL`
**Où le mettre** : GitHub → `Settings` → `Secrets and variables` → `Actions` → `New repository secret`
**Où le prendre** : c'est la même valeur que dans ton `.env` local. Sinon,
Supabase → `Project Settings` → `Database` → `Connection string` → onglet `URI`.

**À quoi ça sert** : le script écrit les offres d'occasion dans
`market_used_offers`. Il accepte aussi `SUPABASE_SERVICE_ROLE_KEY`, mais
`DATABASE_URL` suffit — autant n'avoir qu'un secret à gérer.

**Est-ce délicat ?** Un secret GitHub n'est pas un fichier `.env` : il est
chiffré, masqué dans les logs, et n'est jamais livré au navigateur. C'est
l'endroit prévu pour ça. Le `.env` local, lui, est bien dans `.gitignore`
(ligne 14) — vérifié.

**Ensuite** : renommer `.github/workflows/render-market-sources.yml.example` en
`render-market-sources.yml`, et pousser. Le job tourne le lundi 04:00 UTC, et se
déclenche à la main depuis l'onglet *Actions*.

---

## 2. Secrets Supabase — Edge Functions

`Project Settings` → `Edge Functions` → `Secrets`. Aucun n'a besoin d'être dans
ton `.env`.

| variable | rôle | où l'obtenir |
|---|---|---|
| `GEMINI_API_KEY` | vision + analyse photos | aistudio.google.com/apikey |
| `GEMINI_API_KEY_FALLBACK` | 2ᵉ clé, prend le relais sur quota | idem, autre projet Google |
| `GEMINI_MODELS` | chaîne de modèles, séparés par virgules | facultatif, un défaut existe |
| `GEMINI_CREDIBILITY_MODELS` | idem pour le pré-check photo | facultatif |
| `IMEI_INFO_API_KEY` | vérification IMEI de base | dash.imei.info |
| `IMEI_PREMIUM_API_KEY` | contrôle blacklist mondial | imeicheck.net |
| `CAMPAY_API_TOKEN` · `CAMPAY_BASE_URL` · `CAMPAY_WEBHOOK_KEY` | paiement Mobile Money | tableau de bord Campay |
| `CRON_SECRET` | protège les endpoints déclenchés par cron | valeur que tu choisis |
| `STAFF_DEFAULT_PASSWORD` | mot de passe initial d'un compte staff | valeur que tu choisis |
| `SUPER_ADMIN_EMAILS` | qui accède au super-admin | tes adresses |
| `BING_SEARCH_API_KEY` | recherche de prix (facultatif) | portal.azure.com |
| `PUBLIC_VERIFY_BASE_URL` | URL publique des certificats | ton domaine |
| `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` | injectés automatiquement par Supabase | rien à faire |

---

## 2 bis. Audit du 2026-08-25 — ce qui manque réellement

Comparaison entre les secrets définis sur le projet et ce que le code lit.

### ⚠️ À ajouter — conséquences concrètes

| variable | absente ⇒ | où la prendre |
|---|---|---|
| ~~`STAFF_DEFAULT_PASSWORD`~~ | **plus nécessaire** : chaque compte reçoit désormais un mot de passe aléatoire qui lui est propre, affiché une fois. La variable n'est plus lue | — |

Un seul point, en réalité. Voir la correction ci-dessous pour `IMEI_PREMIUM_API_KEY`.

### Facultatives, absence sans conséquence

| variable | comportement par défaut |
|---|---|
| `IMEI_PREMIUM_API_KEY` | **rien ne la requiert aujourd'hui** : le palier Sûreté n'est pas en vente. `TROC_TIER_SELECTOR_ENABLED = false` et `TROC_TUNNEL_TIER = 'express'` (`utils/trocPricing.ts` l. 27 et 30) — le sélecteur de formule n'est pas rendu et tout le tunnel passe en `express`. Reporté volontairement jusqu'au financement. À reprendre le jour où le drapeau repasse à `true` |
| `BING_SEARCH_API_KEY` | `get-market-trend` saute l'étape proprement |
| `PUBLIC_VERIFY_BASE_URL` | retombe sur `https://xeptionetwork.shop/verify`. Correct, mais le reste du site utilise `www.xeptionetwork.shop` — une redirection de plus sur les QR de certificat |
| `GEMINI_MODELS`, `GEMINI_CREDIBILITY_MODELS` | chaînes par défaut, sondées et à jour |
| `SNAPSHOT_BATCH_DELAY_MS`, `SNAPSHOT_MAX_MODELS` | 1500 ms et 200 modèles |
| `AI_RL_*_MAX_SESSION` / `_MAX_IP` / `_WINDOW_MIN` | quotas par défaut du garde-fou anti-abus |

### Définies mais lues nulle part

| variable | constat |
|---|---|
| `GROQ_API_KEY` | aucune fonction ne la lit. Reliquat, supprimable |
| `SMTP_USER` | `send-invoice` ne lit que `SMTP_PASSWORD` ; l'adresse est **codée en dur** (`support@xeptionetwork.shop`, ligne 174). Modifier ce secret ne change rien |

### Injectées par Supabase — rien à faire

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 3. `.env` local — scripts Node uniquement

Jamais livré au navigateur. Sert aux outils en ligne de commande.

| variable | rôle |
|---|---|
| `DATABASE_URL` | migrations, scripts de vérification, moteur de rendu |
| `SUPABASE_DB_PASSWORD` | utilisé par le CLI Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | facultatif — `DATABASE_URL` fait le même travail |
| `CHROME_PATH` | facultatif, si Chrome n'est pas à un emplacement standard |
| `INDEXNOW_KEY` | ping des moteurs de recherche au build |

---

## 4. Variables `VITE_` — publiées, à traiter comme telles

Elles sont dans le bundle. Vérifié sur `dist/assets/index-*.js`.

**Sans danger** — conçues pour être publiques :
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (protégée par la RLS),
`VITE_ENABLE_TROC_AI`, et tous les `VITE_*_MODEL(S)`, qui ne sont que des noms
de modèles.

**⚠️ Problématiques** — ce sont de vraies clés facturables, lisibles par
n'importe qui ouvrant les sources du site :

| variable | conséquence si extraite |
|---|---|
| `VITE_GEMINI_API_KEY` | consommation facturée sur ton compte Google |
| `VITE_OPENROUTER_API_KEY` | tes crédits OpenRouter dépensés |
| `VITE_DEEPSEEK_API_KEY` | idem côté DeepSeek |
| `VITE_SUPER_ADMIN_EMAILS` | divulgue les adresses des super-admins |

C'est l'objet du cadrage `docs/next-step/CADRAGE_CLES_IA_COTE_SERVEUR.md` : ces
appels doivent passer par une Edge Function, comme le canal vision principal.
Tant que ce n'est pas fait, ces clés sont exposées dès la première mise en ligne
publique — et les trois premières sont à révoquer et recréer à ce moment-là.

---

## 5. Vercel

Vercel n'a besoin **que des `VITE_`** — ce sont les seules variables présentes à
la compilation du site. Ni `DATABASE_URL`, ni `SUPABASE_SERVICE_ROLE_KEY`, ni
aucun secret Supabase n'ont à y figurer : rien dans le site construit ne les lit.

---

## 6. Pour vérifier ce qui fuit réellement

```bash
npx vite build
node -e "const fs=require('fs');const{config}=require('dotenv');config({path:'.env'});
const f=fs.readdirSync('dist/assets').filter(x=>x.endsWith('.js'));
for(const k of Object.keys(process.env).filter(k=>k.startsWith('VITE_'))){
  const v=(process.env[k]||'').trim(); if(v.length<12)continue;
  const hit=f.filter(x=>fs.readFileSync('dist/assets/'+x,'utf8').includes(v));
  console.log(k.padEnd(28), hit.length?'EN CLAIR DANS LE BUNDLE':'absente');}"
```

À relancer après toute modification du `.env` : c'est la seule preuve qui vaille.
Une première version de ce contrôle ne lisait qu'un seul fichier `dist/assets` et
concluait « absente » à tort — il y en a plusieurs.
