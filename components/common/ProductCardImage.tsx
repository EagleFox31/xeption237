import React, { useEffect, useState } from 'react';

type ProductCardImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  /** Fond du placeholder (ex. bg-white pour cards dense). */
  placeholderClassName?: string;
  loading?: 'lazy' | 'eager';
};

/**
 * Image produit avec shimmer pendant le chargement, puis fondu.
 * Remet le shimmer si `src` change (carousel / filtre).
 */
const ProductCardImage: React.FC<ProductCardImageProps> = ({
  src,
  alt,
  width = 400,
  height = 400,
  className = '',
  placeholderClassName = 'bg-white/[0.06]',
  loading = 'lazy',
}) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <>
      {!loaded && (
        <div
          className={`absolute inset-0 overflow-hidden pointer-events-none ${placeholderClassName}`}
          aria-hidden
        >
          <div className="absolute inset-0 product-image-shimmer" />
          <div className="absolute inset-[18%] rounded-md border border-white/5 bg-white/[0.04]" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        ref={(img) => {
          if (img?.complete && img.naturalWidth > 0) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`${className} transition-opacity duration-500 ease-out ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  );
};

export default ProductCardImage;
