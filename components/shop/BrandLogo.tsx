import React, { useState } from 'react';
import type { BrandRef } from '../../utils/productBrand';
import { getBrandInitial, getBrandLogoUrl } from '../../utils/brandLogos';

interface BrandLogoProps {
  brand: BrandRef;
  active?: boolean;
  size?: number;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ brand, active = false, size = 18 }) => {
  const [failed, setFailed] = useState(false);
  const url = getBrandLogoUrl(brand, active ? '000000' : 'B8860B');

  if (!url || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-sm font-tech font-bold shrink-0 ${
          active ? 'bg-black/20 text-black' : 'bg-xeption-gold/15 text-xeption-gold'
        }`}
        style={{ width: size, height: size, fontSize: Math.max(9, size * 0.55) }}
        aria-hidden
      >
        {getBrandInitial(brand.name)}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
      loading="lazy"
      decoding="async"
    />
  );
};

export default BrandLogo;
