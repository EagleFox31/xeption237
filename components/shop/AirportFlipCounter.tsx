import React, { useEffect, useRef, useState } from 'react';

interface AirportFlipCounterProps {
  value: number;
  label?: string;
  minDigits?: number;
}

const FLIP_MS = 90;

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
      setIncoming(null);
      setRolling(false);
      return;
    }
    setIncoming(char);
    setRolling(true);
    const t = window.setTimeout(() => {
      setDisplay(char);
      setIncoming(null);
      setRolling(false);
    }, FLIP_MS);
    return () => window.clearTimeout(t);
  }, [char, display]);

  return (
    <div
      className="relative w-8 h-10 sm:w-9 sm:h-11 md:w-10 md:h-12 overflow-hidden rounded-[3px] bg-[#0c0c0c] border border-white/20 shadow-[inset_0_2px_6px_rgba(0,0,0,0.85),0_1px_0_rgba(255,255,255,0.06)]"
      aria-hidden
    >
      <div
        className={`flex flex-col will-change-transform transition-transform ease-[cubic-bezier(0.4,0,0.2,1)] ${
          rolling ? '-translate-y-full' : 'translate-y-0'
        }`}
        style={{ transitionDuration: `${FLIP_MS}ms` }}
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
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      shownRef.current = safe;
      setShown(safe);
      return;
    }

    const from = shownRef.current;
    const to = safe;
    if (from === to) return;

    const distance = Math.abs(to - from);
    const steps = Math.min(24, Math.max(8, distance));
    const duration = Math.min(1100, Math.max(550, steps * 45));
    let raf = 0;
    let start: number | null = null;

    const tick = (now: number) => {
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + (to - from) * eased);
      if (next !== shownRef.current) {
        shownRef.current = next;
        setShown(next);
      }
      if (t < 1) raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [safe]);

  const digits = String(shown).padStart(minDigits, '0').split('');

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
