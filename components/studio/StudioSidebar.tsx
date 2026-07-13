import React from 'react';
import { LogOut, Sparkles, ExternalLink } from 'lucide-react';
import { STUDIO_MENU_GROUPS, STUDIO_EXTERNAL_LINKS } from './studioMenuConfig';
import type { StudioTabId } from './studioMenuConfig';

interface StudioSidebarProps {
  activeTab: StudioTabId;
  onTabChange: (tab: StudioTabId) => void;
  onLogout: () => void;
  userEmail?: string;
}

const StudioSidebar: React.FC<StudioSidebarProps> = ({
  activeTab,
  onTabChange,
  onLogout,
  userEmail,
}) => {
  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-[#0a0a12]/95 backdrop-blur-xl border-r border-violet-500/20 z-50">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <div>
            <p className="text-[10px] font-tech uppercase tracking-[0.25em] text-violet-400/90">
              Xeption
            </p>
            <h1 className="text-lg font-bold font-tech uppercase text-white leading-tight">
              Studio
            </h1>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
          Console créateur — hors ERP opérationnel
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-3 custom-scrollbar">
        {STUDIO_MENU_GROUPS.map((group) => (
          <div key={group.id} className="mb-3 last:mb-0">
            <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === item.id
                      ? 'bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.35)]'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
            Opérations
          </p>
          {STUDIO_EXTERNAL_LINKS.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider text-gray-400 hover:bg-white/5 hover:text-xeption-gold transition-all"
            >
              <link.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{link.label}</span>
              <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
            </a>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="bg-white/5 rounded p-3">
          <p className="text-[10px] uppercase text-gray-500 font-tech tracking-widest">Super admin</p>
          <p className="text-xs text-gray-300 truncate mt-1">{userEmail || '—'}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 text-xs font-bold uppercase text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

export default StudioSidebar;
