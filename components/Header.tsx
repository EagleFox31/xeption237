
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Menu, X, Search, Lock, ArrowRight, Tag, Smartphone } from 'lucide-react';
import Logo from './Logo';
import { Product } from '../types';
import { optimizeImage } from '../utils/mediaOptimization';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
  products?: Product[];
  onProductSelect?: (product: Product) => void;
}

// Simple Levenshtein distance for fuzzy search (Fault Tolerance)
// Returns 0-1 similarity ratio (1 = match, 0 = no match)
const getSimilarity = (s1: string, s2: string): number => {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }
  
  const editDistance = (s1: string, s2: string) => {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    const costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i == 0) costs[j] = j;
        else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength.toString());
}

const Header: React.FC<HeaderProps> = ({ cartCount, onOpenCart, onNavigate, currentPage, products = [], onProductSelect }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false); // Mobile toggle
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<{products: Product[], categories: string[]}>({ products: [], categories: [] });
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setSearchQuery(''); // Optional: clear search on close
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search Logic
  useEffect(() => {
    if (!searchQuery.trim() || !products) {
      setResults({ products: [], categories: [] });
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    // 1. Filter Products (Includes + Fuzzy)
    const matchedProducts = products.filter(p => {
        const name = p.name.toLowerCase();
        const cat = p.category.toLowerCase();
        // Exact substring match (High priority)
        if (name.includes(query) || cat.includes(query)) return true;
        // Fuzzy match (Low priority, threshold 0.7)
        if (getSimilarity(name, query) > 0.6) return true;
        return false;
    }).slice(0, 5); // Limit to 5 results for speed

    // 2. Derive Categories from matches or query
    // If query matches a category name significantly, show it
    const uniqueCats = Array.from(new Set(products.map(p => p.category))).filter(c => 
        c.toLowerCase().includes(query) || getSimilarity(c, query) > 0.7
    ).slice(0, 2);

    setResults({ products: matchedProducts, categories: uniqueCats });

  }, [searchQuery, products]);

  const handleNav = (page: string) => {
    onNavigate(page);
    setIsMenuOpen(false);
  };

  const handleSearchResultClick = (product: Product) => {
      if (onProductSelect) onProductSelect(product);
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-xeption-gold transition-colors" />
                <input 
                    type="text" 
                    placeholder="Chercher (ex: iPhone 15, PC Gamer...)" 
                    className="w-full bg-[#18181b] border border-white/10 text-white pl-12 pr-4 py-2.5 rounded-full text-sm focus:border-xeption-gold focus:ring-1 focus:ring-xeption-gold/50 outline-none transition-all placeholder-gray-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchOpen(true)}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
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
                             <p className="text-[10px] uppercase font-bold text-gray-500 px-3 py-1">Catégories suggérées</p>
                             {results.categories.map(cat => (
                                 <button 
                                    key={cat} 
                                    onClick={() => handleNav('shop')} // Ideally filter shop by cat
                                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-colors text-sm font-bold"
                                 >
                                     <Tag className="w-3 h-3 text-xeption-gold" />
                                     Voir tout dans <span className="text-xeption-gold">{cat}</span>
                                 </button>
                             ))}
                         </div>
                     )}

                     {/* Product Hits */}
                     <div className="p-2">
                         <p className="text-[10px] uppercase font-bold text-gray-500 px-3 py-1">Produits trouvés</p>
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
                                     <h4 className="text-sm font-bold text-gray-200 group-hover:text-white truncate">{p.name}</h4>
                                     <div className="flex items-center gap-2">
                                         <span className="text-xs text-xeption-gold font-mono">{p.price.toLocaleString()} FCFA</span>
                                         {p.stock <= 0 && <span className="text-[9px] text-red-500 font-bold border border-red-500/30 px-1 rounded">Rupture</span>}
                                     </div>
                                 </div>
                                 <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-xeption-gold -translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all" />
                             </button>
                         ))}
                     </div>
                     
                     <div className="p-2 bg-black/40 text-center border-t border-white/5">
                         <button onClick={() => handleNav('shop')} className="text-xs text-gray-400 hover:text-white transition-colors">
                             Voir tous les résultats pour "{searchQuery}"
                         </button>
                     </div>
                 </div>
             )}
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`relative px-4 py-2 rounded text-sm font-bold tracking-wide transition-all duration-300 font-tech uppercase ${
                  currentPage === item.id
                    ? 'text-xeption-gold bg-white/5 border-b-2 border-xeption-gold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Icons */}
          <div className={`flex items-center space-x-4 md:space-x-6 ${isSearchOpen ? 'hidden md:flex' : 'flex'}`}>
             
             {/* Mobile Search Toggle */}
             <button 
                className="md:hidden text-gray-400 hover:text-white"
                onClick={() => setIsSearchOpen(true)}
             >
                 <Search className="w-6 h-6" />
             </button>

             {/* Staff Access Shortcut (Desktop) */}
             <button 
                onClick={() => handleNav('admin')}
                className="hidden md:block p-2 text-gray-600 hover:text-xeption-gold transition-colors opacity-70 hover:opacity-100"
                title="Accès ERP Staff"
             >
                <Lock className="h-5 w-5" />
             </button>

             {/* Cart Trigger */}
            <button 
              onClick={onOpenCart}
              className="relative group p-2 text-gray-400 hover:text-xeption-gold transition-colors"
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
                className="p-2 text-gray-300 hover:text-white"
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
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`block w-full text-left px-4 py-3 rounded-lg text-lg font-tech uppercase font-bold tracking-wider ${
                  currentPage === item.id
                    ? 'text-xeption-gold bg-white/5 border-l-4 border-xeption-gold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
            
            {/* Staff Link Mobile */}
            <button 
                onClick={() => handleNav('admin')}
                className="block w-full text-left px-4 py-3 rounded-lg text-sm font-tech uppercase font-bold tracking-wider text-gray-600 hover:text-xeption-gold hover:bg-white/5 border-t border-white/5 mt-4 flex items-center gap-2"
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
