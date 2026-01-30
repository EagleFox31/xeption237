
import React, { useState, useEffect } from 'react';
import { ArrowRight, Star, Cpu } from 'lucide-react';
import AdSpot from './AdSpot';

interface HeroProps {
  onShopNow: () => void;
}

const Hero: React.FC<HeroProps> = ({ onShopNow }) => {
  // Phase management: 'text' -> 'ad' -> 'hidden'
  const [phase, setPhase] = useState<'text' | 'ad' | 'hidden'>('text');

  useEffect(() => {
    // Phase 1 -> 2 (After 5s)
    const timer1 = setTimeout(() => {
      setPhase('ad');
    }, 5000);

    // Phase 2 -> 3 (After 5s + 3s = 8s)
    const timer2 = setTimeout(() => {
      setPhase('hidden');
    }, 8000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    // Hauteur réduite à min-h-[55vh] pour prendre environ la moitié de l'écran
    // Padding ajusté pour centrer visuellement dans ce nouvel espace
    <div className="relative overflow-hidden min-h-[55vh] flex items-center justify-center pb-12 md:pb-16 pt-24">
      {/* Background Overlay */}
      <div className="absolute inset-0 z-0 bg-transparent"></div>

      {/* Abstract Glows - Réduits en taille pour correspondre à la nouvelle hauteur */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-xeption-red/10 rounded-full blur-[80px] mix-blend-screen animate-pulse duration-1000 z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-xeption-gold/10 rounded-full blur-[80px] mix-blend-screen z-0"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10 w-full">
        
        {/* Badge - Texte plus petit */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-xeption-gold/30 bg-black/40 backdrop-blur-md mb-4 shadow-[0_0_15px_rgba(255,215,0,0.1)] hover:scale-105 transition-transform group cursor-default">
          <Cpu className="h-3 w-3 text-xeption-gold animate-spin-slow group-hover:text-white transition-colors" />
          <span className="text-xeption-gold group-hover:text-white transition-colors text-[10px] font-bold tracking-[0.2em] font-tech uppercase">
            Collection Future 2026
          </span>
        </div>
        
        {/* Main Title - Renommé en XEPTION seul avec effet Gold */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tighter mb-4 leading-none drop-shadow-[0_0_25px_rgba(0,0,0,0.8)]">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold via-yellow-100 to-xeption-goldDim drop-shadow-sm">
            XEPTION
          </span>
        </h1>
        
        {/* Dynamic Zone: Description -> Ad -> Hidden */}
        <div className="relative min-h-[40px] flex justify-center items-center flex-col transition-all duration-500 ease-in-out w-full max-w-3xl mx-auto">
            
            {/* PHASE 1: TEXTE (0s - 5s) */}
            <div 
                className={`transition-all duration-700 ease-in-out absolute w-full ${
                    phase === 'text' ? 'opacity-100 translate-y-0 relative' : 'opacity-0 -translate-y-4 absolute pointer-events-none'
                }`}
            >
               {phase === 'text' && (
                <div className="mb-8 mt-2">
                    <p className="max-w-xl mx-auto text-sm sm:text-base text-gray-200 font-light tracking-wide drop-shadow-md bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/5 animate-in fade-in zoom-in duration-700">
                    Le futur du e-commerce au Mboa. <br/>
                    <span className="text-white font-bold">Smartphones. Laptops. Accessoires.</span> <br/>
                    Ambiance Tech, Paiement Easy, Livraison au calme.
                    </p>
                </div>
               )}
            </div>

            {/* PHASE 2: ADSPOT (5s - 8s) */}
            <div 
                className={`transition-all duration-700 ease-in-out w-full ${
                    phase === 'ad' ? 'opacity-100 translate-y-0 relative mb-8' : 'opacity-0 translate-y-4 absolute pointer-events-none'
                }`}
            >
                {phase === 'ad' && (
                    <AdSpot 
                        variant="banner"
                        compact={true}
                        title="Troc Express"
                        subtitle="Échange ton ancien téléphone contre du cash."
                        image="https://images.unsplash.com/photo-1596742578443-7682e525c489?q=80&w=2000&auto=format&fit=crop"
                        cta="Estimer"
                        onAdClick={() => window.location.href = '/?page=troc'}
                    />
                )}
            </div>

            {/* PHASE 3: HIDDEN (8s+) - Just a spacer if needed, or 0 height handled by css above */}
        </div>
        
        {/* Actions - Boutons légèrement plus compacts */}
        <div className={`flex flex-col sm:flex-row justify-center gap-4 transition-all duration-1000 ${phase === 'hidden' ? 'mt-0' : 'mt-2'}`}>
          <button 
            onClick={onShopNow}
            className="group relative px-6 py-3 bg-xeption-gold text-black font-tech font-bold text-sm uppercase tracking-wider overflow-hidden clip-path-slant shadow-[0_0_20px_rgba(255,215,0,0.4)] hover:shadow-[0_0_30px_rgba(255,215,0,0.6)] transition-all"
          >
            <span className="relative z-10 flex items-center">
              Explorer le Shop
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-white transform -skew-x-12 -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
          </button>
          
          <button className="px-6 py-3 border border-white/30 text-white font-tech font-bold text-sm uppercase tracking-wider hover:border-xeption-red hover:text-xeption-red hover:shadow-[0_0_20px_rgba(220,20,60,0.3)] transition-all bg-black/30 backdrop-blur-md">
            Voir les Promos
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
