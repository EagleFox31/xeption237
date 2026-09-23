import React, { useState } from 'react';
import { Power, Camera, ArrowRight, Check, AlertCircle } from 'lucide-react';

export interface DiagnosticAnswers {
  powersOn: boolean;
  touchOk: boolean;
  camerasBiometrics: 'oui' | 'non' | 'nsp';
}

export interface MobileTrocStep3Props {
  currentStep?: number;
  totalSteps?: number;
  initialAnswers?: Partial<DiagnosticAnswers>;
  onNext: (answers: DiagnosticAnswers) => void;
  onBack?: () => void;
}

export const MobileTrocStep3: React.FC<MobileTrocStep3Props> = ({
  currentStep = 3,
  totalSteps = 4,
  initialAnswers,
  onNext,
  onBack,
}) => {
  const [powersOn, setPowersOn] = useState<boolean>(initialAnswers?.powersOn ?? true);
  const [touchOk, setTouchOk] = useState<boolean>(initialAnswers?.touchOk ?? true);
  const [camerasBiometrics, setCamerasBiometrics] = useState<'oui' | 'non' | 'nsp'>(
    initialAnswers?.camerasBiometrics ?? 'oui',
  );

  const handleSubmit = () => {
    onNext({
      powersOn,
      touchOk,
      camerasBiometrics,
    });
  };

  return (
    <div className="w-full h-full min-h-[calc(100dvh-132px-96px)] flex flex-col justify-start gap-1 px-4 pt-1 pb-24 relative select-none overflow-hidden">
      {/* Halo et ambiance dorée en arrière-plan */}
      <div className="absolute -top-16 -right-16 w-80 h-80 bg-gradient-to-bl from-amber-400/20 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── 1. STEPPER 4 ÉTAPES NUMÉROTÉES (Identique étapes 1 & 2) ─────────── */}
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

      {/* Titre & sous-titre */}
      <div className="pt-0.5 flex items-center justify-between shrink-0">
        <h1 className="text-[20px] sm:text-[24px] font-tech font-black tracking-tight leading-none text-white">
          Diagnostic{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-200">
            express
          </span>
        </h1>
        <span className="text-[11px] font-tech font-bold text-amber-400/80 uppercase tracking-wider">
          3 réponses
        </span>
      </div>

      {/* ── 2. LES 3 CARTES DE DIAGNOSTIC COMPACTES ──────────────────────────────────── */}
      <div className="relative z-10 flex flex-col gap-2 my-1.5 shrink-0">
        {/* CARTE 1 : S'allume ? */}
        <div className="bg-[#121215]/90 backdrop-blur-md border border-amber-400/30 rounded-xl p-2.5 flex items-center justify-between shadow-md transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
              <Power className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-white font-semibold text-sm tracking-wide truncate">
              S'allume ?
            </span>
          </div>

          <div className="bg-[#18181D] border border-white/10 rounded-lg p-0.5 flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setPowersOn(true)}
              className={`min-w-[48px] py-1.5 px-3 rounded-md text-xs font-bold transition-all ${
                powersOn
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => setPowersOn(false)}
              className={`min-w-[48px] py-1.5 px-3 rounded-md text-xs font-bold transition-all ${
                !powersOn
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Non
            </button>
          </div>
        </div>

        {/* Message informatif si éteint */}
        {!powersOn && (
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>Appareil éteint : test physique requis en boutique avec bon gratuit.</span>
          </div>
        )}

        {/* CARTE 2 : Tactile OK ? */}
        <div className="bg-[#121215]/90 backdrop-blur-md border border-amber-400/30 rounded-xl p-2.5 flex items-center justify-between shadow-md transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-amber-400"
              >
                <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
                <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm tracking-wide truncate">
              Tactile OK ?
            </span>
          </div>

          <div className="bg-[#18181D] border border-white/10 rounded-lg p-0.5 flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setTouchOk(true)}
              className={`min-w-[48px] py-1.5 px-3 rounded-md text-xs font-bold transition-all ${
                touchOk
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => setTouchOk(false)}
              className={`min-w-[48px] py-1.5 px-3 rounded-md text-xs font-bold transition-all ${
                !touchOk
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Non
            </button>
          </div>
        </div>

        {/* CARTE 3 : Caméras / Face ID ? */}
        <div className="bg-[#121215]/90 backdrop-blur-md border border-amber-400/30 rounded-xl p-2.5 flex items-center justify-between shadow-md transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
              <Camera className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-white font-semibold text-sm tracking-wide truncate">
              Caméras / Face ID ?
            </span>
          </div>

          <div className="bg-[#18181D] border border-white/10 rounded-lg p-0.5 flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setCamerasBiometrics('oui')}
              className={`min-w-[42px] py-1.5 px-2.5 rounded-md text-xs font-bold transition-all ${
                camerasBiometrics === 'oui'
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Oui
            </button>
            <button
              type="button"
              onClick={() => setCamerasBiometrics('non')}
              className={`min-w-[42px] py-1.5 px-2.5 rounded-md text-xs font-bold transition-all ${
                camerasBiometrics === 'non'
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Non
            </button>
            <button
              type="button"
              onClick={() => setCamerasBiometrics('nsp')}
              className={`min-w-[42px] py-1.5 px-2 rounded-md text-[11px] font-bold uppercase transition-all ${
                camerasBiometrics === 'nsp'
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              NSP
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. BOUTON CONTINUER (Bas d'écran toujours visible au-dessus de la nav) ────────────────────────────────── */}
      <div className="relative z-10 shrink-0 mt-1">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-tech font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.35)] active:scale-95 transition-all cursor-pointer"
        >
          <span>Continuer vers le paiement (100 F)</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};

export default MobileTrocStep3;
