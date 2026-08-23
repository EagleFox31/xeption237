import React, { useId, useMemo } from 'react';
import type { RadarAxis } from '../../utils/trocModelRadarProfile';
import { getRadarAxisFullLabel } from '../../utils/trocModelRadarProfile';

interface DeviceModelRadarChartProps {
  modelLabel: string;
  modelAxes: RadarAxis[];
  unitAxes?: RadarAxis[] | null;
  source?: 'reference' | 'estimate';
  className?: string;
}

const SIZE = 260;
const CENTER = SIZE / 2;
const MAX_R = 88;
const LEVELS = [25, 50, 75, 100];

const pointAt = (index: number, total: number, value: number, radius = MAX_R) => {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  const r = (clamp(value) / 100) * radius;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));

const toPolygon = (axes: RadarAxis[]) =>
  axes
    .map((axis, i) => {
      const p = pointAt(i, axes.length, axis.value);
      return `${p.x},${p.y}`;
    })
    .join(' ');

const DeviceModelRadarChart: React.FC<DeviceModelRadarChartProps> = ({
  modelLabel,
  modelAxes,
  unitAxes = null,
  source = 'estimate',
  className = '',
}) => {
  const titleId = useId();
  const gridPolygons = useMemo(
    () =>
      LEVELS.map((level) =>
        modelAxes
          .map((_, i) => {
            const p = pointAt(i, modelAxes.length, level);
            return `${p.x},${p.y}`;
          })
          .join(' '),
      ),
    [modelAxes],
  );

  if (!modelAxes.length) return null;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <p className="text-[9px] font-tech uppercase tracking-widest text-gray-500 mb-2 text-center">
        Profil modèle
        {source === 'reference' ? (
          <span className="text-xeption-gold/80"> · fiche Versus</span>
        ) : (
          <span className="text-gray-600"> · estimé</span>
        )}
      </p>

      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-labelledby={titleId}
        className="overflow-visible"
      >
        <title id={titleId}>Radar des caractéristiques — {modelLabel}</title>

        {gridPolygons.map((points, idx) => (
          <polygon
            key={LEVELS[idx]}
            points={points}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        ))}

        {modelAxes.map((axis, i) => {
          const end = pointAt(i, modelAxes.length, 100);
          const label = pointAt(i, modelAxes.length, 118, MAX_R + 24);
          return (
            <g key={axis.key}>
              <title>{getRadarAxisFullLabel(axis.key)}</title>
              <line
                x1={CENTER}
                y1={CENTER}
                x2={end.x}
                y2={end.y}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={1}
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-gray-400"
                style={{ fontSize: 7, fontFamily: 'inherit' }}
              >
                {axis.label}
              </text>
            </g>
          );
        })}

        <polygon
          points={toPolygon(modelAxes)}
          fill="rgba(255, 215, 0, 0.18)"
          stroke="rgba(255, 215, 0, 0.75)"
          strokeWidth={1.5}
        />

        {unitAxes?.length ? (
          <polygon
            points={toPolygon(unitAxes)}
            fill="rgba(34, 197, 94, 0.12)"
            stroke="rgba(74, 222, 128, 0.85)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        ) : null}

        {modelAxes.map((axis, i) => {
          const p = pointAt(i, modelAxes.length, axis.value);
          return (
            <circle
              key={`${axis.key}-dot`}
              cx={p.x}
              cy={p.y}
              r={2.5}
              fill="#FFD700"
            />
          );
        })}
      </svg>

      <p className="text-[10px] text-gray-500 font-sans text-center mt-2 max-w-[260px] leading-snug">
        {modelLabel}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-2 text-[9px] font-tech uppercase tracking-wider">
        <span className="inline-flex items-center gap-1 text-xeption-gold/90">
          <span className="w-2.5 h-2.5 rounded-sm bg-xeption-gold/30 border border-xeption-gold/70" />
          Modèle
        </span>
        {unitAxes?.length ? (
          <span className="inline-flex items-center gap-1 text-green-400/90">
            <span className="w-2.5 h-2.5 rounded-sm border border-green-400/70 border-dashed" />
            Votre état
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default DeviceModelRadarChart;
