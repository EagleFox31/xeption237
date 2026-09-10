import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CheckCircle, MapPin, Loader2, Search, ChevronDown, Check, X } from 'lucide-react';
import { DeliveryZone } from '../../types';
import { getNeighborhoodsForZoneName } from '../../constants/deliveryNeighborhoods';

type DeliveryLocationSelectProps = {
  step: number;
  zones: DeliveryZone[];
  selectedZoneId: string;
  neighborhood: string;
  onZoneChange: (zone: DeliveryZone) => void;
  onNeighborhoodChange: (value: string) => void;
  isLoading?: boolean;
  isValid: boolean;
};

const normalizeSearch = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_']/g, ' ')
    .trim();

function highlightMatch(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const normText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normQ = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const matchIdx = normText.indexOf(normQ);
  if (matchIdx === -1) return text;
  const before = text.slice(0, matchIdx);
  const matched = text.slice(matchIdx, matchIdx + q.length);
  const after = text.slice(matchIdx + q.length);
  return (
    <>
      {before}
      <span className="text-xeption-gold font-semibold underline decoration-xeption-gold/60">{matched}</span>
      {after}
    </>
  );
}

export const DeliveryLocationSelect: React.FC<DeliveryLocationSelectProps> = ({
  step,
  zones,
  selectedZoneId,
  neighborhood,
  onZoneChange,
  onNeighborhoodChange,
  isLoading,
  isValid,
}) => {
  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const neighborhoods = useMemo(
    () => (selectedZone ? getNeighborhoodsForZoneName(selectedZone.name) : []),
    [selectedZone]
  );
  const zoneSelected = Boolean(selectedZoneId);
  const showSuccess = isValid;

  // Searchable dropdown state
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter neighborhoods based on search query
  const filteredNeighborhoods = useMemo(() => {
    const q = normalizeSearch(searchQuery);
    if (!q) return neighborhoods;
    return neighborhoods.filter((item) => normalizeSearch(item).includes(q));
  }, [neighborhoods, searchQuery]);

  const hasExactMatch = useMemo(() => {
    const q = normalizeSearch(searchQuery);
    return neighborhoods.some((item) => normalizeSearch(item) === q);
  }, [neighborhoods, searchQuery]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(filteredNeighborhoods.length > 0 ? 0 : -1);
  }, [filteredNeighborhoods]);

  // Auto-scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const selectAndClose = (val: string) => {
    onNeighborhoodChange(val);
    setIsOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredNeighborhoods.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredNeighborhoods.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredNeighborhoods[highlightedIndex]) {
        selectAndClose(filteredNeighborhoods[highlightedIndex]);
      } else if (filteredNeighborhoods.length === 1) {
        selectAndClose(filteredNeighborhoods[0]);
      } else if (searchQuery.trim()) {
        selectAndClose(searchQuery.trim());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!zoneSelected) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setIsOpen(true);
      setSearchQuery(e.key);
    }
  };

  const selectClass = (filled: boolean) =>
    `w-full bg-black/50 border rounded-lg text-white text-sm pl-10 pr-3 py-2.5 outline-none transition-all appearance-none cursor-pointer ${
      filled
        ? 'border-green-500/30 focus:border-green-400'
        : 'border-white/10 focus:border-xeption-gold focus:shadow-[0_0_0_1px_rgba(255,215,0,0.3),0_0_20px_rgba(255,215,0,0.08)]'
    }`;

  return (
    <div
      className={`relative rounded-xl border p-3 transition-all duration-500 ${
        showSuccess
          ? 'border-green-500/35 bg-green-500/[0.06] shadow-[0_0_24px_rgba(34,197,94,0.07)]'
          : 'border-white/10 bg-black/30 hover:border-white/20 hover:bg-black/40'
      }`}
    >
      <div className="flex items-start gap-2.5 mb-2">
        <div
          className={`w-8 h-8 lg:w-7 lg:h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-tech border-2 shrink-0 transition-all duration-500 ${
            showSuccess
              ? 'border-green-500 bg-green-500/20 text-green-400 scale-110 shadow-[0_0_12px_rgba(34,197,94,0.35)]'
              : 'border-white/15 bg-black/50 text-gray-500'
          }`}
        >
          {showSuccess ? <CheckCircle className="h-3.5 w-3.5" /> : step}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white font-bold uppercase text-[11px] tracking-wider">Où on te livre ?</span>
          <p
            className={`text-[10px] mt-0.5 line-clamp-2 transition-colors duration-300 ${
              showSuccess ? 'text-green-400/90' : 'text-gray-500'
            }`}
          >
            {showSuccess
              ? `Livraison · ${selectedZone?.name}, ${neighborhood}`
              : 'Choisis ta ville, puis ton quartier'}
          </p>
        </div>
        {showSuccess && <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-gray-500 text-xs">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des villes…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* City Selection */}
          <div className="relative group">
            <MapPin
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors ${
                zoneSelected ? 'text-xeption-gold' : 'text-gray-600 group-focus-within:text-xeption-gold'
              }`}
            />
            <select
              value={selectedZoneId}
              onChange={(e) => {
                const zone = zones.find((z) => z.id === e.target.value);
                if (zone) onZoneChange(zone);
              }}
              className={selectClass(zoneSelected)}
              aria-label="Ville de livraison"
            >
              <option value="" disabled>Choisir la ville</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id} className="bg-[#111]">
                  {zone.name} — {zone.price.toLocaleString('fr-FR')} FCFA
                </option>
              ))}
            </select>
          </div>

          {/* Searchable Neighborhood Combobox Dropdown */}
          <div ref={containerRef} className="relative group">
            <MapPin
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors z-10 ${
                neighborhood || isOpen ? 'text-xeption-gold' : 'text-gray-600 group-focus-within:text-xeption-gold'
              }`}
            />
            <button
              type="button"
              disabled={!zoneSelected}
              onClick={() => {
                if (zoneSelected) setIsOpen((prev) => !prev);
              }}
              onKeyDown={handleTriggerKeyDown}
              className={`w-full bg-black/50 border rounded-lg text-sm pl-10 pr-9 py-2.5 outline-none transition-all flex items-center justify-between text-left ${
                !zoneSelected
                  ? 'border-white/10 opacity-40 cursor-not-allowed text-gray-500'
                  : neighborhood
                  ? 'border-green-500/30 text-white hover:border-green-500/50'
                  : isOpen
                  ? 'border-xeption-gold text-gray-300 shadow-[0_0_0_1px_rgba(255,215,0,0.3),0_0_20px_rgba(255,215,0,0.08)]'
                  : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'
              }`}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              aria-label="Quartier de livraison"
            >
              <span className={`truncate ${neighborhood ? 'text-white font-medium' : 'text-gray-500'}`}>
                {neighborhood || (zoneSelected ? 'Choisir le quartier' : "Ville d'abord")}
              </span>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {neighborhood && zoneSelected && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNeighborhoodChange('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        onNeighborhoodChange('');
                      }
                    }}
                    title="Effacer le quartier"
                    className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-xeption-gold' : ''
                  }`}
                />
              </div>
            </button>

            {/* Dropdown Popover */}
            {isOpen && zoneSelected && (
              <div
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#121212] border border-xeption-gold/30 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.95)] backdrop-blur-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
              >
                {/* Search input header */}
                <div className="p-2 border-b border-white/10 bg-[#181818]/95 relative">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-xeption-gold pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Rechercher (ex: Nsam, Bastos)..."
                      className="w-full bg-black/60 border border-white/10 rounded-lg text-white text-xs pl-8 pr-7 py-2 outline-none focus:border-xeption-gold placeholder-gray-500 transition-colors"
                      autoComplete="off"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                        title="Effacer la recherche"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] text-gray-400">
                    <span className="truncate max-w-[150px]">{selectedZone?.name}</span>
                    <span>
                      {filteredNeighborhoods.length} quartier{filteredNeighborhoods.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* List of neighborhoods */}
                <ul
                  ref={listRef}
                  role="listbox"
                  className="max-h-56 overflow-y-auto p-1 divide-y divide-white/5"
                >
                  {/* Option for custom neighborhood entry if no exact match */}
                  {searchQuery.trim() && !hasExactMatch && (
                    <li
                      role="option"
                      aria-selected={false}
                      onClick={() => selectAndClose(searchQuery.trim())}
                      className="px-3 py-2 text-xs text-xeption-gold hover:bg-xeption-gold/15 cursor-pointer rounded-lg flex items-center gap-2 font-medium transition-colors border-b border-xeption-gold/20 mb-1"
                    >
                      <span className="text-sm">➕</span>
                      <span className="truncate">
                        Utiliser « <strong className="underline">{searchQuery.trim()}</strong> »
                      </span>
                    </li>
                  )}

                  {filteredNeighborhoods.length > 0 ? (
                    filteredNeighborhoods.map((q, idx) => {
                      const isSelected = q === neighborhood;
                      const isHighlighted = idx === highlightedIndex;
                      return (
                        <li
                          key={q}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => selectAndClose(q)}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`px-3 py-2 text-xs rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-green-500/20 text-green-300 font-medium'
                              : isHighlighted
                              ? 'bg-xeption-gold/15 text-white'
                              : 'text-gray-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span className="truncate">{highlightMatch(q, searchQuery)}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-green-400 shrink-0 ml-2" />}
                        </li>
                      );
                    })
                  ) : !searchQuery.trim() ? (
                    <li className="px-3 py-4 text-center text-xs text-gray-500">
                      Aucun quartier disponible
                    </li>
                  ) : null}

                  {filteredNeighborhoods.length === 0 && searchQuery.trim() && (
                    <li className="px-3 py-3 text-center text-xs text-gray-500">
                      Aucun quartier suggéré pour « {searchQuery} »
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedZone && (
        <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1.5">
          <span className="text-xeption-gold font-mono font-bold">
            {selectedZone.price.toLocaleString('fr-FR')} FCFA
          </span>
          <span>· délai {selectedZone.delay}</span>
        </p>
      )}
    </div>
  );
};

