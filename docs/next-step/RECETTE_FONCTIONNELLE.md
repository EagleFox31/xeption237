# RECETTE FONCTIONNELLE — CATALOGUE DE TESTS

> **Date** : 24 août 2026 · **Avant mise en ligne réelle**
> Chaque test a un identifiant stable (`T-xxx`) destiné à être suivi dans la page
> de recette super admin. Colonne verdict à remplir : ✅ passe · ❌ échoue · ⏭️ non applicable.
>
> **Prérequis** : activer le **Mode test** de la caisse avant toute vente d'essai.
> Les commandes `TEST-%` sont exclues du CA, des objectifs et des primes
> (vue `orders_reportable`). Sans ça, la recette fausse les chiffres.

---

## Légende de priorité

| | Sens |
|---|---|
| 🔴 | **Bloquant** — ne pas mettre en ligne si ça échoue |
| 🟠 | Important — corriger rapidement après mise en ligne |
| 🟡 | Confort — peut attendre |

---

# 1. PROFIL CLIENT (public, sans compte)

| # | Test | Attendu | Prio |
|---|---|---|:---:|
| T-C01 | Ouvrir `/` | Accueil s'affiche, rangées produit par catégorie, aucune image cassée | 🔴 |
| T-C02 | `/shop` — filtrer par catégorie et par marque | Résultats cohérents, filtres cumulables, une seule entrée Samsung | 🔴 |
| T-C03 | `/shop` sur mobile | Filtres Type + Marque sur **une ligne**, `<select>` natifs | 🟠 |
| T-C04 | `/shop` — pagination | Navigation entre pages, pas de doublon ni de trou | 🟠 |
| T-C05 | Fiche produit `/product/:slug` | Nom visible au-dessus de l'image, prix, stock, specs | 🔴 |
| T-C06 | Fiche produit — étoiles | Affichées **uniquement** s'il y a de vrais avis, jamais de note inventée | 🟠 |
| T-C07 | Ajouter au panier puis checkout | Total juste, villes de livraison proposées (19), quartier requis | 🔴 |
| T-C08 | Valider une commande | Commande créée, **stock réservé**, message paiement à la livraison | 🔴 |
| T-C09 | Commander un article en rupture | Refus propre, message clair, aucune commande créée | 🔴 |
| T-C10 | `/tracking` avec le numéro de commande | Statut affiché en français, étapes lisibles | 🟠 |
| T-C11 | `/troc` — parcours Smart Troc complet | Voir parcours **P4** | 🔴 |
| T-C12 | `/verify/:token` d'un certificat | Certificat affiché, QR cohérent | 🟡 |
| T-C13 | `/avis/:token` reçu par WhatsApp | 5 étoiles + commentaire, sans compte, un seul envoi possible | 🟠 |
| T-C14 | `/avis/:token` avis produit **avant** J+7 | Refus « pas encore ouvert » (contrôle serveur, pas seulement UI) | 🟠 |
| T-C15 | `/sav` — créer un ticket | Ticket enregistré, confirmation visible | 🟠 |
| T-C16 | Pages légales (`/cgv`, `/mentions-legales`, `/politique-confidentialite`, `/politique-cookies`, `/cgv-smart-troc`) | Toutes accessibles, texte lisible | 🟡 |
| T-C17 | Naviguer tout le site en **navigation privée** | Aucune erreur console bloquante, aucun accès admin | 🔴 |
| T-C18 | Troc — saisir `000000000000000` comme IMEI | Refusé comme numéro de test, aucune marque devinée | 🔴 |
| T-C19 | Troc — IMEI d'un autre appareil que le modèle déclaré | Refus explicite, pas d'estimation | 🟠 |
| T-C20 | Chatbot conseil d'achat | Répond en français, cite des produits en stock | 🟠 |
| T-C21 | Troc — photos nettes | Pré-check rendu en quelques secondes | 🔴 |
| T-C22 | Troc — photo qui n'est pas un téléphone | Photo signalée à reprendre, index correct | 🟠 |
| T-C23 | Chatbot — 5 messages d'affilée | Réponses cohérentes ; captcha au 4e si Bot Protection actif | 🔴 |
| T-C24 | Chatbot — dépasser 40 messages/heure | Refus poli, pas d'erreur brute | 🟠 |

---

# 2. PROFIL VENDEUR

