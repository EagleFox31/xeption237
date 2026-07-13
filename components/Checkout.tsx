
import React, { useEffect, useRef, useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { CartItem, PaymentMethod } from '../types';
import { PAYMENT_DETAILS } from '../constants';
import { useCheckoutForm } from '../hooks/useCheckoutForm';
import { useOrderProcess } from '../hooks/useOrderProcess';
import {
  X, Smartphone, CheckCircle, ShieldCheck, Minus, Plus, ShoppingBag,
  ArrowRight, Lock, MapPin, Truck, Store, Loader2, Mail, FileText, Copy, Radar,
  User, Phone, Zap, Circle, Unlock
} from 'lucide-react';
import { useDeliveryZones } from './delivery/deliveryZoneUi';
import { DeliveryLocationSelect } from './delivery/DeliveryLocationSelect';
import { FREE_DELIVERY_THRESHOLD_XAF } from '../constants/delivery';

type PlayfulFieldProps = {
  step: number;
  label: string;
  hint: string;
  doneMessage: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  optional?: boolean;
  icon: React.ReactNode;
  isValid: boolean;
  delayClass?: string;
};

const PlayfulField: React.FC<PlayfulFieldProps> = ({
  step, label, hint, doneMessage, value, onChange, placeholder, type = 'text',
  optional, icon, isValid, delayClass = '',
}) => {
  const showSuccess = isValid;

  return (
    <div
      className={`relative rounded-xl border p-3 lg:p-3 transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 ${delayClass} ${
        showSuccess
          ? 'border-green-500/35 bg-green-500/[0.06] shadow-[0_0_24px_rgba(34,197,94,0.07)]'
          : 'border-white/10 bg-black/30 hover:border-white/20 hover:bg-black/40'
      }`}
    >
      <div className="flex items-start gap-2.5 mb-2 lg:mb-2">
        <div
          className={`w-8 h-8 lg:w-7 lg:h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-tech border-2 shrink-0 transition-all duration-500 ${
            showSuccess
              ? 'border-green-500 bg-green-500/20 text-green-400 scale-110 shadow-[0_0_12px_rgba(34,197,94,0.35)]'
              : 'border-white/15 bg-black/50 text-gray-500'
          }`}
        >
          {showSuccess ? <CheckCircle className="h-3.5 w-3.5 animate-in zoom-in duration-300" /> : step}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold uppercase text-[11px] tracking-wider">{label}</span>
            {optional && (
              <span className="text-[9px] text-xeption-gold uppercase tracking-widest border border-xeption-gold/35 bg-xeption-gold/10 px-1.5 py-0.5 rounded-full">
                + bonus XP
              </span>
            )}
          </div>
          <p className={`text-[10px] mt-0.5 line-clamp-1 lg:line-clamp-2 transition-colors duration-300 ${showSuccess ? 'text-green-400/90' : 'text-gray-500'}`}>
            {showSuccess ? doneMessage : hint}
          </p>
        </div>
        {showSuccess && <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />}
      </div>
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-focus-within:text-xeption-gold text-gray-600">
          {icon}
        </div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-black/50 border rounded-lg text-white text-sm pl-10 pr-8 py-2.5 outline-none transition-all placeholder-gray-600 ${
            showSuccess
              ? 'border-green-500/30 focus:border-green-400'
              : 'border-white/10 focus:border-xeption-gold focus:shadow-[0_0_0_1px_rgba(255,215,0,0.3),0_0_20px_rgba(255,215,0,0.08)]'
          }`}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
};

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
  const { zones: deliveryZones, isLoading: deliveryZonesLoading } = useDeliveryZones();

  useEffect(() => {
    if (!deliveryZones.length) return;

    if (form.selectedDeliveryZone) {
      const fresh = deliveryZones.find((z) => z.id === form.selectedDeliveryZone!.id);
      if (fresh) form.syncDeliveryZone(fresh);
      return;
    }

    if (form.deliveryMode === 'delivery') {
      const defaultZone =
        deliveryZones.find((z) => z.name.includes('Yaoundé')) ?? deliveryZones[0];
      form.setSelectedDeliveryZone(defaultZone);
    }
  }, [deliveryZones, form.deliveryMode, form.selectedDeliveryZone?.id]);

  // Local UI State
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  
  // Captcha State
  const HCAPTCHA_SITE_KEY = "0d0cfd40-72aa-4570-a4fa-e8f263ce1d24";
  const captchaRef = useRef<any>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  if (!isOpen) return null;

  const freeDeliveryProgress = Math.min(
    100,
    Math.round((form.subtotal / FREE_DELIVERY_THRESHOLD_XAF) * 100),
  );

  const FreeDeliveryHint: React.FC<{ className?: string }> = ({ className = '' }) => {
    if (form.qualifiesForFreeDelivery) {
      return (
        <div
          className={`rounded-lg border border-green-500/45 bg-green-500/10 px-4 py-3 ${className}`}
        >
          <p className="text-sm text-green-400 font-bold flex items-center gap-2">
            <Truck className="h-4 w-4 shrink-0" />
            Livraison offerte sur cette commande
          </p>
        </div>
      );
    }
    const remaining = form.freeDeliveryRemaining;
    if (remaining <= 0) return null;
    return (
      <div
        className={`rounded-lg border border-xeption-gold/45 bg-xeption-gold/10 px-4 py-3 shadow-[0_0_20px_rgba(255,215,0,0.08)] ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-xeption-gold/20 border border-xeption-gold/35 shrink-0">
            <Truck className="h-5 w-5 text-xeption-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base text-white font-bold leading-snug">
              Plus que{' '}
              <span className="text-xeption-gold font-mono text-lg sm:text-xl">
                {remaining.toLocaleString('fr-FR')} FCFA
              </span>
            </p>
            <p className="text-xs text-gray-300 mt-0.5">pour débloquer la livraison offerte</p>
            <div className="h-2 bg-black/40 rounded-full mt-3 border border-white/10 overflow-hidden">
              <div
                className="h-full bg-xeption-gold rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(255,215,0,0.5)]"
                style={{ width: `${freeDeliveryProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5 uppercase tracking-widest font-tech">
              Seuil {FREE_DELIVERY_THRESHOLD_XAF.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </div>
      </div>
    );
  };

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
          form.clearDraft();
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

  const handleAddMoreProducts = () => {
    onClose();
    if (onNavigate) {
      onNavigate('shop');
    }
  };

  const hasSavedCoordinates =
    form.formData.name.trim() ||
    form.formData.phone.trim() ||
    form.formData.email.trim() ||
    form.formData.neighborhood.trim();

  const AddMoreProductsBlock: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
    <div
      className={`rounded-xl border border-dashed border-white/15 bg-black/25 space-y-2 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <button
        type="button"
        onClick={handleAddMoreProducts}
        className="w-full rounded-lg border border-white/15 bg-black/40 hover:border-xeption-gold/45 hover:bg-xeption-gold/10 px-4 py-3 flex items-center justify-center gap-2 text-xs font-tech font-bold uppercase tracking-wider text-gray-200 hover:text-white transition-all"
      >
        <Plus className="h-4 w-4 text-xeption-gold shrink-0" />
        Ajouter un autre produit
      </button>
      <p className="text-[10px] text-gray-500 text-center leading-relaxed">
        {hasSavedCoordinates
          ? 'Tes coordonnées restent enregistrées aujourd\'hui. Rouvre le panier pour continuer.'
          : 'Ton panier est conservé — parcours le catalogue et reviens ici.'}
      </p>
    </div>
  );

  const CartProductsRecap: React.FC = () => {
    if (cart.length === 0) return null;

    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
      <div className="rounded-xl border border-white/10 bg-black/30 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between gap-2">
          <span className="text-[10px] font-tech uppercase tracking-widest text-gray-400 font-bold flex items-center gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5 text-xeption-gold shrink-0" />
            Dans ton panier
          </span>
          <span className="text-[9px] text-gray-600 uppercase tracking-widest shrink-0">
            {itemCount} article{itemCount > 1 ? 's' : ''}
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-2 p-2 max-h-[260px] overflow-y-auto">
          {cart.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-white/10 bg-black/40 p-2 flex flex-col gap-1.5 hover:border-white/20 transition-colors min-w-0"
            >
              <div className="flex items-start gap-2 min-w-0">
                <div className="w-9 h-9 rounded-md bg-white/5 border border-white/10 p-0.5 shrink-0 overflow-hidden">
                  <img src={item.image} alt="" className="w-full h-full object-contain" />
                </div>
                <p className="text-white text-[9px] font-bold uppercase tracking-wide line-clamp-2 leading-tight min-w-0">
                  {item.name}
                </p>
              </div>
              <div className="flex justify-between items-end gap-1">
                <p className="text-[9px] text-gray-500 font-mono leading-tight">
                  {item.quantity} × {item.price.toLocaleString('fr-FR')}
                </p>
                <p className="text-[10px] font-mono font-bold text-white tabular-nums shrink-0">
                  {(item.price * item.quantity).toLocaleString('fr-FR')}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="px-3 py-2 border-t border-dashed border-white/10 flex justify-between items-center bg-black/25">
          <span className="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Sous-total</span>
          <span className="text-xs font-mono font-bold text-xeption-gold tabular-nums">
            {form.subtotal.toLocaleString('fr-FR')} FCFA
          </span>
        </div>
      </div>
    );
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

  const checkoutSteps = [
    { key: 'cart' as const, label: 'Panier' },
    { key: 'details' as const, label: 'Infos' },
    { key: 'payment' as const, label: 'Paiement' },
  ];
  const activeStepIndex = checkoutSteps.findIndex((s) => s.key === form.step);

  const isCompactCheckoutStep = form.step === 'details' || form.step === 'payment';

  const StepIndicator = () => (
    <div className={`flex justify-center items-center gap-2 sm:gap-3 ${isCompactCheckoutStep ? 'mb-4' : 'mb-6'}`}>
      {checkoutSteps.map((stepItem, index) => {
        const isActive = form.step === stepItem.key;
        const isDone = activeStepIndex > index;
        return (
          <React.Fragment key={stepItem.key}>
            <div className="flex flex-col items-center gap-2 min-w-[56px]">
              <div
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center font-tech font-bold text-sm transition-all duration-300 ${
                  isActive
                    ? 'border-xeption-gold bg-xeption-gold/15 text-xeption-gold shadow-[0_0_20px_rgba(255,215,0,0.35)] scale-110'
                    : isDone
                      ? 'border-xeption-gold/60 bg-xeption-gold/5 text-xeption-gold/80'
                      : 'border-white/15 bg-black/40 text-gray-500'
                }`}
              >
                {isDone ? <CheckCircle className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={`text-[10px] font-tech uppercase tracking-widest transition-colors ${
                  isActive ? 'text-xeption-gold font-bold' : isDone ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {stepItem.label}
              </span>
            </div>
            {index < checkoutSteps.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-16 mb-5 rounded-full transition-colors duration-500 ${
                  activeStepIndex > index ? 'bg-xeption-gold shadow-[0_0_8px_rgba(255,215,0,0.4)]' : 'bg-white/10'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
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
        {cart.length > 0 && <AddMoreProductsBlock />}
      </div>

      {cart.length > 0 && (
        <div className="w-full lg:w-[400px]">
          <div className="bg-black/50 backdrop-blur-xl border border-white/10 p-8 sticky top-8 shadow-2xl rounded-sm">
            <h3 className="text-xl font-bold text-white font-tech uppercase mb-6 border-b border-white/10 pb-4">Résumé</h3>
            <div className="space-y-4 mb-8 text-sm">
              <div className="flex justify-between text-gray-400"><span>Sous-total</span><span className="font-mono text-white">{form.subtotal.toLocaleString('fr-FR')} FCFA</span></div>
              <div className="flex justify-between text-gray-400 items-center">
                <span>Livraison</span>
                <span className={`font-mono text-xs ${form.qualifiesForFreeDelivery ? 'text-green-400 font-bold' : 'text-gray-500'}`}>
                  {form.qualifiesForFreeDelivery ? 'Offerte' : 'Selon ville'}
                </span>
              </div>
              <FreeDeliveryHint />
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
            <div className="mb-4">
              <AddMoreProductsBlock compact />
            </div>
            <button onClick={handleNext} className="w-full bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-wider py-4 text-lg shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all flex items-center justify-center gap-2 group">
              Continuer <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderDetails = () => {
    const nameValid = form.formData.name.trim().length >= 2;
    const phoneValid = form.formData.phone.trim().length >= 8;
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.formData.email.trim());
    const locationValid = Boolean(form.selectedDeliveryZone && form.formData.neighborhood);
    const firstName = form.formData.name.trim().split(/\s+/)[0] || 'champion';

    const questChecks =
      form.deliveryMode === 'delivery'
        ? [
            nameValid,
            phoneValid,
            Boolean(form.selectedDeliveryZone),
            Boolean(form.formData.neighborhood),
          ]
        : [nameValid, phoneValid];
    const questDone = questChecks.filter(Boolean).length;
    const questTotal = questChecks.length;
    const questProgress = Math.round((questDone / questTotal) * 100);
    const questComplete = questDone === questTotal;

    const questProgressBlock = (
      <div className="rounded-xl border border-white/10 bg-black/40 p-3 lg:p-4">
        <div className="flex justify-between items-center text-[10px] uppercase tracking-widest mb-2">
          <span className="text-gray-500 font-bold">Progression</span>
          <span className={`font-tech font-bold ${questComplete ? 'text-green-400' : 'text-xeption-gold'}`}>
            {questDone}/{questTotal} checkpoints
          </span>
        </div>
        <div className="h-2 bg-black/60 rounded-full border border-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              questComplete
                ? 'bg-gradient-to-r from-green-500 to-green-400 shadow-[0_0_14px_rgba(34,197,94,0.5)]'
                : 'bg-gradient-to-r from-xeption-gold/70 to-xeption-gold shadow-[0_0_12px_rgba(255,215,0,0.4)]'
            }`}
            style={{ width: `${questProgress}%` }}
          />
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {[
            { ok: nameValid, label: 'Nom' },
            { ok: phoneValid, label: 'WhatsApp' },
            ...(form.deliveryMode === 'delivery'
              ? [
                  { ok: Boolean(form.selectedDeliveryZone), label: 'Ville' },
                  { ok: Boolean(form.formData.neighborhood), label: 'Quartier' },
                ]
              : [{ ok: true, label: 'Retrait OK' }]),
          ].map((chip) => (
            <span
              key={chip.label}
              className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border transition-all duration-300 ${
                chip.ok
                  ? 'border-green-500/40 bg-green-500/10 text-green-400'
                  : 'border-white/10 bg-black/30 text-gray-600'
              }`}
            >
              {chip.ok ? (
                <CheckCircle className="h-3 w-3 shrink-0" />
              ) : (
                <Circle className="h-3 w-3 shrink-0 opacity-50" />
              )}
              {chip.label}
            </span>
          ))}
          {emailValid && (
            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border border-xeption-gold/40 bg-xeption-gold/10 text-xeption-gold">
              <Mail className="h-3 w-3 shrink-0" />
              Bonus mail
            </span>
          )}
        </div>
        {questComplete && (
          <p className="text-green-400 text-[10px] mt-2 font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Unlock className="h-3 w-3 shrink-0" />
            Paiement débloqué
          </p>
        )}
      </div>
    );

    const deliveryModeBlock = (
      <div>
        <p className="text-[10px] font-tech uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-xeption-gold/15 border border-xeption-gold/30 flex items-center justify-center text-xeption-gold text-[9px] font-bold">?</span>
          Comment tu reçois ?
        </p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:gap-2">
          <button
            type="button"
            onClick={() => form.setDeliveryMode('delivery')}
            className={`group relative p-3 rounded-xl border text-left transition-all duration-300 active:scale-[0.98] ${
              form.deliveryMode === 'delivery'
                ? 'border-xeption-gold bg-xeption-gold/10 shadow-[0_0_20px_rgba(255,215,0,0.1)]'
                : 'border-white/10 bg-black/30 hover:border-white/25 hover:bg-black/50'
            }`}
          >
            <Truck
              className={`h-5 w-5 mb-2 transition-all duration-300 ${
                form.deliveryMode === 'delivery' ? 'text-xeption-gold -rotate-6' : 'text-gray-500 group-hover:text-gray-300'
              }`}
            />
            <span className="block text-white font-bold uppercase text-[10px] tracking-wider">Chez toi</span>
            <span className="text-xeption-gold text-[10px] font-mono font-bold">
              {form.qualifiesForFreeDelivery
                ? 'Offerte'
                : form.selectedDeliveryZone
                  ? `${form.selectedDeliveryZone.price.toLocaleString('fr-FR')} FCFA`
                  : 'Selon ville'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => form.setDeliveryMode('pickup')}
            className={`group relative p-3 rounded-xl border text-left transition-all duration-300 active:scale-[0.98] ${
              form.deliveryMode === 'pickup'
                ? 'border-xeption-gold bg-xeption-gold/10 shadow-[0_0_20px_rgba(255,215,0,0.1)]'
                : 'border-white/10 bg-black/30 hover:border-white/25 hover:bg-black/50'
            }`}
          >
            <Store
              className={`h-5 w-5 mb-2 transition-all duration-300 ${
                form.deliveryMode === 'pickup' ? 'text-xeption-gold scale-110' : 'text-gray-500 group-hover:text-gray-300'
              }`}
            />
            <span className="block text-white font-bold uppercase text-[10px] tracking-wider">En boutique</span>
            <span className="text-green-400 text-[10px] font-mono font-bold">Gratuit</span>
          </button>
        </div>
      </div>
    );

    const totalAndActionsBlock = (
      <>
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 relative overflow-hidden">
          {questComplete && (
            <div className="absolute inset-0 bg-green-500/[0.03] pointer-events-none" />
          )}
          <div className="space-y-1.5 text-sm mb-3 relative z-10">
            <div className="flex justify-between text-gray-400 text-xs">
              <span>Sous-total</span>
              <span className="font-mono text-white">{form.subtotal.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-gray-400 text-xs items-start gap-2">
              <span>{form.deliveryMode === 'delivery' ? 'Livraison' : 'Retrait'}</span>
              <span className="text-right">
                {form.deliveryMode === 'pickup' ? (
                  <span className="font-mono text-green-400">Gratuit</span>
                ) : form.deliveryFee === 0 ? (
                  <span className="font-mono text-green-400">
                    Gratuit
                    {form.qualifiesForFreeDelivery && form.zoneDeliveryFee > 0 && (
                      <span className="block text-[9px] text-gray-500 line-through">
                        {form.zoneDeliveryFee.toLocaleString('fr-FR')} FCFA
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="font-mono text-white">
                    {form.deliveryFee.toLocaleString('fr-FR')} FCFA
                  </span>
                )}
              </span>
            </div>
            {form.deliveryMode === 'delivery' && <FreeDeliveryHint className="mb-1" />}
          </div>
          <div className="border-t border-dashed border-white/15 pt-3 flex justify-between items-end relative z-10">
            <span className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Total</span>
            <div className="text-right">
              <span className="text-xl lg:text-2xl font-bold font-tech text-white">{form.total.toLocaleString('fr-FR')}</span>
              <span className="text-xeption-gold text-xs font-bold ml-1">FCFA</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={form.prevStep}
            className="px-5 py-3 text-gray-400 border border-white/10 hover:border-white/30 hover:text-white font-bold uppercase text-[10px] tracking-widest transition-all bg-black/30 rounded-lg"
          >
            Retour
          </button>
          <button
            onClick={handleNext}
            className={`flex-1 font-bold py-3 font-tech uppercase tracking-wider text-xs transition-all rounded-lg flex items-center justify-center gap-2 group ${
              questComplete
                ? 'bg-xeption-gold text-black hover:bg-white shadow-[0_0_30px_rgba(255,215,0,0.45)] animate-pulse hover:animate-none'
                : 'bg-white/10 text-gray-400 border border-white/10 cursor-not-allowed'
            }`}
            disabled={!questComplete}
          >
            {questComplete ? (
              <>
                Débloquer le paiement
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            ) : (
              <>
                {questTotal - questDone} info{questTotal - questDone > 1 ? 's' : ''} restante{questTotal - questDone > 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </>
    );

    return (
      <div className="max-w-6xl mx-auto w-full relative overflow-hidden rounded-lg border border-white/10 bg-black/60 backdrop-blur-xl shadow-[0_0_60px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-xeption-gold/60 to-transparent" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-xeption-gold/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-xeption-gold/5 rounded-full blur-3xl pointer-events-none" />

        <div className="p-5 sm:p-6 lg:p-8 relative z-10">
          <div className="text-center mb-5 lg:hidden">
            <p className="text-[10px] font-tech uppercase tracking-[0.35em] text-gray-500 mb-1">-- Mission checkout --</p>
            <div className="flex items-center justify-center gap-2">
              <Zap className="h-4 w-4 text-xeption-gold animate-pulse" />
              <h2 className="text-base font-bold uppercase tracking-widest font-tech text-white">
                C&apos;est presque dans la boîte !
              </h2>
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] lg:gap-8 lg:items-start">
            {/* Panneau gauche — formulaire */}
            <div className="order-3 lg:order-none space-y-3">
              <div className="hidden lg:flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-xeption-gold" />
                <h3 className="text-sm font-tech font-bold uppercase tracking-widest text-white">Tes coordonnées</h3>
              </div>

              <PlayfulField
                step={1}
                label="Qui commande ?"
                hint="Ton nom pour la commande et l'appel WhatsApp"
                doneMessage={`Respect ${firstName}, c'est noté`}
                value={form.formData.name}
                onChange={(v) => form.setFormData({ ...form.formData, name: v })}
                placeholder="Ex: Samuel Eto'o"
                icon={<User className="h-4 w-4" />}
                isValid={nameValid}
                delayClass="duration-300"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                <PlayfulField
                  step={2}
                  label="Ton WhatsApp"
                  hint="Numéro actif pour l'appel"
                  doneMessage="Numéro validé"
                  value={form.formData.phone}
                  onChange={(v) => form.setFormData({ ...form.formData, phone: v })}
                  placeholder="Ex: 699 12 34 56"
                  type="tel"
                  icon={<Phone className="h-4 w-4" />}
                  isValid={phoneValid}
                  delayClass="duration-500"
                />
                <PlayfulField
                  step={3}
                  label="Email facture"
                  hint="Optionnel — facture PDF"
                  doneMessage="Facture prête par mail"
                  value={form.formData.email}
                  onChange={(v) => form.setFormData({ ...form.formData, email: v })}
                  placeholder="Ex: samuel@..."
                  type="email"
                  optional
                  icon={<Mail className="h-4 w-4" />}
                  isValid={emailValid}
                  delayClass="duration-700"
                />
              </div>

              {form.deliveryMode === 'delivery' ? (
                <DeliveryLocationSelect
                  step={4}
                  zones={deliveryZones}
                  selectedZoneId={form.selectedDeliveryZone?.id ?? ''}
                  neighborhood={form.formData.neighborhood}
                  onZoneChange={form.setSelectedDeliveryZone}
                  onNeighborhoodChange={form.setNeighborhood}
                  isLoading={deliveryZonesLoading}
                  isValid={locationValid}
                />
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-xeption-gold/25 bg-gradient-to-br from-xeption-gold/8 to-transparent p-4 flex items-start gap-3 animate-in fade-in duration-300">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-xeption-gold/15 border border-xeption-gold/30 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-xeption-gold" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold uppercase text-xs mb-0.5 tracking-wide">Retrait · Mfoundi Mall</h4>
                    <p className="text-gray-400 text-[11px]">Yaoundé · Boutique 2063</p>
                    <p className="text-xeption-gold/90 text-[9px] uppercase tracking-widest mt-1.5 font-bold">N&apos;oublie pas ton ID</p>
                  </div>
                </div>
              )}

              <AddMoreProductsBlock />
              <CartProductsRecap />
            </div>

            {/* Panneau droit — mission + livraison + total */}
            <div className="order-2 lg:order-none flex flex-col gap-4 lg:sticky lg:top-2">
              <div className="hidden lg:block">
                <p className="text-[10px] font-tech uppercase tracking-[0.35em] text-gray-500 mb-1">-- Mission checkout --</p>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-xeption-gold animate-pulse" />
                  <h2 className="text-base font-bold uppercase tracking-widest font-tech text-white">
                    Presque dans la boîte !
                  </h2>
                </div>
                <p className="text-gray-500 text-[11px] mt-1">
                  {questTotal} infos et tu débloques le paiement.
                </p>
              </div>

              <div className="order-1 lg:order-none">{questProgressBlock}</div>
              <div className="order-2 lg:order-none">{deliveryModeBlock}</div>
              <div className="order-3 lg:order-none hidden lg:flex lg:flex-col lg:gap-4">{totalAndActionsBlock}</div>
            </div>

            {/* Mobile — total + actions en bas */}
            <div className="order-4 lg:hidden flex flex-col gap-4">{totalAndActionsBlock}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderPayment = () => (
    <div className="max-w-2xl mx-auto w-full bg-black/50 backdrop-blur-xl border border-white/10 p-8 sm:p-12 shadow-2xl rounded-sm">
      <h3 className="text-3xl font-bold text-white font-tech uppercase mb-8 text-center drop-shadow-md">Règlement</h3>
      <div className="space-y-3">
        {Object.values(PaymentMethod).map((method) => {
          const isSelected = form.selectedPayment === method;
          return (
            <button
              key={method}
              type="button"
              onClick={() => form.setSelectedPayment(method)}
              className={`w-full p-4 sm:p-5 border cursor-pointer transition-all flex items-center gap-3 sm:gap-4 group relative text-left rounded-lg ${
                isSelected
                  ? 'border-xeption-gold bg-xeption-gold/10 shadow-[0_0_20px_rgba(255,215,0,0.08)]'
                  : 'border-white/15 bg-black/40 hover:border-white/35 hover:bg-black/60'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  isSelected
                    ? 'border-xeption-gold bg-xeption-gold/20 shadow-[0_0_12px_rgba(255,215,0,0.4)]'
                    : 'border-white/55 bg-black/60'
                }`}
                aria-hidden
              >
                {isSelected ? (
                  <div className="w-3 h-3 rounded-full bg-xeption-gold shadow-[0_0_8px_#FFD700]" />
                ) : null}
              </div>
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 relative z-10">
                {method.includes('Orange') && (
                  <div className="w-11 h-11 sm:w-12 sm:h-12 bg-orange-600 flex items-center justify-center text-white font-bold rounded-sm shadow-lg shrink-0">OM</div>
                )}
                {method.includes('MTN') && (
                  <div className="w-11 h-11 sm:w-12 sm:h-12 bg-yellow-400 flex items-center justify-center text-black font-bold rounded-sm shadow-lg shrink-0">MoMo</div>
                )}
                {method.includes('Cash') && (
                  <div className="w-11 h-11 sm:w-12 sm:h-12 bg-green-700 flex items-center justify-center text-white font-bold rounded-sm shadow-lg shrink-0">$$</div>
                )}
                <div className="min-w-0">
                  <span className="block text-white font-tech font-bold uppercase tracking-wide text-sm sm:text-lg group-hover:text-xeption-gold transition-colors leading-tight">
                    {method}
                  </span>
                  <span className="text-[11px] sm:text-xs text-gray-500 leading-snug mt-0.5">
                    {method.includes('Cash')
                      ? 'Paiement au retrait ou à la livraison'
                      : 'Instructions de règlement communiquées par la boutique'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {form.selectedPayment === PaymentMethod.OM && (
        <div className="mt-4 bg-orange-900/20 border border-orange-500/30 p-6 rounded relative overflow-hidden backdrop-blur-sm transition-all duration-300">
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
        <div className="mt-4 bg-yellow-900/20 border border-yellow-500/30 p-6 rounded relative overflow-hidden backdrop-blur-sm transition-all duration-300">
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

      <div className="mt-5 flex flex-col items-center gap-2">
        <p className="text-[10px] font-tech uppercase tracking-widest text-gray-500 font-bold">
          Vérification anti-robot
        </p>
        <div className="rounded-lg border border-white/15 bg-white p-3 shadow-lg">
          <HCaptcha
            ref={captchaRef}
            sitekey={HCAPTCHA_SITE_KEY}
            theme="light"
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken(null)}
            onError={() => setCaptchaToken(null)}
          />
        </div>
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
      <div className="min-h-screen flex flex-col items-center justify-start pt-4 sm:pt-5 pb-8 px-4 sm:px-6">
        <div className={`w-full max-w-7xl flex justify-between items-center relative z-20 ${
          isCompactCheckoutStep ? 'mb-3' : 'mb-6'
        }`}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-1 bg-xeption-gold shadow-[0_0_10px_#FFD700]"></div>
            <h1 className="text-3xl md:text-4xl font-bold text-white font-tech uppercase tracking-wider drop-shadow-lg">
              Finaliser <span className="text-xeption-gold">la commande</span>
            </h1>
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
