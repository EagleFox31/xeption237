# ADR-004 — Plafond « prix boutique » de l'offre de reprise

- **Statut** : proposé — 2026-11-17. À valider par la direction (le ratio est une décision commerciale).
- **Contexte** : le bon `#BON-1794932672` (Pixel 8 Pro, état excellent) affichait une estimation de
  revente de 275 000 – 330 000 FCFA, pour un crédit de 365 000. La boutique vend ce même modèle
  205 000 (non scellé), 260 000 (128 Go) et 280 000 (256 Go). Xeption proposait donc de racheter un
  appareil plus cher qu'elle ne le revend.
- **Cause racine** : le Pixel 8 Pro n'est pas dans `trade_in_models`. `resolveBasePrice` (serveur)
  tombe alors sur `market-price-intel`, qui renvoie un prix neuf estimé élevé. Aucun garde-fou ne
  comparait l'offre au prix de vente boutique du même modèle.

## Décision

Le crédit de reprise ne dépasse jamais **`SHOP_PRICE_OFFER_CAP_RATIO` (0,7) × le prix boutique le
plus bas du même modèle**, arrondi au 5 000 inférieur. Le cash suit (`creditToCash` sur le crédit
plafonné).

- **Même modèle exact** : séquence de tokens identique (marque retirée), et le token suivant ne doit
  pas être une déclinaison (`pro`, `max`, `ultra`, `plus`, `fe`…). Un Pixel 8 ne prend pas le prix
  d'un Pixel 8 Pro. Un modèle sans chiffre (« iPhone ») est trop vague : pas de plafond.
- **Catégories comparées** : `phones` et `tablettes` (`SHOP_PRICE_CAP_CATEGORIES`).
- **Prix le plus bas** : c'est le prix auquel le client peut racheter le modèle chez nous ; c'est
  la référence qui rend l'incohérence visible au boss.
- **Ordre** : le plafond s'applique après le plancher digne. Il peut donc descendre sous
  `DIGNIFIED_FLOOR_XAF` si la boutique vend le modèle très bas. C'est voulu : ne pas racheter au-dessus
  de notre prix de vente prime sur le plancher.
- **Pas de prix boutique ou lecture en échec** : aucun plafond (comportement antérieur conservé).
- **Client et serveur alignés** : `utils/shopPriceCap.ts` (Vite) et
  `supabase/functions/_shared/shopPriceCap.ts` (Deno) sont des copies identiques ;
  `tests/shop-price-cap.test.ts` échoue si elles divergent.

Pour le Pixel 8 Pro : 205 000 × 0,7 = 143 500, soit un crédit plafonné à **140 000**.

## Alternatives écartées

- **Ajouter le modèle à `trade_in_models`** : utile, mais ne protège pas les autres modèles hors
  catalogue. À faire en plus, par le staff.
- **Plafonner au prix boutique le plus haut** : laisse passer une offre supérieure au prix d'un
  exemplaire vendu en rayon.
- **Ratio 1,0** : marge nulle à la revente, contraire à la politique « serrée » du boss.

## Conséquences

- **Changement de comportement par défaut** : les offres sur un modèle vendu en boutique peuvent
  baisser. Les modèles absents de la boutique ne changent pas.
- Une requête `products` de plus par évaluation (client) et par enregistrement (serveur), filtrée
  par catégorie et par le token chiffré du modèle.
- Les dossiers déjà enregistrés ne sont pas recalculés automatiquement. Le dossier TRC-1794932672
  doit l'être après déploiement de `save-trade-in`.
- Ajuster le ratio = changer `SHOP_PRICE_OFFER_CAP_RATIO` dans les deux copies (le test de parité
  l'impose).
