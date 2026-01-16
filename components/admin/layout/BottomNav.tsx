
import React from 'react';
import { LayoutDashboard, CreditCard, ShoppingBag, Package, Layers, Wrench, Users, Key, Clapperboard, BookOpen } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const MENU_ITEMS = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'pos', label: 'Caisse (POS)', icon: CreditCard },
      { id: 'orders', label: 'Commandes', icon: ShoppingBag },
      { id: 'inventory', label: 'Inventaire', icon: Package },
      { id: 'categories', label: 'Types (Dynamic)', icon: Layers },
      { id: 'sav', label: 'Atelier SAV', icon: Wrench },
      { id: 'clients', label: 'Clients CRM', icon: Users },
      { id: 'staff', label: 'Équipe', icon: Key },
      { id: 'marketing', label: 'Studio Vidéo', icon: Clapperboard },
      { id: 'guide', label: 'Guide Staff', icon: BookOpen }
  ];

  return (
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/10 z-50 pb-safe">
          <div className="flex overflow-x-auto no-scrollbar py-2 px-2 gap-2">
              {MENU_ITEMS.map(item => (
                  <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`flex flex-col items-center justify-center min-w-[70px] p-2 rounded-lg transition-all ${
                          activeTab === item.id ? 'text-xeption-gold' : 'text-gray-500'
                      }`}
                  >
                      <item.icon className={`w-5 h-5 mb-1 ${activeTab === item.id ? 'fill-current' : ''}`} />
                      <span className="text-[9px] font-bold uppercase tracking-tight">{item.label.split(' ')[0]}</span>
                  </button>
              ))}
          </div>
      </nav>
  );
};

export default BottomNav;
