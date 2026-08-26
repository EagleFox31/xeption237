import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ShoppingCart, Menu, X, Search, Lock, ArrowRight, Tag, ChevronDown, Zap, Smartphone, Laptop, Tablet, Headphones, RotateCcw, RefreshCw } from 'lucide-react';
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

type BrandRow = { id: string; name: string; slug: string };

/** Icône par catégorie (slug DB → icône lucide). Fallback: Tag. */
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  phones: Smartphone,
  computer: Laptop,
  tablettes: Tablet,
  accessories: Headphones,
};

/** Ordre de priorité d'affichage des catégories (le reste suit, alphabétique). */
const CATEGORY_ORDER = ['phones', 'computer', 'tablettes', 'accessories'];
const categoryRank = (slug: string) => {
  const i = CATEGORY_ORDER.indexOf(slug);
  return i < 0 ? 99 : i;
};

/** Libellés courts téléphone uniquement — Ordinateurs trop large à ~360 px. */
const CATEGORY_MOBILE_LABEL: Record<string, string> = {
  computer: 'PC',
};

/**
 * Marques mises en avant (ordre = priorité). `logo` = chemin réel dans /public.
 * `h` / `maxW` (px) : réglage par marque — certains logos sont des mots larges
 * (Samsung) et d'autres de petites icônes (Apple), on harmonise le poids visuel.
 * `hideClass` : masquage responsive — sur les petits écrans (~15" et moins) on retire
 * les marques secondaires pour que « Reconditionnés » reste visible sans scroller.
 * `wideDesktopOnly` : marque bonus visible seulement si la fenêtre fait ≥ 1920 px
 * (typique écran 24" plein écran). Le CSS ne voit pas les pouces — pas la résolution.
 */
const BRAND_QUICKBAR: {
  slug: string;
  label: string;
  logo: string;
  h?: number;
  maxW?: number;
  hideClass?: string;
  wideDesktopOnly?: boolean;
}[] = [
  { slug: 'apple', label: 'iPhone', logo: '/logos/apple.svg', h: 22, maxW: 28 },
  { slug: 'samsung', label: 'Samsung', logo: '/logos/samsung.svg', h: 42, maxW: 240 },
  { slug: 'xiaomi', label: 'Xiaomi', logo: '/logos/xiaomi.svg', h: 24, maxW: 36 },
  { slug: 'huawei', label: 'Huawei', logo: '/logos/huawei.svg', h: 18, maxW: 120 },
  { slug: 'tecno', label: 'Tecno', logo: '/logo_marques_africaines/tecno.png', h: 16, maxW: 86 },
  { slug: 'infinix', label: 'Infinix', logo: '/logos/infinix.svg', h: 16, maxW: 86, wideDesktopOnly: true },
  { slug: 'google-pixel', label: 'Pixel', logo: '/logos/google.svg', h: 22, maxW: 28 },
  { slug: 'sony', label: 'Sony', logo: '/logos/sony.svg', h: 18, maxW: 80 },
  { slug: 'microsoft', label: 'Microsoft', logo: '/logos/microsoft.svg', h: 20, maxW: 80 },
  { slug: 'hp', label: 'HP', logo: '/logos/hp.svg', h: 20, maxW: 80 },
  { slug: 'dell', label: 'Dell', logo: '/logos/dell.svg', h: 20, maxW: 80 },
  { slug: 'lenovo', label: 'Lenovo', logo: '/logos/lenovo.svg', h: 16, maxW: 80 },
  { slug: 'asus', label: 'ASUS', logo: '/logos/asus.svg', h: 18, maxW: 72, wideDesktopOnly: true },
];

/**
 * Logo de marque rendu en blanc monochrome (filtre) pour un rang cohérent sur le
 * fond sombre — sinon les logos noirs (Apple) seraient invisibles. Fallback texte
 * si le fichier échoue.
 */
const BrandChipLogo: React.FC<{ logo: string; label: string; h?: number; maxW?: number }> = ({
  logo,
  label,
  h = 18,
  maxW = 80,
}) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="text-[12px] font-tech font-extrabold uppercase tracking-wide text-white/70 group-hover:text-white transition-colors">
        {label}
      </span>
    );
  }
  return (
    <img
      src={logo}
      alt={label}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity"
      style={{ filter: 'brightness(0) invert(1)', height: `${h}px`, maxWidth: `${maxW}px` }}
    />
  );
};

