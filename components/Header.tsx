import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ShoppingCart, Menu, X, Search, Lock, ArrowRight, Tag, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from './Logo';
import { Product, Category } from '../types';
import { optimizeImage } from '../utils/mediaOptimization';
import { getProductSlug } from '../utils/slug';
import { supabase } from '../services/supabaseClient';
import {
  HEADER_SEARCH_PREVIEW_LIMIT,
  searchProducts,
} from '../utils/productSearch';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  products?: Product[];
  onProductSelect?: (product: Product) => void;
}

const Header: React.FC<HeaderProps> = ({ cartCount, onOpenCart, products = [], onProductSelect }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
  const [isMobileShopOpen, setIsMobileShopOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<{
    products: Product[];
    categories: string[];
    totalProductMatches: number;
  }>({ products: [], categories: [], totalProductMatches: 0 });
  const searchRef = useRef<HTMLDivElement>(null);
  const shopDropdownRef = useRef<HTMLDivElement>(null);
  const shopSearchDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();
  const location = useLocation();
  const isShopPage = location.pathname === '/shop';

  // Determine current page ID for highlighting
  const currentPath = location.pathname === '/' ? 'home' : location.pathname.split('/')[1];

  // Sync navbar search with shop URL (?q=)
  useEffect(() => {
    if (isShopPage) {
      const q = new URLSearchParams(location.search).get('q') || '';
      setSearchQuery(q);
    }
  }, [isShopPage, location.search]);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        if (!isShopPage) setSearchQuery('');
      }
      if (shopDropdownRef.current && !shopDropdownRef.current.contains(event.target as Node)) {
        setIsShopDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isShopPage]);

  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (data) setCategories(data as Category[]);
    };
    void fetchCats();
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      const key = p.category || 'uncategorized';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [products]);

  useEffect(() => {
    return () => {
      if (shopSearchDebounceRef.current) clearTimeout(shopSearchDebounceRef.current);
    };
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsShopDropdownOpen(false);
    setIsMobileShopOpen(false);
  }, [location.pathname, location.search]);

  // Search Logic
  useEffect(() => {
    if (!searchQuery.trim() || !products) {
      setResults({ products: [], categories: [], totalProductMatches: 0 });
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const allMatches = searchProducts(products, query);
    const matchedProducts = allMatches.slice(0, HEADER_SEARCH_PREVIEW_LIMIT);

    const uniqueCats = Array.from(new Set(products.map((p) => p.category))).filter((c) =>
      c.toLowerCase().includes(query),
    ).slice(0, 2);

    setResults({
      products: matchedProducts,
      categories: uniqueCats,
      totalProductMatches: allMatches.length,
    });

  }, [searchQuery, products]);

  const handleNav = (pageId: string) => {
    if (pageId === 'home') navigate('/');
    else navigate(`/${pageId}`);
    setIsMenuOpen(false);
    setIsShopDropdownOpen(false);
  };

  const navigateToShop = (cat?: string) => {
    if (cat && cat !== 'all') navigate(`/shop?cat=${encodeURIComponent(cat)}`);
    else navigate('/shop');
    setIsMenuOpen(false);
    setIsShopDropdownOpen(false);
    setIsMobileShopOpen(false);
  };

  const pushShopSearchToUrl = (query: string) => {
    const params = new URLSearchParams(location.search);
    const trimmed = query.trim();
    if (trimmed) params.set('q', trimmed);
    else params.delete('q');
    const qs = params.toString();
    navigate(qs ? `/shop?${qs}` : '/shop', { replace: true });
  };

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    if (!isShopPage) return;
    if (shopSearchDebounceRef.current) clearTimeout(shopSearchDebounceRef.current);
    shopSearchDebounceRef.current = setTimeout(() => pushShopSearchToUrl(value), 350);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (shopSearchDebounceRef.current) clearTimeout(shopSearchDebounceRef.current);
    if (isShopPage) {
      pushShopSearchToUrl(searchQuery);
    } else if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
    }
    setIsSearchOpen(false);
  };

  const handleViewAllSearchResults = () => {
    const q = searchQuery.trim();
    if (q) navigate(`/shop?q=${encodeURIComponent(q)}`);
    else navigate('/shop');
    setIsSearchOpen(false);
  };

  const handleSearchResultClick = (product: Product) => {
    if (onProductSelect) {
      onProductSelect(product);
    } else {
      // If no handler passed (e.g. from Routes context), default navigation
      navigate(`/product/${getProductSlug(product)}`);
    }
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const navItems = [
    { id: 'home', label: 'Accueil' },
    { id: 'shop', label: 'Le Shop' },
    { id: 'troc', label: 'Troc Zone' },
    { id: 'tracking', label: 'Suivi' },
    { id: 'sav', label: 'SAV' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] w-full bg-black/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300 supports-[backdrop-filter]:bg-black/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 gap-4">

          {/* Logo */}
          <div
            className={`flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${isSearchOpen ? 'hidden md:block' : 'block'}`}
            onClick={() => handleNav('home')}
          >
            <Logo />
          </div>

          {/* SEARCH BAR (CENTER) */}
          <div ref={searchRef} className={`flex-1 max-w-xl relative ${isSearchOpen ? 'block' : 'hidden md:block'}`}>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 w-4 h-4 group-focus-within:text-xeption-gold transition-colors" />
              <input
                type="text"
                placeholder="Chercher (ex: iPhone 15, PC Gamer...)"
                className="w-full bg-[#18181b] border border-white/20 text-white pl-12 pr-4 py-2.5 rounded-full text-sm font-medium focus:border-xeption-gold focus:ring-1 focus:ring-xeption-gold/50 outline-none transition-all placeholder:text-white/70"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setIsSearchOpen(true)}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    if (isShopPage) pushShopSearchToUrl('');
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* DROPDOWN RESULTS */}
            {searchQuery && (results.products.length > 0 || results.categories.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#09090b]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">

                {/* Category Hits */}
                {results.categories.length > 0 && (
                  <div className="p-2 border-b border-white/5 bg-white/5">
                    <p className="text-[10px] uppercase font-bold text-white/80 px-3 py-1">Catégories suggérées</p>
                    {results.categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set('cat', cat);
                          if (searchQuery.trim()) params.set('q', searchQuery.trim());
                          navigate(`/shop?${params.toString()}`);
                          setIsSearchOpen(false);
                        }}
                        className="flex items-center gap-2 w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-colors text-sm font-bold"
                      >
                        <Tag className="w-3 h-3 text-xeption-gold" />
                        Voir tout dans <span className="text-xeption-gold">{cat}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Product Hits */}
                <div className="p-2 max-h-[min(420px,55vh)] overflow-y-auto custom-scrollbar">
                  <p className="text-[10px] uppercase font-bold text-white/80 px-3 py-1">
                    Produits trouvés
                    {results.totalProductMatches > 0 && (
                      <span className="text-white/45 font-mono normal-case">
                        {' '}({results.totalProductMatches})
                      </span>
                    )}
                  </p>
                  {results.products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSearchResultClick(p)}
                      className="flex items-center gap-3 w-full p-2 hover:bg-white/5 rounded-lg transition-all group"
                    >
                      <div className="w-10 h-10 bg-black rounded flex-shrink-0 border border-white/10 overflow-hidden">
                        <img src={optimizeImage(p.image, 100)} className="w-full h-full object-cover" alt={p.name} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{p.name}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-xeption-gold font-mono">{p.price.toLocaleString()} FCFA</span>
                          {p.stock <= 0 && <span className="text-[9px] text-red-500 font-bold border border-red-500/30 px-1 rounded">Rupture</span>}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-xeption-gold -translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>

                <div className="p-2 bg-black/40 text-center border-t border-white/5">
                  <button onClick={handleViewAllSearchResults} className="text-xs text-white/85 hover:text-white transition-colors">
                    Voir tous les résultats pour &quot;{searchQuery}&quot;
                    {results.totalProductMatches > results.products.length && (
                      <span className="text-xeption-gold">
                        {' '}({results.totalProductMatches})
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) =>
              item.id === 'shop' ? (
                <div key={item.id} ref={shopDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsShopDropdownOpen((v) => !v)}
                    className={`relative flex items-center gap-1 px-4 py-2 rounded text-sm font-bold tracking-wide transition-all duration-300 font-tech uppercase ${
                      currentPath === item.id
                        ? 'text-xeption-gold bg-white/5 border-b-2 border-xeption-gold'
                        : 'text-white hover:text-xeption-gold hover:bg-white/5'
                    }`}
                    aria-expanded={isShopDropdownOpen}
                    aria-haspopup="true"
                  >
                    {item.label}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${isShopDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isShopDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1.5 min-w-[240px] bg-[#0a0a0a] border border-white/25 rounded-lg shadow-[0_16px_48px_rgba(0,0,0,0.95)] overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2">
                      <button
                        type="button"
                        onClick={() => navigateToShop()}
                        className="w-full text-left px-4 py-3 text-sm font-tech font-bold uppercase text-white bg-[#0a0a0a] hover:bg-[#1a1a1a] hover:text-xeption-gold transition-colors border-b border-white/15"
                      >
                        Tout le catalogue
                        <span className="block text-sm text-xeption-gold font-mono font-bold normal-case tracking-normal mt-0.5">
                          {products.length} produits
                        </span>
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.slug}
                          type="button"
                          onClick={() => navigateToShop(cat.slug)}
                          className="w-full text-left px-4 py-2.5 text-sm font-tech font-bold uppercase text-white bg-[#0a0a0a] hover:bg-[#1a1a1a] hover:text-xeption-gold transition-colors border-b border-white/10 last:border-b-0"
                        >
                          {cat.name}
                          <span className="ml-2 text-sm text-xeption-gold font-mono font-bold">
                            ({categoryCounts.get(cat.slug) || 0})
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`relative px-4 py-2 rounded text-sm font-bold tracking-wide transition-all duration-300 font-tech uppercase ${
                    currentPath === item.id
                      ? 'text-xeption-gold bg-white/5 border-b-2 border-xeption-gold'
                      : 'text-white hover:text-xeption-gold hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              )
            )}
          </nav>

          {/* Right Icons */}
          <div className={`flex items-center space-x-4 md:space-x-6 ${isSearchOpen ? 'hidden md:flex' : 'flex'}`}>

            {/* Mobile Search Toggle */}
            <button
              className="md:hidden text-white hover:text-xeption-gold"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="w-6 h-6" />
            </button>

            {/* Staff Access Shortcut (Desktop) */}
            <button
              onClick={() => handleNav('admin')}
              className="hidden md:block p-2 text-white hover:text-xeption-gold transition-colors"
              title="Accès ERP Staff"
            >
              <Lock className="h-5 w-5" />
            </button>

            {/* Cart Trigger */}
            <button
              onClick={onOpenCart}
              className="relative group p-2 text-white hover:text-xeption-gold transition-colors"
            >
              <ShoppingCart className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-xeption-red text-[10px] font-bold text-white shadow-[0_0_10px_#ff0033]">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-white hover:text-xeption-gold"
              >
                {isMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-xl border-t border-gray-800 animate-in slide-in-from-top-5 absolute w-full left-0 border-b border-xeption-gold/20 h-screen z-40">
          <div className="px-4 pt-4 pb-6 space-y-2">
            {navItems.map((item) =>
              item.id === 'shop' ? (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => setIsMobileShopOpen((v) => !v)}
                    className={`flex items-center justify-between w-full text-left px-4 py-3 rounded-lg text-lg font-tech uppercase font-bold tracking-wider ${
                      currentPath === item.id
                        ? 'text-xeption-gold bg-white/5 border-l-4 border-xeption-gold'
                        : 'text-white hover:text-xeption-gold hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${isMobileShopOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isMobileShopOpen && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
                      <button
                        type="button"
                        onClick={() => navigateToShop()}
                        className="block w-full text-left px-3 py-2 rounded text-sm font-tech uppercase text-white/90 hover:text-xeption-gold"
                      >
                        Tout <span className="text-sm text-xeption-gold font-mono font-bold">({products.length})</span>
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.slug}
                          type="button"
                          onClick={() => navigateToShop(cat.slug)}
                          className="block w-full text-left px-3 py-2 rounded text-sm font-tech uppercase text-white/80 hover:text-xeption-gold"
                        >
                          {cat.name}{' '}
                          <span className="text-sm text-xeption-gold font-mono font-bold">
                            ({categoryCounts.get(cat.slug) || 0})
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`block w-full text-left px-4 py-3 rounded-lg text-lg font-tech uppercase font-bold tracking-wider ${
                    currentPath === item.id
                      ? 'text-xeption-gold bg-white/5 border-l-4 border-xeption-gold'
                      : 'text-white hover:text-xeption-gold hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </button>
              )
            )}

            {/* Staff Link Mobile */}
            <button
              onClick={() => handleNav('admin')}
              className="block w-full text-left px-4 py-3 rounded-lg text-sm font-tech uppercase font-bold tracking-wider text-white hover:text-xeption-gold hover:bg-white/5 border-t border-white/5 mt-4 flex items-center gap-2"
            >
              <Lock className="w-4 h-4" /> Accès Staff ERP
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
