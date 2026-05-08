import React, { useState } from 'react';
import { Smartphone, AlertCircle, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';

interface TrocPaymentProps {
  onInitiate: (phone: string) => Promise<void>;
  onRetry: () => void;
  paymentState: 'idle' | 'initiating' | 'pending' | 'polling' | 'paid' | 'failed' | 'expired' | 'timeout';
  error: string | null;
}

export const TrocPayment: React.FC<TrocPaymentProps> = ({
  onInitiate,
  onRetry,
  paymentState,
  error,
}) => {
  const [phone, setPhone] = useState('');

  const phoneDigits = phone.replace(/\s/g, '');
  const isPhoneValid = /^[62]\d{8}$/.test(phoneDigits);
  const isLoading = paymentState === 'initiating' || paymentState === 'pending' || paymentState === 'polling';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneValid || isLoading) return;
    onInitiate(phoneDigits);
  };

  if (paymentState === 'paid') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="w-14 h-14 text-green-400" />
        <p className="text-white text-lg font-semibold">Paiement confirmé</p>
        <p className="text-neutral-400 text-sm">Votre évaluation est en cours de préparation…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="text-center">
        <p className="text-neutral-300 text-sm leading-relaxed">
          Pour accéder à l'estimation de votre appareil, un frais de service de{' '}
          <span className="text-white font-semibold">150 XAF</span> est requis via Mobile Money.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Numéro de téléphone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-neutral-400 text-xs font-medium uppercase tracking-wide">
            Numéro Mobile Money
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm select-none">
              +237
            </span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="6XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
              maxLength={12}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-14 pr-4 py-3 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-500 disabled:opacity-50"
            />
          </div>
          {phone && !isPhoneValid && (
            <p className="text-red-400 text-xs">Format invalide — commencez par 6 ou 2</p>
          )}
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="flex items-start gap-2 bg-red-900/30 border border-red-800 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* État de polling */}
        {(paymentState === 'pending' || paymentState === 'polling') && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
            <p className="text-neutral-300 text-sm font-medium">
              Confirmez le paiement sur votre téléphone
            </p>
            <p className="text-neutral-500 text-xs">
              Un message USSD a été envoyé au{' '}
              <span className="text-white">+237 {phone}</span>
            </p>
          </div>
        )}

        {/* Bouton Réessayer après échec/expiration */}
        {(paymentState === 'failed' || paymentState === 'expired' || paymentState === 'timeout') && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-neutral-600 text-neutral-300 text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {paymentState === 'expired' ? 'Le délai a expiré — réessayer' : 'Réessayer avec un autre numéro'}
          </button>
        )}

        {/* Bouton principal */}
        {(paymentState === 'idle' || paymentState === 'initiating') && (
          <button
            type="submit"
            disabled={!isPhoneValid || isLoading}
            className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-40 hover:bg-neutral-100 transition-colors"
          >
            {paymentState === 'initiating' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Initialisation…
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4" />
                Payer 150 XAF
              </>
            )}
          </button>
        )}
      </form>

      <p className="text-neutral-600 text-xs text-center">
        Paiement sécurisé — les frais s'appliquent en déduction de votre bon de troc.
      </p>
    </div>
  );
};