> Compte de rôle `vendeur`, rattaché à une boutique.

| # | Test | Attendu | Prio |
|---|---|---|:---:|
| T-V01 | Connexion staff | Atterrissage **direct sur la caisse** | 🔴 |
| T-V02 | Bandeau caisse | Nom de la boutique rattachée affiché | 🔴 |
| T-V03 | Compte **sans** boutique | Alerte visible, vente refusée avec message clair | 🔴 |
| T-V04 | Menu latéral | Voit : Dashboard, Caisse, Mes ventes, Commandes, Inventaire, Images, Clients | 🟠 |
| T-V05 | URL directe `/admin/stores` | **Redirigé**, pas d'accès | 🔴 |
| T-V06 | URL directe `/admin/staff` | **Redirigé**, pas d'accès | 🔴 |
| T-V07 | Vente comptoir simple | Voir parcours **P1** | 🔴 |
| T-V08 | Vente multi-articles | Quantités et total justes | 🔴 |
| T-V09 | Remise en FCFA | Sous-total et total recalculés à l'écran | 🟠 |
| T-V10 | Remise **supérieure** au sous-total | Refus serveur « Remise supérieure au sous-total » | 🔴 |
| T-V11 | Moyens de paiement | Espèces, OM, MoMo, Carte, Troc tous sélectionnables | 🟠 |
| T-V12 | Vente d'un article en rupture | Refus, stock inchangé, aucune commande | 🔴 |
| T-V13 | **Deux ventes simultanées** du dernier exemplaire (2 navigateurs) | Une seule passe, l'autre refusée proprement | 🔴 |
| T-V14 | Mode test ON → vente | Identifiant `TEST-…`, bandeau ambre visible | 🟠 |
| T-V15 | Mode test → fermer le navigateur → rouvrir | Mode **éteint** (sessionStorage) | 🟠 |
| T-V16 | Onglet Mes ventes | Nombre, encaissé, remises du jour ; détail ligne à ligne | 🟠 |
| T-V17 | Mes ventes — vente en mode test | **N'apparaît pas** (exclue par `orders_reportable`) — vérifier dans Commandes | 🟡 |
| T-V18 | Mes ventes — changer de date | Historique d'un jour passé | 🟡 |
| T-V19 | Progression objectif | Barre + % ; bannière verte si objectif atteint | 🟠 |
| T-V20 | Facture après vente | PDF avec moyen de paiement et ligne de remise | 🟠 |
| T-V21 | Mode hors connexion | Voir parcours **P8** | 🔴 |

---

# 3. PROFIL RESPONSABLE BOUTIQUE

> Hérite de tous les tests Vendeur, plus :

| # | Test | Attendu | Prio |
|---|---|---|:---:|
| T-R01 | Atterrissage à la connexion | Commandes s'il y en a en attente, sinon Dashboard | 🟠 |
| T-R02 | Menu | Voit en plus : Objectifs, Packs, Livraison, Mouvements stock, Troc, SAV | 🟠 |
| T-R03 | URL directe `/admin/staff` | **Redirigé** (réservé direction) | 🔴 |
| T-R04 | Commande `pending` → `confirmed` | Réservation **prolongée** (plus de TTL 48 h) | 🔴 |
| T-R05 | Commande → `shipped` | Statut à jour, stock toujours réservé | 🔴 |
| T-R06 | Bouton **Annuler** sur commande expédiée | **Absent** — seuls Refus / Retour proposés | 🔴 |
| T-R07 | `shipped` → `refused` | Stock **toujours réservé** (le colis revient) | 🔴 |
| T-R08 | `refused` → `returned` | Stock **libéré**, redevient vendable | 🔴 |
| T-R09 | Annuler une commande **avant** expédition | Stock libéré immédiatement, motif et auteur consignés | 🔴 |
| T-R10 | Encaisser une commande (OM/MoMo) | Campay déclenché, stock **consommé** au paiement confirmé | 🔴 |
| T-R11 | Encaisser en espèces | `mark_order_cash_paid`, stock consommé | 🔴 |
| T-R12 | Bouton **Terminer** sans paiement | Bloqué | 🔴 |
| T-R13 | Transfert inter-boutiques | Voir parcours **P5** | 🟠 |
| T-R14 | Inventaire | Voir parcours **P6** | 🟠 |
| T-R15 | Retour SAV | Voir parcours **P7** | 🟠 |
| T-R16 | Journal des mouvements | Historique lisible, motifs en clair | 🟡 |
| T-R17 | Encart « Stock réservé » | Commandes en attente + âge de la plus ancienne | 🟠 |
| T-R18 | Alerte colis dehors > 5 j | Apparaît dans l'encart | 🟡 |
| T-R19 | Valider un bon Troc au comptoir | Voir parcours **P4** | 🔴 |
| T-R20 | Fixer un objectif vendeur | Enregistré, visible côté vendeur | 🟠 |
| T-R21 | Créer une **règle de prime** | **Refusé** — réservé direction | 🔴 |
| T-R22 | Packs, Livraison, SAV | Consultation et modification OK | 🟡 |
| T-R23 | Troc → Prix marché — saisir un relevé | Marque, modèle, prix, lieu obligatoires ; ligne datée | 🟠 |
| T-R24 | Prix marché — relevé de plus de 180 jours | Grisé et marqué périmé, ignoré par l'estimation | 🟠 |
| T-R25 | Estimer un modèle ayant un relevé boutique | Le prix constaté prime sur le catalogue figé | 🔴 |
| T-R26 | Fiche produit — Auto-fill IA | Champs générés ; message clair si DeepSeek non configuré | 🟠 |
| T-R27 | Fiche produit — bloc Avis clients | Aucun bouton de génération ; renvoi vers la collecte WhatsApp | 🟠 |

