# ADR-005 — Prix de base de reprise dérivé du catalogue boutique

- **Statut** : proposé — 2026-11-17. Le ratio de conversion est une décision commerciale à valider
  par la direction.
- **Suite de** : [ADR-004](./ADR-004-troc-offer-shop-price-cap.md) (plafond prix boutique), qui
  n'est qu'un garde-fou.

## Contexte

Le prix de base d'une reprise (`base_price`) vient de `trade_in_models`. Quand le modèle n'y est pas,
le serveur (`resolveBasePrice`, `save-trade-in`) appelle `market-price-intel`, une estimation de prix
neuf en ligne sans lien avec nos prix de vente. Cas réel : Pixel 8 Pro estimé à 1 090 000, vendu en
boutique 205 000 à 280 000.

Introspection de la prod (lecture seule, 17/11/2026) :

| Constat | Valeur |
|---|---|
| `trade_in_models` | 32 lignes (21 `phone`, 11 `laptop`), colonnes `brand`, `model_name`, `base_price` ; **pas de stockage**, pas de lien vers `products` |
| `products` publiés `phones` + `tablettes` | 151 |
| … dont le modèle a une entrée de reprise | 30 |
| … **sans entrée de reprise** | **121** (Pixel : 19/19, Xiaomi : 20, Samsung : ~54, Apple : 11, Tecno, Infinix…) |
| Modèles présents des deux côtés | 16 |
| Ratio `base_price` / prix boutique le plus bas (médiane, min–max) | **1,7** (1,14 – 2,15) |

`base_price` n'est donc pas un prix boutique : il vaut environ 1,7 fois notre prix de vente le plus
bas (c'est une référence « neuf »). Le formulaire actif (`TrocQuickForm`) ne demande pas le stockage.

## Décision

Ordre de résolution du prix de base, identique client et serveur :

1. **Catalogue de reprise** (`trade_in_models`) : inchangé, il prime toujours.
2. **Catalogue boutique** (nouveau) : prix boutique le plus bas du **même modèle exact** (matching
   d'ADR-004, `findLowestShopPrice`) × **`SHOP_TO_TRADE_IN_BASE_RATIO` (1,7)**, arrondi au 5 000
   inférieur.
3. `market-price-intel`, puis les replis existants (client : relevés `fetchMarketReferencePrice`
   avant l'étape 2 et `CATALOG_FALLBACK` en dernier, comme avant).

- **Pourquoi convertir** : avec le prix boutique brut comme base, un Pixel 8 Pro serait repris
  environ 45 % moins cher qu'un modèle catalogue équivalent. Le ratio rend les deux sources
  comparables. Le plafond d'ADR-004 (0,7 × prix boutique) s'applique toujours ensuite.
- **Pourquoi le prix le plus bas** : même référence que le plafond ; le stockage n'est pas saisi par
  le formulaire actif, donc pas de sélection par capacité (YAGNI).
- **Pas de migration** : aucune colonne ni table nouvelle. La liaison se fait par le nom, avec le
  matching déjà testé.
- **Traçabilité** : le serveur renvoie et journalise `basePriceSource`
  (`catalog` | `shop` | `market` | `none`).
- **Écarts visibles** : `npm run troc:catalog-gaps` (lecture seule) liste les produits boutique sans
  entrée de reprise avec le `base_price` proposé, et recalcule la médiane pour revoir le ratio.
  Le staff ajoute les entrées qu'il veut ; le script n'écrit rien.
- **Code** : `utils/basePriceResolution.ts` (Vite) et
  `supabase/functions/_shared/basePriceResolution.ts` (Deno), copies identiques ;
  `tests/base-price-resolution.test.ts` échoue si elles divergent.

Pixel 8 Pro : 205 000 × 1,7 = 348 500, soit une base de **345 000** (au lieu de 1 090 000).

## Alternatives écartées

- **Synchro qui crée les entrées `trade_in_models` depuis `products`** : écrit en prod, demande de
  dériver un nom de modèle propre depuis des noms produits hétérogènes (« Non scellé (US/Japan) »,
  « Scellé SIM+eSIM (Korea) »), et doublonne la donnée. Le script de lecture suffit pour proposer.
- **Colonne `product_id` sur `trade_in_models`** : un modèle de reprise correspond à plusieurs
  produits (stockages, états) ; la FK n'apporterait rien que le matching ne donne.
- **Ratio calculé à l'exécution** (médiane en direct) : une requête de plus et une offre qui bouge
  quand la boutique change un prix sans rapport. Le script recalcule la médiane pour une revue
  consciente.
- **Écran ERP des écarts** : utile plus tard ; le script couvre le besoin sans UI.

## Conséquences

- **Changement de comportement par défaut** : un modèle hors catalogue de reprise mais vendu en
  boutique ne passe plus par `market-price-intel`. Les modèles du catalogue de reprise et ceux
  absents de la boutique ne changent pas.
- Aucune requête en plus : le prix boutique était déjà lu pour le plafond, il est réutilisé.
- Les dossiers déjà enregistrés ne sont pas recalculés automatiquement (action staff `recalculate`).
- **Limite héritée du matching d'ADR-004** : un modèle sans chiffre (« iPhone XR », « iPhone Air »)
  n'est jamais apparié à la boutique ; il garde le chemin catalogue de reprise puis
  `market-price-intel`. Le script le liste donc comme « sans entrée » même s'il en a une.
- Revoir le ratio = changer `SHOP_TO_TRADE_IN_BASE_RATIO` dans les deux copies, après lecture de la
  médiane donnée par `npm run troc:catalog-gaps`.
