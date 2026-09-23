import React from 'react';
import { ShieldCheck, Camera, Coins, Store, ArrowRight } from 'lucide-react';

export interface MobileTrocViewProps {
  onStart: () => void;
}

/**
 * Vue Mobile Native Smart Troc (Fidèle 100% à la maquette utilisateur)
 * - Strictement aucun élément hors maquette (pas de lien "certifier IMEI")
 * - Layout Full-Screen / Zero-Scroll Viewport : remplit harmonieusement l'écran sans vide en bas
 * - Bouton "Commencer" parfaitement ancré en bas au-dessus de la Bottom Nav
 */
export const MobileTrocView: React.FC<MobileTrocViewProps> = ({ onStart }) => {
  return (
    <div className="w-full h-full min-h-[calc(100dvh-132px-96px)] flex flex-col justify-between px-4 pt-1 pb-3 relative overflow-hidden select-none">
      {/* 1. Halo et courbe dorée d'ambiance en haut à droite (Fidèle maquette) */}
      <div className="absolute -top-16 -right-16 w-80 h-80 bg-gradient-to-bl from-amber-400/20 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 overflow-hidden pointer-events-none">
        <svg className="w-full h-full opacity-30" viewBox="0 0 280 280" fill="none">
          <path
            d="M280 0C280 154.64 154.64 280 0 280"
            stroke="url(#goldStreak)"
            strokeWidth="1.5"
          />
          <defs>
            <linearGradient id="goldStreak" x1="280" y1="0" x2="0" y2="280" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="0.6" stopColor="#d97706" stopOpacity="0.4" />
              <stop offset="1" stopColor="#000000" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 2. EN-TÊTE : TITRE D'ACCROCHE */}
      <div className="relative z-10 pt-2 shrink-0">
        <div>
          <h1 className="text-[32px] sm:text-[36px] leading-[1.08] font-tech font-black text-white tracking-tight">
            Vends ou échange <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffe072] via-[#e5b53b] to-[#b3861b]">
              ton téléphone
            </span>
          </h1>
          <p className="text-zinc-400 text-sm font-normal mt-1.5">
            Rapide et simple.
          </p>
        </div>
      </div>

      {/* 3. CARTE CENTRALE PRESTIGE (OCCUPE L'ESPACE CENTRAL HARMONIEUSEMENT SANS VIDE) */}
      <div className="relative z-10 my-3 flex-1 min-h-[220px] max-h-[340px] w-full rounded-[28px] bg-gradient-to-b from-[#141418] via-[#0f0f13] to-[#0a0a0d] border border-amber-400/35 p-4 sm:p-5 flex flex-col justify-center shadow-[0_0_35px_rgba(251,191,36,0.12),0_15px_40px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Lueur interne dorée */}
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="grid grid-cols-[1.1fr_1fr] items-center gap-3 relative z-10 h-full">
          {/* Colonne gauche : 4 caractéristiques avec icônes dorées */}
          <div className="flex flex-col justify-around h-full py-1 space-y-3">
            {/* 1. IMEI vérifié */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#1c1c22] border border-white/10 flex items-center justify-center shrink-0 shadow-md">
                <ShieldCheck className="w-5 h-5 text-amber-400 stroke-[2.2]" />
              </div>
              <span className="text-white font-tech font-bold text-xs sm:text-sm tracking-wide leading-tight">
                IMEI vérifié
              </span>
            </div>

            {/* 2. 4 photos */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#1c1c22] border border-white/10 flex items-center justify-center shrink-0 shadow-md">
                <Camera className="w-5 h-5 text-amber-400 stroke-[2.2]" />
              </div>
              <span className="text-white font-tech font-bold text-xs sm:text-sm tracking-wide leading-tight">
                4 photos
              </span>
            </div>

            {/* 3. 100 FCFA d'analyse */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#1c1c22] border border-white/10 flex items-center justify-center shrink-0 shadow-md">
                <Coins className="w-5 h-5 text-amber-400 stroke-[2.2]" />
              </div>
              <div className="text-white font-tech font-bold text-xs sm:text-sm tracking-wide leading-tight">
                100 FCFA <br />
                <span className="text-[10.5px] text-zinc-400 font-medium">d'analyse</span>
              </div>
            </div>

            {/* 4. Finalisation en boutique */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#1c1c22] border border-white/10 flex items-center justify-center shrink-0 shadow-md">
                <Store className="w-5 h-5 text-amber-400 stroke-[2.2]" />
              </div>
              <div className="text-white font-tech font-bold text-xs sm:text-sm tracking-wide leading-tight">
                Finalisation <br />
                <span className="text-[10.5px] text-zinc-400 font-medium">en boutique</span>
              </div>
            </div>
          </div>

          {/* Colonne droite : Rendu 3D des deux iPhones Titanium */}
          <div className="relative h-full min-h-[190px] max-h-[290px] flex items-center justify-center overflow-hidden rounded-2xl">
            <img
              src="/troc-exchange-phones.jpg"
              alt="Échange et reprise smartphone - Smart Troc"
              className="w-full h-full object-cover object-center drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] scale-105 pointer-events-none select-none"
              loading="eager"
              fetchpriority="high"
              decoding="async"
            />
          </div>
        </div>
      </div>

      {/* 4. BOUTON D'ACTION PRINCIPAL : "COMMENCER" ANCRÉ EN BAS (AUCUN VIDE SOUS LE BOUTON) */}
      <div className="relative z-10 shrink-0 pt-1">
        <button
          type="button"
          onClick={onStart}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#ffd700] via-[#f59e0b] to-[#eab308] hover:from-[#ffe033] hover:to-[#f59e0b] text-black font-tech font-black text-base uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_4px_25px_rgba(251,191,36,0.45)] active:scale-[0.98] transition-all cursor-pointer"
        >
          <ArrowRight className="w-5 h-5 stroke-[2.8]" />
          <span>Commencer</span>
        </button>
      </div>
    </div>
  );
};

export default MobileTrocView;
