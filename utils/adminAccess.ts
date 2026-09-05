import {
  ADMIN_MENU_GROUPS,
  MOBILE_QUICK_TABS,
  type AdminMenuGroup,
  type AdminTabId,
} from '../components/admin/layout/adminMenuConfig';
import { normalizeStaffRole, type StaffRoleId } from '../constants/staffRoles';

const ROLE_LEVEL: Record<StaffRoleId, number> = {
  vendeur: 1,
  responsable: 2,
  direction: 3,
  super_admin: 4,
};

const TAB_MIN_ROLE: Record<AdminTabId, StaffRoleId> = {
  dashboard: 'vendeur',
  pos: 'vendeur',
  orders: 'vendeur',
  inventory: 'vendeur',
  productImages: 'vendeur',
  clients: 'vendeur',
  packs: 'responsable',
  delivery: 'responsable',
  troc: 'responsable',
  sav: 'responsable',
  catalogStructure: 'direction',
  staff: 'direction',
  qaRecette: 'direction',
};

export function canAccessAdminTab(role: string | null | undefined, tab: AdminTabId): boolean {
  const normalized = normalizeStaffRole(role);
  const minRole = TAB_MIN_ROLE[tab];
  return ROLE_LEVEL[normalized] >= ROLE_LEVEL[minRole];
}

export function filterAdminMenuGroups(role: string | null | undefined): AdminMenuGroup[] {
  return ADMIN_MENU_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessAdminTab(role, item.id)),
  })).filter((group) => group.items.length > 0);
}

export function getMobileQuickTabsForRole(role: string | null | undefined): AdminTabId[] {
  const allowed = MOBILE_QUICK_TABS.filter((tab) => canAccessAdminTab(role, tab));
  if (allowed.length > 0) return allowed;

  const first = filterAdminMenuGroups(role)[0]?.items[0]?.id;
  return first ? [first] : ['dashboard'];
}

export function resolveAdminLandingTabForRole(
  role: string | null | undefined,
  pendingOrderCount: number,
): AdminTabId {
  const normalized = normalizeStaffRole(role);

  if (normalized === 'vendeur') return 'pos';
  if (normalized === 'responsable' && pendingOrderCount > 0) return 'orders';
  if (pendingOrderCount > 0) return 'orders';
  return 'dashboard';
}

export function getFirstAccessibleAdminTab(
  role: string | null | undefined,
  pendingOrderCount: number,
): AdminTabId {
  const landing = resolveAdminLandingTabForRole(role, pendingOrderCount);
  if (canAccessAdminTab(role, landing)) return landing;

  for (const group of filterAdminMenuGroups(role)) {
    for (const item of group.items) return item.id;
  }

  return 'dashboard';
}
