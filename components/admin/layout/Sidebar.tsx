
import React from 'react';
import Logo from '../../Logo';
import { LayoutDashboard, CreditCard, ShoppingBag, Package, Layers, Wrench, Users, Key, Clapperboard, BookOpen, FileText } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const MENU_ITEMS = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'pos', label: 'Caisse (POS)', icon: CreditCard },
      { id: 'orders', label: 'Commandes', icon: ShoppingBag },
      { id: 'invoices', label: 'Factures', icon: FileText }, // Ajout ici
      { id: 'inventory', label: 'Inventaire', icon: Package },
      { id: 'categories', label: 'Types (Dynamic)', icon: Layers },
      { id: 'sav', label: 'Atelier SAV', icon: Wrench },
      { id: 'clients', label: 'Clients CRM', icon: Users },
      { id: 'staff', label: 'Équipe', icon: Key },
      { id: 'marketing', label: 'Studio Vidéo', icon: Clapperboard },
      { id: 'guide', label: 'Guide Staff', icon: BookOpen }
  ];

  return (
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-black/40 backdrop-blur-xl border-r border-white/10 z-50">
          <div className="p-6 border-b border-white/10 flex justify-center">
             <div className="scale-75 origin-center"><Logo /></div>
          </div>
          
          <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
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

          <div className="p-4 border-t border-white/10">
              <div className="bg-white/5 rounded p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-xeption-gold/20 flex items-center justify-center text-xeption-gold font-bold">A</div>
                  <div>
                      <p className="text-white text-xs font-bold uppercase">Admin</p>
                      <p className="text-gray-500 text-[10px] flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> En ligne</p>
                  </div>
              </div>
          </div>
      </aside>
  );
};

export default Sidebar;