---

# 4. PROFIL DIRECTION

| # | Test | Attendu | Prio |
|---|---|---|:---:|
| T-D01 | Menu complet | Voit en plus : Boutiques, Structure catalogue, Équipe | 🟠 |
| T-D02 | Créer une boutique | Nom, code, ville, active | 🔴 |
| T-D03 | Rattacher un vendeur à une boutique | Visible dans Équipe et dans sa caisse | 🔴 |
| T-D04 | Répartir le stock d'un produit | Somme forcée = stock catalogue, refus sinon | 🔴 |
| T-D05 | Répartir un produit ayant des **réservations** | Refus « du stock est réservé » | 🟠 |
| T-D06 | Désactiver une boutique ayant du stock | Comportement défini (à trancher) | 🟡 |
| T-D07 | Dashboard — KPI | CA, transactions, articles, panier moyen | 🔴 |
| T-D08 | Dashboard — filtres période | Aujourd'hui / 7 j / Mois / Personnalisé | 🟠 |
| T-D09 | Dashboard — filtres boutique et vendeur | Chiffres cohérents avec le filtre | 🟠 |
| T-D10 | Dashboard — classements | Vendeurs et boutiques | 🟠 |
| T-D11 | **Cohérence CA** : total dashboard vs somme Mes ventes de tous les vendeurs | Doivent concorder (même vue `orders_reportable`) | 🔴 |
| T-D12 | Export Excel | Fichier ouvert d'un double-clic, **accents corrects** (BOM), séparateur `;` | 🟠 |
| T-D13 | Rapport du soir | Impression lisible, mêmes chiffres que l'écran | 🟠 |
| T-D14 | Créer une règle de prime | Seuil et montant enregistrés | 🟠 |
| T-D15 | Retirer un objectif ou une prime | Suppression effective | 🟡 |
| T-D16 | Créer / modifier un membre d'équipe | Compte utilisable ensuite | 🔴 |
| T-D17 | Structure catalogue (catégories, marques, gammes) | Modification reflétée en boutique | 🟠 |
| T-D18 | Se connecter après qu'un employé a changé son mot de passe | Notification avec son nom | 🔴 |
| T-D19 | Réinitialiser le mot de passe d'un membre (icône clé) | Nouveau mot de passe affiché, événement journalisé | 🔴 |
| T-D20 | Changer le rôle d'un membre | Journalisé avec « ancien → nouveau » | 🟠 |
| T-D21 | Enregistrer un membre sans toucher à son rôle | Aucun événement, mot de passe conservé | 🟠 |

---

# 5. PROFIL SUPER ADMIN

