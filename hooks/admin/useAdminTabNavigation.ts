import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { AdminTabId } from '../../components/admin/layout/adminMenuConfig';
import type { Order } from '../../types';
import {
  adminTabPath,
  getAdminPathSegment,
  isAdminTabId,
  parseAdminTabFromPath,
  resolveAdminLandingTab,
} from '../../utils/adminRoutes';

interface UseAdminTabNavigationOptions {
  orders: Order[];
  isDataReady: boolean;
  staffRole?: string | null;
}

export const useAdminTabNavigation = ({
  orders,
  isDataReady,
  staffRole,
}: UseAdminTabNavigationOptions) => {
  const navigate = useNavigate();
  const location = useLocation();
  const landingApplied = useRef(false);

  const activeTab = useMemo((): AdminTabId => {
    const parsed = parseAdminTabFromPath(location.pathname);
    return parsed ?? 'dashboard';
  }, [location.pathname]);

  useEffect(() => {
    if (!isDataReady) return;

    const segment = getAdminPathSegment(location.pathname);

    if (segment && !isAdminTabId(segment)) {
      navigate(adminTabPath('dashboard'), { replace: true });
      return;
    }

    if (segment) return;

    if (landingApplied.current) return;
    landingApplied.current = true;

    const pending = orders.filter((o) => o.status === 'pending').length;
    navigate(adminTabPath(resolveAdminLandingTab(pending, staffRole)), { replace: true });
  }, [isDataReady, location.pathname, navigate, orders, staffRole]);

  const navigateToTab = useCallback(
    (tab: AdminTabId) => {
      navigate(adminTabPath(tab));
    },
    [navigate],
  );

  return { activeTab, navigateToTab };
};
