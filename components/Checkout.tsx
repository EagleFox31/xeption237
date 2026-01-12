
import React, { useState } from 'react';
import { CartItem, PaymentMethod } from '../types';
import { PAYMENT_DETAILS } from '../constants';
import { supabase } from '../services/supabaseClient';
import { X, Smartphone, CheckCircle, ShieldCheck, Minus, Plus, ShoppingBag, ArrowRight, Lock, MapPin, Truck, Store, Loader2 } from 'lucide-react';

interface CheckoutProps {
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearCart: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ cart, isOpen, onClose, onRemoveItem, onUpdateQuantity, onClearCart }) => {
  const [step, setStep] = useState<'cart' | 'details' | 'payment' | 'success'>('cart');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', phone: '', city: '' });

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = deliveryMode === 'pickup' ? 0 : 2000;
  const total = subtotal + (cart.length > 0 ? deliveryFee : 0);

  if (!isOpen) return null;

  const handleNext = async () => {
    if (step === 'cart' && cart.length > 0) setStep('details');
    else if (step === 'details' && formData.name && formData.phone) {
        if (deliveryMode === 'delivery' && !formData.city) {
            alert("Veuillez entrer votre ville/quartier pour la livraison.");
            return;
        }
        setStep('payment');
    }
    else if (step === 'payment' && selectedPayment) {
        await submitOrder();
    }
  };

  const submitOrder = async () => {
      setIsProcessing(true);
      try {
          const orderData = {
              id: `ORD-${Date.now().toString().slice(-6)}`,
              customer_name: formData.name,
              customer_phone: formData.phone,
              customer_city: deliveryMode === 'pickup' ? 'Retrait Boutique' : formData.city,
              delivery_mode: deliveryMode,
              total: total,
              status: 'pending',
              payment_method: selectedPayment,
              items: cart // Supabase stores JSONB
          };

          const { error } = await supabase.from('orders').insert([orderData]);
          
          if (error) throw error;
          
          setStep('success');
      } catch (err) {
          console.error("Order error", err);
          alert("Erreur lors de la commande. Veuillez réessayer.");
      } finally {
          setIsProcessing(false);
      }
  };

  const StepIndicator = () => (
    <div className="flex justify-center items-center gap-4 mb-8 text-sm font-tech uppercase tracking-widest">
        <span className={`${step === 'cart' ? 'text-xeption-gold font-bold' : 'text-gray-400/70'}`}>1. Panier</span>
        <span className="text-gray-500">/</span>
        <span className={`${step === 'details' ? 'text-xeption-gold font-bold' : 'text-gray-400/70'}`}>2. Infos</span>
        <span className="text-gray-500">/</span>
        <span className={`${step === 'payment' ? 'text-xeption-gold font-bold' : 'text-gray-400/70'}`}>3. Paiement</span>
    </div>
  );

  const renderCart = () => (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto w-full">
      {/* LEFT COLUMN: PRODUCT LIST */}
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white font-tech uppercase drop-shadow-md">Mon Panier <span className="text-gray-400 text-lg">({cart.length} articles)</span></h2>
        </div>

        {cart.length === 0 ? (
            <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-lg p-20 text-center flex flex-col items-center shadow-xl">
              <ShoppingBag className="h-16 w-16 text-gray-500 mb-4" />
              <p className="text-gray-300 font-tech text-xl uppercase mb-6">Votre panier est vide</p>
              <button 
                onClick={onClose}
                className="px-8 py-3 bg-white/10 hover:bg-xeption-gold hover:text-black text-white border border-white/10 transition-colors uppercase font-bold text-xs tracking-widest"
              >
                Découvrir nos produits
              </button>
            </div>
        ) : (
            <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden shadow-2xl">
                {cart.map((item) => (
                    <div key={item.id} className="p-6 border-b border-white/5 hover:bg-white/5 transition-colors group flex flex-col sm:flex-row items-center gap-6">
                        {/* Product Image */}
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-lg p-2 flex-shrink-0 relative overflow-hidden">
                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 text-center sm:text-left">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                                <h4 className="text-white font-bold font-tech uppercase tracking-wide text-lg">{item.name}</h4>
                                <p className="text-white font-bold text-xl font-mono sm:hidden mt-2">
                                    {(item.price * item.quantity).toLocaleString('fr-FR')} <span className="text-xeption-gold text-xs">FCFA</span>
                                </p>
                            </div>
                            <p className="text-gray-400 text-sm mb-4 line-clamp-1">{item.description}</p>
                            
                            <div className="flex items-center justify-center sm:justify-between">
                                {/* Qty Controls */}
                                <div className="flex items-center bg-black/50 border border-gray-600 rounded-full px-1">
                                    <button onClick={() => onUpdateQuantity(item.id, -1)} className="p-2 text-gray-400 hover:text-white transition-colors">
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-8 text-center text-sm font-bold font-mono text-white">{item.quantity}</span>
                                    <button onClick={() => onUpdateQuantity(item.id, 1)} className="p-2 text-gray-400 hover:text-white transition-colors">
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                                
                                <button 
                                    onClick={() => onRemoveItem(item.id)}
                                    className="ml-4 text-sm text-red-400/70 hover:text-red-400 underline decoration-red-400/30 font-bold uppercase text-[10px] tracking-widest"
                                >
                                    Retirer
                                </button>
                            </div>
                        </div>

                        {/* Price Desktop */}
                        <div className="hidden sm:block text-right min-w-[120px]">
                             <p className="text-white font-bold text-xl font-mono">
                                {(item.price * item.quantity).toLocaleString('fr-FR')} 
                            </p>
                            <p className="text-xeption-gold text-xs font-bold">FCFA</p>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* RIGHT COLUMN: SUMMARY */}
      {cart.length > 0 && (
        <div className="w-full lg:w-[400px]">
            <div className="bg-black/50 backdrop-blur-xl border border-white/10 p-8 sticky top-8 shadow-2xl rounded-sm">
                
                {/* DELIVERY TOGGLE */}
                <div className="flex bg-black/60 p-1 rounded-sm mb-6 border border-white/10">
                    <button 
                        onClick={() => setDeliveryMode('delivery')}
                        className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-sm ${deliveryMode === 'delivery' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Truck className="h-4 w-4" /> Livraison
                    </button>
                    <button 
                         onClick={() => setDeliveryMode('pickup')}
                         className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-sm ${deliveryMode === 'pickup' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Store className="h-4 w-4" /> Retrait
                    </button>
                </div>

                <h3 className="text-xl font-bold text-white font-tech uppercase mb-6 border-b border-white/10 pb-4">Résumé</h3>
                
                <div className="space-y-4 mb-8 text-sm">
                    <div className="flex justify-between text-gray-400">
                        <span>Sous-total</span>
                        <span className="font-mono text-white">{subtotal.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    
                    <div className="flex justify-between text-gray-400">
                        <span>
                            {deliveryMode === 'delivery' ? 'Livraison (Douala/Yde)' : 'Frais de retrait'}
                        </span>
                        <span className={`font-mono ${deliveryMode === 'pickup' ? 'text-xeption-gold' : 'text-white'}`}>
                            {deliveryMode === 'pickup' ? 'GRATUIT' : `${deliveryFee.toLocaleString('fr-FR')} FCFA`}
                        </span>
                    </div>
                     <div className="flex justify-between text-xeption-gold">
                        <span>Remise Promo</span>
                        <span className="font-mono">- 0 FCFA</span>
                    </div>
                    
                    <div className="border-t border-dashed border-white/20 pt-4 mt-4">
                        <div className="flex justify-between items-end">
                            <span className="text-white font-bold uppercase tracking-wider">Total à payer</span>
                            <div className="text-right">
                                <span className="block text-3xl font-bold text-white font-tech">{total.toLocaleString('fr-FR')}</span>
                                <span className="text-xeption-gold text-xs font-bold">FCFA TTC</span>
                            </div>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleNext}
                    className="w-full bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-wider py-4 text-lg shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all flex items-center justify-center gap-2 group"
                >
                    Commander
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
      )}
    </div>
  );

  const renderDetails = () => (
    <div className="max-w-2xl mx-auto w-full bg-black/50 backdrop-blur-xl border border-white/10 p-8 sm:p-12 shadow-2xl relative rounded-sm">
      <div className="flex items-center space-x-2 text-xeption-gold mb-8 justify-center">
         <ShieldCheck className="h-6 w-6" />
         <span className="text-sm font-bold uppercase tracking-widest">Informations Client</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-400 uppercase font-bold mb-2 ml-1">Nom complet</label>
          <input 
            type="text" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full bg-black/40 border border-white/10 text-white p-4 focus:border-xeption-gold focus:bg-black/60 outline-none transition-all placeholder-gray-600"
            placeholder="Ex: Samuel Eto'o"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase font-bold mb-2 ml-1">WhatsApp / Tél</label>
          <input 
            type="tel" 
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            className="w-full bg-black/40 border border-white/10 text-white p-4 focus:border-xeption-gold focus:bg-black/60 outline-none transition-all placeholder-gray-600"
            placeholder="Ex: 699..."
          />
        </div>
        
        {deliveryMode === 'delivery' ? (
             <div className="md:col-span-2">
                <label className="block text-xs text-gray-400 uppercase font-bold mb-2 ml-1">Adresse de livraison (Ville, Quartier)</label>
                <input 
                    type="text" 
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 text-white p-4 focus:border-xeption-gold focus:bg-black/60 outline-none transition-all placeholder-gray-600"
                    placeholder="Ex: Douala, Bonapriso, Rue des Palmiers"
                />
            </div>
        ) : (
            <div className="md:col-span-2 bg-white/5 border border-white/10 p-4 rounded-sm flex items-start gap-3">
                <MapPin className="h-5 w-5 text-xeption-gold mt-1" />
                <div>
                    <h4 className="text-white font-bold uppercase text-sm mb-1">Point de Retrait Xeption</h4>
                    <p className="text-gray-400 text-sm">Yaoundé, Mfoundi Mall</p>
                    <p className="text-gray-500 text-xs">À l'étage, Boutique 2063</p>
                </div>
            </div>
        )}
      </div>

      <div className="flex space-x-4 mt-10">
        <button onClick={() => setStep('cart')} className="px-8 py-4 text-gray-400 border border-white/10 hover:border-white hover:text-white font-bold uppercase text-xs tracking-widest transition-colors bg-black/20">Retour</button>
        <button onClick={handleNext} className="flex-1 bg-xeption-gold text-black font-bold py-4 font-tech uppercase tracking-wider hover:bg-white shadow-lg transition-colors">Continuer vers Paiement</button>
      </div>
    </div>
  );

  const renderPayment = () => (
    <div className="max-w-2xl mx-auto w-full bg-black/50 backdrop-blur-xl border border-white/10 p-8 sm:p-12 shadow-2xl rounded-sm">
      <h3 className="text-3xl font-bold text-white font-tech uppercase mb-8 text-center drop-shadow-md">Paiement</h3>
      
      <div className="space-y-4">
        {Object.values(PaymentMethod).map((method) => (
          <div 
            key={method}
            onClick={() => setSelectedPayment(method)}
            className={`p-6 border cursor-pointer transition-all flex items-center justify-between group relative overflow-hidden ${
              selectedPayment === method 
                ? 'border-xeption-gold bg-xeption-gold/10' 
                : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-black/60'
            }`}
          >
            <div className="flex items-center space-x-6 relative z-10">
               {method.includes('Orange') && <div className="w-12 h-12 bg-orange-600 flex items-center justify-center text-white font-bold rounded-sm shadow-lg">OM</div>}
               {method.includes('MTN') && <div className="w-12 h-12 bg-yellow-400 flex items-center justify-center text-black font-bold rounded-sm shadow-lg">MoMo</div>}
               {method.includes('Cash') && <div className="w-12 h-12 bg-green-700 flex items-center justify-center text-white font-bold rounded-sm shadow-lg">$$</div>}
               <div>
                   <span className="block text-white font-tech font-bold uppercase tracking-wide text-lg group-hover:text-xeption-gold transition-colors">{method}</span>
                   <span className="text-xs text-gray-500">Transaction sécurisée</span>
               </div>
            </div>
            {selectedPayment === method && <div className="w-4 h-4 bg-xeption-gold rounded-full shadow-[0_0_10px_#FFD700]"></div>}
          </div>
        ))}
      </div>

      {/* Payment Instructions */}
      <div className="mt-8 min-h-[100px] transition-all duration-300">
        {selectedPayment === PaymentMethod.OM && (
            <div className="bg-orange-900/20 border border-orange-500/30 p-6 rounded relative overflow-hidden backdrop-blur-sm">
             <div className="absolute -right-4 -top-4 text-orange-500/10"><Smartphone size={100} /></div>
             <p className="text-orange-500 text-xs font-bold mb-4 uppercase tracking-widest relative z-10">Procédure Orange Money</p>
             <div className="space-y-3 font-mono text-sm text-gray-300 relative z-10">
                <div className="flex justify-between border-b border-orange-500/10 pb-2"><span>Code USSD</span> <span className="text-white font-bold">#150*47#</span></div>
                <div className="flex justify-between border-b border-orange-500/10 pb-2"><span>Code Marchand</span> <span className="text-white font-bold">{PAYMENT_DETAILS.OM.merchantCode}</span></div>
                <div className="flex justify-between"><span>Montant à payer</span> <span className="text-xeption-gold font-bold">{total.toLocaleString('fr-FR')} FCFA</span></div>
             </div>
            </div>
        )}
        {selectedPayment === PaymentMethod.MOMO && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 p-6 rounded relative overflow-hidden backdrop-blur-sm">
            <div className="absolute -right-4 -top-4 text-yellow-500/10"><Smartphone size={100} /></div>
            <p className="text-yellow-500 text-xs font-bold mb-4 uppercase tracking-widest relative z-10">Procédure MTN MoMo</p>
            <div className="space-y-3 font-mono text-sm text-gray-300 relative z-10">
                <div className="flex justify-between border-b border-yellow-500/10 pb-2"><span>Code USSD</span> <span className="text-white font-bold">*126#</span></div>
                <div className="flex justify-between border-b border-yellow-500/10 pb-2"><span>Code Marchand</span> <span className="text-white font-bold">{PAYMENT_DETAILS.MOMO.merchantCode}</span></div>
            </div>
            </div>
        )}
      </div>

      <div className="flex space-x-4 mt-8">
        <button onClick={() => setStep('details')} className="px-8 py-4 text-gray-400 border border-white/10 hover:border-white hover:text-white font-bold uppercase text-xs tracking-widest transition-colors bg-black/20">Retour</button>
        <button 
            onClick={handleNext} 
            disabled={!selectedPayment || isProcessing}
            className="flex-1 bg-xeption-gold text-black font-bold py-4 font-tech uppercase tracking-wider hover:bg-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
        >
            {isProcessing ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Traitement...
                </>
            ) : (
                <>
                    <Lock className="h-4 w-4" />
                    Confirmer la commande
                </>
            )}
        </button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="max-w-xl mx-auto w-full bg-black/50 backdrop-blur-xl border border-white/10 p-12 text-center animate-in fade-in zoom-in duration-500 shadow-2xl relative overflow-hidden rounded-sm">
      <div className="absolute inset-0 bg-green-500/5"></div>
      
      <div className="relative z-10">
          <div className="w-28 h-28 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <h3 className="text-4xl font-bold text-white font-tech uppercase mb-4 drop-shadow-lg">C'est Validé !</h3>
          <p className="text-gray-300 text-lg mb-8 leading-relaxed">
            Respect <span className="text-xeption-gold font-bold">{formData.name}</span>.<br/>
            Ta commande est enregistrée. Notre équipe logistique t'appelle au <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded">{formData.phone}</span> pour confirmer le {deliveryMode === 'delivery' ? 'lieu de livraison' : 'retrait en boutique'}.
          </p>
          
          <button 
            onClick={() => {
                onClearCart();
                onClose();
                setStep('cart');
            }} 
            className="w-full bg-xeption-gold text-black font-bold py-4 font-tech uppercase tracking-wider hover:bg-white shadow-lg transition-all"
          >
            Retour au Shop
          </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-black/40 backdrop-blur-md">
      {/* Background Gradient for depth */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.02),transparent_70%)]"></div>

      <div className="min-h-screen flex flex-col items-center justify-start py-12 px-4 sm:px-6">
          
          {/* Header */}
          <div className="w-full max-w-7xl flex justify-between items-center mb-10 relative z-20">
             <div className="flex items-center gap-3">
                 <div className="h-10 w-1 bg-xeption-gold shadow-[0_0_10px_#FFD700]"></div>
                 <h1 className="text-3xl md:text-4xl font-bold text-white font-tech uppercase tracking-wider drop-shadow-lg">Checkout <span className="text-xeption-gold">Process</span></h1>
             </div>
             <button 
                onClick={onClose} 
                className="group flex items-center gap-2 text-gray-300 hover:text-white transition-colors bg-black/20 p-2 rounded-full backdrop-blur-sm border border-white/5 hover:border-white/20"
             >
                <span className="text-xs font-bold uppercase tracking-widest hidden sm:block px-2">Fermer</span>
                <div className="border border-gray-500 rounded-full p-1 group-hover:border-white transition-colors">
                    <X className="h-4 w-4" />
                </div>
             </button>
          </div>

          {step !== 'success' && <StepIndicator />}

          {/* Main Content Area */}
          <div className="w-full relative z-10 animate-in slide-in-from-bottom-10 duration-500">
            {step === 'cart' && renderCart()}
            {step === 'details' && renderDetails()}
            {step === 'payment' && renderPayment()}
            {step === 'success' && renderSuccess()}
          </div>
          
      </div>
    </div>
  );
};

export default Checkout;
