
import React, { useEffect, useState } from 'react';
import Logo from '../../Logo';
import { Bell, KeyRound, LogOut } from 'lucide-react';
import { ADMIN_MENU_GROUPS, type AdminMenuGroup } from './adminMenuConfig';
import type { AdminTabId } from './adminMenuConfig';
import { adminUi } from '../shared/adminUi';
import BackToShopLink from './BackToShopLink';
import MenuBadge from '../shared/MenuBadge';
import type { AdminMenuBadges } from '../../../utils/adminRoutes';

export type StaffSessionDisplay = {
  displayName: string;
  roleLabel: string;
  initials: string;
};

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: AdminTabId) => void;
  unreadCount: number;
  menuBadges?: AdminMenuBadges;
  onToggleNotifications: () => void;
  onLogout: () => void;
  currentUser?: StaffSessionDisplay;
  menuGroups?: AdminMenuGroup[];
  /** Ouvre le changement de mot de passe. La carte utilisateur devient cliquable. */
  onChangePassword?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onChangePassword,
  activeTab,
  onTabChange,
  unreadCount,
  menuBadges = {},
  onToggleNotifications,
  onLogout,
  currentUser,
  menuGroups = ADMIN_MENU_GROUPS,
}) => {
  // Date + heure affichées sous le mot « XEPTION ». Précision à la minute :
  // un tic de 30 s garantit un décalage d'au plus une demi-minute sans faire
  // tourner un minuteur à la seconde pour rien.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const stamp = `${now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

  const userName = currentUser?.displayName ?? 'Équipe';
  const userRole = currentUser?.roleLabel ?? 'Staff';
  const userInitials = currentUser?.initials ?? 'X';
  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 z-50 border-r border-white/10 bg-black/45 backdrop-blur-xl">
      <div className="p-5 border-b border-white/10 flex items-center justify-between gap-2">
        <Logo className="scale-[0.85] origin-left" subtitle={stamp} />
        <button
          type="button"
          onClick={onToggleNotifications}
          className={`relative shrink-0 p-2 rounded-md text-white/85 hover:text-xeption-gold hover:bg-white/10 transition-colors duration-200 ${adminUi.focusRing}`}
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : 'Notifications'}
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-xeption-red text-[8px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.id} className="mb-4 last:mb-0">
            <p className={`px-3 pt-1 pb-2 ${adminUi.label}`}>
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${adminUi.focusRing} ${
                      isActive ? adminUi.navActive : adminUi.navIdle
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    <MenuBadge count={menuBadges[item.id] ?? 0} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          type="button"
          onClick={onChangePassword}
          disabled={!onChangePassword}
          title={onChangePassword ? 'Changer mon mot de passe' : undefined}
          className={`${adminUi.surface} p-3 flex items-center gap-3 w-full text-left transition-colors ${
            onChangePassword ? 'hover:border-xeption-gold/40 cursor-pointer' : 'cursor-default'
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-xeption-gold/15 border border-xeption-gold/30 flex items-center justify-center text-xeption-gold font-bold text-sm shrink-0">
            {userInitials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-bold truncate">{userName}</p>
            <p className="text-xeption-gold/90 text-[10px] font-bold uppercase tracking-wide truncate mt-0.5">
              {userRole}
            </p>
          </div>
          {onChangePassword && <KeyRound className="w-3.5 h-3.5 text-white/40 ml-auto shrink-0" />}
        </button>

        <BackToShopLink />

        <button
          type="button"
          onClick={onLogout}
          className={`w-full flex items-center justify-center gap-2 text-red-400 hover:text-white hover:bg-red-500/10 border border-transparent hover:border-red-500/25 py-2.5 rounded-md transition-all duration-200 text-xs font-bold uppercase tracking-wider cursor-pointer ${adminUi.focusRing}`}
        >
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
