import React from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { MarketTrend } from '../../types';

const MIN_CONFIDENCE = 0.3;

export const shouldShowMarketTrend = (
  trend: MarketTrend | null | undefined,
): trend is MarketTrend => {
  if (!trend) return false;
  if (trend.label === 'insufficient_data') return false;
  if (trend.confidence < MIN_CONFIDENCE) return false;
  return trend.label === 'rising' || trend.label === 'stable' || trend.label === 'falling';
};

const VISUALS: Record<
  'rising' | 'stable' | 'falling',
  {
    Icon: React.ComponentType<{ className?: string }>;
    container: string;
    icon: string;
    title: string;
  }
> = {
  rising: {
    Icon: TrendingUp,
    container: 'border-xeption-gold/35 bg-xeption-gold/10',
    icon: 'text-xeption-gold',
    title: 'Cote du marché — hausse',
  },
  stable: {
    Icon: Minus,
    container: 'border-white/15 bg-white/5',
    icon: 'text-white/70',
    title: 'Cote du marché — stable',
  },
  falling: {
    Icon: TrendingDown,
    container: 'border-orange-500/35 bg-orange-950/40',
    icon: 'text-orange-400',
    title: 'Cote du marché — baisse',
  },
};

interface MarketTrendBadgeProps {
  trend: MarketTrend;
  className?: string;
}

export const MarketTrendBadge: React.FC<MarketTrendBadgeProps> = ({ trend, className = '' }) => {
  if (!shouldShowMarketTrend(trend)) return null;

  const { Icon, container, icon, title } = VISUALS[trend.label];

  return (
    <aside
      className={`flex gap-3 rounded-lg border px-4 py-3 ${container} ${className}`}
      aria-label={title}
    >
      <div
        className={`shrink-0 w-9 h-9 rounded-lg border border-white/20 flex items-center justify-center ${icon}`}
      >
        <Icon className="w-4 h-4" aria-hidden />
      </div>
      <div className="min-w-0 flex flex-col gap-1">
        <p className="text-[10px] font-tech uppercase tracking-widest text-white/60">{title}</p>
        <p className="text-xs text-white/90 font-sans leading-relaxed">{trend.message_fr}</p>
      </div>
    </aside>
  );
};
