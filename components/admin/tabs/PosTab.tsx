
import React, { useState, useMemo } from 'react';
import { Box, User, Phone, Mail, ShoppingCart, Grid, CheckCircle, Printer, ArrowRight, Search, SlidersHorizontal, Filter, X } from 'lucide-react';
import { Product, CartItem, Order, Category } from '../../../types';
import { generateInvoiceHTML } from '../../../utils/invoiceGenerator';

interface PosTabProps {
  products: Product[];
  categories: Category[];
  posCart: CartItem[];
  posSearch: string;
  setPosSearch: (val: string) => void;
  posCustomer: { name: string; phone: string; email: string };
  setPosCustomer: (val: { name: string; phone: string; email: string }) => void;
  addToPosCart: (product: Product) => void;
  onPosSubmit: () => void;
  lastOrder: Order | null;
  onDismissSuccess: () => void;
}

const PosTab: React.FC<PosTabProps> = ({ 
    products, categories, posCart, posSearch, setPosSearch, 
    posCustomer, setPosCustomer, addToPosCart, onPosSubmit,
    lastOrder, onDismissSuccess 
}) => {
  const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name');

  const totalAmount = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = posCart.reduce((sum, item) => sum + item.quantity, 0);

  // --- FILTRAGE ET TRI ---
  const filteredProducts = useMemo(() => {
      let filtered = products.filter(p => {
          const matchSearch = p.name.toLowerCase().includes(posSearch.toLowerCase());
          const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
          return matchSearch && matchCat;
      });

      return filtered.sort((a, b) => {
          if (sortBy === 'price-asc') return a.price - b.price;
          if (sortBy === 'price-desc') return b.price - a.price;
          return a.name.localeCompare(b.name);
      });
  }, [products, posSearch, selectedCategory, sortBy]);

  const handlePrint = () => {
      if (!lastOrder) return;
      const html = generateInvoiceHTML(lastOrder);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          setTimeout(() => { 
              printWindow.focus(); 
              printWindow.print(); 
              printWindow.close(); 
          }, 500);
      }
  };

  if (lastOrder) {
      return (
          <div className="h-full flex items-center justify-center animate-in zoom-in-95 duration-300">
              <div className="bg-black/80 backdrop-blur-xl border border-xeption-gold/30 p-8 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-md w-full text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-xeption-gold to-transparent"></div>
                  <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-3xl font-tech font-bold uppercase text-white mb-2">Vente Validée !</h2>
                  <p className="text-gray-400 text-sm mb-6">Commande #{lastOrder.id} enregistrée.</p>
                  <div className="space-y-3">
                      <button onClick={handlePrint} className="w-full bg-white text-black font-bold uppercase py-4 rounded-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"><Printer className="w-5 h-5" /> Imprimer Facture</button>
                      <button onClick={onDismissSuccess} className="w-full bg-xeption-gold/10 text-xeption-gold border border-xeption-gold/30 font-bold uppercase py-4 rounded-sm flex items-center justify-center gap-2 hover:bg-xeption-gold hover:text-black transition-all">Nouvelle Vente <ArrowRight className="w-5 h-5" /></button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="animate-in fade-in h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] flex flex-col lg:grid lg:grid-cols-3 gap-6 relative">
        
        {/* MOBILE TOGGLE SWITCHER */}
        <div className="lg:hidden flex bg-black/40 p-1 rounded-sm mb-2 border border-white/10 shrink-0">
           <button onClick={() => setMobileView('catalog')} className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 rounded-sm transition-all ${mobileView === 'catalog' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}><Grid className="w-4 h-4" /> Catalogue</button>
           <button onClick={() => setMobileView('cart')} className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 rounded-sm transition-all ${mobileView === 'cart' ? 'bg-xeption-gold text-black' : 'text-gray-400 hover:text-white'}`}><ShoppingCart className="w-4 h-4" /> Panier ({totalItems})</button>
        </div>

        {/* CATALOGUE (Left) - Scrollable Area */}
        <div className={`lg:col-span-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-sm shadow-xl flex flex-col overflow-hidden ${mobileView === 'cart' ? 'hidden lg:flex' : 'flex'} h-full`}>
            
            {/* HEADER STICKY : RECHERCHE & FILTRES */}
            <div className="p-4 border-b border-white/10 bg-[#0c0c0e] shrink-0 sticky top-0 z-20 shadow-md">
                
                {/* Ligne 1: Recherche & Tri */}
                <div className="flex gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text" 
                            value={posSearch} 
                            onChange={(e) => setPosSearch(e.target.value)} 
                            placeholder="Rechercher (Nom, Marque)..." 
                            className="bg-black/50 border border-white/10 text-white pl-10 pr-4 py-2.5 rounded-sm text-sm focus:border-xeption-gold outline-none w-full" 
                        />
                        {posSearch && <button onClick={() => setPosSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X className="w-3 h-3"/></button>}
                    </div>
                    
                    <div className="relative">
                        <select 
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-black/50 border border-white/10 text-white pl-3 pr-8 py-2.5 rounded-sm text-sm focus:border-xeption-gold outline-none appearance-none font-bold uppercase cursor-pointer"
                        >
                            <option value="name">Nom (A-Z)</option>
                            <option value="price-asc">Prix (Min-Max)</option>
                            <option value="price-desc">Prix (Max-Min)</option>
                        </select>
                        <SlidersHorizontal className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                {/* Ligne 2: Catégories (Chips) - Horizontal Scroll */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mask-right">
                    <button 
                        onClick={() => setSelectedCategory('all')} 
                        className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-all border ${selectedCategory === 'all' ? 'bg-xeption-gold text-black border-xeption-gold' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30'}`}
                    >
                        Tout
                    </button>
                    {categories.map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.slug)} 
                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-all border ${selectedCategory === cat.slug ? 'bg-xeption-gold text-black border-xeption-gold' : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* GRILLE PRODUITS - SCROLLABLE */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 content-start pb-20 lg:pb-4 custom-scrollbar">
                {filteredProducts.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-500">
                        <Box className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                        <p>Aucun produit trouvé.</p>
                    </div>
                ) : (
                    filteredProducts.map(p => (
                        <button 
                            key={p.id} 
                            onClick={() => addToPosCart(p)} 
                            disabled={p.stock<=0} 
                            className={`bg-[#18181b] border border-white/5 p-2 rounded-sm hover:border-xeption-gold/50 text-left flex flex-col h-full group transition-all active:scale-95 relative overflow-hidden ${p.stock <= 0 ? 'opacity-60 grayscale' : ''}`}
                        >
                            {/* Pastille Stock */}
                            <div className={`absolute top-2 left-2 w-2 h-2 rounded-full z-10 shadow-lg ${p.stock > 5 ? 'bg-green-500' : p.stock > 0 ? 'bg-orange-500' : 'bg-red-500'}`}></div>

                            <div className="aspect-square bg-black rounded-sm mb-2 relative overflow-hidden">
                                <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name}/>
                                {p.stock<=0 && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-xs text-red-500 font-bold backdrop-blur-sm uppercase tracking-widest border border-red-500/30">Rupture</div>}
                            </div>
                            
                            <h4 className="text-[11px] font-bold text-gray-200 line-clamp-2 leading-tight group-hover:text-white h-8 mb-1">{p.name}</h4>
                            
                            <div className="mt-auto pt-2 border-t border-white/5 flex justify-between items-end">
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-gray-500 uppercase">Stock: {p.stock}</span>
                                </div>
                                <span className="text-xs font-bold text-xeption-gold font-mono">{p.price.toLocaleString()}</span>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>

        {/* PANIER (Right) - Fixed Height & Scrollable Items */}
        <div className={`bg-black/40 backdrop-blur-md border border-white/10 rounded-sm shadow-xl flex-col overflow-hidden ${mobileView === 'catalog' ? 'hidden lg:flex' : 'flex'} h-full`}>
            <div className="p-4 border-b border-white/10 bg-[#0c0c0e] shrink-0 flex justify-between items-center">
                <h3 className="text-white font-bold uppercase text-sm">Panier</h3>
                <span className="bg-white/10 text-[10px] font-bold px-2 py-0.5 rounded text-white">{totalItems} items</span>
            </div>
            
            {/* Scrollable Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-black/20 min-h-0 custom-scrollbar">
                    {posCart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                            <ShoppingCart className="w-8 h-8 mb-2" />
                            <span className="text-xs uppercase font-bold">Panier vide</span>
                        </div>
                    ) : (
                        posCart.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-black/40 p-3 rounded-sm border border-white/5 hover:border-white/20 transition-colors">
                                <div className="flex-1 min-w-0 pr-2">
                                    <div className="text-xs font-bold text-white truncate">{item.name}</div>
                                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                                        {item.price.toLocaleString()} x <span className="text-xeption-gold font-bold text-sm">{item.quantity}</span>
                                    </div>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                    <span className="text-xs font-bold text-white">{(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                            </div>
                        ))
                    )}
            </div>

            {/* Footer Fixe */}
            <div className="p-4 bg-[#0c0c0e] border-t border-white/10 space-y-3 shrink-0 z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Client</div>
                
                <div className="flex gap-2 mb-2">
                    <input type="text" placeholder="Nom *" className="flex-1 bg-black/50 border border-white/10 px-3 py-2 text-xs text-white rounded-sm focus:border-xeption-gold outline-none" value={posCustomer.name} onChange={e => setPosCustomer({...posCustomer, name: e.target.value})} />
                    <input type="tel" placeholder="Tél *" className="w-1/3 bg-black/50 border border-white/10 px-3 py-2 text-xs text-white rounded-sm focus:border-xeption-gold outline-none" value={posCustomer.phone} onChange={e => setPosCustomer({...posCustomer, phone: e.target.value})} />
                </div>
                <input type="email" placeholder="Email (Facture)" className="w-full bg-black/50 border border-white/10 px-3 py-2 text-xs text-white rounded-sm focus:border-xeption-gold outline-none" value={posCustomer.email} onChange={e => setPosCustomer({...posCustomer, email: e.target.value})} />

                <div className="h-px bg-white/10 my-2"></div>

                <div className="flex justify-between items-end">
                    <span className="text-gray-400 text-xs font-bold uppercase">Total à payer</span>
                    <span className="text-2xl font-bold font-mono text-white tracking-tighter">
                        {totalAmount.toLocaleString()} <span className="text-xs text-xeption-gold align-top">FCFA</span>
                    </span>
                </div>
                
                <button onClick={onPosSubmit} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold uppercase py-3 rounded-sm shadow-lg hover:shadow-green-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Valider
                </button>
            </div>
        </div>
    </div>
  );
};

export default PosTab;
