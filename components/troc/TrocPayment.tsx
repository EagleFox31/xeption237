import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, AlertCircle, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { formatTrocFee, TROC_TIER_LABELS, TROC_TIER_PRICES, type TrocTier } from '../../utils/trocPricing';
import { detectCameroonOperator, OPERATOR_LABELS, type CameroonOperator } from '../../utils/cameroonOperators';

interface TrocPaymentProps {
  selectedTier: TrocTier;
  paymentAmount?: number;
  initialPhone?: string;
  onInitiate: (phone: string) => Promise<void>;
  onRetry: () => void;
  paymentState: 'idle' | 'initiating' | 'pending' | 'polling' | 'paid' | 'failed' | 'expired' | 'timeout';
  error: string | null;
}

const POLL_MESSAGES = [
  'Connexion sécurisée avec Mobile Money…',
  'Vérification de la transaction en cours…',
  'Préparez-vous à recevoir votre expertise…',
] as const;

const OperatorBadge: React.FC<{ operator: CameroonOperator | null }> = ({ operator }) => {
  if (!operator) {
    return (
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-600 font-tech" title="Opérateur non détecté">
        ?
      </span>
    );
  }
  const styles =
    operator === 'mtn'
      ? 'bg-[#FFCC00] text-black border-black/10'
      : 'bg-[#FF6600] text-white border-white/20';
  return (
    <span
      className={`absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-tech font-bold uppercase px-1.5 py-0.5 rounded border ${styles} transition-opacity`}
      title={OPERATOR_LABELS[operator]}
    >
      {operator === 'mtn' ? 'MoMo' : 'OM'}
    </span>
  );
};

export const TrocPayment: React.FC<TrocPaymentProps> = ({
  selectedTier,
  paymentAmount = 0,
  initialPhone = '',
  onInitiate,
  onRetry,
  paymentState,
  error,
}) => {
  const [phone, setPhone] = useState(initialPhone);
  const [accepted, setAccepted] = useState(false);
  const [pollMsgIndex, setPollMsgIndex] = useState(0);
  const [pollProgress, setPollProgress] = useState(12);

  const amountLocked =
    paymentState === 'pending' ||
    paymentState === 'polling' ||
    paymentState === 'paid' ||
    paymentState === 'initiating';
  const amountXaf =
    amountLocked && paymentAmount > 0 ? paymentAmount : TROC_TIER_PRICES[selectedTier];
  const fee = formatTrocFee(amountXaf);
  const feeShort = formatTrocFee(amountXaf, { short: true });
  const tierLabel = TROC_TIER_LABELS[selectedTier];

  const phoneDigits = phone.replace(/\s/g, '');
  const isPhoneValid = /^[62]\d{8}$/.test(phoneDigits);
  const operator = isPhoneValid ? detectCameroonOperator(phoneDigits) : null;
  const isLoading = paymentState === 'initiating' || paymentState === 'pending' || paymentState === 'polling';
  const isPolling = paymentState === 'pending' || paymentState === 'polling';

  useEffect(() => {
    if (!isPolling) {
      setPollMsgIndex(0);
      setPollProgress(12);
      return;
    }
    const msgTimer = setInterval(() => {
      setPollMsgIndex((i) => (i + 1) % POLL_MESSAGES.length);
    }, 3000);
    const progTimer = setInterval(() => {
      setPollProgress((p) => (p >= 92 ? 12 : p + 8));
    }, 2200);
    return () => {
      clearInterval(msgTimer);
      clearInterval(progTimer);
    };
  }, [isPolling]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneValid || isLoading || !accepted) return;
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
      <div className="text-center">
        <p className="text-neutral-300 text-sm leading-relaxed">
          Formule <span className="text-white font-semibold">{tierLabel}</span> — frais de service{' '}
          <span className="text-white font-semibold">{fee}</span> via Mobile Money.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-14 pr-14 py-3 text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-neutral-500 disabled:opacity-50"
            />
            <OperatorBadge operator={operator} />
          </div>
          {phone && !isPhoneValid && (
            <p className="text-red-400 text-xs">Format invalide — commencez par 6 ou 2</p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-900/30 border border-red-800 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {isPolling && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Loader2 className="w-8 h-8 text-xeption-gold animate-spin" />
            <p className="text-neutral-200 text-sm font-medium min-h-[2.5rem] transition-opacity">
              {POLL_MESSAGES[pollMsgIndex]}
            </p>
            <div className="w-full max-w-xs h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-xeption-gold/80 transition-all duration-700 ease-out"
                style={{ width: `${pollProgress}%` }}
              />
            </div>
            <p className="text-neutral-500 text-xs">
              Confirmez sur votre téléphone — <span className="text-white">+237 {phone}</span>
            </p>
            <p className="text-neutral-600 text-[10px]">La confirmation peut prendre jusqu&apos;à 60 secondes</p>
          </div>
        )}

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

        {(paymentState === 'idle' || paymentState === 'initiating') && (
          <label className="flex items-start gap-3 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={isLoading}
              className="mt-0.5 w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-xeption-gold focus:ring-1 focus:ring-xeption-gold cursor-pointer shrink-0"
            />
            <span className="text-neutral-400 text-xs leading-relaxed group-hover:text-neutral-300 transition-colors">
              J&apos;ai lu et j&apos;accepte les{' '}
              <Link
                to="/cgv-smart-troc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xeption-gold hover:underline"
              >
                conditions Smart Troc
              </Link>
              {' '}— frais de {feeShort} non remboursable, estimation indicative confirmée en boutique.
            </span>
          </label>
        )}

        {(paymentState === 'idle' || paymentState === 'initiating') && (
          <button
            type="submit"
            disabled={!isPhoneValid || isLoading || !accepted}
            className="flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100 transition-colors"
          >
            {paymentState === 'initiating' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Initialisation…
              </>
            ) : (
              <>
                <Smartphone className="w-4 h-4" />
                Payer {feeShort}
              </>
            )}
          </button>
        )}
      </form>

      <p className="text-neutral-600 text-xs text-center">
        Paiement sécurisé — les frais s&apos;appliquent en déduction de votre bon de troc.
      </p>
    </div>
  );
};
