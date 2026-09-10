import React, { useEffect, useMemo, useState } from 'react';
import {
  formatPriceFcfa,
  getPriceStep,
  isPriceFilterActive,
  type PriceBounds,
} from '../../utils/shopPriceFilter';

interface ShopPriceRangeFilterProps {
  bounds: PriceBounds | null;
  valueMin: number | null;
  valueMax: number | null;
  onChange: (min: number | null, max: number | null) => void;
}

const ShopPriceRangeFilter: React.FC<ShopPriceRangeFilterProps> = ({
  bounds,
  valueMin,
  valueMax,
  onChange,
}) => {
  const catalogBounds = bounds;
  const filterActive = isPriceFilterActive(valueMin, valueMax);

  const sliderBounds = useMemo(() => {
    if (!catalogBounds) return null;
    if (!filterActive) return catalogBounds;
    return {
      min: Math.min(catalogBounds.min, valueMin!),
      max: Math.max(catalogBounds.max, valueMax!),
    };
  }, [catalogBounds, valueMin, valueMax, filterActive]);

  const step = useMemo(
    () => (sliderBounds ? getPriceStep(sliderBounds.min, sliderBounds.max) : 1000),
    [sliderBounds],
  );

  const [localMin, setLocalMin] = useState(0);
  const [localMax, setLocalMax] = useState(0);

  useEffect(() => {
    if (!sliderBounds) return;
    if (filterActive) {
      setLocalMin(valueMin!);
      setLocalMax(valueMax!);
      return;
    }
    setLocalMin(sliderBounds.min);
    setLocalMax(sliderBounds.max);
  }, [sliderBounds, filterActive, valueMin, valueMax]);

  if (!catalogBounds || !sliderBounds || catalogBounds.min >= catalogBounds.max) return null;

  const span = sliderBounds.max - sliderBounds.min;
  const minPct = span > 0 ? ((localMin - sliderBounds.min) / span) * 100 : 0;
  const maxPct = span > 0 ? ((localMax - sliderBounds.min) / span) * 100 : 100;

  const commit = (nextMin: number, nextMax: number) => {
    const lo = Math.min(nextMin, nextMax);
    const hi = Math.max(nextMin, nextMax);
    if (lo <= catalogBounds.min && hi >= catalogBounds.max) {
      onChange(null, null);
      return;
    }
    onChange(lo, hi);
  };

  const handleMinChange = (raw: number) => {
    const nextMin = Math.min(raw, localMax);
    setLocalMin(nextMin);
    commit(nextMin, localMax);
  };

  const handleMaxChange = (raw: number) => {
    const nextMax = Math.max(raw, localMin);
    setLocalMax(nextMax);
    commit(localMin, nextMax);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm font-mono">
        <span className="text-xeption-gold font-bold">{formatPriceFcfa(localMin, true)}</span>
        <span className="text-white/40">—</span>
        <span className="text-xeption-gold font-bold">{formatPriceFcfa(localMax, true)}</span>
      </div>

      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-1 rounded-full bg-white/10" />
        <div
          className="absolute h-1 rounded-full bg-xeption-gold/70"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />
        <input
          type="range"
          min={sliderBounds.min}
          max={sliderBounds.max}
          step={step}
          value={localMin}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          className="shop-price-range absolute inset-x-0 w-full pointer-events-none appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
          aria-label="Prix minimum"
        />
        <input
          type="range"
          min={sliderBounds.min}
          max={sliderBounds.max}
          step={step}
          value={localMax}
          onChange={(e) => handleMaxChange(Number(e.target.value))}
          className="shop-price-range absolute inset-x-0 w-full pointer-events-none appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
          aria-label="Prix maximum"
        />
      </div>

      <div className="flex items-center justify-between text-[10px] font-tech text-white/50 uppercase tracking-wide">
        <span>{formatPriceFcfa(catalogBounds.min, true)}</span>
        <span>dispo.</span>
        <span>{formatPriceFcfa(catalogBounds.max, true)}</span>
      </div>

      {filterActive ? (
        <button
          type="button"
          onClick={() => onChange(null, null)}
          className="w-full py-1.5 text-[10px] font-tech uppercase tracking-wide text-white/60 border border-white/15 rounded-sm hover:text-white hover:border-white/30 transition-colors"
        >
          Tous les prix
        </button>
      ) : null}
    </div>
  );
};

export default ShopPriceRangeFilter;
