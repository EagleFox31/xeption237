import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AutocompleteInputProps {
  id?: string;
  /** Valeur courante du champ. Si non listée, c'est une saisie libre — acceptée. */
  value: string;
  onChange: (value: string) => void;
  /** Liste complète des suggestions disponibles (déjà dédupliquée et triée). */
  suggestions: string[];
  placeholder?: string;
  /** Max d'items affichés dans le dropdown. Par défaut 6. */
  maxItems?: number;
  className?: string;
  /** Affiché en gris sous le dropdown si aucune suggestion ne matche (saisie libre OK). */
  freeTextHint?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

// Style aligné sur SmartTrocForm pour cohérence visuelle.
const inputClass =
  'w-full bg-black/40 border border-white/10 text-white px-4 py-3 pr-9 text-sm font-sans placeholder-gray-600 focus:border-xeption-gold/60 focus:bg-black/60 outline-none transition-all rounded-sm';

/**
 * Champ texte avec suggestions filtrées en temps réel.
 *
 * Comportement :
 *   • Tape pour filtrer la liste (insensible casse, accents).
 *   • ↑ ↓ pour naviguer, Enter pour valider, Échap pour fermer.
 *   • Click hors composant ferme le dropdown.
 *   • Si aucune suggestion ne matche, la valeur libre est conservée (UX "Autre" implicite).
 */
export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  id,
  value,
  onChange,
  suggestions,
  placeholder,
  maxItems = 6,
  className,
  freeTextHint,
  disabled,
  autoFocus,
}) => {
  const [open, setOpen]               = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef      = useRef<HTMLUListElement>(null);

  const normalized = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const filtered = useMemo(() => {
    const v = normalized(value).trim();
    if (!v) return suggestions.slice(0, maxItems);
    return suggestions
      .filter((s) => normalized(s).includes(v))
      .slice(0, maxItems);
  }, [value, suggestions, maxItems]);

  const hasExactMatch = useMemo(
    () => suggestions.some((s) => normalized(s) === normalized(value).trim()),
    [value, suggestions],
  );

  // Click outside → close
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Reset highlight quand la liste filtrée change
  useEffect(() => {
    setHighlightedIdx(filtered.length > 0 ? 0 : -1);
  }, [filtered.length, value]);

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlightedIdx((idx) => Math.min(idx + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((idx) => Math.max(idx - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && highlightedIdx >= 0 && filtered[highlightedIdx]) {
        e.preventDefault();
        commit(filtered[highlightedIdx]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Scroll l'item highlighté dans la vue
  useEffect(() => {
    if (highlightedIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightedIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIdx]);

  const showHint = !!freeTextHint && value.trim().length > 0 && !hasExactMatch && filtered.length === 0;

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
          className={inputClass}
        />
        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-20 w-full mt-1 max-h-56 overflow-y-auto bg-[#1a1a1a] border border-xeption-gold/30 rounded-sm shadow-xl"
        >
          {filtered.map((s, idx) => {
            const isHighlighted = idx === highlightedIdx;
            return (
              <li
                key={s}
                role="option"
                aria-selected={isHighlighted}
                onMouseDown={(e) => { e.preventDefault(); commit(s); }}
                onMouseEnter={() => setHighlightedIdx(idx)}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors border-b border-white/5 last:border-0 ${
                  isHighlighted
                    ? 'bg-xeption-gold/20 text-xeption-gold'
                    : 'text-gray-200 hover:bg-xeption-gold/10'
                }`}
              >
                {s}
              </li>
            );
          })}
        </ul>
      )}

      {showHint && (
        <p className="absolute mt-1 text-[10px] text-gray-500 font-sans italic">
          {freeTextHint}
        </p>
      )}
    </div>
  );
};
