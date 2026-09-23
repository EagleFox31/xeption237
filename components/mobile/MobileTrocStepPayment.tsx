import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { detectCameroonOperator, type CameroonOperator } from '../../utils/cameroonOperators';

export interface MobileTrocStepPaymentProps {
  currentStep?: number;
  totalSteps?: number;
  initialPhone?: string;
  paymentAmount?: number;
  paymentState: 'idle' | 'initiating' | 'pending' | 'polling' | 'paid' | 'failed' | 'expired' | 'timeout';
  error?: string | null;
  onInitiate: (phone: string) => Promise<void>;
  onRetry: () => void;
  onBack?: () => void;
}

const POLL_MESSAGES = [
  'Envoi de l’invite USSD sur votre téléphone…',
  'En attente de votre code secret Mobile Money…',
  'Validation de la transaction sécurisée…',
  'Préparation de votre rapport d’audit IA…',
] as const;

export const MobileTrocStepPayment: React.FC<MobileTrocStepPaymentProps> = ({
  currentStep = 4,
  totalSteps = 4,
  initialPhone = '',
  paymentAmount = 100,
  paymentState,
  error = null,
  onInitiate,
  onRetry,
  onBack,
}) => {
  const [phone, setPhone] = useState(initialPhone);
  const [selectedOperator, setSelectedOperator] = useState<CameroonOperator>('mtn');
  const [pollMsgIndex, setPollMsgIndex] = useState(0);

  const phoneDigits = phone.replace(/\s+/g, '');
  const detectedOperator = detectCameroonOperator(phoneDigits);

  // Auto-sélection de l'opérateur selon le numéro saisi
  useEffect(() => {
    if (detectedOperator) {
      setSelectedOperator(detectedOperator);
    }
  }, [detectedOperator]);

  const isPhoneValid = /^[62]\d{8}$/.test(phoneDigits);
  const isLoading = paymentState === 'initiating' || paymentState === 'pending' || paymentState === 'polling';
  const isPolling = paymentState === 'pending' || paymentState === 'polling';

  useEffect(() => {
    if (!isPolling) {
      setPollMsgIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setPollMsgIndex((prev) => (prev + 1) % POLL_MESSAGES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [isPolling]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isPhoneValid || isLoading) return;
    onInitiate(phoneDigits);
  };

  // Format affichage montant
  const displayAmount = paymentAmount > 0 ? paymentAmount : 100;

  return (
    <div className="w-full h-full min-h-[calc(100dvh-132px-96px)] flex flex-col justify-start gap-1 px-4 pt-1 pb-24 relative select-none overflow-hidden">
      {/* Halo d'ambiance dorée haut droite */}
      <div className="absolute -top-20 -right-20 w-88 h-88 bg-gradient-to-bl from-amber-400/20 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── 1. STEPPER 4 ÉTAPES NUMÉROTÉES (Identique étapes 1, 2 & 3) ─────────── */}
      <div className="relative z-10 pt-1 shrink-0">
        <div className="flex items-center justify-between w-full max-w-[280px] mx-auto py-1">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNum, idx) => {
            const isActive = stepNum === currentStep;
            const isDone = stepNum < currentStep;

            return (
              <React.Fragment key={stepNum}>
                <button
                  type="button"
                  disabled={!isDone}
                  onClick={() => {
                    if (isDone && onBack) onBack();
                  }}
                  title={isDone ? "Revenir en arrière" : undefined}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-tech font-bold text-xs transition-all ${
                    isDone ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
                  } ${
                    isActive
                      ? 'border-2 border-amber-400 bg-amber-400 text-black font-black shadow-[0_0_18px_rgba(251,191,36,0.6)] scale-110'
                      : isDone
                      ? 'border border-amber-400/80 bg-black/40 text-amber-300 font-bold'
                      : 'border border-zinc-700 bg-zinc-900/60 text-zinc-500'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : stepNum}
                </button>
                {idx < totalSteps - 1 && (
                  <div
                    className={`flex-1 h-[1.5px] mx-2 transition-colors ${
                      stepNum < currentStep ? 'bg-amber-400/70' : 'bg-zinc-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Titres de page compacts */}
      <div className="pt-0.5 flex items-center justify-between shrink-0">
        <h1 className="text-[20px] sm:text-[24px] font-tech font-black tracking-tight leading-none text-white">
          Frais d’audit{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200">
            {displayAmount} FCFA
          </span>
        </h1>
        <span className="text-[10px] font-tech font-bold text-amber-400/80 uppercase tracking-wider">
          100% déductible
        </span>
      </div>

      {/* ── 2. CARTE MONTANT + OPÉRATEURS ─────────────────────── */}
      <div className="relative z-10 flex flex-col gap-2 my-1 shrink-0">
        {/* CARTE MONTANT 100 FCFA LUMINEUSE & COMPACTE */}
        <div className="bg-[#121215]/90 backdrop-blur-md border border-amber-400/35 shadow-md rounded-xl py-2 px-3 flex items-center justify-between transition-all">
          <span className="text-xl sm:text-2xl font-tech font-black whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200">
            {displayAmount} FCFA
          </span>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Remboursable</span>
          </div>
        </div>

        {/* ÉTAT : EN COURS DE PAIEMENT / POLLING USSD */}
        {isLoading ? (
          <div className="bg-[#121215]/90 border border-amber-400/40 rounded-xl p-4 text-center flex flex-col items-center gap-2 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            </div>
            <div>
              <p className="text-white font-bold text-xs uppercase tracking-wide">Validation USSD envoyée</p>
              <p className="text-amber-300 text-xs mt-0.5 font-medium">
                {POLL_MESSAGES[pollMsgIndex]}
              </p>
            </div>
            <p className="text-white/50 text-[10px] max-w-xs">
              Consultez l'écran de votre téléphone pour taper votre code PIN Mobile Money.
            </p>
            <div className="mt-1 px-2.5 py-1.5 rounded-lg bg-black/60 border border-amber-400/40 text-[10.5px] text-zinc-300 max-w-xs leading-snug">
              Pas reçu d’invitation après 1 min ? Tapez <span className="font-mono font-bold text-amber-300">#150*50#</span> (Orange) ou <span className="font-mono font-bold text-amber-300">*126#</span> (MTN).
            </div>
          </div>
        ) : (
          /* SÉLECTION OPÉRATEURS MTN & ORANGE EN GRILLE 2 COLONNES */
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              {/* CARTE MTN MOBILE MONEY */}
              <button
                type="button"
                onClick={() => setSelectedOperator('mtn')}
                className={`text-left rounded-xl p-2 flex items-center gap-2 transition-all border cursor-pointer ${
                  selectedOperator === 'mtn'
                    ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
                    : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#FFCC00] text-black font-extrabold text-[10px] flex items-center justify-center shrink-0 shadow">
                  MTN
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-xs truncate">MTN MoMo</div>
                  <div className="text-zinc-500 text-[10px] font-mono">67X, 68X</div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedOperator === 'mtn'
                      ? 'border-amber-400 bg-amber-400'
                      : 'border-zinc-600'
                  }`}
                >
                  {selectedOperator === 'mtn' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
              </button>

              {/* CARTE ORANGE MONEY */}
              <button
                type="button"
                onClick={() => setSelectedOperator('orange')}
                className={`text-left rounded-xl p-2 flex items-center gap-2 transition-all border cursor-pointer ${
                  selectedOperator === 'orange'
                    ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.25)]'
                    : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-700'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#FF6600] text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow">
                  OM
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-xs truncate">Orange Money</div>
                  <div className="text-zinc-500 text-[10px] font-mono">69X, 65X</div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    selectedOperator === 'orange'
                      ? 'border-orange-500 bg-orange-500'
                      : 'border-zinc-600'
                  }`}
                >
                  {selectedOperator === 'orange' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            </div>

            {/* CHAMP SAISIE DU NUMÉRO MOBILE MONEY */}
            <div>
              <label className="block text-[11px] font-medium text-white/70 mb-1">
                Numéro Mobile Money (9 chiffres) :
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-white/60 font-mono text-xs font-semibold pointer-events-none">
                  +237
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="6XX XXX XXX"
                  maxLength={13}
                  className="w-full bg-[#16161A] border border-white/15 rounded-xl pl-14 pr-3 py-2 text-white text-sm font-mono tracking-wider focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* BANNIÈRE D'ERREUR */}
        {error && (
          <div className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-[11px]">{error}</span>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="block mt-0.5 text-red-300 font-bold underline hover:text-white text-[11px]"
                >
                  Réessayer
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. BOUTON ACTION PAIEMENT TOUJOURS VISIBLE ───────────────────────────────────────── */}
      <div className="relative z-10 shrink-0 mt-1">
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={!isPhoneValid || isLoading}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-tech font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.35)] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Attente de validation…</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Payer {displayAmount} F (Validation USSD)</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-zinc-400 mt-1 font-medium leading-tight">
          Sans invite après 1 min, tapez <span className="font-mono font-bold text-amber-300">#150*50#</span> (Orange) ou <span className="font-mono font-bold text-amber-300">*126#</span> (MTN)
        </p>
      </div>
    </div>
  );
};

export default MobileTrocStepPayment;