| # | Test | Attendu | Prio |
|---|---|---|:---:|
| T-S01 | Accès `/studio` | Ouvert (réservé super admin) | 🟡 |
| T-S02 | Funnel d'import produits | Import bout en bout | 🟡 |
| T-S03 | Traitement d'images en masse | Images optimisées et rattachées | 🟡 |
| T-S04 | Accès à tous les onglets admin | Aucun refus | 🟠 |
| T-S05 | Page de recette (cette liste) | Accessible, verdicts enregistrés | 🟠 |
| T-S06 | `evaluate-device` en `healthCheck` | État réel de chaque modèle, pas « clé présente » | 🟠 |
| T-S07 | `npm run market:render -- --limit=2` | Écrit de l'occasion, aucune ligne de neuf | 🟡 |

---

# 6. PARCOURS DE BOUT EN BOUT

## P1 — Vente comptoir simple 🔴
1. Vendeur se connecte → arrive sur la caisse
2. Ajoute 2 produits, applique une remise
3. Choisit Espèces, valide
4. **Vérifier** : stock décrémenté **sur sa boutique**, commande créée avec son `staff_id` et son `store_id`, facture imprimable, vente visible dans Mes ventes, progression objectif mise à jour

## P2 — Commande web → livraison → encaissement 🔴
1. Client commande sur le site (article en stock)
2. **Vérifier** : stock **réservé**, pas encore consommé ; site affiche une unité de moins
3. Responsable valide → `confirmed` — **vérifier** que la réservation est prolongée
4. → `shipped`
5. Livraison, encaissement Campay ou espèces
6. **Vérifier** : stock **consommé**, CA mis à jour, `Terminer` débloqué
7. Invitation avis « accueil » proposée

## P3 — Refus à la porte puis retour 🔴
1. Commande `shipped`
2. Client refuse → `refused`
3. **Vérifier** : stock **toujours réservé**, article **non vendable** au comptoir
4. Le livreur rapporte le colis → `returned`
5. **Vérifier** : stock libéré, article de nouveau vendable, mouvement tracé

## P4 — Smart Troc complet 🔴
1. Client sur `/troc` : appareil, photos, IMEI
2. Paiement du frais de service
3. Résultat d'évaluation + choix d'un appareil cible
4. Bon généré — **vérifier** l'échéance (7/10/14 j) et la mention « sous réserve de dédouanement »
5. Client se présente en boutique
6. Responsable ouvre le dossier, valide, encaisse le reste à payer
7. **Vérifier** : commande créée, stock de la cible décrémenté, dossier `completed`, bon inutilisable une seconde fois

## P5 — Transfert inter-boutiques 🟠
1. Responsable crée un transfert A → B
2. Expédie
3. **Vérifier** : stock A décrémenté, B inchangé, **`products.stock` diminué** (en transit, vendable nulle part)
4. Se connecter côté B, confirmer la réception
5. **Vérifier** : stock B incrémenté, total revenu à l'identique, deux mouvements tracés

## P6 — Inventaire physique 🟠
1. Lancer une session sur une boutique
2. Saisir des quantités comptées, dont une avec écart
3. Valider
4. **Vérifier** : stock ajusté, écart consigné avec motif, mouvement `inventory_adjust`

## P7 — Retour SAV 🟠
1. Commande livrée et payée
2. Enregistrer un retour — cas **revendable**
3. **Vérifier** : stock **ré-incrémenté**, remboursement → `payment_status = refunded`, **commande sortie du CA**
4. Refaire avec disposition **atelier** : pas de ré-incrément

## P8 — Mode hors connexion 🔴
1. Ouvrir la caisse **en ligne** (snapshot catalogue)
2. Couper le réseau
3. Encaisser 2 ventes → « Vente en file locale »
4. **Fermer complètement le navigateur, rouvrir** → la file est toujours là
5. Rétablir le réseau → synchronisation automatique
6. **Vérifier** : commandes créées avec **l'heure réelle de la vente**, pas celle de la synchro
7. **Cas dur** : couper le réseau **pendant** la synchro → au rejeu, marquée synchronisée, **pas de doublon**
8. **Cas conflit** : épuiser le stock d'un article avant de synchroniser une vente en file → statut `stock_conflict`, aucune vente fantôme

## P9 — Avis client 🟠
1. Commande passée en `delivered`
2. **Vérifier** : bouton « Avis accueil » apparaît
3. Envoyer le lien, remplir côté client
4. **Vérifier** : un seul avis possible ; l'avis produit reste bloqué avant J+7

