import React, { useState } from 'react';
import {
  brandNameToRef,
  getBrandInitial,
  resolveBrandHeroLogo,
} from '../../utils/brandLogos';

interface BrandHeroLogoProps {
  brandName: string;
  className?: string;
}

const BrandHeroLogo: React.FC<BrandHeroLogoProps> = ({ brandName, className = '' }) => {
  const [failed, setFailed] = useState(false);
  const brand = brandNameToRef(brandName);
  const asset = resolveBrandHeroLogo(brandName);

  if (!asset || failed) {
    return (
      <div
        className={`flex items-center justify-center pointer-events-none select-none ${className}`}
        aria-hidden
      >
        <span className="font-tech font-bold uppercase text-white/[0.12] leading-none text-[5rem] sm:text-[6.5rem]">
          {getBrandInitial(brand.name)}
        </span>
      </div>
    );
  }

  const src = asset.kind === 'local' ? asset.path : asset.url;

  return (
    <div
      className={`flex items-center justify-end pointer-events-none select-none ${className}`}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="w-auto object-contain opacity-35 sm:opacity-40"
        style={{
          height: `${asset.heroH}px`,
          maxWidth: `${asset.heroMaxW}px`,
          ...(asset.kind === 'local'
            ? { filter: 'brightness(0) invert(1)' }
            : undefined),
        }}
      />
    </div>
  );
};

export default BrandHeroLogo;
