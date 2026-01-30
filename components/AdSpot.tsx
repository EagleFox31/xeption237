
import React from 'react';
import { ArrowRight, Star } from 'lucide-react';

interface AdSpotProps {
  variant?: 'banner' | 'card'; // Bannière large ou Carte produit
  image?: string; // Image de fond
  title?: string;
  subtitle?: string;
  cta?: string;
  link?: string;
  onAdClick?: () => void;
  active?: boolean; // Si false, le composant disparaît totalement (0px)
  isExternal?: boolean; // Si true, ajoute un petit label "Sponsorisé"
  compact?: boolean; // NOUVEAU : Version compacte pour le Hero
}

const AdSpot: React.FC<AdSpotProps> = ({ 
  variant = 'banner', 
  image, 
  title, 
  subtitle, 
  cta = "Découvrir", 
  link,
  onAdClick,
  active = true,
  isExternal = false,
  compact = false
}) => {
  if (!active) return null;

  // VARIANT 1: Bannière Large (Pour la Home entre les sections)
  if (variant === 'banner') {
    return (
      <div className={compact ? "w-full mx-auto animate-in fade-in zoom-in duration-500 my-4" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4"}>
        <div 
            onClick={onAdClick}
            className={`relative w-full rounded-2xl overflow-hidden group cursor-pointer border border-white/10 shadow-2xl ${
                compact ? 'h-32 md:h-40 border-xeption-gold/30' : 'h-48 md:h-64'
            }`}
        >
            {/* Background Image */}
            <div className="absolute inset-0">
                <img 
                    src={image || "https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=2000&auto=format&fit=crop"} 
                    alt="Ad Background" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent"></div>
            </div>

            {/* Label Sponsorisé (Discret) */}
            {isExternal && (
                <div className="absolute top-2 right-2 text-[9px] text-gray-500 uppercase tracking-widest bg-black/40 px-2 py-1 rounded backdrop-blur-md">
                    Sponsorisé
                </div>
            )}

            {/* Content */}
            <div className={`absolute inset-0 flex flex-col justify-center z-10 ${compact ? 'px-6 md:px-12' : 'px-8 md:px-16'}`}>
                <span className="text-xeption-gold text-xs font-bold uppercase tracking-[0.2em] mb-1 drop-shadow-md">
                    {isExternal ? 'Partenaire' : 'Offre Flash'}
                </span>
                <h3 className={`font-tech font-bold text-white uppercase leading-none drop-shadow-xl ${compact ? 'text-2xl md:text-3xl mb-2' : 'text-3xl md:text-5xl mb-4 max-w-xl'}`}>
                    {title || "Espace Publicitaire"}
                </h3>
                {subtitle && (
                    <p className={`text-gray-300 font-light drop-shadow-md hidden md:block ${compact ? 'text-xs max-w-lg mb-2 line-clamp-1' : 'text-sm md:text-base max-w-md mb-6'}`}>
                        {subtitle}
                    </p>
                )}
                
                <button className="flex items-center gap-2 text-white font-bold uppercase text-xs tracking-widest group-hover:text-xeption-gold transition-colors w-fit">
                    {cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
      </div>
    );
  }

  // VARIANT 2: Carte (Pour s'insérer dans la grille produit)
  return (
    <div 
        onClick={onAdClick}
        className="relative bg-[#1a1a1a] border border-xeption-gold/30 rounded-lg overflow-hidden flex flex-col justify-between group cursor-pointer hover:border-xeption-gold transition-all h-full min-h-[350px]"
    >
        <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity">
            <img 
                src={image || "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop"} 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
        </div>

        <div className="relative z-10 p-4">
            <span className="inline-block bg-xeption-gold text-black text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2">
                {isExternal ? 'Sponsor' : 'Xeption Tips'}
            </span>
            <h3 className="text-2xl font-tech font-bold text-white uppercase leading-tight">
                {title || "Spot Dispo"}
            </h3>
        </div>

        <div className="relative z-10 p-4 mt-auto border-t border-white/10 bg-black/40 backdrop-blur-sm">
            <p className="text-xs text-gray-300 mb-3 line-clamp-2">
                {subtitle || "Contactez-nous pour afficher votre marque ici."}
            </p>
            <div className="flex items-center justify-between text-xeption-gold text-xs font-bold uppercase tracking-widest">
                <span>{cta}</span>
                <div className="bg-white/10 p-1.5 rounded-full group-hover:bg-xeption-gold group-hover:text-black transition-all">
                    <ArrowRight className="w-3 h-3" />
                </div>
            </div>
        </div>
    </div>
  );
};

export default AdSpot;
