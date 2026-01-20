
import React from 'react';
import Logo from '../../Logo'; 
import { LayoutDashboard, CreditCard, ShoppingBag, Package, Layers, Wrench, Users, Key, Clapperboard, BookOpen, FileText, Bell, RefreshCw, LogOut, Tag, Gift } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  unreadCount: number;
  onToggleNotifications: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, unreadCount, onToggleNotifications, onLogout }) => {
  const MENU_ITEMS = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'pos', label: 'Caisse (POS)', icon: CreditCard },
      { id: 'orders', label: 'Commandes', icon: ShoppingBag },
      { id: 'invoices', label: 'Factures', icon: FileText },
      { id: 'inventory', label: 'Inventaire', icon: Package },
      { id: 'packs', label: 'Packs Promo', icon: Gift },
      { id: 'categories', label: 'Types', icon: Layers },
      { id: 'brands', label: 'Marques & Gammes', icon: Tag },
      { id: 'argus', label: 'Argus Troc', icon: RefreshCw },
      { id: 'sav', label: 'Atelier SAV', icon: Wrench },
      { id: 'clients', label: 'Clients CRM', icon: Users },
      { id: 'staff', label: 'Équipe', icon: Key },
      { id: 'marketing', label: 'Studio Vidéo', icon: Clapperboard },
      { id: 'guide', label: 'Guide Staff', icon: BookOpen }
  ];

  return (
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-black/40 backdrop-blur-xl border-r border-white/10 z-50">
          <div className="p-6 border-b border-white/10 flex justify-center relative">
             <div className="scale-75 origin-center"><Logo /></div>
          </div>
          
          {/* Notification Button embedded near top */}
          <div className="px-4 py-2">
            <button 
                onClick={onToggleNotifications}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-md p-3 flex items-center justify-between group transition-all"
            >
                <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-gray-400 group-hover:text-xeption-gold transition-colors" />
                    <span className="text-xs font-bold uppercase text-gray-400 group-hover:text-white">Notifications</span>
                </div>
                {unreadCount > 0 && (
                    <span className="bg-xeption-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_#ff0033] animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1 custom-scrollbar">
              {MENU_ITEMS.map(item => (
                  <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-bold uppercase tracking-wider transition-all ${
                          activeTab === item.id 
                          ? 'bg-xeption-gold text-black shadow-[0_0_15px_rgba(255,215,0,0.3)]' 
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                  </button>
              ))}
          </div>

          <div className="p-4 border-t border-white/10 space-y-3">
              <div className="bg-white/5 rounded p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-xeption-gold/20 flex items-center justify-center text-xeption-gold font-bold">A</div>
                  <div>
                      <p className="text-white text-xs font-bold uppercase">Admin</p>
                      <p className="text-gray-500 text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> En ligne</p>
                  </div>
              </div>
              
              <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 text-red-500 hover:text-white hover:bg-red-500/10 border border-transparent hover:border-red-500/20 py-2 rounded transition-all text-xs font-bold uppercase tracking-wider"
              >
                  <LogOut className="w-4 h-4" /> Déconnexion
              </button>
          </div>
      </aside>
  );
};

export default Sidebar;
