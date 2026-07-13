
import React from 'react';
import { Search } from 'lucide-react';
import { adminUi } from './adminUi';

export interface TableToolbarOption {
  id: string;
  label: string;
}

interface TableShellProps {
  children: React.ReactNode;
  className?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filterOptions?: TableToolbarOption[];
  filterValue?: string;
  onFilterChange?: (id: string) => void;
  sortOptions?: TableToolbarOption[];
  sortValue?: string;
  onSortChange?: (id: string) => void;
  resultCount?: number;
  resultLabel?: string;
  /** Filtres ou contrôles affichés sur la même ligne que la recherche */
  toolbarAddon?: React.ReactNode;
}

const filterButtonClass = (active: boolean) =>
  `px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xeption-gold/40 ${
    active
      ? 'bg-xeption-gold text-black border-xeption-gold'
      : 'border-white/20 text-white bg-black/40 hover:bg-white/10'
  }`;

const TableShell: React.FC<TableShellProps> = ({
  children,
  className = '',
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Rechercher…',
  filterOptions,
  filterValue,
  onFilterChange,
  sortOptions,
  sortValue,
  onSortChange,
  resultCount,
  resultLabel = 'ligne',
  toolbarAddon,
}) => {
  const hasSearch = onSearchChange != null;
  const hasToolbar =
    hasSearch ||
    toolbarAddon != null ||
    (filterOptions && filterOptions.length > 0) ||
    (sortOptions && sortOptions.length > 0) ||
    resultCount != null;

  if (!hasToolbar) {
    return (
      <div
        className={`${adminUi.surface} overflow-hidden overflow-x-auto ${className}`}
      >
        {children}
      </div>
    );
  }

  const pluralSuffix =
    resultCount != null && resultCount !== 1 ? 's' : '';

  return (
    <div
      className={`${adminUi.surface} overflow-hidden flex flex-col ${className}`}
    >
      <div className="shrink-0 border-b border-white/10 bg-black/30 backdrop-blur-sm px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {hasSearch && (
            <div className="relative flex-1 min-w-[10rem] max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
                aria-hidden
              />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => onSearchChange!(e.target.value)}
                placeholder={searchPlaceholder}
                className={adminUi.input + ' pl-10'}
                aria-label={searchPlaceholder}
              />
            </div>
          )}

          {toolbarAddon}

          {filterOptions && filterOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {filterOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onFilterChange?.(opt.id)}
                  className={filterButtonClass(filterValue === opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 ml-auto shrink-0">
            {resultCount != null && (
              <span className="text-[10px] font-mono text-white/70 uppercase tracking-wider">
                {resultCount} {resultLabel}{pluralSuffix}
              </span>
            )}
            {sortOptions && sortOptions.length > 0 && (
              <select
                value={sortValue ?? sortOptions[0].id}
                onChange={(e) => onSortChange?.(e.target.value)}
                className="bg-black/60 border border-white/25 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-sm outline-none focus:border-xeption-gold cursor-pointer"
                aria-label="Tri du tableau"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
        {children}
      </div>
    </div>
  );
};

export default TableShell;
