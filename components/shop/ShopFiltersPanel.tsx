import React from 'react';
import {
  ArrowDownAZ,
  ArrowUpDown,
  Box,
  HardDrive,
  LayoutGrid,
  MemoryStick,
  Percent,
  ShieldCheck,
  Smartphone,
  Store,
  Tablet,
  Laptop,
  Headphones,
  Gamepad2,
  SlidersHorizontal,
  Tag,
  Tags,
  Coins,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Category } from '../../types';
import type { BrandRef } from '../../utils/productBrand';
import type { FacetGroup, FacetKey } from '../../utils/shopFacets';
import type { PriceBounds } from '../../utils/shopPriceFilter';
import BrandLogo from './BrandLogo';
import ShopPriceRangeFilter from './ShopPriceRangeFilter';

export interface BrandOption {
  id: string;
  count: number;
  name: string;
  brandRef?: BrandRef;
}

interface ShopFiltersPanelProps {
  categories: Category[];
  categoryCounts: Map<string, number>;
  brandOptions: BrandOption[];
  facetGroups: FacetGroup[];
  productsTotal: number;
  brandCategoryTotal: number;
  activeFilter: string;
  activeBrand: string;
  activeFacets: Partial<Record<FacetKey, string>>;
  promoOnly: boolean;
  inStockOnly: boolean;
  sort: string;
  priceBounds: PriceBounds | null;
  priceMin: number | null;
  priceMax: number | null;
  onFilterChange: (next: string) => void;
  onBrandChange: (next: string) => void;
  onFacetChange: (key: FacetKey, value: string) => void;
  onPriceRangeChange?: (min: number | null, max: number | null) => void;
  onPromoOnlyChange?: (enabled: boolean) => void;
  onInStockOnlyChange?: (enabled: boolean) => void;
  onSortChange?: (next: string) => void;
}

const sectionTitleClass =
  'flex items-center gap-1.5 text-[10px] font-tech font-bold uppercase tracking-widest text-white/50 mb-2';

const optionBtnClass = (active: boolean) =>
  `w-full flex items-center gap-2.5 px-3 py-2 rounded-sm border font-tech text-xs uppercase tracking-wide transition-all ${
    active
      ? 'bg-xeption-gold text-black border-xeption-gold font-bold'
      : 'bg-white/5 text-gray-200 border-white/15 hover:border-white/30 hover:bg-white/10'
  }`;

const iconClass = (active: boolean) =>
  `w-4 h-4 shrink-0 ${active ? 'text-black' : 'text-xeption-gold'}`;

const countClass = (active: boolean) =>
  `ml-auto font-mono font-bold text-[11px] shrink-0 ${active ? 'text-black/70' : 'text-xeption-gold'}`;

const toggleBtnClass = (active: boolean) =>
  `flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm border font-tech text-xs uppercase tracking-wide transition-all ${
    active
      ? 'bg-xeption-gold text-black border-xeption-gold font-bold'
      : 'bg-white/5 text-gray-200 border-white/15 hover:border-white/30 hover:bg-white/10'
  }`;

const getCategoryIcon = (slug: string): LucideIcon => {
  if (slug === 'phones' || slug === 'smartphones') return Smartphone;
  if (slug === 'tablettes' || slug === 'tablets') return Tablet;
  if (slug === 'ordinateurs' || slug === 'laptops' || slug === 'computer') return Laptop;
  if (slug === 'gaming' || slug === 'consoles') return Gamepad2;
  if (slug === 'accessories') return Headphones;
  return LayoutGrid;
};

const facetSectionIcon = (key: FacetKey): LucideIcon => {
  if (key === 'storage') return HardDrive;
  if (key === 'ram') return MemoryStick;
  return ShieldCheck;
};

const SectionTitle: React.FC<{ icon: LucideIcon; label: string }> = ({ icon: Icon, label }) => (
  <p className={sectionTitleClass}>
    <Icon className="w-3.5 h-3.5 text-xeption-gold" aria-hidden />
    {label}
  </p>
);

