import React from 'react';
import { useNavigate } from 'react-router-dom';

export interface CategoryPillItem {
  id: string;
  label: string;
  route: string;
  isSpecial?: boolean;
}

export interface MobileCategoryPillsProps {
  activePill?: string;
  className?: string;
  onPillClick?: (pill: CategoryPillItem) => void;
}

const DEFAULT_PILLS: CategoryPillItem[] = [
  { id: 'troc', label: 'TROC', route: '/troc', isSpecial: true },
  { id: 'phones', label: 'SMARTPHONES', route: '/shop?cat=phones' },
  { id: 'computer', label: 'PC', route: '/shop?cat=computer' },
  { id: 'tablettes', label: 'TABLETTES', route: '/shop?cat=tablettes' },
  { id: 'accessories', label: 'ACCESSOIRES', route: '/shop?cat=accessories' },
];

export const MobileCategoryPills: React.FC<MobileCategoryPillsProps> = ({
  activePill,
  className = '',
  onPillClick,
}) => {
  const navigate = useNavigate();

  const handlePillClick = (pill: CategoryPillItem) => {
    if (onPillClick) {
      onPillClick(pill);
    } else {
      navigate(pill.route);
    }
  };

  return (
    <div
      className={`w-full overflow-x-auto py-2.5 px-4 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      <div className="flex items-center space-x-2.5 w-max">
        {DEFAULT_PILLS.map((pill) => {
          const isActive = activePill === pill.id;

          if (pill.isSpecial) {
            // Pilule TROC dorée et lumineuse (conforme à la maquette)
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => handlePillClick(pill)}
                className="shrink-0 px-4 py-2 rounded-full border border-amber-400/80 bg-black/50 text-amber-400 font-tech text-xs font-black uppercase tracking-wider shadow-[0_0_12px_rgba(251,191,36,0.35)] active:scale-95 transition-all hover:bg-amber-400/10 hover:shadow-[0_0_16px_rgba(251,191,36,0.5)]"
              >
                {pill.label}
              </button>
            );
          }

          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => handlePillClick(pill)}
              className={`shrink-0 px-4 py-2 rounded-full border text-xs font-tech font-bold uppercase tracking-wider transition-all active:scale-95 ${
                isActive
                  ? 'border-white bg-white text-black font-black'
                  : 'border-zinc-800/90 bg-zinc-900/90 text-zinc-200 hover:border-zinc-700 hover:text-white'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileCategoryPills;
