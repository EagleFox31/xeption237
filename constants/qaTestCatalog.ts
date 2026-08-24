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

  // ── Super admin ───────────────────────────────────────────────────────────
  T('T-S01', 'superadmin', 'nice', 'Accès au Studio', 'Ouvert'),
  T('T-S02', 'superadmin', 'nice', 'Funnel d’import produits', 'Import de bout en bout'),
  T('T-S03', 'superadmin', 'nice', 'Traitement d’images en masse', 'Images optimisées et rattachées'),
  T('T-S04', 'superadmin', 'important', 'Accès à tous les onglets', 'Aucun refus'),
  T('T-S05', 'superadmin', 'important', 'Page de recette', 'Verdicts enregistrés et partagés'),

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
];

export const QA_TOTAL = QA_TESTS.length;
export const QA_BLOCKING_TOTAL = QA_TESTS.filter((t) => t.priority === 'blocking').length;
