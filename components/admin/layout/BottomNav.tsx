
import React from 'react';
import { LayoutDashboard, CreditCard, ShoppingBag, Package, Layers, Wrench, Users, Key, Clapperboard, BookOpen, FileText, Bell, RefreshCw, Tag, Gift } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  unreadCount: number;
  onToggleNotifications: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, unreadCount, onToggleNotifications }) => {
  const MENU_ITEMS = [
      { id: 'dashboard', label: 'Dash', icon: LayoutDashboard },
      { id: 'pos', label: 'Caisse', icon: CreditCard },
      { id: 'orders', label: 'Cmds', icon: ShoppingBag },
      { id: 'invoices', label: 'Factures', icon: FileText },
      { id: 'inventory', label: 'Stock', icon: Package },
      { id: 'packs', label: 'Packs', icon: Gift },
      { id: 'categories', label: 'Types', icon: Layers },
      { id: 'brands', label: 'Marques', icon: Tag },
      { id: 'argus', label: 'Argus', icon: RefreshCw },
      { id: 'sav', label: 'SAV', icon: Wrench },
      { id: 'clients', label: 'Clients', icon: Users },
      { id: 'staff', label: 'Staff', icon: Key },
      { id: 'marketing', label: 'Studio', icon: Clapperboard },
      { id: 'guide', label: 'Guide', icon: BookOpen }
  ];

  return (
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-xl border-t border-white/10 z-50 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
          <div className="flex overflow-x-auto no-scrollbar py-2 px-2 gap-1 items-center">
              
              {/* Notification Trigger (Fixed left or start) */}
              <button
                  onClick={onToggleNotifications}
                  className="flex flex-col items-center justify-center min-w-[60px] p-2 rounded-lg text-gray-500 relative border-r border-white/10 mr-1"
              >
                  <Bell className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-bold uppercase tracking-tight">Alertes</span>
                  {unreadCount > 0 && (
                      <span className="absolute top-2 right-4 w-2 h-2 bg-xeption-red rounded-full animate-pulse shadow-[0_0_5px_#ff0033]"></span>
                  )}
              </button>

              {MENU_ITEMS.map(item => (
                  <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`flex flex-col items-center justify-center min-w-[60px] p-2 rounded-lg transition-all active:scale-95 ${
                          activeTab === item.id 
                          ? 'text-black bg-xeption-gold shadow-[0_0_10px_rgba(255,215,0,0.4)]' 
                          : 'text-gray-500 hover:text-white'
                      }`}
                  >
                      <item.icon className={`w-5 h-5 mb-1 ${activeTab === item.id ? 'fill-black/20' : ''}`} />
                      <span className="text-[9px] font-bold uppercase tracking-tight whitespace-nowrap">{item.label}</span>
                  </button>
              ))}
          </div>
      </nav>
  );
};

export default BottomNav;
