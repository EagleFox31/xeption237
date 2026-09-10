import { ADMIN_TAB_IDS, type AdminTabId } from '../components/admin/layout/adminMenuConfig';
import { resolveAdminLandingTabForRole } from './adminAccess';

export const ADMIN_BASE_PATH = '/admin';

export const isAdminTabId = (value: string): value is AdminTabId =>
  (ADMIN_TAB_IDS as readonly string[]).includes(value);

/** Segment URL après /admin (vide si /admin seul). */
export const getAdminPathSegment = (pathname: string): string =>
  pathname.replace(/^\/admin\/?/, '').split('/')[0] ?? '';

export const adminTabPath = (tab: AdminTabId): string => `${ADMIN_BASE_PATH}/${tab}`;

export const parseAdminTabFromPath = (pathname: string): AdminTabId | null => {
  const segment = getAdminPathSegment(pathname);
  if (!segment) return null;
  return isAdminTabId(segment) ? segment : null;
};

/** Page d’atterrissage après /admin ou connexion staff. */
export const resolveAdminLandingTab = (
  pendingOrderCount: number,
  role?: string | null,
): AdminTabId => resolveAdminLandingTabForRole(role, pendingOrderCount);

export type AdminMenuBadges = Partial<Record<AdminTabId, number>>;

export const buildAdminMenuBadges = (
  orders: { status: string }[],
  trocRequests: { status: string }[],
): AdminMenuBadges => {
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const pendingTroc = trocRequests.filter(
    (r) => r.status === 'pending' || r.status === 'accepted',
  ).length;

  return {
    ...(pendingOrders > 0 ? { orders: pendingOrders } : {}),
    ...(pendingTroc > 0 ? { troc: pendingTroc } : {}),
  };
};
