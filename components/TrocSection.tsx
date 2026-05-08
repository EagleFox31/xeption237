
import React from 'react';
import { RefreshCw, Check, ChevronRight } from 'lucide-react';

interface TrocSectionProps {
  onNavigate?: (page: string) => void;
}

const TrocSection: React.FC<TrocSectionProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20" id="troc-section">
      <div className="relative bg-black/80 backdrop-blur-3xl border border-white/10 overflow-hidden shadow-2xl rounded-xl min-h-[500px]">

        <div className="absolute inset-0 tech-pattern opacity-10 pointer-events-none"></div>
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-xeption-gold/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>

        <div className="relative z-10 p-8 md:p-16 h-full flex flex-col justify-center">
          <div className="flex flex-col md:flex-row items-center gap-12 h-full">

            {/* Texte */}
            <div className="flex-1 space-y-8">
              <div>
                <div className="inline-flex items-center px-3 py-1 bg-xeption-gold/10 text-xeption-gold text-xs font-bold uppercase tracking-[0.2em] font-tech mb-4 border border-xeption-gold/20">
                  <RefreshCw className="w-3 h-3 mr-2 animate-spin-slow" />
                  Smart Troc — IA
                </div>

                <h2 className="text-4xl md:text-6xl font-bold text-white font-tech leading-none mb-4 drop-shadow-xl">
                  TON ANCIEN PHONE <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold to-white">VAUT DE L'OR.</span>
                </h2>

                <p className="text-lg text-gray-300 font-light max-w-lg drop-shadow-md">
                  Fais évaluer ton appareil en 2 minutes par notre IA.
                  Reçois une <span className="text-white font-bold">offre instantanée</span> en cash ou crédit boutique.
                </p>
              </div>

              <ul className="space-y-4">
                {[
                  'Évaluation IA avec analyse photos',
                  'Score transparent + justification',
                  'Paiement Cash ou Crédit boutique (+10%)',
                ].map((item, i) => (
                  <li key={i} className="flex items-center text-gray-200">
                    <div className="bg-green-500/10 p-1.5 rounded-none border border-green-500/30 mr-4 backdrop-blur-sm">
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="font-tech text-lg uppercase tracking-wide">{item}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => onNavigate && onNavigate('troc')}
                className="group bg-white/90 backdrop-blur text-black px-8 py-3 font-tech font-bold uppercase tracking-widest hover:bg-xeption-gold transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center gap-2"
              >
                Évaluer mon appareil <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Visuel */}
            <div className="flex-1 relative w-full flex justify-center pointer-events-none">
              <div className="relative w-64 h-64 md:w-80 md:h-80">
                <div className="absolute inset-0 border-2 border-dashed border-gray-600 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-4 border border-white/10 rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-black/60 backdrop-blur-md w-32 h-32 rounded-full border border-xeption-gold/30 shadow-[0_0_30px_rgba(255,215,0,0.15)] z-20">
                  <RefreshCw className="w-12 h-12 text-xeption-gold" />
                </div>
                <div className="absolute top-0 left-10 bg-black/80 backdrop-blur p-2 border border-green-500/30 text-green-500 text-xs font-bold rounded animate-bounce delay-75">IA Score</div>
                <div className="absolute bottom-10 right-0 bg-black/80 backdrop-blur p-2 border border-xeption-gold/30 text-xeption-gold text-xs font-bold rounded animate-bounce delay-150">+10% Crédit</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TrocSection;
