
import React, { useState, useMemo } from 'react';
import { Box, User, Phone, Mail, ShoppingCart, Grid, CheckCircle, Printer, ArrowRight, Search, SlidersHorizontal, Filter, X, Building2, AlertTriangle } from 'lucide-react';
import { Product, CartItem, Order, Category, Brand, TradeInRequest } from '../../../types';
import { generateInvoiceHTML } from '../../../utils/invoiceGenerator';
import { optimizeImage } from '../../../utils/mediaOptimization';
import { POS_PAYMENT_OPTIONS, type PosPaymentMethod } from '../../../utils/paymentMethods';
import PosTrocPanel from '../pos/PosTrocPanel';
import {
  getBrandDisplayName,
  resolveProductBrandId,
  UNASSIGNED_BRAND_KEY,
} from '../../../utils/productBrand';

interface PosTabProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  posCart: CartItem[];
  posSearch: string;
  setPosSearch: (val: string) => void;
  posCustomer: { name: string; phone: string; email: string };
  setPosCustomer: (val: { name: string; phone: string; email: string }) => void;
  addToPosCart: (product: Product) => void;
  removeFromPosCart: (productId: string) => void;
  onPosSubmit: () => void;
  lastOrder: Order | null;
  onDismissSuccess: () => void;
  storeName: string | null;
  hasStore: boolean;
  paymentMethod: PosPaymentMethod;
  setPaymentMethod: (method: PosPaymentMethod) => void;
  discountAmount: number;
  setDiscountAmount: (amount: number) => void;
  subtotal: number;
  totalAmount: number;
  trocRequests: TradeInRequest[];
  onTrocSuccess: (orderId: string) => void;
}

