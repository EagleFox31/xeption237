
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="relative w-12 h-12 flex items-center justify-center">
        <img 
          src="https://res.cloudinary.com/dli0kdkg9/image/upload/v1768287078/logo_mbajfa.png" 
          alt="Xeption Logo" 
          className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(255,215,0,0.6)] animate-pulse-slow"
        />
      </div>
      
      <div className="flex flex-col leading-none">
        <span className="font-tech text-3xl font-black tracking-tighter text-white">
          XEPTION
        </span>
        <div className="flex justify-between items-center w-full">
           <span className="text-[0.6rem] font-sans font-bold tracking-[0.4em] text-xeption-gold uppercase">
            Network
          </span>
          <span className="block w-1.5 h-1.5 bg-xeption-red rounded-full shadow-[0_0_10px_#ff0033]"></span>
        </div>
      </div>
    </div>
  );
};

export default Logo;
