import React from 'react';
import { Link } from 'react-router-dom';
import { Package, RefreshCw, ArrowRight, Radar } from 'lucide-react';
import { ChameleoMascot } from './troc/ChameleoMascot';

const TrackingHub: React.FC = () => (
  <div className="w-full min-h-[calc(100dvh-132px)] px-4 sm:px-6 lg:px-8 xl:px-10 pt-3 sm:pt-4 lg:pt-5 pb-16 sm:pb-20">
    <div className="w-full max-w-[1440px] mx-auto space-y-4 sm:space-y-5">
      <div className="w-full bg-[#0a0a0c]/70 backdrop-blur-2xl border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.6)] p-5 sm:p-7 lg:p-9 xl:p-10 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent animate-pulse" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 sm:gap-8 lg:gap-10 xl:gap-14">
          <div className="flex-1 min-w-0 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-xeption-gold/10 text-xeption-gold text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] sm:tracking-[0.2em] font-tech mb-3 sm:mb-4 border border-xeption-gold/30 rounded-full">
              <span className="w-2 h-2 rounded-full bg-xeption-gold animate-ping" />
              Suivi client · Xeption Network
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-tech font-bold uppercase text-white tracking-wider leading-tight">
              Suivi{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold to-amber-300">
                Xeption
              </span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-white/75 mt-3 leading-relaxed max-w-none lg:max-w-2xl xl:max-w-3xl mx-auto lg:mx-0">
              Retrouve l&apos;état de ta{' '}
              <span className="text-xeption-gold font-tech font-bold uppercase tracking-wide">
                commande
              </span>{' '}
              ou de ton{' '}
              <span className="text-emerald-400 font-tech font-bold uppercase tracking-wide">
                bon Smart Troc
              </span>{' '}
              en quelques secondes — colis boutique, livraison ou reprise.
            </p>

            {/* Mobile — boutons d'accès rapide */}
            <div className="flex flex-col gap-2.5 mt-5 w-full max-w-md mx-auto md:hidden">
              <Link
                to="/tracking/commande"
                className="inline-flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl bg-xeption-gold text-black text-xs font-tech font-bold uppercase tracking-widest hover:bg-white transition-colors shadow-[0_0_16px_rgba(255,215,0,0.2)]"
              >
                <Package className="w-4 h-4 shrink-0" />
                Commande &amp; colis
                <ArrowRight className="w-4 h-4 shrink-0 ml-auto" />
              </Link>
              <Link
                to="/bon"
                className="inline-flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl bg-emerald-500 text-black text-xs font-tech font-bold uppercase tracking-widest hover:bg-emerald-300 transition-colors shadow-[0_0_16px_rgba(52,211,153,0.2)]"
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                Bon Smart Troc
                <ArrowRight className="w-4 h-4 shrink-0 ml-auto" />
              </Link>
            </div>

            {/* Desktop — pastilles cliquables */}
            <div className="hidden md:flex flex-wrap gap-2 mt-4 sm:mt-5 justify-center lg:justify-start">
              <Link
                to="/tracking/commande"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/20 rounded-lg text-[10px] sm:text-[11px] font-tech text-white/90 hover:bg-white/10 hover:border-xeption-gold/40 transition-colors"
              >
                <Package className="w-3.5 h-3.5 text-xeption-gold shrink-0" />
                Commande &amp; colis
              </Link>
              <Link
                to="/bon"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-[10px] sm:text-[11px] font-tech text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400/50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Bon Smart Troc
              </Link>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-xeption-gold/10 border border-xeption-gold/30 rounded-lg text-[10px] sm:text-[11px] font-tech text-xeption-gold">
                <Radar className="w-3.5 h-3.5 text-xeption-gold shrink-0" />
                Mise à jour en direct
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-center relative mx-auto lg:mx-0 lg:pr-2 xl:pr-6">
            <div className="absolute w-32 h-32 sm:w-44 sm:h-44 bg-xeption-gold/15 rounded-full blur-3xl pointer-events-none" />
            <div className="scale-90 sm:scale-100 lg:scale-105 xl:scale-110 origin-center">
              <ChameleoMascot
                size="md"
                pose="delivery"
                state="idle"
                message="Commande ou bon Smart Troc ? Choisis ton suivi."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 w-full">
        <Link
          to="/tracking/commande"
          className="group relative overflow-hidden rounded-xl border border-white/15 bg-black/40 backdrop-blur-xl p-4 sm:p-5 text-left transition-all hover:border-xeption-gold/50 hover:shadow-[0_0_24px_rgba(255,215,0,0.1)]"
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-xeption-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex gap-3.5 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-lg border border-xeption-gold/30 bg-xeption-gold/10 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-xeption-gold" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-tech font-bold uppercase text-white tracking-wide leading-snug">
                Suivre ma commande
              </h2>
              <p className="text-xs sm:text-sm text-white/65 mt-1 leading-relaxed">
                Colis boutique, livraison ou retrait — numéro de commande.
              </p>
              <span className="inline-flex items-center gap-1.5 mt-2.5 sm:mt-3 text-[10px] sm:text-xs font-tech font-bold uppercase tracking-widest text-xeption-gold group-hover:translate-x-0.5 transition-transform">
                Accéder au suivi colis <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </Link>

        <Link
          to="/bon"
          className="group relative overflow-hidden rounded-xl border border-white/15 bg-black/40 backdrop-blur-xl p-4 sm:p-5 text-left transition-all hover:border-emerald-400/40 hover:shadow-[0_0_24px_rgba(52,211,153,0.08)]"
        >
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex gap-3.5 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-lg border border-emerald-400/30 bg-emerald-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
              <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-tech font-bold uppercase text-white tracking-wide leading-snug">
                Suivre mon bon Smart Troc
              </h2>
              <p className="text-xs sm:text-sm text-white/65 mt-1 leading-relaxed">
                Bon de reprise, appareil souhaité — référence TRC- et 4 chiffres du téléphone.
              </p>
              <span className="inline-flex items-center gap-1.5 mt-2.5 sm:mt-3 text-[10px] sm:text-xs font-tech font-bold uppercase tracking-widest text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                Accéder à mon bon <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  </div>
);

export default TrackingHub;