const ShopFiltersPanel: React.FC<ShopFiltersPanelProps> = ({
  categories,
  categoryCounts,
  brandOptions,
  facetGroups,
  productsTotal,
  brandCategoryTotal,
  activeFilter,
  activeBrand,
  activeFacets,
  promoOnly,
  inStockOnly,
  sort,
  priceBounds,
  priceMin,
  priceMax,
  onFilterChange,
  onBrandChange,
  onFacetChange,
  onPriceRangeChange,
  onPromoOnlyChange,
  onInStockOnlyChange,
  onSortChange,
}) => (
  <div className="space-y-5">
    <div>
      <SectionTitle icon={LayoutGrid} label="Catégorie" />
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => onFilterChange('all')}
          className={optionBtnClass(activeFilter === 'all')}
        >
          <Store className={iconClass(activeFilter === 'all')} aria-hidden />
          <span className="truncate">Tout le catalogue</span>
          <span className={countClass(activeFilter === 'all')}>({productsTotal})</span>
        </button>
        {categories.map((cat) => {
          const CatIcon = getCategoryIcon(cat.slug);
          const active = activeFilter === cat.slug;
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => onFilterChange(cat.slug)}
              className={optionBtnClass(active)}
            >
              <CatIcon className={iconClass(active)} aria-hidden />
              <span className="truncate">{cat.name}</span>
              <span className={countClass(active)}>({categoryCounts.get(cat.slug) || 0})</span>
            </button>
          );
        })}
      </div>
    </div>

    {priceBounds ? (
      <div>
        <p className="flex items-center gap-1.5 text-xs sm:text-sm font-tech font-bold uppercase tracking-widest text-white mb-2">
          <Coins className="w-4 h-4 text-xeption-gold" aria-hidden />
          Budget
        </p>
        <ShopPriceRangeFilter
          bounds={priceBounds}
          valueMin={priceMin}
          valueMax={priceMax}
          onChange={(min, max) => onPriceRangeChange?.(min, max)}
        />
      </div>
    ) : null}

    {activeFilter !== 'all' && brandOptions.length > 0 ? (
      <div>
        <SectionTitle icon={Tag} label="Marque" />
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => onBrandChange('all')}
            className={optionBtnClass(activeBrand === 'all')}
          >
            <Tags className={iconClass(activeBrand === 'all')} aria-hidden />
            <span className="truncate">Toutes</span>
            <span className={countClass(activeBrand === 'all')}>({brandCategoryTotal})</span>
          </button>
          {brandOptions.map((brand) => {
            const active = activeBrand === brand.id;
            return (
              <button
                key={brand.id}
                type="button"
                onClick={() => onBrandChange(brand.id)}
                className={optionBtnClass(active)}
              >
                {brand.brandRef ? (
                  <BrandLogo brand={brand.brandRef} active={active} size={18} />
                ) : (
                  <Tag className={iconClass(active)} aria-hidden />
                )}
                <span className="truncate">{brand.name}</span>
                <span className={countClass(active)}>({brand.count})</span>
              </button>
            );
          })}
        </div>
      </div>
    ) : null}

    {facetGroups.map((group) => {
      const FacetIcon = facetSectionIcon(group.key);
      const activeValue = activeFacets[group.key] || 'all';
      return (
        <div key={group.key}>
          <SectionTitle icon={FacetIcon} label={group.label} />
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => onFacetChange(group.key, 'all')}
              className={optionBtnClass(activeValue === 'all')}
            >
              <FacetIcon className={iconClass(activeValue === 'all')} aria-hidden />
              <span className="truncate">Tous</span>
            </button>
            {group.options.map((opt) => {
              const active = activeValue === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onFacetChange(group.key, opt.value)}
                  className={optionBtnClass(active)}
                >
                  <FacetIcon className={iconClass(active)} aria-hidden />
                  <span className="truncate">{opt.label}</span>
                  <span className={countClass(active)}>({opt.count})</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    })}

    <div>
      <SectionTitle icon={SlidersHorizontal} label="Options" />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPromoOnlyChange?.(!promoOnly)}
          className={toggleBtnClass(promoOnly)}
        >
          <Percent className="w-3.5 h-3.5 shrink-0" aria-hidden />
          Promos
        </button>
        <button
          type="button"
          onClick={() => onInStockOnlyChange?.(!inStockOnly)}
          className={toggleBtnClass(inStockOnly)}
        >
          <Box className="w-3.5 h-3.5 shrink-0" aria-hidden />
          En stock
        </button>
      </div>
    </div>

    <div>
      <SectionTitle icon={ArrowUpDown} label="Tri" />
      <div className="relative">
        <ArrowDownAZ
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-xeption-gold"
          aria-hidden
        />
        <select
          value={sort}
          onChange={(e) => onSortChange?.(e.target.value)}
          className="w-full bg-black/50 border border-white/20 text-white text-xs font-tech uppercase pl-9 pr-3 py-2 rounded-sm outline-none focus:border-xeption-gold focus:ring-1 focus:ring-xeption-gold/40 cursor-pointer appearance-none"
          aria-label="Tri des produits"
        >
          <option value="default">Catalogue</option>
          <option value="price-asc">Prix croissant</option>
          <option value="price-desc">Prix décroissant</option>
          <option value="name">Nom A–Z</option>
        </select>
      </div>
    </div>
  </div>
);

export default ShopFiltersPanel;
