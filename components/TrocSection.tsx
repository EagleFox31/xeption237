
import React from 'react';
import { RefreshCw, Check, Sparkles } from 'lucide-react';
import { formatTrocFee, TROC_BASE_PRICE_XAF, CREDIT_BONUS_PERCENT } from '../utils/trocPricing';
import { TrocMonthlyCounter } from './troc/TrocMonthlyCounter';
import { MobileMoneyLogos } from './troc/MobileMoneyLogos';
import { ChameleoMascot } from './troc/ChameleoMascot';

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

            <div className="flex-1 relative w-full flex flex-col items-center justify-center">
              {/* Socle Holographique & Mascotte Interactive */}
              <div 
                onClick={() => onNavigate?.('troc')}
                className="relative cursor-pointer group flex flex-col items-center justify-center p-4 transition-transform duration-300 hover:scale-105"
                title="Clique pour estimer ton téléphone avec Chameleo !"
              >
                {/* Anneaux d'énergie en arrière-plan */}
                <div className="absolute w-72 h-72 md:w-96 md:h-96 rounded-full border border-xeption-gold/20 animate-spin-slow pointer-events-none" />
                <div className="absolute w-60 h-60 md:w-80 md:h-80 rounded-full border border-dashed border-white/10 animate-[spin_20s_linear_infinite_reverse] pointer-events-none" />
                <div className="absolute w-44 h-44 rounded-full bg-xeption-gold/10 blur-2xl pointer-events-none group-hover:bg-xeption-gold/20 transition-colors" />

                {/* Badges Flottants Gamifiés */}
                <div className="absolute -top-2 -left-4 md:left-2 z-20 bg-black/90 backdrop-blur-md px-3 py-1.5 border border-green-500/40 text-green-400 text-xs font-tech font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(34,197,94,0.2)] animate-bounce delay-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                  Scan IA
                </div>

                <div className="absolute -bottom-2 -right-4 md:right-2 z-20 bg-black/90 backdrop-blur-md px-3 py-1.5 border border-xeption-gold/40 text-xeption-gold text-xs font-tech font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(255,215,0,0.2)] animate-bounce delay-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-xeption-gold" />
                  +{CREDIT_BONUS_PERCENT}% Crédit
                </div>

                {/* Mascotte Animée Xepti */}
                <div className="relative z-10">
                  <ChameleoMascot 
                    size="lg"
                    state="idle"
                    message="Psst ! Ton téléphone au tiroir vaut de l'or ✨"
                  />
                </div>

                {/* Socle 3D au sol */}
                <div className="relative -mt-6 w-48 h-8 flex items-center justify-center">
                  <div className="w-full h-4 bg-gradient-to-r from-transparent via-xeption-gold/40 to-transparent rounded-full blur-sm" />
                  <div className="absolute w-36 h-2 bg-gradient-to-r from-transparent via-xeption-gold to-transparent rounded-full shadow-[0_0_20px_#FFD700]" />
                </div>

                {/* Indication au survol */}
                <span className="mt-2 text-[11px] font-tech text-gray-400 group-hover:text-xeption-gold uppercase tracking-widest transition-colors flex items-center gap-1">
                  Estimer mon appareil avec Xepti ➔
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrocSection;
