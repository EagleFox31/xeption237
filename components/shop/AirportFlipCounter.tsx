import React, { useEffect, useState } from 'react';

interface AirportFlipCounterProps {
  value: number;
  label?: string;
  minDigits?: number;
}

const FlipDigit: React.FC<{ char: string }> = ({ char }) => {
  const [display, setDisplay] = useState(char);
  const [incoming, setIncoming] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    if (char === display) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplay(char);
      return;
    }
    setIncoming(char);
    setRolling(true);
    const t = window.setTimeout(() => {
      setDisplay(char);
      setIncoming(null);
      setRolling(false);
    }, 380);
    return () => window.clearTimeout(t);
  }, [char, display]);

  return (
    <div
      className="relative w-8 h-10 sm:w-9 sm:h-11 md:w-10 md:h-12 overflow-hidden rounded-[3px] bg-[#0c0c0c] border border-white/20 shadow-[inset_0_2px_6px_rgba(0,0,0,0.85),0_1px_0_rgba(255,255,255,0.06)]"
      aria-hidden
    >
      <div
        className={`flex flex-col will-change-transform transition-transform duration-[380ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          rolling ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        <span className="h-10 sm:h-11 md:h-12 flex items-center justify-center font-mono text-xl sm:text-2xl font-bold text-xeption-gold tabular-nums leading-none">
          {display}
        </span>
        {incoming ? (
          <span className="h-10 sm:h-11 md:h-12 flex items-center justify-center font-mono text-xl sm:text-2xl font-bold text-xeption-gold tabular-nums leading-none">
            {incoming}
          </span>
        ) : null}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/70 z-10" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_40%,transparent_60%,rgba(0,0,0,0.25)_100%)]" />
    </div>
  );
};

const AirportFlipCounter: React.FC<AirportFlipCounterProps> = ({
  value,
  label = 'Produits',
  minDigits = 3,
}) => {
  const safe = Math.max(0, Math.floor(value));
  const digits = String(safe).padStart(minDigits, '0').split('');

  return (
    <div
      className="flex flex-col items-end shrink-0"
      role="status"
      aria-live="polite"
      aria-label={`${safe} ${label.toLowerCase()}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-xeption-gold animate-pulse" aria-hidden />
        <span className="text-xs sm:text-sm font-tech font-bold uppercase tracking-[0.25em] text-white">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5 p-2 sm:p-2.5 rounded-md bg-[#050505]/80 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
        {digits.map((d, i) => (
          <FlipDigit key={i} char={d} />
        ))}
      </div>
      <p className="mt-2 text-xs sm:text-sm font-tech font-semibold text-white/90">
        {safe === 1 ? '1 article disponible' : `${safe} articles disponibles`}
      </p>
    </div>
  );
};

export default AirportFlipCounter;