## P10 — Objectif et prime 🟠
1. Direction fixe un objectif journalier et un seuil de prime
2. Vendeur réalise des ventes
3. **Vérifier** : barre de progression, bannière à l'atteinte, prime affichée
4. **Vérifier** : une vente en **mode test** ne fait **pas** monter la barre

---

## P11 — Cycle complet d'un mot de passe staff 🔴
1. Direction crée un membre → **vérifier** : un mot de passe unique s'affiche, à noter
2. Le membre se connecte avec ce mot de passe
3. Il ouvre sa carte utilisateur en bas de la barre latérale → **Changer mon mot de passe**
4. **Vérifier** : le changement passe sans lien reçu par mail (deux comptes staff sont sur un domaine sans MX)
5. **Vérifier** : à sa prochaine connexion, la direction voit la notification avec son nom
6. **Vérifier** : le mot de passe d'un autre membre ne fonctionne toujours pas sur ce compte

---

# 7. CONTRÔLES TRANSVERSES

| # | Test | Attendu | Prio |
|---|---|---|:---:|
| T-X01 | Vendeur tente `/admin/stores` par URL | Redirigé | 🔴 |
| T-X02 | Responsable tente de créer une prime | Refusé côté serveur | 🔴 |
| T-X03 | `npm run db:inventory` | 0 RPC exposée à anon sans garde · 0 table sans RLS | 🔴 |
| T-X04 | `npm run db:status` | 0 migration en attente · 0 fichier modifié après application | 🟠 |
| T-X05 | `npm run db:verify` | Aucun écart fichiers ↔ base | 🟠 |
| T-X06 | `npx vite build` | Build vert | 🔴 |
| T-X07 | Somme des stocks boutique = `products.stock` | 0 désynchronisation | 🔴 |
| T-X08 | Site public en navigation privée | Aucune donnée staff accessible | 🔴 |
| T-X09 | Déconnexion staff | Session effacée, retour au login | 🟠 |
| T-X10 | Chercher les clés `VITE_` dans `dist/assets` après build | Aucune clé facturable en clair | 🔴 |
| T-X11 | Deux membres du staff se connectent | Mots de passe différents et non interchangeables | 🔴 |
| T-X12 | Employé sans email change son mot de passe | Possible sans lien reçu par mail | 🔴 |
| T-X13 | Un responsable ouvre le journal de sécurité | Ne voit rien : lecture réservée à la direction | 🟠 |
| T-X14 | Estimer un iPhone 13 et un Galaxy A15 | Prix cohérents, aucune valeur à 0 | 🟠 |
| T-X15 | Vérifier la source du prix marché | `strategy = shopify_api`, titres appariés aux prix | 🟠 |
| T-X16 | Clé Gemini dans le bundle après lot 2 | Chat propre, mais encore livrée par le canal vision | 🔴 |
| T-X17 | `POST /auth/v1/signup` sans captcha | Doit **échouer**. Un token = Bot Protection off = captcha du chat inerte | 🔴 |
| T-X18 | `ai_usage_quota` après quelques appels IA | Compteurs qui montent : c'est la protection réelle | 🟠 |
| T-X19 | `ai-product-details` sans connexion | 401. La clé anon en Bearer échoue aussi : pas d'email dans le jeton | 🔴 |
| T-X20 | `ai-product-details` avec un compte hors table `staff` | Refusé malgré un JWT valide | 🟠 |

---

# 8. LA PAGE DE RECETTE — proposition

**Onglet « Recette » réservé au super admin**, alimenté par ce catalogue.

Pour chaque test : identifiant, libellé, attendu, priorité, et trois boutons — ✅ / ❌ / ⏭️ — plus un champ commentaire libre.

**Ce qu'il faut décider** : où stocker les verdicts.

- **En base** (table `qa_test_runs` : `test_id`, `status`, `note`, `tested_by`, `tested_at`) — permet à plusieurs personnes de se répartir la recette et à la direction de suivre l'avancement. C'est ce que je recommande à 4 personnes avant une mise en ligne.
- **En local** (navigateur) — plus simple, mais chacun voit ses propres résultats et rien ne se partage.

**Affichage utile** : un compteur en tête — *« 47 / 96 testés · 3 échecs · 5 bloquants restants »* — et un filtre pour ne voir que les 🔴 non validés. C'est ce qui répond à la seule question qui compte le jour du lancement : **est-ce qu'il reste un bloquant ?**
