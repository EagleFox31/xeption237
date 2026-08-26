import React, { useId, useMemo } from 'react';
import {
  CAMEROON_DELIVERY_CITIES,
  CAMEROON_MAP_SIZE,
  CAMEROON_REGION_PATHS,
  SERVED_REGION_IDS,
  curvedRoutePath,
  hubCity,
  projectCameroonLatLng,
} from './cameroonMapData';

type CameroonDeliveryMapProps = {
  /** Id ville à mettre en avant (ex. ville client). */
  activeCityId?: string | null;
  className?: string;
  /** Version réduite pour une card bento. */
  compact?: boolean;
};

const CameroonDeliveryMap: React.FC<CameroonDeliveryMapProps> = ({
  activeCityId,
  className = '',
  compact = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const { width, height } = CAMEROON_MAP_SIZE;

  const hub = hubCity();
  const hubPt = useMemo(() => projectCameroonLatLng(hub.lat, hub.lng, width, height), [hub, width, height]);

  const routes = useMemo(
    () =>
      CAMEROON_DELIVERY_CITIES.filter((c) => !c.isHub).map((city) => {
        const from = projectCameroonLatLng(city.lat, city.lng, width, height);
        return {
          id: city.id,
          d: curvedRoutePath(from, hubPt, city.bend ?? 0.25),
          active: activeCityId === city.id,
        };
      }),
    [activeCityId, hubPt, width, height],
  );

  const cities = useMemo(
    () =>
      CAMEROON_DELIVERY_CITIES.map((city) => ({
        ...city,
        pt: projectCameroonLatLng(city.lat, city.lng, width, height),
        active: activeCityId === city.id || (city.isHub && !activeCityId),
      })),
    [activeCityId, width, height],
  );

  const hubR = compact ? 8 : 11;
  const cityR = compact ? 6 : 7;
  const hubPulseR = compact ? 16 : 22;
  const labelSize = (isHub: boolean) => (compact ? (isHub ? 14 : 12) : isHub ? 18 : 15);
  const routeStroke = (active: boolean) => (active ? (compact ? 2 : 3.5) : compact ? 1.4 : 2.2);

  return (
    <div
      className={`relative w-full overflow-hidden ${
        compact
          ? 'flex flex-col items-center justify-center min-h-0'
          : 'rounded-xl border border-white/10 bg-[#0a0a0c]/60 backdrop-blur-sm'
      } ${className}`}
    >
      <div
        className={`shrink-0 flex flex-wrap items-end justify-between gap-1 ${
          compact ? 'px-2 pt-2 pb-0' : 'px-4 pt-4 pb-1'
        }`}
      >
        <div>
          <p className="text-[9px] sm:text-[10px] font-tech uppercase tracking-[0.18em] text-xeption-gold">
            Réseau livraison · 237
          </p>
          {!compact && (
            <p className="text-xs text-white/60 mt-0.5">
              Toutes les routes convergent vers notre hub{' '}
              <span className="text-white font-semibold">Yaoundé</span>
            </p>
          )}
        </div>
        {!compact && (
          <p className="text-[10px] text-white/40 font-tech uppercase tracking-widest hidden sm:block">
            Trait interrompu = liaison express
          </p>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Carte du Cameroun — villes desservies reliées à Yaoundé"
        className={`block bg-transparent ${
          compact
            ? 'w-full max-w-[220px] sm:max-w-[260px] lg:max-w-[280px] h-auto'
            : 'w-full h-auto max-h-[min(70vh,720px)]'
        }`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`${uid}-land-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#F5A623" stopOpacity="0.16" />
          </linearGradient>
          {!compact && (
            <linearGradient id={`${uid}-land`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a1a18" />
              <stop offset="100%" stopColor="#10100e" />
            </linearGradient>
          )}
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {!compact && <rect width={width} height={height} fill="#060606" />}

        {CAMEROON_REGION_PATHS.map(({ id, d }) => {
          const served = SERVED_REGION_IDS.has(id);
          return (
            <path
              key={id}
              d={d}
              fill={
                compact
                  ? served
                    ? `url(#${uid}-land-gold)`
                    : 'rgba(255,255,255,0.05)'
                  : `url(#${uid}-land)`
              }
              stroke={
                compact
                  ? served
                    ? 'rgba(255,215,0,0.55)'
                    : 'rgba(255,255,255,0.12)'
                  : 'rgba(255,215,0,0.28)'
              }
              strokeWidth={compact ? 1.2 : 1.2}
              strokeLinejoin="round"
            />
          );
        })}

        {routes.map((route) => (
          <path
            key={route.id}
            d={route.d}
            fill="none"
            stroke={route.active ? '#FFD700' : 'rgba(255,215,0,0.42)'}
            strokeWidth={routeStroke(route.active)}
            strokeDasharray={compact ? '10 7' : '14 9'}
            strokeLinecap="round"
            opacity={route.active ? 1 : 0.75}
          />
        ))}

        {cities.map((city) => {
          const isHub = city.isHub;
          const r = isHub ? hubR : cityR;
          const labelScale = compact ? 0.62 : 1;
          const lx = city.pt.x + (city.labelDx ?? 12) * labelScale;
          const ly = city.pt.y + (city.labelDy ?? 4) * labelScale;

          return (
            <g key={city.id} filter={isHub || city.active ? `url(#${uid}-glow)` : undefined}>
              {isHub && (
                <circle
                  cx={city.pt.x}
                  cy={city.pt.y}
                  r={hubPulseR}
                  fill="rgba(255,215,0,0.14)"
                  className="animate-pulse"
                />
              )}
              <circle
                cx={city.pt.x}
                cy={city.pt.y}
                r={r}
                fill="#FFD700"
                stroke={city.active ? '#ffffff' : '#fff8dc'}
                strokeWidth={city.active ? 2.5 : compact ? 1.5 : 2}
              />
              <text
                x={lx}
                y={ly}
                fill="#000000"
                stroke="#FFD700"
                strokeWidth={compact ? 1.2 : 1.5}
                paintOrder="stroke fill"
                fontSize={labelSize(isHub)}
                fontFamily="'Space Grotesk', system-ui, sans-serif"
                fontWeight={800}
                style={{ letterSpacing: '0.04em' }}
              >
                {city.name.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default CameroonDeliveryMap;
