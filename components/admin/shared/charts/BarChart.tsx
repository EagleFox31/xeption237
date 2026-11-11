import React from 'react';
import { computeChartScale } from '../../../../utils/chartScale';

/**
 * Graphe en barres SVG léger (groupé ou empilé), sans dépendance externe.
 * Réutilisable dans tout l'ERP : catégories en X, une ou plusieurs séries.
 */

export interface BarChartSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface BarChartProps {
  categories: string[];
  series: BarChartSeries[];
  /** Hauteur de la zone de tracé en px (le SVG est responsive en largeur). */
  height?: number;
  stacked?: boolean;
  formatValue: (value: number) => string;
  /** Libellé court d'axe (ex. « 1,2 M »). Par défaut `formatValue`. */
  formatTick?: (value: number) => string;
  emptyLabel?: string;
}

const VIEW_WIDTH = 720;
const PADDING = { top: 12, right: 12, bottom: 28, left: 64 };
const GROUP_GAP_RATIO = 0.3;
const BAR_GAP = 2;
const TICK_COUNT = 4;

export const SERIES_PALETTE = ['#FFD700', '#22d3ee', '#34d399', '#a78bfa', '#fb7185', '#fb923c'] as const;

const BarChart: React.FC<BarChartProps> = ({
  categories,
  series,
  height = 220,
  stacked = false,
  formatValue,
  formatTick = formatValue,
  emptyLabel = 'Aucune donnée',
}) => {
  if (categories.length === 0 || series.length === 0) {
    return <p className="text-center text-sm text-white/45 py-8">{emptyLabel}</p>;
  }

  const totals = categories.map((_, i) =>
    stacked
      ? series.reduce((s, sr) => s + Math.max(0, sr.values[i] ?? 0), 0)
      : Math.max(...series.map((sr) => sr.values[i] ?? 0)),
  );
  const scale = computeChartScale(totals, TICK_COUNT);
  const plotW = VIEW_WIDTH - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;
  const groupW = plotW / categories.length;
  const innerW = groupW * (1 - GROUP_GAP_RATIO);
  const barW = stacked ? innerW : (innerW - BAR_GAP * (series.length - 1)) / series.length;
  const y = (v: number) => PADDING.top + plotH - (v / scale.max) * plotH;

  return (
    <div>
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${height}`} className="w-full h-auto" role="img">
        {scale.ticks.map((t) => (
          <g key={t}>
            <line x1={PADDING.left} x2={VIEW_WIDTH - PADDING.right} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.08)" />
            <text x={PADDING.left - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.5)">
              {formatTick(t)}
            </text>
          </g>
        ))}
        {categories.map((cat, i) => {
          const x0 = PADDING.left + i * groupW + (groupW - innerW) / 2;
          let stackTop = 0;
          return (
            <g key={cat}>
              {series.map((sr, j) => {
                const v = Math.max(0, sr.values[i] ?? 0);
                const h = (v / scale.max) * plotH;
                const x = stacked ? x0 : x0 + j * (barW + BAR_GAP);
                const yTop = stacked ? y(stackTop + v) : y(v);
                stackTop += stacked ? v : 0;
                return (
                  <rect key={sr.key} x={x} y={yTop} width={barW} height={h} fill={sr.color} rx={1.5} opacity={0.9}>
                    <title>{`${cat} · ${sr.label} : ${formatValue(v)}`}</title>
                  </rect>
                );
              })}
              <text
                x={x0 + innerW / 2}
                y={height - PADDING.bottom + 14}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(255,255,255,0.65)"
              >
                {cat}
              </text>
            </g>
          );
        })}
      </svg>
      {series.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-white/65">
          {series.map((sr) => (
            <li key={sr.key} className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: sr.color }} />
              {sr.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BarChart;
