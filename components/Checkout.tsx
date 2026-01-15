
import React, { useState, useRef } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

import { CartItem, PaymentMethod } from '../types';
import { PAYMENT_DETAILS } from '../constants';
import { supabase } from '../services/supabaseClient';
import { generateInvoiceHTML } from '../utils/invoiceGenerator';
import {
  X, Smartphone, CheckCircle, ShieldCheck, Minus, Plus, ShoppingBag,
  ArrowRight, Lock, MapPin, Truck, Store, Loader2, Mail, Download, FileText, Search
} from 'lucide-react';

interface CheckoutProps {
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearCart: () => void;
  onGoToTracking?: (orderId: string) => void;
}

const Checkout: React.FC<CheckoutProps> = ({
  cart, isOpen, onClose, onRemoveItem, onUpdateQuantity, onClearCart, onGoToTracking
}) => {
  const [step, setStep] = useState<'cart' | 'details' | 'payment' | 'success'>('cart');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>('delivery');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [lastOrderHtml, setLastOrderHtml] = useState<string | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string>('');

  const HCAPTCHA_SITE_KEY = "0d0cfd40-72aa-4570-a4fa-e8f263ce1d24";
  const captchaRef = useRef<any>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', phone: '', email: '', city: '' });

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = deliveryMode === 'pickup' ? 0 : 2000;
  const total = subtotal + (cart.length > 0 ? deliveryFee : 0);

  if (!isOpen) return null;

  const submitOrder = async () => {
    setIsProcessing(true);
    try {
      if (!captchaToken) {
        alert("Veuillez valider le captcha avant de confirmer la commande.");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously({ options: { captchaToken } });
      }

      const newOrderId = `ORD-${Date.now().toString().slice(-6)}`;
      setCompletedOrderId(newOrderId);
      
      const dbDate = new Date().toISOString();
      const displayDate = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const { error: orderError } = await supabase.from('orders').insert([{
        id: newOrderId,
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        customer_city: deliveryMode === 'pickup' ? 'Retrait Boutique' : formData.city,
        delivery_mode: deliveryMode,
        total: total,
        status: 'pending',
        payment_method: selectedPayment,
        items: cart,
        date: dbDate
      }]);

      if (orderError) throw orderError;

      for (const item of cart) {
        const { data: productData } = await supabase.from('products').select('stock').eq('id', item.id).single();
        if (productData) {
            await supabase.from('products').update({ stock: Math.max(0, productData.stock - item.quantity) }).eq('id', item.id);
        }
      }

      const invoiceData = {
        id: newOrderId,
        items: cart,
        total: total,
        status: 'pending',
        paymentMethod: selectedPayment,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        customerCity: deliveryMode === 'pickup' ? 'Retrait Boutique' : formData.city,
        deliveryMode: deliveryMode,
        date: displayDate
      };
      const emailHtml = generateInvoiceHTML(invoiceData as any);
      setLastOrderHtml(emailHtml);

      if (formData.email) {
        await supabase.functions.invoke('send-invoice', {
          body: { to: formData.email, subject: `XEPTION | Commande ${newOrderId}`, html: emailHtml }
        });
      }

      captchaRef.current?.resetCaptcha?.();
      setCaptchaToken(null);
      setStep('success');
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!lastOrderHtml) return;
    setIsPdfGenerating(true);
    try {
        const element = document.createElement('div');
        element.innerHTML = lastOrderHtml;
        element.style.width = '700px'; 
        element.style.padding = '20px';
        element.style.background = 'white';
        // @ts-ignore
        await window.html2pdf().set({ margin: 10, filename: `Facture_Xeption_${completedOrderId}.pdf`, jsPDF: { unit: 'mm', format: 'a4' } }).from(element).save();
    } catch (err) {
        console.error(err);
    } finally {
        setIsPdfGenerating(false);
    }
  };

  const renderSuccess = () => (
    <div className="max-w-xl mx-auto w-full bg-black/50 backdrop-blur-xl border border-white/10 p-8 md:p-12 text-center animate-in fade-in zoom-in duration-500 shadow-2xl relative overflow-hidden rounded-sm">
      <div className="absolute inset-0 bg-green-500/5"></div>
      <div className="relative z-10">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h3 className="text-3xl font-bold text-white font-tech uppercase mb-4">Commande Confirmée !</h3>
        
        <div className="bg-white/5 border border-white/10 p-4 rounded-sm mb-6 inline-block">
            <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest block mb-1">Référence Facture</span>
            <span className="text-xl font-mono text-xeption-gold font-bold tracking-tighter">{completedOrderId}</span>
        </div>

        <p className="text-gray-300 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
          Merci <span className="text-white font-bold">{formData.name}</span>. 
          Notez bien ce numéro ou téléchargez votre facture. Il vous servira à suivre l'évolution de votre colis.
        </p>

        <div className="space-y-3 mb-8">
            <button
                onClick={() => onGoToTracking && onGoToTracking(completedOrderId)}
                className="w-full bg-xeption-gold text-black font-tech font-bold py-4 uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,215,0,0.3)]"
            >
                <Search className="w-5 h-5" /> Suivre mon colis maintenant
            </button>
            
            <button
              onClick={handleDownloadInvoice}
              disabled={isPdfGenerating}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-300 hover:text-white transition-colors py-3 border border-white/10 hover:bg-white/5 rounded-sm"
            >
              {isPdfGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4" />} 
              {isPdfGenerating ? 'Génération...' : 'Télécharger Facture (PDF)'}
            </button>
        </div>

        <button
          onClick={() => { onClearCart(); onClose(); setStep('cart'); }}
          className="text-[10px] text-gray-500 uppercase font-bold tracking-widest hover:text-white transition-colors"
        >
          Retourner au catalogue
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto overflow-x-hidden bg-black/40 backdrop-blur-md">
      <div className="min-h-screen flex flex-col items-center justify-start pt-32 pb-12 px-4">
        <div className="w-full max-w-7xl flex justify-between items-center mb-10 relative z-20">
          <h1 className="text-2xl font-bold text-white font-tech uppercase tracking-wider">Finaliser <span className="text-xeption-gold">l'achat</span></h1>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 border border-white/10 rounded-full"><X className="h-5 w-5" /></button>
        </div>

        <div className="w-full relative z-10">
          {step === 'cart' && (
              <div className="max-w-4xl mx-auto">
                {cart.length > 0 ? (
                    <div className="bg-black/30 backdrop-blur-xl border border-white/10 p-8 rounded-sm">
                        {cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center py-4 border-b border-white/5">
                                <div className="text-sm font-bold uppercase">{item.name}</div>
                                <div className="font-mono text-xeption-gold">{item.price.toLocaleString()} FCFA</div>
                            </div>
                        ))}
                        <button onClick={() => setStep('details')} className="w-full bg-xeption-gold text-black font-bold py-4 mt-8 uppercase font-tech">Continuer</button>
                    </div>
                ) : <p className="text-center text-gray-500">Panier vide</p>}
              </div>
          )}
          {step === 'details' && (
              <div className="max-w-xl mx-auto bg-black/50 border border-white/10 p-8 rounded-sm">
                <input type="text" placeholder="Nom complet" className="w-full bg-black border border-white/10 p-4 mb-4 text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input type="tel" placeholder="Téléphone" className="w-full bg-black border border-white/10 p-4 mb-4 text-white" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                <input type="email" placeholder="Email (Optionnel)" className="w-full bg-black border border-white/10 p-4 mb-8 text-white" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <button onClick={() => setStep('payment')} className="w-full bg-xeption-gold text-black font-bold py-4 uppercase font-tech">Aller au paiement</button>
              </div>
          )}
          {step === 'payment' && (
              <div className="max-w-xl mx-auto bg-black/50 border border-white/10 p-8 rounded-sm">
                <div className="grid grid-cols-1 gap-4 mb-8">
                    {['Orange Money', 'MTN Mobile Money', 'Cash à la livraison'].map(m => (
                        <button key={m} onClick={() => setSelectedPayment(m as any)} className={`p-6 border text-left font-bold uppercase text-xs ${selectedPayment === m ? 'border-xeption-gold bg-xeption-gold/10' : 'border-white/10'}`}>{m}</button>
                    ))}
                </div>
                <div className="flex justify-center mb-6">
                    <HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITE_KEY} onVerify={setCaptchaToken} />
                </div>
                <button onClick={submitOrder} disabled={!selectedPayment || !captchaToken || isProcessing} className="w-full bg-xeption-gold text-black font-bold py-4 uppercase font-tech disabled:opacity-50">Confirmer la commande</button>
              </div>
          )}
          {step === 'success' && renderSuccess()}
        </div>
      </div>
    </div>
  );
};

export default Checkout;
