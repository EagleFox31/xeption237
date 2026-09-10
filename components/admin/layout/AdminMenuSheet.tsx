
import React from 'react';
import { X, Bell } from 'lucide-react';
import { ADMIN_MENU_GROUPS, type AdminMenuGroup } from './adminMenuConfig';
import type { AdminTabId } from './adminMenuConfig';
import { adminUi } from '../shared/adminUi';
import BackToShopLink from './BackToShopLink';
import MenuBadge from '../shared/MenuBadge';
import type { AdminMenuBadges } from '../../../utils/adminRoutes';

interface AdminMenuSheetProps {
  isOpen: boolean;
  activeTab: string;
  unreadCount: number;
  menuBadges?: AdminMenuBadges;
  onClose: () => void;
  onTabChange: (tab: AdminTabId) => void;
  onToggleNotifications: () => void;
  menuGroups?: AdminMenuGroup[];
}

const AdminMenuSheet: React.FC<AdminMenuSheetProps> = ({
  isOpen,
  activeTab,
  unreadCount,
  menuBadges = {},
  onClose,
  onTabChange,
  onToggleNotifications,
  menuGroups = ADMIN_MENU_GROUPS,
}) => {
  if (!isOpen) return null;

  const handleSelect = (tabId: AdminTabId) => {
    onTabChange(tabId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fermer le menu"
      />
      <div
        className={`absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl border border-white/10 bg-[#080809]/90 backdrop-blur-xl shadow-[0_-20px_60px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-300 flex flex-col`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div>
            <p className={`${adminUi.label} text-xeption-gold`}>Navigation</p>
            <h2 className="text-sm font-bold uppercase text-white">Menu admin</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 text-white/70 hover:text-white rounded-md hover:bg-white/10 ${adminUi.focusRing}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar px-3 py-3 space-y-4">
          <button
            type="button"
            onClick={() => {
              onToggleNotifications();
              onClose();
            }}
            className={`w-full flex items-center justify-between ${adminUi.surface} rounded-lg px-4 py-3 ${adminUi.surfaceHover}`}
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-white/70" />
              <span className="text-xs font-bold uppercase text-white">Notifications</span>
            </div>
            {unreadCount > 0 && (
              <span className="bg-xeption-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {menuGroups.map((group) => (
            <div key={group.id}>
              <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all duration-200 cursor-pointer ${adminUi.focusRing} ${
                      activeTab === item.id
                        ? adminUi.navActive
                        : `${adminUi.surface} text-white hover:border-white/20`
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="text-[10px] font-bold uppercase leading-tight flex-1 text-left">
                      {item.shortLabel}
                    </span>
                    <MenuBadge count={menuBadges[item.id] ?? 0} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 px-3 py-3 border-t border-white/10">
          <BackToShopLink variant="sheet" onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
};

export default AdminMenuSheet;
