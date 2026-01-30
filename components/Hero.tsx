
import React from 'react';
import { ArrowRight, Star, Cpu } from 'lucide-react';

interface HeroProps {
  onShopNow: () => void;
}

const Hero: React.FC<HeroProps> = ({ onShopNow }) => {
  return (
    // Hauteur réduite à min-h-[55vh] pour prendre environ la moitié de l'écran
    // Padding ajusté pour centrer visuellement dans ce nouvel espace
    <div className="relative overflow-hidden min-h-[55vh] flex items-center justify-center pb-12 md:pb-16 pt-24">
      {/* Background Overlay */}
      <div className="absolute inset-0 z-0 bg-transparent"></div>

      {/* Abstract Glows - Réduits en taille pour correspondre à la nouvelle hauteur */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-xeption-red/10 rounded-full blur-[80px] mix-blend-screen animate-pulse duration-1000 z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-xeption-gold/10 rounded-full blur-[80px] mix-blend-screen z-0"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
        
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
        
        {/* Description - Texte plus petit et marges réduites */}
        <p className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-gray-200 font-light tracking-wide mb-8 drop-shadow-md bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/5">
          Le futur du e-commerce au Mboa. <br/>
          <span className="text-white font-bold">Smartphones. Laptops. Accessoires.</span> <br/>
          Ambiance Tech, Paiement Easy, Livraison au calme.
        </p>
        
        {/* Actions - Boutons légèrement plus compacts */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
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
