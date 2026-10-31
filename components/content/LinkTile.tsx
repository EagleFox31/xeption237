import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';

export type LinkTileTheme = 'light' | 'dark';

interface LinkTileProps {
  to: string;
  icon: LucideIcon;
  /** Nature de la destination (« Rayon », « Guide », « Aide ») : dit où mène le lien avant le clic. */
  kind: string;
  title: string;
  /** Pastille optionnelle (ex. « Vidéo »). */
  badge?: string;
  theme?: LinkTileTheme;
}

const THEMES: Record<LinkTileTheme, { tile: string; icon: string; kind: string; title: string; arrow: string }> = {
  light: {
    tile: 'border-black/10 bg-white/70 hover:border-amber-500/70 hover:bg-white',
    icon: 'bg-amber-100 text-amber-700',
    kind: 'text-gray-500',
    title: 'text-gray-900',
    arrow: 'text-gray-400 group-hover:text-amber-600',
  },
  dark: {
    tile: 'border-white/10 bg-[#0f0f0f]/80 hover:border-xeption-gold/50',
    icon: 'bg-xeption-gold/10 text-xeption-gold',
    kind: 'text-gray-500',
    title: 'text-gray-100 group-hover:text-xeption-gold',
    arrow: 'text-gray-500 group-hover:text-xeption-gold',
  },
};

/** Tuile de lien compacte : toute la surface est cliquable, icône + type + titre + flèche. */
const LinkTile: React.FC<LinkTileProps> = ({ to, icon: Icon, kind, title, badge, theme = 'light' }) => {
  const t = THEMES[theme];
  return (
    <Link
      to={to}
      className={`group flex items-center gap-3 h-full min-h-[56px] px-3 py-2.5 rounded-xl border transition-colors ${t.tile}`}
    >
      <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${t.icon}`} aria-hidden>
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${t.kind}`}>
          {kind}
          {badge && <span className="rounded-full bg-red-600 px-1.5 py-px text-[9px] text-white tracking-wider">{badge}</span>}
        </span>
        <span className={`block text-sm font-medium leading-snug transition-colors ${t.title}`}>{title}</span>
      </span>
      <ArrowRight className={`shrink-0 w-4 h-4 transition-all group-hover:translate-x-1 ${t.arrow}`} aria-hidden />
    </Link>
  );
};

export default LinkTile;
