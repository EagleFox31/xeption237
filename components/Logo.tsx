
import React from 'react';
import { optimizeImage } from '../utils/mediaOptimization';

const Logo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="relative w-12 h-12 flex items-center justify-center">
        <img 
          src={optimizeImage("https://res.cloudinary.com/dli0kdkg9/image/upload/v1768287078/logo_mbajfa.png", 100)} 
          alt="Xeption Logo" 
          className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(255,215,0,0.6)] animate-pulse-slow"
        />
      </div>
      
      <div className="flex flex-col justify-center h-full">
        <span className="font-tech text-3xl font-black tracking-tighter text-white leading-none flex items-baseline gap-1">
          XEPTION
          <span className="block w-1.5 h-1.5 bg-xeption-red rounded-full shadow-[0_0_10px_#ff0033]"></span>
        </span>
      </div>
    </div>
  );
};

export default Logo;
