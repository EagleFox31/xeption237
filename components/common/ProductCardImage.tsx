import React, { useEffect, useState, useMemo } from 'react';
import { optimizeImagePlaceholder, generateCloudinarySrcSet } from '../../utils/mediaOptimization';

export type ProductCardImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  /** Fond du placeholder (ex. bg-white pour cards dense). */
  placeholderClassName?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  srcSet?: string;
  sizes?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
};

/**
 * Image produit ultra-performante avec :
 * - LQIP (Low-Quality Image Placeholder) flouté Cloudinary (~250 octets)
 * - Shimmer sombre/or pendant le chargement
 * - Négociation responsive via srcSet et sizes
 * - fetchPriority="high" si prioritaires (LCP / hero / fiche produit)
 * - Fondu doux sans saut d'image (zero layout shift)
 */
const ProductCardImage: React.FC<ProductCardImageProps> = ({
  src,
  alt,
  width = 400,
  height = 400,
  className = '',
  placeholderClassName = 'bg-white/[0.06]',
  loading = 'lazy',
  priority = false,
  srcSet,
  sizes,
  onError,
}) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  // Placeholder LQIP flouté Cloudinary (~250 octets)
  const lqipUrl = useMemo(() => {
    if (src && src.includes('cloudinary.com')) {
      return optimizeImagePlaceholder(src, 28);
    }
    return null;
  }, [src]);

  // srcSet automatique si image Cloudinary et non fourni
  const computedSrcSet = useMemo(() => {
    if (srcSet) return srcSet;
    if (src && src.includes('cloudinary.com')) {
      return generateCloudinarySrcSet(src, [180, 320, 540, 720]);
    }
    return undefined;
  }, [src, srcSet]);

  const effectiveLoading = priority ? 'eager' : loading;
  const effectivePriority = priority ? ('high' as const) : ('auto' as const);

  return (
    <>
      {/* 1. Placeholder immédiat (Shimmer + Micro-vignette floutée LQIP) */}
      {!loaded && (
        <div
          className={`absolute inset-0 overflow-hidden pointer-events-none ${placeholderClassName}`}
          aria-hidden
        >
          {/* Micro-image floutée aux couleurs réelles du produit (chargée en ~0.05s) */}
          {lqipUrl && (
            <img
              src={lqipUrl}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-contain filter blur-md scale-105 opacity-70 transition-opacity duration-300 pointer-events-none"
            />
          )}

          {/* Effet shimmer subtil en surimpression */}
          <div className="absolute inset-0 product-image-shimmer opacity-60" />
          <div className="absolute inset-[6%] rounded-md border border-white/5 bg-white/[0.02]" />
        </div>
      )}

      {/* 2. Image Haute Définition avec transition en fondu */}
      <img
        src={src}
        srcSet={computedSrcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={effectiveLoading}
        decoding="async"
        {...(priority ? { fetchpriority: 'high' } : {})}
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setLoaded(true);
          onError?.(e);
        }}
        className={`${className} transition-[opacity,transform] duration-300 ease-out ${
          loaded
            ? 'opacity-100 motion-safe:scale-100'
            : 'opacity-0 motion-safe:scale-[0.98]'
        }`}
      />
    </>
  );
};

export default ProductCardImage;
