import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { ProductRange } from '../../../types';

interface CatalogRangeComboboxProps {
  ranges: ProductRange[];
  valueId: string;
  onSelect: (rangeId: string) => void;
  onRequestCreate: (draftName: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const inputClass =
  'w-full bg-black/40 border border-white/10 text-white px-3 py-3 pr-9 text-sm focus:border-xeption-gold outline-none transition-all rounded-sm disabled:opacity-50';

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const CatalogRangeCombobox: React.FC<CatalogRangeComboboxProps> = ({
  ranges,
  valueId,
  onSelect,
  onRequestCreate,
  disabled,
  placeholder = 'Rechercher ou créer une gamme…',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedRange = useMemo(
    () => ranges.find((r) => r.id === valueId),
    [ranges, valueId],
  );

  useEffect(() => {
    setQuery(selectedRange?.name ?? '');
  }, [valueId, selectedRange?.name]);

  const filtered = useMemo(() => {
    const q = normalize(query).trim();
    const sorted = [...ranges].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    if (!q) return sorted.slice(0, 8);
    return sorted.filter((r) => normalize(r.name).includes(q)).slice(0, 8);
  }, [ranges, query]);

  const exactMatch = useMemo(
    () => ranges.some((r) => normalize(r.name) === normalize(query).trim()),
    [ranges, query],
  );

  const trimmedQuery = query.trim();
  const showCreateRow = trimmedQuery.length >= 2 && !exactMatch;

  type Row =
    | { kind: 'range'; range: ProductRange }
    | { kind: 'create'; label: string };

  const rows: Row[] = useMemo(() => {
    const list: Row[] = filtered.map((range) => ({ kind: 'range', range }));
    if (showCreateRow) {
      list.push({ kind: 'create', label: trimmedQuery });
    }
    return list;
  }, [filtered, showCreateRow, trimmedQuery]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useEffect(() => {
    setHighlightedIdx(rows.length > 0 ? 0 : -1);
  }, [rows.length, query]);

  useEffect(() => {
    if (highlightedIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightedIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIdx]);

  const pickRange = (range: ProductRange) => {
    onSelect(range.id);
    setQuery(range.name);
    setOpen(false);
  };

  const pickCreate = () => {
    if (!trimmedQuery) return;
    onRequestCreate(trimmedQuery);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlightedIdx((idx) => Math.min(idx + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((idx) => Math.max(idx - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && highlightedIdx >= 0) {
        const row = rows[highlightedIdx];
        if (row?.kind === 'range') pickRange(row.range);
        if (row?.kind === 'create') pickCreate();
        return;
      }
      if (showCreateRow) pickCreate();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery(selectedRange?.name ?? '');
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (valueId && e.target.value !== selectedRange?.name) {
              onSelect('');
            }
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          className={inputClass}
        />
        <ChevronDown
          className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && rows.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-30 w-full mt-1 max-h-56 overflow-y-auto bg-[#1a1a1a] border border-xeption-gold/30 rounded-sm shadow-xl"
        >
          {rows.map((row, idx) => {
            const isHighlighted = idx === highlightedIdx;
            if (row.kind === 'create') {
              return (
                <li
                  key="__create__"
                  role="option"
                  aria-selected={isHighlighted}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pickCreate();
                  }}
                  onMouseEnter={() => setHighlightedIdx(idx)}
                  className={`px-3 py-2.5 text-sm cursor-pointer transition-colors border-t border-white/10 flex items-center gap-2 ${
                    isHighlighted
                      ? 'bg-xeption-gold/20 text-xeption-gold'
                      : 'text-xeption-gold/90 hover:bg-xeption-gold/10'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  Créer « {row.label} »
                </li>
              );
            }
            return (
              <li
                key={row.range.id}
                role="option"
                aria-selected={isHighlighted || row.range.id === valueId}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickRange(row.range);
                }}
                onMouseEnter={() => setHighlightedIdx(idx)}
                className={`px-3 py-2.5 text-sm cursor-pointer transition-colors border-b border-white/5 last:border-0 ${
                  isHighlighted || row.range.id === valueId
                    ? 'bg-xeption-gold/20 text-xeption-gold'
                    : 'text-gray-200 hover:bg-xeption-gold/10'
                }`}
              >
                {row.range.name}
              </li>
            );
          })}
        </ul>
      )}

      {open && rows.length === 0 && trimmedQuery.length >= 2 && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            pickCreate();
          }}
          className="absolute z-30 w-full mt-1 px-3 py-2.5 text-sm text-left bg-[#1a1a1a] border border-xeption-gold/30 rounded-sm shadow-xl text-xeption-gold/90 hover:bg-xeption-gold/10 flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          Créer « {trimmedQuery} »
        </button>
      )}
    </div>
  );
};

export default CatalogRangeCombobox;