const PosTab: React.FC<PosTabProps> = ({
    products,
    categories,
    brands,
    posCart,
    posSearch,
    setPosSearch,
    posCustomer,
    setPosCustomer,
    addToPosCart,
    removeFromPosCart,
    onPosSubmit,
    lastOrder,
    onDismissSuccess,
    storeName,
    hasStore,
    paymentMethod,
    setPaymentMethod,
    discountAmount,
    setDiscountAmount,
    subtotal,
    totalAmount,
    trocRequests,
    onTrocSuccess,
}) => {
  const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc'>('name');
  const isTrocMode = paymentMethod === 'TROC';

  const totalItems = posCart.reduce((sum, item) => sum + item.quantity, 0);

  // --- FILTRAGE ET TRI ---
  const getProductBrandLabel = (product: Product) => {
      const brandId = resolveProductBrandId(product, brands);
      return getBrandDisplayName(brandId ?? UNASSIGNED_BRAND_KEY, brands);
  };

  const filteredProducts = useMemo(() => {
      const q = posSearch.trim().toLowerCase();
      let filtered = products.filter((p) => {
          const brandLabel = getProductBrandLabel(p).toLowerCase();
          const matchSearch =
              !q ||
              p.name.toLowerCase().includes(q) ||
              brandLabel.includes(q);
          const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
          return matchSearch && matchCat;
      });

      return filtered.sort((a, b) => {
          if (sortBy === 'price-asc') return a.price - b.price;
          if (sortBy === 'price-desc') return b.price - a.price;
          return a.name.localeCompare(b.name);
      });
  }, [products, brands, posSearch, selectedCategory, sortBy]);

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
        {!hasStore && (
          <div className="lg:col-span-3 bg-amber-500/10 border border-amber-500/30 rounded-sm p-3 flex items-start gap-2 text-amber-200 text-sm shrink-0">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Aucune boutique rattachée à ton compte — la vente sera refusée tant que la direction ne t&apos;a pas assigné.</span>
          </div>
        )}

        {storeName && (
          <div className="lg:col-span-3 flex items-center gap-2 text-xs text-white/75 shrink-0">
            <Building2 className="h-3.5 w-3.5 text-xeption-gold" />
            <span>Caisse : <strong className="text-white">{storeName}</strong></span>
          </div>
        )}
        
        {/* MOBILE TOGGLE SWITCHER */}
        <div className="lg:hidden flex bg-black/40 p-1 rounded-sm mb-2 border border-white/10 shrink-0">
           <button onClick={() => setMobileView('catalog')} className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 rounded-sm transition-all ${mobileView === 'catalog' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}><Grid className="w-4 h-4" /> Catalogue</button>
           <button onClick={() => setMobileView('cart')} className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 rounded-sm transition-all ${mobileView === 'cart' ? 'bg-xeption-gold text-black' : 'text-gray-400 hover:text-white'}`}><ShoppingCart className="w-4 h-4" /> Panier ({totalItems})</button>
        </div>

        {/* CATALOGUE (Left) - SCROLLABLE AREA */}
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
                        className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-all border ${selectedCategory === 'all' ? 'bg-xeption-gold text-black border-xeption-gold' : 'bg-white/5 text-white border-white/20 hover:border-white/40'}`}
                    >
                        Tout
                    </button>
                    {categories.map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.slug)} 
                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap transition-all border ${selectedCategory === cat.slug ? 'bg-xeption-gold text-black border-xeption-gold' : 'bg-white/5 text-white border-white/20 hover:border-white/40'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* GRILLE PRODUITS — scroll sur le wrapper, pas sur la grid (sinon flex-1 écrase les lignes) */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-20 lg:pb-4">
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 content-start items-start">
                {filteredProducts.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-white/60">
                        <Box className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                        <p>Aucun produit trouvé.</p>
                    </div>
                ) : (
                    filteredProducts.map((p) => {
                        const brandLabel = getProductBrandLabel(p);
                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => addToPosCart(p)}
                                disabled={p.stock <= 0}
                                className={`bg-[#111214] border border-white/10 rounded-sm hover:border-xeption-gold/50 text-left flex flex-col w-full min-w-0 overflow-hidden isolate group transition-all active:scale-[0.98] ${p.stock <= 0 ? 'opacity-60 grayscale' : ''}`}
                            >
                                <div className="relative h-28 bg-black shrink-0 overflow-hidden">
                                    <img
                                        src={optimizeImage(p.image, 280)}
                                        className="w-full h-full object-contain p-2 pointer-events-none"
                                        alt=""
                                    />

                                    <div
                                        className={`absolute top-2 left-2 w-2.5 h-2.5 rounded-full z-10 shadow-lg ${p.stock > 5 ? 'bg-green-500' : p.stock > 0 ? 'bg-orange-500' : 'bg-red-500'}`}
                                        aria-hidden
                                    />

                                    {p.stock <= 0 && (
                                        <div className="absolute inset-0 z-20 bg-black/75 flex items-center justify-center text-xs text-red-400 font-bold uppercase tracking-widest">
                                            Rupture
                                        </div>
                                    )}
                                </div>

                                <div className="px-2.5 py-2 bg-[#0c0c0e] border-t border-white/10 shrink-0 min-h-[3.25rem]">
                                    <p className="text-[9px] font-tech uppercase tracking-[0.18em] text-xeption-gold leading-none mb-1 truncate">
                                        {brandLabel}
                                    </p>
                                    <p className="text-[11px] font-bold text-white font-tech uppercase leading-snug line-clamp-2">
                                        {p.name}
                                    </p>
                                </div>

                                <div className="px-2.5 py-2 bg-[#09090b] border-t border-white/15 flex justify-between items-center gap-2 shrink-0">
                                    <span
                                        className={`text-xs font-bold uppercase font-mono tracking-wide ${
                                            (p.stock ?? 0) > 5
                                                ? 'text-emerald-400'
                                                : (p.stock ?? 0) > 0
                                                  ? 'text-amber-300'
                                                  : 'text-red-400'
                                        }`}
                                    >
                                        Stock {(p.stock ?? 0)}
                                    </span>
                                    <span className="text-sm font-bold text-xeption-gold font-mono whitespace-nowrap">
                                        {(p.price ?? 0).toLocaleString('fr-FR')} F
                                    </span>
                                </div>
                            </button>
                        );
                    })
                )}
                </div>
            </div>
        </div>

        {/* PANIER (Right) - FIXED HEIGHT & SCROLLABLE ITEMS */}
        <div className={`bg-black/40 backdrop-blur-md border border-white/10 rounded-sm shadow-xl flex flex-col overflow-hidden ${mobileView === 'catalog' ? 'hidden lg:flex' : 'flex'} h-full`}>
            <div className="p-4 border-b border-white/10 bg-[#0c0c0e] shrink-0 flex justify-between items-center">
                <h3 className="text-white font-bold uppercase text-sm">Panier</h3>
                <span className="bg-white/10 text-[10px] font-bold px-2 py-0.5 rounded text-white">{totalItems} items</span>
            </div>
            
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-black/20">
                <div className="p-4 space-y-2">
                    {posCart.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-white/40">
                            <ShoppingCart className="w-8 h-8 mb-2" />
                            <span className="text-xs uppercase font-bold">Panier vide</span>
                        </div>
                    ) : (
                        posCart.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-2 bg-black/40 p-3 rounded-sm border border-white/5 hover:border-white/20 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-white truncate">{item.name}</div>
                                    <div className="text-[10px] text-white/85 font-mono mt-0.5">
                                        {item.price.toLocaleString('fr-FR')} x{' '}
                                        <span className="text-xeption-gold font-bold text-sm">{item.quantity}</span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-white font-mono whitespace-nowrap shrink-0">
                                    {(item.price * item.quantity).toLocaleString('fr-FR')}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeFromPosCart(item.id)}
                                    className="shrink-0 p-1 rounded-sm bg-red-600 text-white border-2 border-white shadow-sm hover:bg-red-500 transition-colors"
                                    title="Retirer du panier"
                                    aria-label={`Retirer ${item.name} du panier`}
                                >
                                    <X className="w-3.5 h-3.5" strokeWidth={3} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Footer Fixe */}
            <div className="p-4 bg-[#0c0c0e] border-t border-white/10 space-y-3 shrink-0 z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                <div className="text-[10px] uppercase font-bold tracking-wider text-white mb-1">Client</div>
                
                <div className="flex gap-2 mb-2">
                    <input type="text" placeholder="Nom *" className="flex-1 bg-black/50 border border-white/25 px-3 py-2 text-xs font-medium text-white placeholder:text-white/75 rounded-sm focus:border-xeption-gold outline-none" value={posCustomer.name} onChange={e => setPosCustomer({...posCustomer, name: e.target.value})} />
                    <input type="tel" placeholder="Tél *" className="w-1/3 bg-black/50 border border-white/25 px-3 py-2 text-xs font-medium text-white placeholder:text-white/75 rounded-sm focus:border-xeption-gold outline-none" value={posCustomer.phone} onChange={e => setPosCustomer({...posCustomer, phone: e.target.value})} />
                </div>
                <input type="email" placeholder="Email (Facture)" className="w-full bg-black/50 border border-white/25 px-3 py-2 text-xs font-medium text-white placeholder:text-white/75 rounded-sm focus:border-xeption-gold outline-none" value={posCustomer.email} onChange={e => setPosCustomer({...posCustomer, email: e.target.value})} />

                <div className="h-px bg-white/10 my-2"></div>

                <div className="text-[10px] uppercase font-bold tracking-wider text-white mb-1">Paiement</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {POS_PAYMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPaymentMethod(opt.id)}
                      className={`text-[10px] font-bold uppercase px-2 py-1.5 rounded border transition-colors ${
                        paymentMethod === opt.id
                          ? 'bg-xeption-gold text-black border-xeption-gold'
                          : 'border-white/20 text-white/75 hover:border-white/40'
                      }`}
                    >
                      {opt.shortLabel}
                    </button>
                  ))}
                </div>

                {isTrocMode ? (
                  <PosTrocPanel
                    requests={trocRequests}
                    onSuccess={onTrocSuccess}
                    onCancel={() => setPaymentMethod('CASH')}
                  />
                ) : (
                  <>
                <div className="flex gap-2 items-center mb-2">
                  <label className="text-[10px] uppercase font-bold text-white/70 shrink-0">Remise</label>
                  <input
                    type="number"
                    min={0}
                    max={subtotal}
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    className="flex-1 bg-black/50 border border-white/25 px-3 py-2 text-xs text-white rounded-sm focus:border-xeption-gold outline-none font-mono"
                  />
                  <span className="text-[10px] text-white/50">FCFA</span>
                </div>

                <div className="flex justify-between items-center text-xs text-white/65 mb-1">
                  <span>Sous-total</span>
                  <span className="font-mono">{subtotal.toLocaleString('fr-FR')} F</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs text-amber-300 mb-1">
                    <span>Remise</span>
                    <span className="font-mono">−{Math.min(discountAmount, subtotal).toLocaleString('fr-FR')} F</span>
                  </div>
                )}

                <div className="flex justify-between items-end">
                    <span className="text-white text-xs font-bold uppercase tracking-wide">Total à payer</span>
                    <span className="text-2xl font-bold font-mono text-white tracking-tighter">
                        {totalAmount.toLocaleString()} <span className="text-xs text-xeption-gold align-top">FCFA</span>
                    </span>
                </div>
                
                <button onClick={onPosSubmit} disabled={!hasStore} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold uppercase py-3 rounded-sm shadow-lg hover:shadow-green-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Valider
                </button>
                  </>
                )}
            </div>
        </div>
    </div>
  );
};

export default PosTab;
