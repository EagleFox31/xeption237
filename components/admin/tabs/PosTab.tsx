
import React, { useState } from 'react';
import { Box, User, Phone, Mail, ShoppingCart, Grid, CheckCircle, Printer, ArrowRight } from 'lucide-react';
import { Product, CartItem, Order } from '../../../types';
import { generateInvoiceHTML } from '../../../utils/invoiceGenerator';

interface PosTabProps {
  products: Product[];
  posCart: CartItem[];
  posSearch: string;
  setPosSearch: (val: string) => void;
  posCustomer: { name: string; phone: string; email: string };
  setPosCustomer: (val: { name: string; phone: string; email: string }) => void;
  addToPosCart: (product: Product) => void;
  onPosSubmit: () => void;
  lastOrder: Order | null; // Nouvelle prop
  onDismissSuccess: () => void; // Nouvelle prop
}

const PosTab: React.FC<PosTabProps> = ({ 
    products, posCart, posSearch, setPosSearch, 
    posCustomer, setPosCustomer, addToPosCart, onPosSubmit,
    lastOrder, onDismissSuccess 
}) => {
  // État pour gérer la vue mobile (Catalogue vs Panier)
  const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog');

  const totalAmount = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = posCart.reduce((sum, item) => sum + item.quantity, 0);

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

  // --- ECRAN DE SUCCES ---
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
                  
                  <div className="bg-white/5 rounded p-4 mb-8 border border-white/5">
                      <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Client</span>
                          <span className="text-white font-bold">{lastOrder.customerName}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Articles</span>
                          <span className="text-white">{lastOrder.items.length}</span>
                      </div>
                      <div className="flex justify-between text-xl border-t border-white/10 pt-2 mt-2">
                          <span className="text-xeption-gold font-bold uppercase">Total</span>
                          <span className="text-white font-mono font-bold">{lastOrder.total.toLocaleString()} FCFA</span>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <button 
                          onClick={handlePrint}
                          className="w-full bg-white text-black font-bold uppercase py-4 rounded-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                      >
                          <Printer className="w-5 h-5" /> Imprimer Facture
                      </button>
                      <button 
                          onClick={onDismissSuccess}
                          className="w-full bg-xeption-gold/10 text-xeption-gold border border-xeption-gold/30 font-bold uppercase py-4 rounded-sm flex items-center justify-center gap-2 hover:bg-xeption-gold hover:text-black transition-all"
                      >
                          Nouvelle Vente <ArrowRight className="w-5 h-5" />
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- ECRAN POS STANDARD ---
  return (
    <div className="animate-in fade-in h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] flex flex-col lg:grid lg:grid-cols-3 gap-6 relative">
        
        {/* MOBILE TOGGLE SWITCHER */}
        <div className="lg:hidden flex bg-black/40 p-1 rounded-sm mb-2 border border-white/10 shrink-0">
           <button 
             onClick={() => setMobileView('catalog')} 
             className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 rounded-sm transition-all ${mobileView === 'catalog' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
           >
             <Grid className="w-4 h-4" /> Catalogue
           </button>
           <button 
             onClick={() => setMobileView('cart')} 
             className={`flex-1 py-3 text-xs font-bold uppercase flex items-center justify-center gap-2 rounded-sm transition-all ${mobileView === 'cart' ? 'bg-xeption-gold text-black' : 'text-gray-400 hover:text-white'}`}
           >
              <ShoppingCart className="w-4 h-4" /> Panier ({totalItems})
           </button>
        </div>

        {/* CATALOGUE (Visible si Desktop OU si mobileView == 'catalog') */}
        <div className={`lg:col-span-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-sm shadow-xl flex-col overflow-hidden ${mobileView === 'cart' ? 'hidden lg:flex' : 'flex'} h-full`}>
            <div className="p-4 border-b border-white/10 bg-black/40 flex justify-between items-center shrink-0">
                <h3 className="text-white font-bold uppercase text-sm flex items-center gap-2"><Box className="w-4 h-4 text-blue-400" /> Catalogue</h3>
                <input type="text" value={posSearch} onChange={(e) => setPosSearch(e.target.value)} placeholder="Chercher produit..." className="bg-black/50 border border-white/10 px-3 py-1 text-sm text-white rounded-sm w-32 md:w-48 focus:border-xeption-gold outline-none" />
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start pb-20 lg:pb-4">
                {products.filter(p=>p.name.toLowerCase().includes(posSearch.toLowerCase())).map(p => (
                    <button 
                        key={p.id} 
                        onClick={() => {
                            addToPosCart(p);
                        }} 
                        disabled={p.stock<=0} 
                        className="bg-black/40 border border-white/5 p-3 rounded-sm hover:border-xeption-gold/50 text-left flex flex-col h-full group transition-all active:scale-95"
                    >
                        <div className="aspect-square bg-black rounded-sm mb-2 relative overflow-hidden">
                            <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.name}/>
                            {p.stock<=0 && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-xs text-red-500 font-bold backdrop-blur-sm">Rupture</div>}
                        </div>
                        <h4 className="text-xs font-bold text-gray-200 line-clamp-1 group-hover:text-xeption-gold">{p.name}</h4>
                        <div className="flex justify-between items-center mt-1">
                             <span className="text-[10px] text-gray-500">Stock: {p.stock}</span>
                             <span className="text-[10px] font-bold text-white">{p.price.toLocaleString()}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* PANIER & CLIENT (Visible si Desktop OU si mobileView == 'cart') */}
        <div className={`bg-black/40 backdrop-blur-md border border-white/10 rounded-sm shadow-xl flex-col overflow-hidden ${mobileView === 'catalog' ? 'hidden lg:flex' : 'flex'} h-full`}>
            <div className="p-4 border-b border-white/10 bg-black/40 shrink-0"><h3 className="text-white font-bold uppercase text-sm">Panier En Cours</h3></div>
            
            {/* Zone Scrollable des articles : flex-1 pour prendre tout l'espace disponible */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-black/20 min-h-0">
                    {posCart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                            <Box className="w-8 h-8 mb-2" />
                            <span className="text-xs uppercase font-bold">Panier vide</span>
                        </div>
                    ) : (
                        posCart.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-black/40 p-3 rounded-sm border border-white/5 hover:border-white/20 transition-colors">
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-white line-clamp-2 mb-1">{item.name}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">
                                        {item.price.toLocaleString()} x <span className="text-xeption-gold font-bold text-sm">{item.quantity}</span>
                                    </div>
                                </div>
                                <div className="text-right pl-2 flex flex-col items-end">
                                    <span className="text-xs font-bold text-white mb-1">{(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                            </div>
                        ))
                    )}
            </div>

            {/* Zone Formulaire Client : Fixe en bas */}
            <div className="p-4 bg-black/40 border-t border-white/10 space-y-3 shrink-0 z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">Informations Client</div>
                
                <div className="relative">
                    <User className="absolute left-3 top-2.5 w-3 h-3 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="Nom du Client *" 
                        className="w-full bg-black/50 border border-white/10 pl-8 pr-3 py-2 text-xs text-white rounded-sm focus:border-xeption-gold outline-none" 
                        value={posCustomer.name} 
                        onChange={e => setPosCustomer({...posCustomer, name: e.target.value})} 
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-3 h-3 text-gray-500" />
                        <input 
                            type="tel" 
                            placeholder="Téléphone *" 
                            className="w-full bg-black/50 border border-white/10 pl-8 pr-3 py-2 text-xs text-white rounded-sm focus:border-xeption-gold outline-none" 
                            value={posCustomer.phone} 
                            onChange={e => setPosCustomer({...posCustomer, phone: e.target.value})} 
                        />
                    </div>
                    <div className="relative">
                        <Mail className="absolute left-3 top-2.5 w-3 h-3 text-gray-500" />
                        <input 
                            type="email" 
                            placeholder="Email" 
                            className="w-full bg-black/50 border border-white/10 pl-8 pr-3 py-2 text-xs text-white rounded-sm focus:border-xeption-gold outline-none" 
                            value={posCustomer.email} 
                            onChange={e => setPosCustomer({...posCustomer, email: e.target.value})} 
                        />
                    </div>
                </div>

                <div className="h-px bg-white/10 my-2"></div>

                <div className="flex justify-between items-end">
                    <span className="text-gray-400 text-xs font-bold uppercase">Total à payer</span>
                    <span className="text-2xl font-bold font-mono text-white tracking-tighter">
                        {totalAmount.toLocaleString()} <span className="text-xs text-xeption-gold align-top">FCFA</span>
                    </span>
                </div>
                
                <button 
                    onClick={onPosSubmit} 
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold uppercase py-3 rounded-sm shadow-lg hover:shadow-green-500/20 transition-all active:scale-95"
                >
                    Valider la Vente
                </button>
            </div>
        </div>
    </div>
  );
};

export default PosTab;
