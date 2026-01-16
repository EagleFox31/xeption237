
import React from 'react';
import { LayoutDashboard, CreditCard, ShoppingBag, Package, Layers, Wrench, Users, Key, Clapperboard, BookOpen, FileText, Bell } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  unreadCount: number;
  onToggleNotifications: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, unreadCount, onToggleNotifications }) => {
  const MENU_ITEMS = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'pos', label: 'Caisse', icon: CreditCard },
      { id: 'orders', label: 'Commandes', icon: ShoppingBag },
      { id: 'sav', label: 'SAV', icon: Wrench },
  ];

  return (
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/10 z-50 pb-safe">
          <div className="flex overflow-x-auto no-scrollbar py-2 px-2 gap-2 justify-between">
              {MENU_ITEMS.map(item => (
                  <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`flex flex-col items-center justify-center min-w-[70px] p-2 rounded-lg transition-all ${
                          activeTab === item.id ? 'text-xeption-gold' : 'text-gray-500'
                      }`}
                  >
                      <item.icon className={`w-5 h-5 mb-1 ${activeTab === item.id ? 'fill-current' : ''}`} />
                      <span className="text-[9px] font-bold uppercase tracking-tight">{item.label}</span>
                  </button>
              ))}
              
              {/* Mobile Notification Trigger */}
              <button
                  onClick={onToggleNotifications}
                  className="flex flex-col items-center justify-center min-w-[70px] p-2 rounded-lg text-gray-500 relative"
              >
                  <Bell className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-bold uppercase tracking-tight">Alertes</span>
                  {unreadCount > 0 && (
                      <span className="absolute top-2 right-4 w-2 h-2 bg-xeption-red rounded-full animate-pulse"></span>
                  )}
              </button>
          </div>
      </nav>
  );
};

export default BottomNav;
