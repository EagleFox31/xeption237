
import React from 'react';
import { ArrowRight, Star, Cpu } from 'lucide-react';

interface HeroProps {
  onShopNow: () => void;
}

const Hero: React.FC<HeroProps> = ({ onShopNow }) => {
  return (
    // Ajout de pb-20 md:pb-32 pour pousser le contenu vers le haut et laisser de la place à la barre
    <div className="relative overflow-hidden min-h-[85vh] flex items-center justify-center pb-20 md:pb-32">
      {/* Background Overlay - Removed dark gradient so video is clearer */}
      <div className="absolute inset-0 z-0 bg-transparent"></div>

      {/* Abstract Glows - Adjusted for new video */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-xeption-red/10 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-1000 z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-xeption-gold/10 rounded-full blur-[100px] mix-blend-screen z-0"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10 pt-20">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-xeption-gold/30 bg-black/40 backdrop-blur-md mb-8 shadow-[0_0_15px_rgba(255,215,0,0.1)] hover:scale-105 transition-transform group cursor-default">
          <Cpu className="h-4 w-4 text-xeption-gold animate-spin-slow group-hover:text-white transition-colors" />
          <span className="text-xeption-gold group-hover:text-white transition-colors text-xs font-bold tracking-[0.2em] font-tech uppercase">
            Collection Future 2026
          </span>
        </div>
        
        {/* Main Title */}
        <h1 className="text-6xl sm:text-8xl md:text-9xl font-bold tracking-tighter text-white mb-6 leading-none drop-shadow-[0_0_25px_rgba(0,0,0,0.8)]">
          XEPTION
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold via-yellow-100 to-xeption-goldDim drop-shadow-sm">
            NETWORK
          </span>
        </h1>
        
        <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-200 font-light tracking-wide mb-12 drop-shadow-md bg-black/20 backdrop-blur-sm p-4 rounded-xl border border-white/5">
          Le futur du e-commerce au Mboa. <br/>
          <span className="text-white font-bold">Smartphones. Laptops. Accessoires.</span> <br/>
          Ambiance Tech, Paiement Easy, Livraison au calme.
        </p>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <button 
            onClick={onShopNow}
            className="group relative px-8 py-4 bg-xeption-gold text-black font-tech font-bold text-lg uppercase tracking-wider overflow-hidden clip-path-slant shadow-[0_0_20px_rgba(255,215,0,0.4)] hover:shadow-[0_0_30px_rgba(255,215,0,0.6)] transition-all"
          >
            <span className="relative z-10 flex items-center">
              Explorer le Shop
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 bg-white transform -skew-x-12 -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
          </button>
          
          <button className="px-8 py-4 border border-white/30 text-white font-tech font-bold text-lg uppercase tracking-wider hover:border-xeption-red hover:text-xeption-red hover:shadow-[0_0_20px_rgba(220,20,60,0.3)] transition-all bg-black/30 backdrop-blur-md">
            Voir les Promos
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
