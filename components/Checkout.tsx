
import React, { useRef, useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { CartItem, PaymentMethod } from '../types';
import { PAYMENT_DETAILS } from '../constants';
import { useCheckoutForm } from '../hooks/useCheckoutForm';
import { useOrderProcess } from '../hooks/useOrderProcess';
import {
  X, Smartphone, CheckCircle, ShieldCheck, Minus, Plus, ShoppingBag,
  ArrowRight, Lock, MapPin, Truck, Store, Loader2, Mail, FileText, Copy, Radar
} from 'lucide-react';

interface CheckoutProps {
  cart: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearCart: () => void;
  onNavigate?: (page: string) => void;
}

const Checkout: React.FC<CheckoutProps> = ({
  cart, isOpen, onClose, onRemoveItem, onUpdateQuantity, onClearCart, onNavigate
}) => {
  // Logic Hooks
  const form = useCheckoutForm(cart);
  const order = useOrderProcess();

  // Local UI State
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  
  // Captcha State
  const HCAPTCHA_SITE_KEY = "0d0cfd40-72aa-4570-a4fa-e8f263ce1d24";
  const captchaRef = useRef<any>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  if (!isOpen) return null;

  // --- Actions ---

  const handleProcessOrder = async () => {
      try {
          await order.submitOrder({
              cart,
              total: form.total,
              formData: form.formData,
              deliveryMode: form.deliveryMode,
              paymentMethod: form.selectedPayment,
              captchaToken
          });
          
          captchaRef.current?.resetCaptcha?.();
          setCaptchaToken(null);
          form.setStep('success');
      } catch (err: any) {
          alert(err.message || "Une erreur est survenue.");
      }
  };

  const handleNext = () => {
      if (form.step === 'payment') {
          handleProcessOrder();
      } else {
          form.nextStep();
      }
  };

  const handleDownloadInvoice = async () => {
    if (!order.lastOrderHtml) return;
    setIsPdfGenerating(true);
    try {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default;

        const element = document.createElement('div');
        element.innerHTML = order.lastOrderHtml;
        element.style.width = '700px'; 
        element.style.padding = '20px';
        element.style.background = 'white';

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-10000px';
        container.style.top = '0';
        container.appendChild(element);
        document.body.appendChild(container);

        const safeName = form.formData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'client';
        await html2pdf().set({
            margin: 10, filename: `Facture_Xeption_${safeName}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(element).save();
        document.body.removeChild(container);
    } catch (err) {
        console.error("PDF Gen Error:", err);
        const blob = new Blob([order.lastOrderHtml], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Facture.html`;
        link.click();
    } finally {
        setIsPdfGenerating(false);
    }
  };

  const handleGoToTracking = () => {
      if (order.createdOrderId && onNavigate) {
          onClearCart();
          onClose();
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('id', order.createdOrderId);
          window.history.pushState({}, '', newUrl);
          onNavigate('tracking');
      }
  };

  // --- Renders ---

  const StepIndicator = () => (
    <div className="flex justify-center items-center gap-4 mb-8 text-sm font-tech uppercase tracking-widest">
      <span className={`${form.step === 'cart' ? 'text-xeption-gold font-bold' : 'text-gray-400/70'}`}>1. Panier</span>
      <span className="text-gray-500">/</span>
      <span className={`${form.step === 'details' ? 'text-xeption-gold font-bold' : 'text-gray-400/70'}`}>2. Infos</span>
      <span className="text-gray-500">/</span>
      <span className={`${form.step === 'payment' ? 'text-xeption-gold font-bold' : 'text-gray-400/70'}`}>3. Paiement</span>
    </div>
  );

  const renderCart = () => (
    <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto w-full">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white font-tech uppercase drop-shadow-md">
            Mon Panier <span className="text-gray-400 text-lg">({cart.length} articles)</span>
          </h2>
        </div>
        {cart.length === 0 ? (
          <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-lg p-20 text-center flex flex-col items-center shadow-xl">
            <ShoppingBag className="h-16 w-16 text-gray-500 mb-4" />
            <p className="text-gray-300 font-tech text-xl uppercase mb-6">Votre panier est vide</p>
            <button onClick={onClose} className="px-8 py-3 bg-white/10 hover:bg-xeption-gold hover:text-black text-white border border-white/10 transition-colors uppercase font-bold text-xs tracking-widest">
              Découvrir nos produits
            </button>
          </div>
        ) : (
          <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden shadow-2xl">
            {cart.map((item) => (
              <div key={item.id} className="p-6 border-b border-white/5 hover:bg-white/5 transition-colors group flex flex-col sm:flex-row items-center gap-6">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white/5 rounded-lg p-2 flex-shrink-0 relative overflow-hidden">
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                    <h4 className="text-white font-bold font-tech uppercase tracking-wide text-lg">{item.name}</h4>
                    <p className="text-white font-bold text-xl font-mono sm:hidden mt-2">{(item.price * item.quantity).toLocaleString('fr-FR')} <span className="text-xeption-gold text-xs">FCFA</span></p>
                  </div>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-1">{item.description}</p>
                  <div className="flex items-center justify-center sm:justify-between">
                    <div className="flex items-center bg-black/50 border border-gray-600 rounded-full px-1">
                      <button onClick={() => onUpdateQuantity(item.id, -1)} className="p-2 text-gray-400 hover:text-white transition-colors"><Minus className="h-4 w-4" /></button>
                      <span className="w-8 text-center text-sm font-bold font-mono text-white">{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.id, 1)} className="p-2 text-gray-400 hover:text-white transition-colors"><Plus className="h-4 w-4" /></button>
                    </div>
                    <button onClick={() => onRemoveItem(item.id)} className="ml-4 text-sm text-red-400/70 hover:text-red-400 underline decoration-red-400/30 font-bold uppercase text-[10px] tracking-widest">Retirer</button>
                  </div>
                </div>
                <div className="hidden sm:block text-right min-w-[120px]">
                  <p className="text-white font-bold text-xl font-mono">{(item.price * item.quantity).toLocaleString('fr-FR')}</p>
                  <p className="text-xeption-gold text-xs font-bold">FCFA</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="w-full lg:w-[400px]">
          <div className="bg-black/50 backdrop-blur-xl border border-white/10 p-8 sticky top-8 shadow-2xl rounded-sm">
            <h3 className="text-xl font-bold text-white font-tech uppercase mb-6 border-b border-white/10 pb-4">Résumé</h3>
            <div className="space-y-4 mb-8 text-sm">
              <div className="flex justify-between text-gray-400"><span>Sous-total</span><span className="font-mono text-white">{form.subtotal.toLocaleString('fr-FR')} FCFA</span></div>
              <div className="flex justify-between text-gray-400"><span>Estimation Livraison</span><span className="font-mono text-gray-500 italic text-xs">Calculé après</span></div>
              <div className="border-t border-dashed border-white/20 pt-4 mt-4">
                <div className="flex justify-between items-end">
                  <span className="text-white font-bold uppercase tracking-wider">Total Est.</span>
                  <div className="text-right">
                    <span className="block text-3xl font-bold text-white font-tech">{form.subtotal.toLocaleString('fr-FR')}</span>
                    <span className="text-xeption-gold text-xs font-bold">FCFA</span>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={handleNext} className="w-full bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-wider py-4 text-lg shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all flex items-center justify-center gap-2 group">
              Continuer <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
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

      <div className="flex bg-black/60 p-1 rounded-sm mb-8 border border-white/10">
        <button onClick={() => form.setDeliveryMode('delivery')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-sm ${form.deliveryMode === 'delivery' ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-gray-500 hover:text-gray-300'}`}>
          <Truck className="h-4 w-4" /> Livraison à domicile (+2000 FCFA)
        </button>
        <button onClick={() => form.setDeliveryMode('pickup')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded-sm ${form.deliveryMode === 'pickup' ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-gray-500 hover:text-gray-300'}`}>
          <Store className="h-4 w-4" /> Retrait en Boutique (Gratuit)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-xs text-gray-400 uppercase font-bold mb-2 ml-1">Nom complet</label>
          <input type="text" value={form.formData.name} onChange={e => form.setFormData({ ...form.formData, name: e.target.value })} className="w-full bg-black/40 border border-white/10 text-white p-4 focus:border-xeption-gold focus:bg-black/60 outline-none transition-all placeholder-gray-600" placeholder="Ex: Samuel Eto'o" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase font-bold mb-2 ml-1">WhatsApp / Tél</label>
          <input type="tel" value={form.formData.phone} onChange={e => form.setFormData({ ...form.formData, phone: e.target.value })} className="w-full bg-black/40 border border-white/10 text-white p-4 focus:border-xeption-gold focus:bg-black/60 outline-none transition-all placeholder-gray-600" placeholder="Ex: 699..." />
        </div>
        <div>
          <label className="block text-xs text-gray-400 uppercase font-bold mb-2 ml-1">Email (Pour la facture)</label>
          <input type="email" value={form.formData.email} onChange={e => form.setFormData({ ...form.formData, email: e.target.value })} className="w-full bg-black/40 border border-white/10 text-white p-4 focus:border-xeption-gold focus:bg-black/60 outline-none transition-all placeholder-gray-600" placeholder="Ex: samuel@xeptionetwork.shop" />
        </div>

        {form.deliveryMode === 'delivery' ? (
          <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2">
            <label className="block text-xs text-gray-400 uppercase font-bold mb-2 ml-1">Adresse de livraison (Ville, Quartier)</label>
            <input type="text" value={form.formData.city} onChange={e => form.setFormData({ ...form.formData, city: e.target.value })} className="w-full bg-black/40 border border-white/10 text-white p-4 focus:border-xeption-gold focus:bg-black/60 outline-none transition-all placeholder-gray-600" placeholder="Ex: Douala, Bonapriso, Rue des Palmiers" />
          </div>
        ) : (
          <div className="md:col-span-2 bg-white/5 border border-white/10 p-4 rounded-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <MapPin className="h-5 w-5 text-xeption-gold mt-1" />
            <div>
              <h4 className="text-white font-bold uppercase text-sm mb-1">Point de Retrait Xeption</h4>
              <p className="text-gray-400 text-sm">Yaoundé, Mfoundi Mall</p>
              <p className="text-gray-500 text-xs">À l'étage, Boutique 2063</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-sm">
        <span className="text-gray-400">Total à payer</span>
        <span className="text-2xl font-bold font-mono text-white">{(form.total).toLocaleString('fr-FR')} FCFA</span>
      </div>

      <div className="flex space-x-4 mt-8">
        <button onClick={form.prevStep} className="px-8 py-4 text-gray-400 border border-white/10 hover:border-white hover:text-white font-bold uppercase text-xs tracking-widest transition-colors bg-black/20">Retour</button>
        <button onClick={handleNext} className="flex-1 bg-xeption-gold text-black font-bold py-4 font-tech uppercase tracking-wider hover:bg-white shadow-lg transition-colors">Continuer vers Paiement</button>
      </div>
    </div>
  );

  const renderPayment = () => (
    <div className="max-w-2xl mx-auto w-full bg-black/50 backdrop-blur-xl border border-white/10 p-8 sm:p-12 shadow-2xl rounded-sm">
      <h3 className="text-3xl font-bold text-white font-tech uppercase mb-8 text-center drop-shadow-md">Règlement</h3>
      <div className="space-y-4">
        {Object.values(PaymentMethod).map((method) => (
          <div
            key={method}
            onClick={() => form.setSelectedPayment(method)}
            className={`p-6 border cursor-pointer transition-all flex items-center justify-between group relative overflow-hidden ${
              form.selectedPayment === method ? 'border-xeption-gold bg-xeption-gold/10' : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-black/60'
            }`}
          >
            <div className="flex items-center space-x-6 relative z-10">
              {method.includes('Orange') && <div className="w-12 h-12 bg-orange-600 flex items-center justify-center text-white font-bold rounded-sm shadow-lg">OM</div>}
              {method.includes('MTN') && <div className="w-12 h-12 bg-yellow-400 flex items-center justify-center text-black font-bold rounded-sm shadow-lg">MoMo</div>}
              {method.includes('Cash') && <div className="w-12 h-12 bg-green-700 flex items-center justify-center text-white font-bold rounded-sm shadow-lg">$$</div>}
              <div>
                <span className="block text-white font-tech font-bold uppercase tracking-wide text-lg group-hover:text-xeption-gold transition-colors">{method}</span>
                <span className="text-xs text-gray-500">
                  {method.includes('Cash')
                    ? 'Paiement au retrait ou à la livraison'
                    : 'Instructions de règlement communiquées par la boutique'}
                </span>
              </div>
            </div>
            {form.selectedPayment === method && <div className="w-4 h-4 bg-xeption-gold rounded-full shadow-[0_0_10px_#FFD700]"></div>}
          </div>
        ))}
      </div>

      <div className="mt-8 min-h-[100px] transition-all duration-300">
        {form.selectedPayment === PaymentMethod.OM && (
          <div className="bg-orange-900/20 border border-orange-500/30 p-6 rounded relative overflow-hidden backdrop-blur-sm">
            <div className="absolute -right-4 -top-4 text-orange-500/10"><Smartphone size={100} /></div>
            <p className="text-orange-500 text-xs font-bold mb-4 uppercase tracking-widest relative z-10">Indications Orange Money</p>
            <div className="space-y-3 font-mono text-sm text-gray-300 relative z-10">
              <div className="flex justify-between border-b border-orange-500/10 pb-2"><span>Code USSD</span> <span className="text-white font-bold">#150*47#</span></div>
              <div className="flex justify-between border-b border-orange-500/10 pb-2"><span>Code Marchand</span> <span className="text-white font-bold">{PAYMENT_DETAILS.OM.merchantCode}</span></div>
              <div className="flex justify-between"><span>Montant à payer</span> <span className="text-xeption-gold font-bold">{form.total.toLocaleString('fr-FR')} FCFA</span></div>
            </div>
            <p className="text-gray-400 text-xs mt-4 relative z-10">
              La commande est enregistrée sur le site. Le règlement Mobile Money est ensuite confirmé avec la boutique avant préparation ou retrait.
            </p>
          </div>
        )}
        {form.selectedPayment === PaymentMethod.MOMO && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 p-6 rounded relative overflow-hidden backdrop-blur-sm">
            <div className="absolute -right-4 -top-4 text-yellow-500/10"><Smartphone size={100} /></div>
            <p className="text-yellow-500 text-xs font-bold mb-4 uppercase tracking-widest relative z-10">Indications MTN MoMo</p>
            <div className="space-y-3 font-mono text-sm text-gray-300 relative z-10">
              <div className="flex justify-between border-b border-yellow-500/10 pb-2"><span>Code USSD</span> <span className="text-white font-bold">*126#</span></div>
              <div className="flex justify-between border-b border-yellow-500/10 pb-2"><span>Code Marchand</span> <span className="text-white font-bold">{PAYMENT_DETAILS.MOMO.merchantCode}</span></div>
            </div>
            <p className="text-gray-400 text-xs mt-4 relative z-10">
              La validation finale du règlement peut nécessiter une confirmation manuelle avec la boutique avant expédition ou retrait.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-center">
        <HCaptcha ref={captchaRef} sitekey={HCAPTCHA_SITE_KEY} onVerify={(token) => setCaptchaToken(token)} onExpire={() => setCaptchaToken(null)} onError={() => setCaptchaToken(null)} />
      </div>

      <div className="flex space-x-4 mt-8">
        <button onClick={form.prevStep} className="px-8 py-4 text-gray-400 border border-white/10 hover:border-white hover:text-white font-bold uppercase text-xs tracking-widest transition-colors bg-black/20">Retour</button>
        <button onClick={handleNext} disabled={!form.selectedPayment || !captchaToken || order.isProcessing} className="flex-1 bg-xeption-gold text-black font-bold py-4 font-tech uppercase tracking-wider hover:bg-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all">
          {order.isProcessing ? <><Loader2 className="h-4 w-4 animate-spin" /> Traitement...</> : !captchaToken ? <><ShieldCheck className="h-4 w-4" /> Valide le captcha</> : <><Lock className="h-4 w-4" /> Valider la commande</>}
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
        <p className="text-gray-300 text-lg mb-6 leading-relaxed">
          Respect <span className="text-xeption-gold font-bold">{form.formData.name}</span>.<br />
          Ta commande est enregistrée. Notre équipe t'appelle au <span className="text-white font-bold bg-white/10 px-2 py-0.5 rounded">{form.formData.phone}</span>.
        </p>

        <div className="bg-[#18181b] border border-xeption-gold/30 p-6 rounded-lg mb-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-xeption-gold/10 rounded-full blur-xl group-hover:bg-xeption-gold/20 transition-all"></div>
            <div className="relative z-10">
                <h4 className="text-xeption-gold font-bold uppercase text-sm mb-2 flex items-center justify-center gap-2"><Radar className="w-4 h-4 animate-pulse" /> Suivi Live</h4>
                <p className="text-gray-400 text-xs mb-4">Copie ton numéro de commande pour suivre ton colis en temps réel.</p>
                {order.createdOrderId && (
                    <div className="flex items-center justify-center gap-2 mb-4">
                         <code className="bg-black/50 border border-white/10 px-4 py-2 rounded text-white font-mono font-bold tracking-widest text-lg">{order.createdOrderId}</code>
                         <button onClick={() => { navigator.clipboard.writeText(order.createdOrderId || ''); setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Copier">
                             {copiedId ? <CheckCircle className="w-5 h-5 text-green-500"/> : <Copy className="w-5 h-5"/>}
                         </button>
                    </div>
                )}
                <button onClick={handleGoToTracking} className="w-full bg-white/5 hover:bg-xeption-gold hover:text-black border border-white/10 hover:border-transparent text-white font-bold py-3 rounded uppercase text-xs tracking-widest transition-all">Suivre mon colis maintenant</button>
            </div>
        </div>

        <div className="space-y-3 mb-8">
          {form.formData.email && (
            <div className="bg-white/5 border border-white/10 p-4 rounded flex items-center gap-3 justify-center text-sm">
              <Mail className="w-5 h-5 text-xeption-gold" />
              <span className="text-gray-300">Facture envoyée à <span className="text-white font-bold">{form.formData.email}</span></span>
            </div>
          )}
          {order.lastOrderHtml && (
            <button onClick={handleDownloadInvoice} disabled={isPdfGenerating} className="w-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-xeption-gold hover:text-white transition-colors py-2 border border-xeption-gold/30 hover:bg-xeption-gold hover:text-black rounded-sm p-3 mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
              {isPdfGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4" />} {isPdfGenerating ? 'Génération PDF...' : 'Télécharger la facture (PDF)'}
            </button>
          )}
        </div>

        <button onClick={() => { onClearCart(); onClose(); form.setStep('cart'); }} className="w-full bg-white/10 text-white font-bold py-4 font-tech uppercase tracking-wider hover:bg-white hover:text-black shadow-lg transition-all">Retour au Shop</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto overflow-x-hidden bg-black/40 backdrop-blur-md">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.02),transparent_70%)]"></div>
      <div className="min-h-screen flex flex-col items-center justify-start pt-32 pb-12 px-4 sm:px-6">
        <div className="w-full max-w-7xl flex justify-between items-center mb-10 relative z-20">
          <div className="flex items-center gap-3">
            <div className="h-10 w-1 bg-xeption-gold shadow-[0_0_10px_#FFD700]"></div>
            <h1 className="text-3xl md:text-4xl font-bold text-white font-tech uppercase tracking-wider drop-shadow-lg">Checkout <span className="text-xeption-gold">Process</span></h1>
          </div>
          <button onClick={onClose} className="group flex items-center gap-2 text-gray-300 hover:text-white transition-colors bg-black/20 p-2 rounded-full backdrop-blur-sm border border-white/5 hover:border-white/20">
            <span className="text-xs font-bold uppercase tracking-widest hidden sm:block px-2">Fermer</span>
            <div className="border border-gray-500 rounded-full p-1 group-hover:border-white transition-colors"><X className="h-4 w-4" /></div>
          </button>
        </div>
        {form.step !== 'success' && <StepIndicator />}
        <div className="w-full relative z-10 animate-in slide-in-from-bottom-10 duration-500">
          {form.step === 'cart' && renderCart()}
          {form.step === 'details' && renderDetails()}
          {form.step === 'payment' && renderPayment()}
          {form.step === 'success' && renderSuccess()}
        </div>
      </div>
    </div>
  );
};

export default Checkout;