const Header: React.FC<HeaderProps> = ({ cartCount, onOpenCart, products = [], onProductSelect }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
  const [isMobileShopOpen, setIsMobileShopOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<{
    products: Product[];
    categories: string[];
    totalProductMatches: number;
  }>({ products: [], categories: [], totalProductMatches: 0 });
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const shopDropdownRef = useRef<HTMLDivElement>(null);
  const shopSearchDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const catBarRef = useRef<HTMLElement>(null);
  const [catBarCanScrollMore, setCatBarCanScrollMore] = useState(false);
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
        searchInputRef.current?.blur();
      }
      if (shopDropdownRef.current && !shopDropdownRef.current.contains(event.target as Node)) {
        setIsShopDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [isSearchOpen]);

  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (data) setCategories(data as Category[]);
    };
    void fetchCats();
  }, []);

  // Fade à droite seulement s'il reste du contenu à glisser (barre masquée).
  useEffect(() => {
    const el = catBarRef.current;
    if (!el) return;
    const update = () => {
      const remaining = el.scrollWidth - el.clientWidth - el.scrollLeft;
      setCatBarCanScrollMore(remaining > 8);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [categories]);

  useEffect(() => {
    const fetchBrands = async () => {
      const { data } = await supabase.from('brands').select('id,name,slug');
      if (data) setBrands(data as BrandRow[]);
    };
    void fetchBrands();
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

  /** Navigue vers la boutique avec une query brute (promo, brand, condition…). */
  const goShop = (qs?: string) => {
    navigate(qs ? `/shop?${qs}` : '/shop');
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
    if (value.trim()) setIsSearchOpen(true);
    if (!isShopPage) return;
    if (shopSearchDebounceRef.current) clearTimeout(shopSearchDebounceRef.current);
    shopSearchDebounceRef.current = setTimeout(() => pushShopSearchToUrl(value), 350);
  };

  const closeSearchDropdown = () => {
    setIsSearchOpen(false);
    searchInputRef.current?.blur();
  };

  const hasSearchResults = results.products.length > 0 || results.categories.length > 0;
  const showSearchDropdown = isSearchOpen && searchQuery.trim().length > 0 && hasSearchResults;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (shopSearchDebounceRef.current) clearTimeout(shopSearchDebounceRef.current);
    if (isShopPage) {
      pushShopSearchToUrl(searchQuery);
    } else if (searchQuery.trim()) {
      navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
    }
    closeSearchDropdown();
  };

  const handleViewAllSearchResults = () => {
    const q = searchQuery.trim();
    if (q) navigate(`/shop?q=${encodeURIComponent(q)}`);
    else navigate('/shop');
    closeSearchDropdown();
  };

  const handleSearchResultClick = (product: Product) => {
    closeSearchDropdown();
    if (!isShopPage) setSearchQuery('');
    onProductSelect?.(product);
    navigate(`/product/${getProductSlug(product)}`);
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
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10">
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
                ref={searchInputRef}
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
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    closeSearchDropdown();
                    if (isShopPage) pushShopSearchToUrl('');
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* DROPDOWN RESULTS */}
            {showSearchDropdown && (
              <>
                <div
                  className="fixed inset-0 z-[90]"
                  aria-hidden="true"
                  onMouseDown={closeSearchDropdown}
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#09090b]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden z-[95] animate-in fade-in slide-in-from-top-2">

                {/* Category Hits */}
                {results.categories.length > 0 && (
                  <div className="p-2 border-b border-white/5 bg-white/5">
                    <p className="text-[10px] uppercase font-bold text-white/80 px-3 py-1">Catégories suggérées</p>
                    {results.categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set('cat', cat);
                          if (searchQuery.trim()) params.set('q', searchQuery.trim());
                          navigate(`/shop?${params.toString()}`);
                          closeSearchDropdown();
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
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
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
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleViewAllSearchResults}
                    className="text-xs text-white/85 hover:text-white transition-colors"
                  >
                    Voir tous les résultats pour &quot;{searchQuery}&quot;
                    {results.totalProductMatches > results.products.length && (
                      <span className="text-xeption-gold">
                        {' '}({results.totalProductMatches})
                      </span>
                    )}
                  </button>
                </div>
              </div>
              </>
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

        {/* ── Barre de raccourcis : catégories + marques ── */}
        <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 border-t border-white/5">
          <nav
            ref={catBarRef}
            aria-label="Catégories et marques"
            className="flex items-center gap-0.5 md:gap-1 h-14 pl-1.5 pr-6 md:pl-2 md:pr-6 lg:pr-8 xl:pr-10 overflow-x-auto snap-x snap-mandatory md:snap-none scroll-px-1 md:scroll-px-2 border-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* Mobile : Smart Troc en tête de barre */}
            <button
              type="button"
              onClick={() => navigate('/troc')}
              className="md:hidden group shrink-0 snap-start inline-flex items-center gap-1 px-1.5 py-2 rounded-md text-[10px] font-tech font-bold uppercase tracking-normal text-xeption-gold hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} />
              Troc
            </button>

            {/* Desktop : Promos */}
            <button
              type="button"
              onClick={() => goShop('promo=1')}
              className="hidden md:inline-flex group shrink-0 snap-start items-center gap-1.5 px-3 py-2 rounded-md text-sm font-tech font-bold uppercase tracking-wide text-xeption-gold hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              <Zap className="w-4 h-4 fill-current" /> Promos
            </button>

            <span className="shrink-0 w-px h-4 bg-white/10 mx-0.5 md:mx-1.5" />

            {/* Catégories */}
            {[...categories].sort((a, b) => categoryRank(a.slug) - categoryRank(b.slug)).map((cat) => {
              const Icon = CATEGORY_ICONS[cat.slug] || Tag;
              const mobileLabel = CATEGORY_MOBILE_LABEL[cat.slug] ?? cat.name;
              return (
                <button
                  key={cat.slug}
                  onClick={() => navigateToShop(cat.slug)}
                  aria-label={cat.name}
                  className="group shrink-0 snap-start inline-flex items-center gap-0.5 md:gap-1.5 px-1.5 md:px-3 py-2 rounded-md text-[10px] md:text-sm font-tech font-bold uppercase tracking-normal md:tracking-wide text-white/70 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap"
                >
                  <Icon className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
                  <span className="md:hidden">{mobileLabel}</span>
                  <span className="hidden md:inline">{cat.name}</span>
                </button>
              );
            })}

            <span className="hidden md:block shrink-0 w-px h-5 bg-white/10 mx-1.5" />
            <span className="hidden md:inline shrink-0 text-[11px] font-tech font-bold uppercase tracking-[0.18em] text-xeption-gold pl-1 pr-1.5">
              Marques
            </span>

            {/* Marques : desktop seulement (trop long sur téléphone) */}
            {BRAND_QUICKBAR.map((b) => {
              const ref = brands.find((x) => x.slug === b.slug);
              return (
                <button
                  key={b.slug}
                  onClick={() => goShop(ref ? `brand=${b.slug}` : `q=${b.label}`)}
                  aria-label={b.label}
                  className={`group shrink-0 ${b.wideDesktopOnly ? 'hidden min-[1920px]:inline-flex' : 'hidden md:inline-flex'} items-center px-2 py-2 rounded-md hover:bg-white/5 transition-colors whitespace-nowrap ${b.hideClass ?? ''}`}
                >
                  <BrandChipLogo logo={b.logo} label={b.label} h={b.h} maxW={b.maxW} />
                </button>
              );
            })}

            <span className="md:hidden shrink-0 w-px h-4 bg-white/10 mx-0.5" />
            {/* Pousse "Reconditionnés" à droite sur desktop */}
            <span className="hidden md:block shrink-0 w-px h-5 bg-white/10 mx-1.5 ml-auto" />

            {/* Reconditionnés */}
            <button
              onClick={() => goShop('condition=refurbished')}
              aria-label="Reconditionnés"
              className="group shrink-0 snap-start inline-flex items-center gap-0.5 md:gap-1.5 px-1.5 md:px-3 py-2 md:mr-32 rounded-md text-[10px] md:text-sm font-tech font-bold uppercase tracking-normal md:tracking-wide text-emerald-300/80 hover:text-emerald-200 hover:bg-white/5 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
              <span className="md:hidden">Reco</span>
              <span className="hidden md:inline">Reconditionnés</span>
            </button>
          </nav>
          {catBarCanScrollMore && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-8 md:hidden bg-gradient-to-l from-black to-transparent"
            />
          )}
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
