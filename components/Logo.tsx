
import React from 'react';
import { optimizeImage } from '../utils/mediaOptimization';

interface LogoProps {
  className?: string;
  /**
   * Ligne facultative glissée SOUS le mot « XEPTION ».
   *
   * Elle tient dans la marge verticale déjà disponible : l'icône fait 48 px de
   * haut, le mot n'en occupe qu'une trentaine. Le bloc ne grandit donc ni en
   * hauteur ni en largeur — à condition de rester sur une ligne courte et en
   * très petit corps.
   *
   * Réservé à l'admin (date et heure dans la barre latérale) ; le site public
   * n'en passe aucune.
   */
  subtitle?: React.ReactNode;
}

const Logo: React.FC<LogoProps> = ({ className = '', subtitle }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="relative w-12 h-12 flex items-center justify-center">
        <img
          src={optimizeImage("https://res.cloudinary.com/dli0kdkg9/image/upload/v1768287078/logo_mbajfa.png", 100)}
          alt="Xeption Logo"
          className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(255,215,0,0.6)] animate-pulse-slow"
        />
      </div>

      <div className="flex flex-col justify-center h-full min-w-0">
        <span className="font-tech text-3xl font-black tracking-tighter text-white leading-none flex items-baseline gap-1">
          XEPTION
          <span className="block w-1.5 h-1.5 bg-xeption-red rounded-full shadow-[0_0_10px_#ff0033]"></span>
        </span>
        {subtitle && (
          <span className="mt-1 text-[10px] leading-none tracking-wide text-xeption-gold/80 truncate">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
