import React, { useState } from 'react';
import { CartItem, PaymentMethod } from '../types';
import { PAYMENT_DETAILS } from '../constants';
import { X, Trash2, Smartphone, Banknote, CreditCard, CheckCircle, ShieldCheck } from 'lucide-react';

interface CheckoutProps {
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ cart, isOpen, onClose, onRemoveItem, onClearCart }) => {
  const [step, setStep] = useState<'cart' | 'details' | 'payment' | 'success'>('cart');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', phone: '', city: '' });

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step === 'cart' && cart.length > 0) setStep('details');
    else if (step === 'details' && formData.name && formData.phone) setStep('payment');
    else if (step === 'payment' && selectedPayment) setStep('success');
  };

  const renderCart = () => (
    <div className="space-y-4">
      {cart.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-800">
          <p className="text-gray-500 font-tech text-xl uppercase">Panier Vide</p>
          <p className="text-gray-600 text-sm">Le panier est sec, boss.</p>
        </div>
      ) : (
        cart.map((item) => (
          <div key={item.id} className="flex items-center space-x-4 bg-gray-900/50 p-3 border border-gray-800 hover:border-xeption-gold/30 transition-colors">
            <img src={item.image} alt={item.name} className="w-16 h-16 object-cover bg-gray-800" />
            <div className="flex-1">
              <h4 className="text-white font-bold font-tech uppercase tracking-wide text-sm">{item.name}</h4>
              <p className="text-xeption-gold text-sm font-mono">{item.price.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <button 
              onClick={() => onRemoveItem(item.id)}
              className="text-gray-600 hover:text-xeption-red p-2 transition-colors"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        ))
      )}
      
      {cart.length > 0 && (
         <div className="pt-6 border-t border-gray-800 mt-6">
           <div className="flex justify-between items-end mb-8">
             <span className="text-gray-400 font-tech uppercase">Total</span>
             <span className="text-2xl font-bold text-white font-tech">{total.toLocaleString('fr-FR')} <span className="text-xeption-gold text-sm">FCFA</span></span>
           </div>
           <button 
             onClick={handleNext}
             className="w-full bg-xeption-gold text-black font-bold font-tech uppercase tracking-wider py-4 hover:bg-white transition-colors"
           >
             Commander ({cart.length})
           </button>
         </div>
      )}
    </div>
  );

  const renderDetails = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-xeption-gold mb-2">
         <ShieldCheck className="h-5 w-5" />
         <span className="text-xs font-bold uppercase tracking-widest">Secure Checkout</span>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Nom complet</label>
          <input 
            type="text" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full bg-black border border-gray-800 text-white p-4 focus:border-xeption-gold outline-none transition-colors"
            placeholder="Le Boss..."
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase font-bold mb-2">WhatsApp</label>
          <input 
            type="tel" 
            value={formData.phone}
            onChange={e => setFormData({...formData, phone: e.target.value})}
            className="w-full bg-black border border-gray-800 text-white p-4 focus:border-xeption-gold outline-none transition-colors"
            placeholder="6..."
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 uppercase font-bold mb-2">Ville & Quartier</label>
          <input 
            type="text" 
            value={formData.city}
            onChange={e => setFormData({...formData, city: e.target.value})}
            className="w-full bg-black border border-gray-800 text-white p-4 focus:border-xeption-gold outline-none transition-colors"
            placeholder="Douala, Akwa..."
          />
        </div>
      </div>
      <div className="flex space-x-3 mt-8">
        <button onClick={() => setStep('cart')} className="flex-1 py-4 text-gray-400 border border-gray-800 hover:text-white hover:border-gray-600 font-bold uppercase text-xs">Retour</button>
        <button onClick={handleNext} className="flex-1 bg-xeption-gold text-black font-bold py-4 font-tech uppercase tracking-wider hover:bg-white">Suivant</button>
      </div>
    </div>
  );

  const renderPayment = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white font-tech uppercase">Mode de paiement</h3>
      
      <div className="grid grid-cols-1 gap-3">
        {Object.values(PaymentMethod).map((method) => (
          <div 
            key={method}
            onClick={() => setSelectedPayment(method)}
            className={`p-4 border cursor-pointer transition-all flex items-center justify-between group ${
              selectedPayment === method 
                ? 'border-xeption-gold bg-xeption-gold/5' 
                : 'border-gray-800 bg-black hover:border-gray-600'
            }`}
          >
            <div className="flex items-center space-x-4">
               {method.includes('Orange') && <div className="w-10 h-10 bg-orange-600 flex items-center justify-center text-white font-bold">OM</div>}
               {method.includes('MTN') && <div className="w-10 h-10 bg-yellow-400 flex items-center justify-center text-black font-bold">MoMo</div>}
               {method.includes('Cash') && <div className="w-10 h-10 bg-green-700 flex items-center justify-center text-white font-bold">$$</div>}
               <span className="text-white font-tech font-bold uppercase tracking-wide group-hover:text-xeption-gold transition-colors">{method}</span>
            </div>
            {selectedPayment === method && <div className="w-3 h-3 bg-xeption-gold shadow-[0_0_10px_#FFD700]"></div>}
          </div>
        ))}
      </div>

      {/* USSD Instructions Display */}
      {selectedPayment === PaymentMethod.OM && (
        <div className="bg-orange-900/10 border border-orange-500/30 p-4 mt-4">
          <p className="text-orange-500 text-xs font-bold mb-3 uppercase tracking-widest">Procédure Orange Money</p>
          <div className="space-y-2 font-mono text-sm text-gray-300">
             <div className="flex justify-between"><span>Compose</span> <span className="text-white">#150*47#</span></div>
             <div className="flex justify-between"><span>Code</span> <span className="text-white font-bold">{PAYMENT_DETAILS.OM.merchantCode}</span></div>
             <div className="flex justify-between"><span>Montant</span> <span className="text-white font-bold">{total}</span></div>
          </div>
        </div>
      )}
       {selectedPayment === PaymentMethod.MOMO && (
        <div className="bg-yellow-900/10 border border-yellow-500/30 p-4 mt-4">
          <p className="text-yellow-500 text-xs font-bold mb-3 uppercase tracking-widest">Procédure MTN MoMo</p>
          <div className="space-y-2 font-mono text-sm text-gray-300">
             <div className="flex justify-between"><span>Compose</span> <span className="text-white">*126#</span></div>
             <div className="flex justify-between"><span>Code</span> <span className="text-white font-bold">{PAYMENT_DETAILS.MOMO.merchantCode}</span></div>
          </div>
        </div>
      )}

      <div className="flex space-x-3 mt-8">
        <button onClick={() => setStep('details')} className="flex-1 py-4 text-gray-400 border border-gray-800 hover:text-white uppercase text-xs font-bold">Retour</button>
        <button 
            onClick={handleNext} 
            disabled={!selectedPayment}
            className="flex-1 bg-xeption-gold text-black font-bold py-4 font-tech uppercase tracking-wider hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
            Valider
        </button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-10 space-y-6 animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
        <CheckCircle className="h-10 w-10 text-green-500" />
      </div>
      <h3 className="text-3xl font-bold text-white font-tech uppercase">C'est Validé !</h3>
      <p className="text-gray-400 max-w-xs mx-auto">
        Respect <span className="text-xeption-gold font-bold">{formData.name}</span>.
        Ton matériel est réservé. Le staff t'appelle au <span className="text-white">{formData.phone}</span> dans quelques minutes.
      </p>
      
      <button 
        onClick={() => {
            onClearCart();
            onClose();
            setStep('cart');
        }} 
        className="w-full bg-xeption-gold text-black font-bold py-4 font-tech uppercase tracking-wider hover:bg-white mt-8"
      >
        Retour au Shop
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
      
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-[#080808] border-l border-gray-800 shadow-2xl flex flex-col h-full">
          
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white font-tech uppercase tracking-wide">
              {step === 'cart' && 'Panier'}
              {step === 'details' && 'Identité'}
              {step === 'payment' && 'Caisse'}
              {step === 'success' && 'Succès'}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-tech-pattern">
            {step === 'cart' && renderCart()}
            {step === 'details' && renderDetails()}
            {step === 'payment' && renderPayment()}
            {step === 'success' && renderSuccess()}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Checkout;