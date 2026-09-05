import React from 'react';
import {
  Battery,
  Cpu,
  Gamepad2,
  HardDrive,
  Layers,
  Monitor,
  Smartphone,
  Tag,
} from 'lucide-react';
import type { Product } from '../../types';
import {
  getProductHighlightSpecs,
  type HighlightSpecKey,
  type ProductHighlightSpec,
} from '../../utils/productHighlightSpecs';

interface ProductHighlightCardsProps {
  product: Product;
  className?: string;
}

const iconForKey = (key: HighlightSpecKey, category: string): React.ReactNode => {
  const cat = category.toLowerCase();
  const iconClass = 'w-5 h-5 text-xeption-gold shrink-0';

  if (key === 'screen') {
    const isPhone = cat === 'phones' || cat === 'smartphones';
    const Icon = isPhone ? Smartphone : Monitor;
    return <Icon className={iconClass} aria-hidden />;
  }
  if (key === 'storage') return <HardDrive className={iconClass} aria-hidden />;
  if (key === 'ram') return <Layers className={iconClass} aria-hidden />;
  if (key === 'processor') return <Cpu className={iconClass} aria-hidden />;
  if (key === 'gpu') return <Gamepad2 className={iconClass} aria-hidden />;
  if (key === 'battery') return <Battery className={iconClass} aria-hidden />;
  return <Tag className={iconClass} aria-hidden />;
};

const HighlightCard: React.FC<{ spec: ProductHighlightSpec; category: string }> = ({
  spec,
  category,
}) => (
  <div className="inline-flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm min-w-[7.5rem]">
    {iconForKey(spec.key, category)}
    <div className="min-w-0">
      <p className="text-[11px] md:text-xs font-tech uppercase tracking-wider text-black/80 leading-none mb-1.5">
        {spec.label}
      </p>
      <p className="text-base md:text-lg font-bold text-black font-mono tabular-nums leading-tight truncate max-w-[10rem]">
        {spec.value}
      </p>
    </div>
  </div>
);

const ProductHighlightCards: React.FC<ProductHighlightCardsProps> = ({
  product,
  className = '',
}) => {
  const highlights = getProductHighlightSpecs(product);
  if (!highlights.length) return null;

  return (
    <div className={`flex flex-wrap gap-3 ${className}`} aria-label="Caractéristiques principales">
      {highlights.map((spec) => (
        <HighlightCard
          key={`${spec.key}-${spec.label}-${spec.value}`}
          spec={spec}
          category={product.category}
        />
      ))}
    </div>
  );
};

export default ProductHighlightCards;
