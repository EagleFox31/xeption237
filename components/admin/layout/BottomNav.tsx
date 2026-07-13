

import React, { useMemo, useState } from 'react';

import { Bell, Menu } from 'lucide-react';

import AdminMenuSheet from './AdminMenuSheet';

import { findMenuItem, type AdminMenuGroup } from './adminMenuConfig';

import type { AdminTabId } from './adminMenuConfig';

import { adminUi } from '../shared/adminUi';

import MenuBadge from '../shared/MenuBadge';

import type { AdminMenuBadges } from '../../../utils/adminRoutes';

import { getMobileQuickTabsForRole } from '../../../utils/adminAccess';



interface BottomNavProps {

  activeTab: string;

  onTabChange: (tab: AdminTabId) => void;

  unreadCount: number;

  menuBadges?: AdminMenuBadges;

  onToggleNotifications: () => void;

  staffRole?: string | null;

  menuGroups?: AdminMenuGroup[];

}



const BottomNav: React.FC<BottomNavProps> = ({

  activeTab,

  onTabChange,

  unreadCount,

  menuBadges = {},

  onToggleNotifications,

  staffRole,

  menuGroups,

}) => {

  const [menuOpen, setMenuOpen] = useState(false);



  const quickTabIds = useMemo(

    () => getMobileQuickTabsForRole(staffRole),

    [staffRole],

  );



  const quickItems = useMemo(

    () => quickTabIds.map((id) => findMenuItem(id)).filter(Boolean),

    [quickTabIds],

  );



  const isQuickTab = quickTabIds.includes(activeTab as AdminTabId);

  const menuActive = menuOpen || (!isQuickTab && activeTab !== '');



  return (

    <>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#080809]/95 backdrop-blur-xl border-t border-white/10 z-50 pb-safe shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">

        <div className="flex items-center justify-around py-2 px-2 gap-1">

          <button

            type="button"

            onClick={onToggleNotifications}

            className={`flex flex-col items-center justify-center min-w-[52px] p-2 rounded-lg text-white relative ${adminUi.focusRing}`}

          >

            <Bell className="w-5 h-5 mb-1" />

            <span className="text-[9px] font-bold uppercase tracking-tight">Alertes</span>

            {unreadCount > 0 && (

              <span className="absolute top-1.5 right-2 w-2 h-2 bg-xeption-red rounded-full animate-pulse shadow-[0_0_5px_#ff0033]" />

            )}

          </button>



          {quickItems.map((item) => {

            if (!item) return null;

            const isActive = activeTab === item.id;

            return (

              <button

                key={item.id}

                type="button"

                onClick={() => onTabChange(item.id)}

                className={`relative flex flex-col items-center justify-center min-w-[52px] p-2 rounded-lg transition-all duration-200 active:scale-95 cursor-pointer ${adminUi.focusRing} ${

                  isActive

                    ? adminUi.navActive

                    : adminUi.navIdle

                }`}

              >

                <item.icon className={`w-5 h-5 mb-1 ${isActive ? 'fill-black/20' : ''}`} />

                <span className="text-[9px] font-bold uppercase tracking-tight">

                  {item.shortLabel}

                </span>

                {(menuBadges[item.id] ?? 0) > 0 && (

                  <MenuBadge

                    count={menuBadges[item.id] ?? 0}

                    className="absolute top-1 right-1 min-w-[14px] h-[14px] text-[8px]"

                  />

                )}

              </button>

            );

          })}



          <button

            type="button"

            onClick={() => setMenuOpen(true)}

            className={`flex flex-col items-center justify-center min-w-[52px] p-2 rounded-lg transition-all duration-200 active:scale-95 cursor-pointer ${adminUi.focusRing} ${

              menuActive

                ? adminUi.navActive

                : adminUi.navIdle

            }`}

          >

            <Menu className="w-5 h-5 mb-1" />

            <span className="text-[9px] font-bold uppercase tracking-tight">Menu</span>

          </button>

        </div>

      </nav>



      <AdminMenuSheet

        isOpen={menuOpen}

        activeTab={activeTab}

        unreadCount={unreadCount}

        menuBadges={menuBadges}

        menuGroups={menuGroups}

        onClose={() => setMenuOpen(false)}

        onTabChange={onTabChange}

        onToggleNotifications={onToggleNotifications}

      />

    </>

  );

};



export default BottomNav;

