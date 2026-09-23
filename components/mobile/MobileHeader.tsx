import React, { useState } from 'react';
import { Search, ShoppingCart, Menu, X, ArrowRight, RefreshCw, Zap, Package, Wrench, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface MobileHeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onSearchClick?: () => void;
  className?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  cartCount,
  onOpenCart,
  onSearchClick,
  className = '',
}) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchInputOpen, setIsSearchInputOpen] = useState(false);
  const [query, setQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
      setIsSearchInputOpen(false);
      setQuery('');
    }
  };

  const handleMenuNav = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  return (
    <>
      <header
        className={`w-full bg-[#0a0a0c]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 sticky top-0 z-50 transition-all ${className}`}
      >
        <div className="flex items-center justify-between">
          {/* Logo XEPTION. avec point rouge (conforme maquette) */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-baseline text-left group"
            aria-label="Accueil Xeption"
          >
            <span className="font-tech text-2xl font-black tracking-tight text-white uppercase select-none">
              XEPTION
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-0.5 shadow-[0_0_8px_#ef4444] inline-block self-center" />
          </button>

          {/* Actions : Recherche, Panier avec badge doré, Hamburger */}
          <div className="flex items-center space-x-3.5">
            {/* Recherche */}
            <button
              type="button"
              onClick={() => {
                if (onSearchClick) {
                  onSearchClick();
                } else {
                  setIsSearchInputOpen((prev) => !prev);
                }
              }}
              className="text-gray-200 hover:text-white p-1 transition-colors active:scale-90"
              aria-label="Rechercher un produit"
            >
              <Search className="w-5 h-5 stroke-[2]" />
            </button>

            {/* Panier avec badge doré circulaire */}
            <button
              type="button"
              onClick={onOpenCart}
              className="relative text-gray-200 hover:text-white p-1 transition-colors active:scale-90"
              aria-label={`Panier (${cartCount} article${cartCount > 1 ? 's' : ''})`}
            >
              <ShoppingCart className="w-5 h-5 stroke-[2]" />
              <span
                className="absolute -top-1 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-amber-400 text-black text-[10px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(251,191,36,0.5)] leading-none"
              >
                {cartCount}
              </span>
            </button>

            {/* Menu Hamburger */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="text-gray-200 hover:text-white p-1 transition-colors active:scale-90"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-6 h-6 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Barre de recherche déroulante rapide */}
        {isSearchInputOpen && (
          <form onSubmit={handleSearchSubmit} className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un smartphone, PC, accessoire..."
                autoFocus
                className="w-full bg-zinc-900/90 border border-zinc-700 text-white text-xs rounded-full pl-9 pr-8 py-2 outline-none focus:border-amber-400 placeholder:text-zinc-500"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSearchInputOpen(false)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>
        )}
      </header>

      {/* Drawer Menu Hamburger Mobile */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="absolute top-0 right-0 bottom-0 w-4/5 max-w-xs bg-[#0f0f12] border-l border-white/10 p-5 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Header drawer */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-baseline">
                  <span className="font-tech text-xl font-black tracking-tight text-white uppercase">
                    XEPTION
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 ml-0.5 inline-block self-center" />
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  aria-label="Fermer le menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation links */}
              <nav className="space-y-1.5">
                <button
                  onClick={() => handleMenuNav('/')}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-gray-200 hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  <span>Accueil</span>
                  <ArrowRight className="w-4 h-4 text-zinc-500" />
                </button>

                <button
                  onClick={() => handleMenuNav('/shop')}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-gray-200 hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  <span>Catalogue complet</span>
                  <ArrowRight className="w-4 h-4 text-zinc-500" />
                </button>

                <button
                  onClick={() => handleMenuNav('/troc')}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 active:bg-amber-400/20 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Smart Troc (Estimer mon tel)
                  </span>
                  <span className="text-[10px] bg-amber-400 text-black font-black px-1.5 py-0.5 rounded">
                    IA
                  </span>
                </button>

                <button
                  onClick={() => handleMenuNav('/shop?promo=1')}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-gray-200 hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-red-400" />
                    Promotions & Ventes Flash
                  </span>
                  <ArrowRight className="w-4 h-4 text-zinc-500" />
                </button>

                <button
                  onClick={() => handleMenuNav('/tracking')}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-gray-200 hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-400" />
                    Suivi de commande
                  </span>
                  <ArrowRight className="w-4 h-4 text-zinc-500" />
                </button>

                <button
                  onClick={() => handleMenuNav('/sav')}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-semibold text-gray-200 hover:bg-white/5 active:bg-white/10 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-emerald-400" />
                    SAV & Réparations
                  </span>
                  <ArrowRight className="w-4 h-4 text-zinc-500" />
                </button>
              </nav>
            </div>

            {/* Footer drawer */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <button
                onClick={() => handleMenuNav('/admin')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Accès Staff Xeption</span>
              </button>
              <p className="text-[11px] text-zinc-600 px-3 font-tech">
                Xeption Cameroun · Yaoundé & Douala
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileHeader;
