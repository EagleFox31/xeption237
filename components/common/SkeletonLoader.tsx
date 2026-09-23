import React from 'react';

export type SkeletonVariant =
  | 'product-detail'
  | 'product-card'
  | 'product-grid'
  | 'home'
  | 'shop'
  | 'banner'
  | 'text'
  | 'circle'
  | 'rect';

export interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  count?: number;
  className?: string;
  width?: string | number;
  height?: string | number;
}

/**
 * Bloc atomique avec effet de balayage lumineux (shimmer) haut de gamme.
 */
export const SkeletonShimmer: React.FC<{
  className?: string;
  style?: React.CSSProperties;
}> = ({ className = '', style }) => {
  return (
    <div
      className={`relative overflow-hidden bg-zinc-900/80 border border-white/5 rounded-2xl ${className}`}
      style={style}
    >
      {/* Balayage lumineux animé (shimmer) */}
      <div
        className="absolute inset-0 -translate-x-full pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.06) 50%, transparent 100%)',
          animation: 'xeption-shimmer 1.8s infinite linear',
        }}
      />
      <style>{`
        @keyframes xeption-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

/**
 * Squelette d'une carte produit (grille boutique / accueil)
 */
export const ProductCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`p-3 rounded-2xl bg-[#121216] border border-white/10 flex flex-col space-y-3 ${className}`}
    >
      {/* Image produit */}
      <SkeletonShimmer className="w-full aspect-square rounded-xl bg-zinc-900" />

      {/* Titre produit (2 lignes) */}
      <div className="space-y-1.5 pt-1">
        <SkeletonShimmer className="w-4/5 h-3.5 rounded-md" />
        <SkeletonShimmer className="w-1/2 h-3 rounded-md" />
      </div>

      {/* Prix + bouton */}
      <div className="pt-2 flex items-center justify-between">
        <SkeletonShimmer className="w-24 h-5 rounded-md" />
        <SkeletonShimmer className="w-8 h-8 rounded-xl shrink-0" />
      </div>
    </div>
  );
};

/**
 * Squelette pour la page de détail produit (Mobile & Desktop)
 */
export const ProductDetailSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`w-full min-h-screen bg-[#0a0a0c] text-white p-4 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-300 ${className}`}>
      {/* Bouton retour + partage */}
      <div className="flex items-center justify-between pt-2">
        <SkeletonShimmer className="w-24 h-9 rounded-xl" />
        <div className="flex gap-2">
          <SkeletonShimmer className="w-9 h-9 rounded-xl" />
          <SkeletonShimmer className="w-10 h-10 rounded-xl" />
        </div>
      </div>

      {/* Fil d'ariane */}
      <div className="flex items-center gap-2">
        <SkeletonShimmer className="w-16 h-3 rounded-md" />
        <SkeletonShimmer className="w-4 h-3 rounded-md" />
        <SkeletonShimmer className="w-20 h-3 rounded-md" />
        <SkeletonShimmer className="w-4 h-3 rounded-md" />
        <SkeletonShimmer className="w-28 h-3 rounded-md" />
      </div>

      {/* Zone Hero : Carrousel image + infos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Colonne Image principale */}
        <div className="space-y-3">
          <SkeletonShimmer className="w-full aspect-[4/3] md:aspect-square max-h-[380px] md:max-h-[440px] rounded-3xl" />
          <div className="flex justify-center gap-2 pt-1">
            <SkeletonShimmer className="w-14 h-14 rounded-xl" />
            <SkeletonShimmer className="w-14 h-14 rounded-xl" />
            <SkeletonShimmer className="w-14 h-14 rounded-xl" />
          </div>
        </div>

        {/* Colonne Détails */}
        <div className="space-y-4">
          <SkeletonShimmer className="w-36 h-6 rounded-lg" />
          <SkeletonShimmer className="w-4/5 h-8 rounded-xl" />
          <SkeletonShimmer className="w-32 h-9 rounded-xl" />
          <SkeletonShimmer className="w-44 h-7 rounded-lg" />

          {/* Description */}
          <div className="space-y-2 pt-2">
            <SkeletonShimmer className="w-full h-3 rounded-md" />
            <SkeletonShimmer className="w-5/6 h-3 rounded-md" />
            <SkeletonShimmer className="w-2/3 h-3 rounded-md" />
          </div>

          {/* Bloc d'action / rassurance */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-3 mt-4">
            <SkeletonShimmer className="w-48 h-4 rounded-md" />
            <SkeletonShimmer className="w-full h-11 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Bloc Caractéristiques */}
      <div className="pt-6 space-y-3">
        <SkeletonShimmer className="w-48 h-5 rounded-md" />
        <div className="rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-3.5 flex justify-between">
              <SkeletonShimmer className="w-28 h-3 rounded-md" />
              <SkeletonShimmer className="w-36 h-3 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Squelette pour la page d'accueil (Hero + Grille)
 */
export const HomeSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`w-full min-h-screen bg-[#0a0a0c] p-4 space-y-6 max-w-7xl mx-auto ${className}`}>
      {/* Hero Banner Skeleton */}
      <SkeletonShimmer className="w-full aspect-[16/9] md:aspect-[21/9] max-h-[380px] rounded-3xl" />

      {/* Catégories chips */}
      <div className="flex gap-2 overflow-x-hidden py-2">
        {[...Array(5)].map((_, i) => (
          <SkeletonShimmer key={i} className="w-24 h-9 rounded-xl shrink-0" />
        ))}
      </div>

      {/* Section Produits */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SkeletonShimmer className="w-40 h-6 rounded-lg" />
          <SkeletonShimmer className="w-20 h-4 rounded-md" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Squelette pour la page Shop / Catalogue
 */
export const ShopSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 6,
  className = '',
}) => {
  return (
    <div className={`w-full p-4 space-y-5 max-w-7xl mx-auto ${className}`}>
      {/* Filtres & Recherche */}
      <div className="flex gap-3 items-center">
        <SkeletonShimmer className="flex-1 h-11 rounded-2xl" />
        <SkeletonShimmer className="w-11 h-11 rounded-2xl shrink-0" />
      </div>

      {/* Grille de cartes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
        {[...Array(count)].map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

/**
 * Composant universel SkeletonLoader réutilisable partout dans le projet.
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'product-card',
  count = 4,
  className = '',
  width,
  height,
}) => {
  switch (variant) {
    case 'product-detail':
      return <ProductDetailSkeleton className={className} />;

    case 'home':
      return <HomeSkeleton className={className} />;

    case 'shop':
      return <ShopSkeleton count={count} className={className} />;

    case 'product-grid':
      return (
        <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ${className}`}>
          {[...Array(count)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      );

    case 'banner':
      return (
        <SkeletonShimmer
          className={`w-full aspect-[16/9] max-h-[300px] rounded-3xl ${className}`}
          style={{ width, height }}
        />
      );

    case 'text':
      return (
        <SkeletonShimmer
          className={`h-4 w-full rounded-md ${className}`}
          style={{ width, height }}
        />
      );

    case 'circle':
      return (
        <SkeletonShimmer
          className={`rounded-full aspect-square ${className}`}
          style={{ width, height }}
        />
      );

    case 'rect':
      return (
        <SkeletonShimmer
          className={`rounded-2xl ${className}`}
          style={{ width, height }}
        />
      );

    case 'product-card':
    default:
      return <ProductCardSkeleton className={className} />;
  }
};

export default SkeletonLoader;
