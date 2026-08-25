/**
 * Catalogue de recette fonctionnelle — source unique des tests à passer avant
 * la mise en ligne. Miroir de `docs/next-step/RECETTE_FONCTIONNELLE.md`.
 *
 * Les verdicts sont stockés en base (`qa_test_runs`, migration 20260824_028) :
 * l'équipe se répartit la recette, la direction suit l'avancement.
 *
 * ⚠️ Les identifiants sont la CLÉ des verdicts enregistrés. Ne pas les renuméroter :
 * un test renommé perd son historique. Pour retirer un test, supprimer sa ligne ;
 * pour en ajouter un, prendre le numéro suivant de sa section.
 */

export type QaPriority = 'blocking' | 'important' | 'nice';

export type QaSection =
  | 'client'
  | 'vendeur'
  | 'responsable'
  | 'direction'
  | 'superadmin'
  | 'parcours'
  | 'transverse';

export interface QaTest {
  id: string;
  label: string;
  expected: string;
  priority: QaPriority;
  section: QaSection;
}

export const QA_SECTIONS: { id: QaSection; label: string; hint: string }[] = [
  { id: 'client', label: 'Client (public)', hint: 'Sans compte, depuis le site' },
  { id: 'vendeur', label: 'Vendeur', hint: 'Compte rôle vendeur, rattaché à une boutique' },
  { id: 'responsable', label: 'Responsable boutique', hint: 'Hérite des tests vendeur' },
  { id: 'direction', label: 'Direction', hint: 'Hérite de tout' },
  { id: 'superadmin', label: 'Super admin', hint: 'Studio et outillage' },
  { id: 'parcours', label: 'Parcours de bout en bout', hint: 'Du début à la fin, sans raccourci' },
  { id: 'transverse', label: 'Contrôles transverses', hint: 'Sécurité, intégrité, build' },
];

export const QA_PRIORITY_LABEL: Record<QaPriority, string> = {
  blocking: 'Bloquant',
  important: 'Important',
  nice: 'Confort',
};

const T = (
  id: string,
  section: QaSection,
  priority: QaPriority,
  label: string,
  expected: string,
): QaTest => ({ id, section, priority, label, expected });

