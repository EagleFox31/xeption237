/** Rôles staff Xeption — libellés boutique, pas jargon technique. */

export const STAFF_ROLE_IDS = [
  'vendeur',
  'responsable',
  'direction',
  'super_admin',
] as const;

export type StaffRoleId = (typeof STAFF_ROLE_IDS)[number];

/** Anciens slugs encore possibles en base avant migration. */
export type LegacyStaffRoleId = 'editor' | 'manager' | 'admin';

export type StaffRoleValue = StaffRoleId | LegacyStaffRoleId;

export type StaffRoleDefinition = {
  id: StaffRoleId;
  label: string;
  shortLabel: string;
  description: string;
  /** Ce que la personne peut faire — affiché en chips dans le modal. */
  highlights: string[];
  /** Phrase d’aide pour choisir le bon profil. */
  idealFor: string;
};

export const STAFF_ROLES: StaffRoleDefinition[] = [
  {
    id: 'vendeur',
    label: 'Vendeur & catalogue',
    shortLabel: 'Vendeur',
    description: 'Boutique, commandes, clients, et mise à jour des produits.',
    highlights: ['Vente en boutique', 'Commandes', 'Inventaire & photos', 'Clients'],
    idealFor: 'Quelqu’un en caisse qui ajoute aussi des produits au catalogue.',
  },
  {
    id: 'responsable',
    label: 'Responsable boutique',
    shortLabel: 'Responsable',
    description: 'Vente, stock, troc, livraison et SAV — sans gestion de l’équipe.',
    highlights: ['Tout le vendeur', 'Troc & reprises', 'Livraison', 'Atelier SAV', 'Packs promo'],
    idealFor: 'Adjoint ou chef de boutique qui pilote les opérations du jour.',
  },
  {
    id: 'direction',
    label: 'Direction',
    shortLabel: 'Direction',
    description: 'Accès complet à l’ERP, y compris l’équipe staff.',
    highlights: ['Tout l’ERP', 'Gestion équipe', 'Structure catalogue', 'Tous les dossiers'],
    idealFor: 'Gérant ou associé qui supervise toute la boutique.',
  },
  {
    id: 'super_admin',
    label: 'Super admin (Studio)',
    shortLabel: 'Studio',
    description: 'Paramètres avancés et espace Studio — réservé à l’équipe technique (dev).',
    highlights: ['Espace Studio', 'Ingestion catalogue', 'Réglages avancés'],
    idealFor: 'Développeuse ou profil technique — pas pour le CEO au quotidien.',
  },
];

const LEGACY_ROLE_MAP: Record<LegacyStaffRoleId, StaffRoleId> = {
  editor: 'vendeur',
  manager: 'responsable',
  admin: 'direction',
};

const ROLE_BY_ID = Object.fromEntries(STAFF_ROLES.map((r) => [r.id, r])) as Record<
  StaffRoleId,
  StaffRoleDefinition
>;

export const DEFAULT_STAFF_ROLE: StaffRoleId = 'vendeur';

export const normalizeStaffRole = (role: string | undefined | null): StaffRoleId => {
  const raw = (role || '').trim().toLowerCase();
  if (!raw) return DEFAULT_STAFF_ROLE;
  if (raw === 'manager_vente' || raw === 'manager vente' || raw === 'directeur_commercial') {
    return 'responsable';
  }
  if (raw in LEGACY_ROLE_MAP) return LEGACY_ROLE_MAP[raw as LegacyStaffRoleId];
  if (STAFF_ROLE_IDS.includes(raw as StaffRoleId)) return raw as StaffRoleId;
  return DEFAULT_STAFF_ROLE;
};

export const getStaffRoleLabel = (role: string | undefined | null): string =>
  ROLE_BY_ID[normalizeStaffRole(role)]?.label ?? 'Vendeur & catalogue';

export const getStaffRoleShortLabel = (role: string | undefined | null): string =>
  ROLE_BY_ID[normalizeStaffRole(role)]?.shortLabel ?? 'Vendeur';

export const isSuperAdminStaffRole = (role: string | undefined | null): boolean =>
  normalizeStaffRole(role) === 'super_admin';

/** Peut créer / activer les comptes de connexion staff. */
export const canProvisionStaffAuth = (role: string | undefined | null): boolean => {
  const normalized = normalizeStaffRole(role);
  return normalized === 'direction' || normalized === 'super_admin' || normalized === 'responsable';
};
