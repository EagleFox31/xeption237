# Rapport import catalogue Mfoundi Mall

**Date :** 2026-06-12  
**Source :** Mfoundi Mall, Boutique 2063  
**Devise :** FCFA  

## Résumé

| Élément | Quantité |
|---------|----------|
| Lignes catalogue | 131 |
| Marques (créées si absentes) | 6 |
| Gammes (créées si absentes) | 89 |
| Produits à insérer / mettre à jour | 131 |

## Marques

| Slug DB | Nom affiché | Statut |
|---------|-------------|--------|
| `apple` | Apple | Existante probablement — INSERT si absent |
| `google-pixel` | Google Pixel | Google du JSON mappé sur marque existante |
| `samsung` | Samsung | Existante probablement |
| `xiaomi` | Xiaomi | **Nouvelle** si absente |
| `infinix` | Infinix | **Nouvelle** si absente |
| `tecno` | Tecno | **Nouvelle** si absente |

## Catégories mappées

| Source JSON | Slug DB |
|-------------|---------|
| `smartphone` | `phones` |
| `smartwatch` | `accessories` |
| `earbuds` | `accessories` |

## Règles d’import produits

- **Nom :** Marque + modèle + stockage + RAM + conditionnement + SIM + origine  
  Ex. `Samsung Galaxy S23 Ultra 512 Go Non scellé SIM+eSIM (US)`
- **Condition :** `scelle` → `new`, `non_scelle` → `refurbished`, iPhones Apple → `refurbished`
- **Stock initial :** 0 (à saisir en inventaire)
- **Image :** `/icons/icon-192x192.png` (placeholder — utiliser **Import photos** dans l’ERP)
- **Doublons :** pas d’insert si même nom + marque + gamme ; UPDATE prix/specs si existant
- **Normalisations appliquées :**
  - iPhone 12 Pro Max 512 Go (source « 515g »)
  - Tecno Spark 40 (source « Spart 40 »)
  - Gammes `S21+`, `S22+`, etc. → slug `galaxy-s21-plus` (pas collision avec `Galaxy S21`)

## Gammes nouvelles (aperçu par marque)

### Apple (13 gammes iPhone)
iPhone XR, 11, 11 Pro, 11 Pro Max, 12, 12 Pro, 12 Pro Max, 13, 13 Pro, 13 Pro Max, 14, 14 Pro, 14 Pro Max

### Google Pixel (12 gammes)
Pixel 6A, 6 Pro, 7, 7a, 7 Pro, 8, 8a, 8 Pro, 9, 9 Pro, 9 Pro XL

### Samsung (~55 gammes)
Galaxy S / Z / A / M / Note, montres (Watch4–8, Ultra, FIT 3), Galaxy Buds Core, A07, etc.

### Xiaomi (9 gammes)
Redmi A5, 13, 14C, 15, 15C, Note 9 Pro, Note 14, Note 15

### Infinix (4 gammes)
Smart 10 HD, Smart 10, Hot 60i, Hot 50 Pro+

### Tecno (2 gammes)
Pop 10, Spark 40

Liste complète : `data/mfoundi-import-report.json`

## Fichiers générés

| Fichier | Usage |
|---------|--------|
| `data/mfoundi-mall-catalog.json` | Source catalogue |
| `supabase/migrations/20260614_007_mfoundi_mall_catalog.sql` | Migration SQL à exécuter |
| `scripts/generate-mfoundi-import.mjs` | Régénération si le JSON change |

## Application en base

La migration n’a **pas** été appliquée automatiquement (pas de `SUPABASE_DB_PASSWORD` / CLI indisponible).

**À faire dans Supabase Dashboard → SQL Editor :**

1. Ouvrir `supabase/migrations/20260614_007_mfoundi_mall_catalog.sql`
2. Exécuter le script complet (peut prendre ~30 s)
3. Vérifier : `SELECT count(*) FROM products WHERE description LIKE '%Mfoundi Mall%';` → ~131

Ou en local si mot de passe DB configuré :

```powershell
cd xeption237
# Ajouter SUPABASE_DB_PASSWORD=... dans .env
node scripts/apply-migration.mjs supabase/migrations/20260614_007_mfoundi_mall_catalog.sql
```

## Page ERP « Import photos »

Menu **Catalogue → Import photos** : liste des produits sans image, upload Cloudinary direct, pas de changement de page.

Après migration : filtre **Sans photo** → ~131 produits Mfoundi à photographier.