export const QA_TESTS: QaTest[] = [
  // ── Client ────────────────────────────────────────────────────────────────
  T('T-C01', 'client', 'blocking', 'Ouvrir l’accueil', 'Rangées produit par catégorie, aucune image cassée'),
  T('T-C02', 'client', 'blocking', 'Boutique — filtrer par catégorie et marque', 'Filtres cumulables, une seule entrée Samsung'),
  T('T-C03', 'client', 'important', 'Boutique sur mobile', 'Filtres Type + Marque sur une ligne, selects natifs'),
  T('T-C04', 'client', 'important', 'Boutique — pagination', 'Ni doublon ni trou entre les pages'),
  T('T-C05', 'client', 'blocking', 'Fiche produit', 'Nom visible au-dessus de l’image, prix, stock, specs'),
  T('T-C06', 'client', 'important', 'Fiche produit — étoiles', 'Affichées seulement s’il y a de vrais avis'),
  T('T-C07', 'client', 'blocking', 'Panier puis checkout', 'Total juste, 19 villes proposées, quartier requis'),
  T('T-C08', 'client', 'blocking', 'Valider une commande', 'Stock réservé, message paiement à la livraison'),
  T('T-C09', 'client', 'blocking', 'Commander un article en rupture', 'Refus propre, aucune commande créée'),
  T('T-C10', 'client', 'important', 'Suivi de commande', 'Statut en français, étapes lisibles'),
  T('T-C11', 'client', 'blocking', 'Smart Troc depuis le site', 'Voir parcours P4'),
  T('T-C12', 'client', 'nice', 'Vérification d’un certificat', 'Certificat affiché, QR cohérent'),
  T('T-C13', 'client', 'important', 'Page avis reçue par WhatsApp', '5 étoiles + mot, sans compte, un seul envoi'),
  T('T-C14', 'client', 'important', 'Avis produit avant J+7', 'Refus côté serveur, pas seulement dans l’interface'),
  T('T-C15', 'client', 'important', 'Créer un ticket SAV', 'Ticket enregistré, confirmation visible'),
  T('T-C16', 'client', 'nice', 'Pages légales', 'Les cinq accessibles et lisibles'),
  T('T-C17', 'client', 'blocking', 'Naviguer en navigation privée', 'Aucune erreur bloquante, aucun accès admin'),
  T('T-C18', 'client', 'blocking', 'Troc — saisir 000000000000000 comme IMEI', 'Refusé comme numéro de test, aucune marque devinée'),
  T('T-C19', 'client', 'important', 'Troc — saisir un IMEI d’un autre appareil que le modèle déclaré', 'Refus explicite, pas d’estimation'),
  T('T-C20', 'client', 'important', 'Chatbot conseil d’achat', 'Répond en français, cite des produits en stock, ne s’excuse pas d’une panne'),
  T('T-C21', 'client', 'blocking', 'Troc — envoyer des photos nettes', 'Pré-check rendu en quelques secondes, pas de « vérification impossible »'),
  T('T-C22', 'client', 'important', 'Troc — envoyer une photo qui n’est pas un téléphone', 'Photo signalée à reprendre, index correct'),
  T('T-C23', 'client', 'blocking', 'Chatbot — envoyer 5 messages d’affilée', 'Réponses cohérentes ; au 4e, captcha demandé si Bot Protection est actif'),
  T('T-C24', 'client', 'important', 'Chatbot — dépasser 40 messages en une heure', 'Refus poli « trop de requêtes », pas d’erreur brute'),

  // ── Vendeur ───────────────────────────────────────────────────────────────
  T('T-V01', 'vendeur', 'blocking', 'Connexion staff', 'Atterrissage direct sur la caisse'),
  T('T-V02', 'vendeur', 'blocking', 'Bandeau caisse', 'Nom de la boutique rattachée affiché'),
  T('T-V03', 'vendeur', 'blocking', 'Compte sans boutique', 'Alerte visible, vente refusée avec message clair'),
  T('T-V04', 'vendeur', 'important', 'Menu latéral', 'Dashboard, Caisse, Mes ventes, Commandes, Inventaire, Images, Clients'),
  T('T-V05', 'vendeur', 'blocking', 'URL directe /admin/stores', 'Redirigé, pas d’accès'),
  T('T-V06', 'vendeur', 'blocking', 'URL directe /admin/staff', 'Redirigé, pas d’accès'),
  T('T-V07', 'vendeur', 'blocking', 'Vente comptoir simple', 'Voir parcours P1'),
  T('T-V08', 'vendeur', 'blocking', 'Vente multi-articles', 'Quantités et total justes'),
  T('T-V09', 'vendeur', 'important', 'Remise en FCFA', 'Sous-total et total recalculés'),
  T('T-V10', 'vendeur', 'blocking', 'Remise supérieure au sous-total', 'Refus serveur explicite'),
  T('T-V11', 'vendeur', 'important', 'Moyens de paiement', 'Espèces, OM, MoMo, Carte, Troc sélectionnables'),
  T('T-V12', 'vendeur', 'blocking', 'Vente d’un article en rupture', 'Refus, stock inchangé, aucune commande'),
  T('T-V13', 'vendeur', 'blocking', 'Deux ventes simultanées du dernier exemplaire', 'Une seule passe, l’autre refusée proprement'),
  T('T-V14', 'vendeur', 'important', 'Mode test activé puis vente', 'Identifiant TEST-…, bandeau ambre visible'),
  T('T-V15', 'vendeur', 'important', 'Mode test — fermer et rouvrir le navigateur', 'Mode éteint au retour'),
  T('T-V16', 'vendeur', 'important', 'Onglet Mes ventes', 'Nombre, encaissé, remises du jour, détail'),
  T('T-V17', 'vendeur', 'nice', 'Mes ventes — vente en mode test', 'N’apparaît pas ; visible dans Commandes'),
  T('T-V18', 'vendeur', 'nice', 'Mes ventes — changer de date', 'Historique d’un jour passé'),
  T('T-V19', 'vendeur', 'important', 'Progression objectif', 'Barre, pourcentage, bannière à l’atteinte'),
  T('T-V20', 'vendeur', 'important', 'Facture après vente', 'Moyen de paiement et ligne de remise'),
  T('T-V21', 'vendeur', 'blocking', 'Mode hors connexion', 'Voir parcours P8'),

  // ── Responsable ───────────────────────────────────────────────────────────
  T('T-R01', 'responsable', 'important', 'Atterrissage à la connexion', 'Commandes si en attente, sinon Dashboard'),
  T('T-R02', 'responsable', 'important', 'Menu', 'Ajoute Objectifs, Packs, Livraison, Mouvements stock, Troc, SAV'),
  T('T-R03', 'responsable', 'blocking', 'URL directe /admin/staff', 'Redirigé (réservé direction)'),
  T('T-R04', 'responsable', 'blocking', 'Commande pending vers confirmed', 'Réservation prolongée, plus de TTL 48 h'),
  T('T-R05', 'responsable', 'blocking', 'Commande vers shipped', 'Statut à jour, stock toujours réservé'),
  T('T-R06', 'responsable', 'blocking', 'Bouton Annuler sur commande expédiée', 'Absent — seuls Refus et Retour proposés'),
  T('T-R07', 'responsable', 'blocking', 'shipped vers refused', 'Stock toujours réservé, le colis revient'),
  T('T-R08', 'responsable', 'blocking', 'refused vers returned', 'Stock libéré, redevient vendable'),
  T('T-R09', 'responsable', 'blocking', 'Annuler avant expédition', 'Stock libéré, motif et auteur consignés'),
  T('T-R10', 'responsable', 'blocking', 'Encaisser en OM ou MoMo', 'Campay déclenché, stock consommé au paiement'),
  T('T-R11', 'responsable', 'blocking', 'Encaisser en espèces', 'Stock consommé'),
  T('T-R12', 'responsable', 'blocking', 'Terminer sans paiement enregistré', 'Bloqué'),
  T('T-R13', 'responsable', 'important', 'Transfert inter-boutiques', 'Voir parcours P5'),
  T('T-R14', 'responsable', 'important', 'Inventaire', 'Voir parcours P6'),
  T('T-R15', 'responsable', 'important', 'Retour SAV', 'Voir parcours P7'),
  T('T-R16', 'responsable', 'nice', 'Journal des mouvements', 'Historique lisible, motifs en clair'),
  T('T-R17', 'responsable', 'important', 'Encart Stock réservé', 'Commandes en attente et âge de la plus ancienne'),
  T('T-R18', 'responsable', 'nice', 'Alerte colis dehors depuis plus de 5 jours', 'Apparaît dans l’encart'),
  T('T-R19', 'responsable', 'blocking', 'Valider un bon Troc au comptoir', 'Voir parcours P4'),
  T('T-R20', 'responsable', 'important', 'Fixer un objectif vendeur', 'Enregistré, visible côté vendeur'),
  T('T-R21', 'responsable', 'blocking', 'Créer une règle de prime', 'Refusé — réservé à la direction'),
  T('T-R22', 'responsable', 'nice', 'Packs, Livraison, SAV', 'Consultation et modification'),
  T('T-R23', 'responsable', 'important', 'Troc → Prix marché — saisir un relevé', 'Marque, modèle, prix, lieu obligatoires ; la ligne apparaît datée'),
  T('T-R24', 'responsable', 'important', 'Prix marché — relevé de plus de 180 jours', 'Affiché grisé et marqué périmé, ignoré par l’estimation'),
  T('T-R25', 'responsable', 'blocking', 'Estimer un modèle ayant un relevé boutique', 'Le prix constaté prime sur le catalogue figé du code'),
  T('T-R26', 'responsable', 'important', 'Fiche produit — Auto-fill IA sur un champ', 'Description, specs, pros et cons générés ; message clair si DeepSeek n’est pas configuré côté serveur'),

  // ── Direction ─────────────────────────────────────────────────────────────
  T('T-D01', 'direction', 'important', 'Menu complet', 'Ajoute Boutiques, Structure catalogue, Équipe'),
  T('T-D02', 'direction', 'blocking', 'Créer une boutique', 'Nom, code, ville, active'),
  T('T-D03', 'direction', 'blocking', 'Rattacher un vendeur à une boutique', 'Visible dans Équipe et dans sa caisse'),
  T('T-D04', 'direction', 'blocking', 'Répartir le stock d’un produit', 'Somme forcée au stock catalogue, refus sinon'),
  T('T-D05', 'direction', 'important', 'Répartir un produit ayant des réservations', 'Refus explicite'),
  T('T-D06', 'direction', 'nice', 'Désactiver une boutique ayant du stock', 'Comportement à trancher puis vérifier'),
  T('T-D07', 'direction', 'blocking', 'Dashboard — KPI', 'CA, transactions, articles, panier moyen'),
  T('T-D08', 'direction', 'important', 'Dashboard — filtres de période', 'Aujourd’hui, 7 jours, mois, personnalisé'),
  T('T-D09', 'direction', 'important', 'Dashboard — filtres boutique et vendeur', 'Chiffres cohérents avec le filtre'),
  T('T-D10', 'direction', 'important', 'Dashboard — classements', 'Vendeurs et boutiques'),
  T('T-D11', 'direction', 'blocking', 'Cohérence CA dashboard et Mes ventes', 'Les deux doivent concorder'),
  T('T-D12', 'direction', 'important', 'Export Excel', 'Ouverture au double-clic, accents corrects'),
  T('T-D13', 'direction', 'important', 'Rapport du soir', 'Mêmes chiffres que l’écran'),
  T('T-D14', 'direction', 'important', 'Créer une règle de prime', 'Seuil et montant enregistrés'),
  T('T-D15', 'direction', 'nice', 'Retirer un objectif ou une prime', 'Suppression effective'),
  T('T-D16', 'direction', 'blocking', 'Créer ou modifier un membre d’équipe', 'Compte utilisable ensuite'),
  T('T-D17', 'direction', 'important', 'Structure catalogue', 'Modification reflétée en boutique'),
  T('T-D18', 'direction', 'blocking', 'Se connecter après qu’un employé a changé son mot de passe', 'Notification « Mot de passe modifié » avec son nom'),
  T('T-D19', 'direction', 'blocking', 'Réinitialiser le mot de passe d’un membre (icône clé)', 'Nouveau mot de passe affiché, événement journalisé avec la cible'),
  T('T-D20', 'direction', 'important', 'Changer le rôle d’un membre', 'Journalisé avec « ancien → nouveau »'),
  T('T-D21', 'direction', 'important', 'Enregistrer un membre sans toucher à son rôle', 'Aucun événement, et son mot de passe reste valide'),

  // ── Super admin ───────────────────────────────────────────────────────────
  T('T-S01', 'superadmin', 'nice', 'Accès au Studio', 'Ouvert'),
  T('T-S02', 'superadmin', 'nice', 'Funnel d’import produits', 'Import de bout en bout'),
  T('T-S03', 'superadmin', 'nice', 'Traitement d’images en masse', 'Images optimisées et rattachées'),
  T('T-S04', 'superadmin', 'important', 'Accès à tous les onglets', 'Aucun refus'),
  T('T-S05', 'superadmin', 'important', 'Page de recette', 'Verdicts enregistrés et partagés'),
  T('T-S06', 'superadmin', 'important', 'Appeler evaluate-device en healthCheck', 'Répond l’état réel de chaque modèle, pas seulement « clé présente »'),
  T('T-S07', 'superadmin', 'nice', 'Lancer npm run market:render -- --limit=2', 'Écrit des lignes d’occasion, aucune ligne de neuf'),

  // ── Parcours ──────────────────────────────────────────────────────────────
  T('P1', 'parcours', 'blocking', 'Vente comptoir simple', 'Stock décrémenté sur SA boutique, staff_id et store_id renseignés, facture, Mes ventes, objectif'),
  T('P2', 'parcours', 'blocking', 'Commande web jusqu’à l’encaissement', 'Réservé puis consommé au paiement ; Terminer débloqué ; invitation avis'),
  T('P3', 'parcours', 'blocking', 'Refus à la porte puis retour', 'Reste réservé en refused, libéré seulement en returned'),
  T('P4', 'parcours', 'blocking', 'Smart Troc complet', 'Bon avec échéance et clause dédouanement, rachat, dossier completed, bon inutilisable deux fois'),
  T('P5', 'parcours', 'important', 'Transfert inter-boutiques', 'products.stock diminue pendant le transit, revient à la réception'),
  T('P6', 'parcours', 'important', 'Inventaire physique', 'Écart consigné avec motif, mouvement inventory_adjust'),
  T('P7', 'parcours', 'important', 'Retour SAV', 'Revendable ré-incrémente, remboursement sort la commande du CA'),
  T('P8', 'parcours', 'blocking', 'Mode hors connexion', 'File survit à la fermeture du navigateur ; coupure PENDANT la synchro ne crée pas de doublon ; conflit stock signalé'),
  T('P9', 'parcours', 'important', 'Avis client', 'Un seul avis possible, produit bloqué avant J+7'),
  T('P10', 'parcours', 'important', 'Objectif et prime', 'Barre monte, bannière à l’atteinte, vente en mode test ne compte pas'),
  T('P11', 'parcours', 'blocking', 'Cycle mot de passe complet', 'Direction crée le compte → mot de passe unique affiché → employé se connecte → le change → direction notifiée'),

  // ── Transverse ────────────────────────────────────────────────────────────
  T('T-X01', 'transverse', 'blocking', 'Vendeur tente /admin/stores par URL', 'Redirigé'),
  T('T-X02', 'transverse', 'blocking', 'Responsable tente de créer une prime', 'Refusé côté serveur'),
  T('T-X03', 'transverse', 'blocking', 'npm run db:inventory', '0 RPC exposée à anon sans garde, 0 table sans RLS'),
  T('T-X04', 'transverse', 'important', 'npm run db:status', '0 migration en attente, 0 fichier modifié après application'),
  T('T-X05', 'transverse', 'important', 'npm run db:verify', 'Aucun écart fichiers / base'),
  T('T-X06', 'transverse', 'blocking', 'npx vite build', 'Build vert'),
  T('T-X07', 'transverse', 'blocking', 'Somme des stocks boutique = products.stock', '0 désynchronisation'),
  T('T-X08', 'transverse', 'blocking', 'Site public en navigation privée', 'Aucune donnée staff accessible'),
  T('T-X09', 'transverse', 'important', 'Déconnexion staff', 'Session effacée, retour au login'),
  T('T-X10', 'transverse', 'blocking', 'Chercher les clés VITE_ dans dist/assets après build', 'Aucune clé facturable en clair (Gemini, OpenRouter, DeepSeek)'),
  T('T-X11', 'transverse', 'blocking', 'Deux membres du staff se connectent', 'Mots de passe différents ; celui de l’un ne marche pas pour l’autre'),
  T('T-X12', 'transverse', 'blocking', 'Un employé sans adresse email change son mot de passe', 'Possible depuis la carte utilisateur, sans lien reçu par mail'),
  T('T-X13', 'transverse', 'important', 'Un responsable ouvre le journal de sécurité', 'Ne voit rien : lecture réservée à la direction'),
  T('T-X14', 'transverse', 'important', 'Estimer un iPhone 13 et un Galaxy A15', 'Prix cohérents avec le marché, aucune valeur à 0'),
  T('T-X15', 'transverse', 'important', 'Vérifier la source du prix marché', 'strategy = shopify_api, titres exacts appariés aux prix'),
  T('T-X16', 'transverse', 'blocking', 'Chercher la clé Gemini dans le bundle après le lot 2', 'Le chat ne l’utilise plus, mais elle est encore livrée par le canal vision'),
  T('T-X17', 'transverse', 'blocking', 'Appeler /auth/v1/signup sans captcha', 'Doit ÉCHOUER. S’il renvoie un token, Bot Protection est désactivé et le captcha du chat est inerte'),
  T('T-X18', 'transverse', 'important', 'Vérifier ai_usage_quota après quelques appels IA', 'Les compteurs montent ; la limitation est la protection réelle'),
  T('T-X19', 'transverse', 'blocking', 'Appeler ai-product-details sans être connecté', '401. Idem avec la clé anon en Bearer : une session anonyme n’a pas d’email, donc ne passe pas'),
  T('T-X20', 'transverse', 'important', 'Appeler ai-product-details avec un compte hors table staff', 'Refusé, même si le JWT est valide'),
];

export const QA_TOTAL = QA_TESTS.length;
export const QA_BLOCKING_TOTAL = QA_TESTS.filter((t) => t.priority === 'blocking').length;
