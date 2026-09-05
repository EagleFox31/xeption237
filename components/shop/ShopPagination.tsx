import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { visiblePageTokens } from '../../utils/shopPagination';

interface ShopPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

const btnClass =
  'inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-sm border text-xs font-tech font-bold uppercase tracking-wide transition-colors disabled:opacity-40 disabled:pointer-events-none';

const ShopPagination: React.FC<ShopPaginationProps> = ({
  page,
  totalPages: last,
  totalItems,
  onPageChange,
}) => {
  if (last <= 1) return null;

  const tokens = visiblePageTokens(page, last);

  return (
    <nav
      className="mt-6 md:mt-8 rounded-md border border-white/15 bg-[#0a0a0a] px-4 py-3 md:px-5 md:py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
      aria-label="Pagination du catalogue"
    >
      <p className="text-xs sm:text-sm text-white font-tech font-semibold">
        Page {page} sur {last}
        <span className="text-white/75">
          {' '}
          · {totalItems} article{totalItems !== 1 ? 's' : ''}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className={`${btnClass} bg-black/60 border-white/25 text-white hover:border-xeption-gold hover:text-xeption-gold`}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Page précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {tokens.map((token, i) =>
          token === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-1 text-white/70 font-tech" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={token}
              type="button"
              aria-current={token === page ? 'page' : undefined}
              className={
                token === page
                  ? `${btnClass} border-xeption-gold bg-xeption-gold text-black`
                  : `${btnClass} bg-black/60 border-white/25 text-white hover:border-xeption-gold hover:text-xeption-gold`
              }
              onClick={() => onPageChange(token)}
            >
              {token}
            </button>
          ),
        )}
        <button
          type="button"
          className={`${btnClass} bg-black/60 border-white/25 text-white hover:border-xeption-gold hover:text-xeption-gold`}
          disabled={page >= last}
          onClick={() => onPageChange(page + 1)}
          aria-label="Page suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
};

export default ShopPagination;
