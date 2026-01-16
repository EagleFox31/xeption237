
import React, { useState } from 'react';
import { ShoppingCart, Menu, X, Smartphone, Zap, Search } from 'lucide-react';
import Logo from './Logo';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

const Header: React.FC<HeaderProps> = ({ cartCount, onOpenCart, onNavigate, currentPage }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Accueil' },
    { id: 'shop', label: 'Le Shop' },
    { id: 'troc', label: 'Troc Zone' },
    { id: 'tracking', label: 'Suivi' },
    { id: 'sav', label: 'SAV' },
    // Staff removed from public header
  ];

  const handleNav = (page: string) => {
    onNavigate(page);
    setIsMenuOpen(false);
  };

  return (
    // Changed sticky to fixed, added top-0 left-0 right-0 to ensure it stays at top
    <header className="fixed top-0 left-0 right-0 z-[100] w-full bg-black/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300 supports-[backdrop-filter]:bg-black/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div 
            className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => handleNav('home')}
          >
            <Logo />
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
                {currentPage === item.id && (
                  <span className="absolute inset-0 bg-xeption-gold/5 blur-sm rounded"></span>
                )}
              </button>
            ))}
          </nav>

          {/* Right Icons */}
          <div className="flex items-center space-x-6">
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
        <div className="md:hidden bg-black/95 backdrop-blur-xl border-t border-gray-800 animate-in slide-in-from-top-5 absolute w-full left-0 border-b border-xeption-gold/20">
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
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
