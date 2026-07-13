import React from 'react';
import { Award, Globe2, Package, PackageOpen, Sparkles, Smartphone } from 'lucide-react';
import type { Product } from '../types';
import { getProductBadges, type ProductBadgeVariant } from '../../utils/productDisplay';

type Size = 'sm' | 'md';
type Theme = 'light' | 'dark';

const variantStylesLight: Record<ProductBadgeVariant, { wrap: string; icon: React.ReactNode }> = {
  certified: {
    wrap: 'bg-white/60 border-xeption-gold/30 text-xeption-goldDim',
    icon: <Award className="h-3 w-3 text-xeption-gold shrink-0" />,
  },
  sealed: {
    wrap: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700',
    icon: <Sparkles className="h-3 w-3 text-emerald-600 shrink-0" />,
  },
  unsealed: {
    wrap: 'bg-amber-500/10 border-amber-500/40 text-amber-800',
    icon: <PackageOpen className="h-3 w-3 text-amber-700 shrink-0" />,
  },
  origin: {
    wrap: 'bg-slate-500/10 border-slate-400/40 text-slate-700',
    icon: <Globe2 className="h-3 w-3 text-slate-600 shrink-0" />,
  },
  sim: {
    wrap: 'bg-black/5 border-black/15 text-gray-700',
    icon: <Smartphone className="h-3 w-3 text-gray-600 shrink-0" />,
  },
};

const variantStylesDark: Record<ProductBadgeVariant, { wrap: string; icon: React.ReactNode }> = {
  certified: {
    wrap: 'bg-xeption-gold/10 border-xeption-gold/40 text-xeption-gold',
    icon: <Award className="h-3 w-3 text-xeption-gold shrink-0" />,
  },
  sealed: {
    wrap: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300',
    icon: <Sparkles className="h-3 w-3 text-emerald-400 shrink-0" />,
  },
  unsealed: {
    wrap: 'bg-amber-500/15 border-amber-400/40 text-amber-200',
    icon: <PackageOpen className="h-3 w-3 text-amber-300 shrink-0" />,
  },
  origin: {
    wrap: 'bg-white/10 border-white/20 text-gray-200',
    icon: <Globe2 className="h-3 w-3 text-gray-300 shrink-0" />,
  },
  sim: {
    wrap: 'bg-white/5 border-white/15 text-gray-300',
    icon: <Smartphone className="h-3 w-3 text-gray-400 shrink-0" />,
  },
};

const sizeStyles: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-[8px] md:text-[9px] gap-1',
  md: 'px-3 py-1 text-[10px] md:text-xs gap-1.5',
};

interface ProductBadgeChipsProps {
  product: Product;
  size?: Size;
  theme?: Theme;
  className?: string;
}

export const ProductBadgeChips: React.FC<ProductBadgeChipsProps> = ({
  product,
  size = 'md',
  theme = 'light',
  className = '',
}) => {
  const badges = getProductBadges(product);
  if (badges.length === 0) return null;

  const variantStyles = theme === 'dark' ? variantStylesDark : variantStylesLight;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {badges.map((badge) => {
        const style = variantStyles[badge.variant];
        return (
          <div
            key={badge.id}
            className={`inline-flex items-center rounded-full border backdrop-blur-md shadow-sm font-tech font-bold uppercase tracking-[0.15em] ${sizeStyles[size]} ${style.wrap}`}
          >
            {style.icon}
            <span>{badge.label}</span>
          </div>
        );
      })}
    </div>
  );
};

/** Puce compacte « Neuf » pour les cartes catalogue (condition new). */
export const ProductNewChip: React.FC<{ size?: Size }> = ({ size = 'sm' }) => (
  <div
    className={`inline-flex items-center rounded-sm border border-emerald-400 bg-emerald-500 font-tech font-bold uppercase tracking-widest text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] ${sizeStyles[size]}`}
  >
    <Sparkles className="h-2.5 w-2.5 shrink-0" />
    <span>Neuf</span>
  </div>
);

/** Icône scellé pour overlay carte (remplace le gros bandeau si badges détaillés en dessous). */
export const ProductSealedOverlayChip: React.FC = () => (
  <div className="bg-emerald-500 text-white text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 font-tech uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.4)] rounded-sm border border-emerald-400 flex items-center gap-1">
    <Package className="w-2 h-2 md:w-2.5 md:h-2.5" />
    Scellé
  </div>
);
