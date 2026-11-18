# Passation — carrousel roue ordinateurs

## 2026-11-18 12:58 — Étude de faisabilité carrousel « roue courbe » (ordinateurs)

- Livrable : `docs/plans/etude-faisabilite-carrousel-roue-ordinateurs.md` (étude seule, aucun code).
- Données lues en prod (lecture seule, script temporaire supprimé) : 32 PC publiés en stock, images WebP hétérogènes (19 fonds blancs, 12 décor, 1 détouré).
- Recommandation : pilote de 8 PC détourés dans le hero de la landing PC, Embla + arc maison, mesure `view_item_list` / `select_item` sur 4 semaines (~3 à 3,5 j).
- Rien n'est commité, poussé ni déployé : en attente de l'accord d'Anjl.

## 2026-11-18 13:28 — Périmètre élargi par le client (vocal du 18/11)

- Demande : roue pour les PC les plus vendus en 2026, priorité au stock boutique ; liste stock + arrivages à recevoir du client ; commande sur demande des modèles absents.
- Lots : 1) roue + stock (~1 sem.) ; 2) badge « Bientôt disponible » via colonne additive `expected_at` (~0,5 j) ; 3) commande sur demande (~1 sem., non cadré : vérifier le panier avec stock 0 ; hypothèse = réservation, pas d'acompte).
- Délai annoncé : 2 semaines et demie à partir de la réception des listes et des photos, livraison par lots.
- Outils : détourage gratuit (Magnific formule gratuite) ; Premium (~20 $/mois) seulement si changement d'angle ou vraie 3D.

## 2026-11-18 13:40 — Correctif « Sur commande » refusé au paiement

- Fait (non commité) : `utils/cartAvailability.ts`, `buildOnRequestOrderMessage` (`utils/whatsappShare.ts`), garde
  dans `addToCart` / `updateQuantity` (`App.tsx`), libellés « Commander sur demande » dans `ProductCard.tsx`,
  `ProductDetail.tsx`, `MobileProductDetailView.tsx`. Test : `tests/cart-availability.test.ts` (12 verts, `git add -f`).
- Preuve : suite complète 890 verts / 30 rouges, identique à `HEAD` (30 rouges préexistants : pas de
  `test.environment` jsdom dans `vite.config.ts`). `vite build` OK. `tsc` : seule erreur préexistante `vite.config.d.ts`.
- Worktree : `node_modules` est une jonction vers celui du dépôt principal (ne pas le supprimer avec `rm -rf`
  qui suivrait la jonction ; utiliser `rmdir`).
- Reste : lot 3 (commande sur demande enrichie), commit à valider par l'utilisateur.

## 2026-11-18 13:41 — Commits du correctif et de l'étude

- Correctif panier commité : `5551ac7` (branche `claude/dreamy-morse-62f960`, non poussée, pas de PR).
- Étude (section 7, lots 1-3) et passation commitées dans le commit suivant.
- Prochaine étape : lot 1 (carrousel) dès réception des listes et photos du client ; push/PR sur accord.

## 2026-11-18 13:42 — PR ouverte

- PR : https://github.com/EagleFox31/xeption237/pull/66 (correctif panier hors stock + étude), base `main`, branche poussée.
- Prochaine étape : revue/merge de la PR ; lot 1 dès réception des listes et photos du client.
