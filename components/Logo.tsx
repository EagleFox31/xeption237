import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <div className="relative w-10 h-10 flex items-center justify-center">
        {/* Abstract X Logo */}
        <svg viewBox="0 0 40 40" className="w-full h-full drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>
            <linearGradient id="redGradient" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF0033" />
              <stop offset="100%" stopColor="#800000" />
            </linearGradient>
          </defs>
          
          {/* Background Shape */}
          <path d="M20 2 L38 12 L38 28 L20 38 L2 28 L2 12 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,215,0,0.3)" strokeWidth="1" />
          
          {/* X Shape */}
          <path d="M10 10 L30 30" stroke="url(#goldGradient)" strokeWidth="4" strokeLinecap="round" />
          <path d="M30 10 L10 30" stroke="url(#redGradient)" strokeWidth="4" strokeLinecap="round" className="opacity-80" />
          
          {/* Center Dot */}
          <circle cx="20" cy="20" r="3" fill="white" className="animate-pulse" />
        </svg>
      </div>
      
      <div className="flex flex-col leading-none">
        <span className="font-tech text-2xl font-bold tracking-widest text-white">
          XEPTION
        </span>
        <div className="flex justify-between items-center w-full">
           <span className="text-[0.6rem] font-sans font-medium tracking-[0.3em] text-xeption-gold uppercase">
            Network
          </span>
          <span className="block w-1.5 h-1.5 bg-xeption-red rounded-full shadow-[0_0_5px_#ff0033]"></span>
        </div>
      </div>
    </div>
  );
};

export default Logo;