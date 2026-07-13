
import React from 'react';
import { RefreshCw, Check, Sparkles } from 'lucide-react';
import { formatTrocFee, TROC_BASE_PRICE_XAF, CREDIT_BONUS_PERCENT } from '../utils/trocPricing';
import { TrocMonthlyCounter } from './troc/TrocMonthlyCounter';
import { MobileMoneyLogos } from './troc/MobileMoneyLogos';

interface TrocSectionProps {
  onNavigate?: (page: string) => void;
}

const BULLETS = [
  'Scan visuel par IA (analyse photos réelles)',
  "Rapport d'expertise XEPTION",
  `Paiement Cash ou Crédit boutique (+${CREDIT_BONUS_PERCENT} % selon offre)`,
] as const;

const TrocSection: React.FC<TrocSectionProps> = ({ onNavigate }) => {
  const feeShort = formatTrocFee(TROC_BASE_PRICE_XAF, { short: true });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20" id="troc-section">
      <div className="relative bg-black/80 backdrop-blur-3xl border border-white/10 overflow-hidden shadow-2xl rounded-xl min-h-[500px]">
        <div className="absolute inset-0 tech-pattern opacity-10 pointer-events-none" />
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-xeption-gold/10 rounded-full blur-3xl animate-pulse pointer-events-none" />

        <div className="relative z-10 p-8 md:p-16 h-full flex flex-col justify-center">
          <div className="flex flex-col md:flex-row items-center gap-12 h-full">
            <div className="flex-1 space-y-6 w-full">
              <div>
                <div className="inline-flex items-center px-3 py-1 bg-xeption-gold/10 text-xeption-gold text-xs font-bold uppercase tracking-[0.2em] font-tech mb-4 border border-xeption-gold/20">
                  <RefreshCw className="w-3 h-3 mr-2 animate-spin-slow" />
                  Smart Troc — IA
                </div>

                <h2 className="text-4xl md:text-6xl font-bold text-white font-tech leading-none mb-4 drop-shadow-xl">
                  TON ANCIEN PHONE <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold to-white">
                    VAUT DE L&apos;OR.
                  </span>
                </h2>

                <p className="text-lg text-gray-300 font-light max-w-lg drop-shadow-md">
                  Estimation guidée en quelques minutes. Offre indicative, validation finale au{' '}
                  <span className="text-white font-bold">Mfoundi Mall</span>.
                </p>
              </div>

              <ul className="space-y-3">
                {BULLETS.map((item) => (
                  <li key={item} className="flex items-center text-gray-200">
                    <div className="bg-green-500/10 p-1.5 border border-green-500/30 mr-4 backdrop-blur-sm shrink-0">
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="font-tech text-sm sm:text-base uppercase tracking-wide">{item}</span>
                  </li>
                ))}
              </ul>

              <p className="text-[10px] font-tech uppercase tracking-widest text-xeption-gold/90 border border-xeption-gold/20 bg-xeption-gold/5 px-3 py-2 inline-block">
                Offre de reprise +{CREDIT_BONUS_PERCENT} % en crédit boutique — valable aujourd&apos;hui
              </p>

              <div className="flex flex-col gap-3 max-w-md w-full">
                <button
                  type="button"
                  onClick={() => onNavigate?.('troc')}
                  className="group w-full min-h-[56px] bg-white hover:bg-xeption-gold text-black px-6 py-4 font-tech font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  Estimer mon prix maintenant
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                  <p className="text-sm font-tech font-bold text-xeption-gold uppercase tracking-wider">
                    À partir de {feeShort} — Express, Premium ou Sûreté
                  </p>
                  <MobileMoneyLogos />
                </div>

                <TrocMonthlyCounter />
              </div>
            </div>

            <div className="flex-1 relative w-full flex justify-center pointer-events-none">
              <div className="relative w-64 h-64 md:w-80 md:h-80">
                <div className="absolute inset-0 border-2 border-dashed border-gray-600 rounded-full animate-spin-slow" />
                <div className="absolute inset-4 border border-white/10 rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-black/60 backdrop-blur-md w-32 h-32 rounded-full border border-xeption-gold/30 shadow-[0_0_30px_rgba(255,215,0,0.15)] z-20">
                  <RefreshCw className="w-12 h-12 text-xeption-gold" />
                </div>
                <div className="absolute top-0 left-10 bg-black/80 backdrop-blur p-2 border border-green-500/30 text-green-500 text-xs font-bold rounded animate-bounce delay-75">
                  Scan IA
                </div>
                <div className="absolute bottom-10 right-0 bg-black/80 backdrop-blur p-2 border border-xeption-gold/30 text-xeption-gold text-xs font-bold rounded animate-bounce delay-150">
                  +{CREDIT_BONUS_PERCENT}% Crédit
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrocSection;
