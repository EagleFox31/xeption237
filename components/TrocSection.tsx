import React from 'react';
import { RefreshCw, Smartphone, Check } from 'lucide-react';

const TrocSection: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl">
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 tech-pattern opacity-10"></div>
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-xeption-gold/10 rounded-full blur-3xl animate-pulse"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center p-8 md:p-16 gap-12">
          
          <div className="flex-1 space-y-8">
            <div>
                <div className="inline-flex items-center px-3 py-1 bg-xeption-gold/10 text-xeption-gold text-xs font-bold uppercase tracking-[0.2em] font-tech mb-4 border border-xeption-gold/20">
                <RefreshCw className="w-3 h-3 mr-2 animate-spin-slow" />
                Service Troc 2.0
                </div>
                
                <h2 className="text-4xl md:text-6xl font-bold text-white font-tech leading-none mb-4 drop-shadow-xl">
                TON ANCIEN PHONE <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-xeption-gold to-white">VAUT DE L'OR.</span>
                </h2>
                
                <p className="text-lg text-gray-300 font-light max-w-lg drop-shadow-md">
                Ne laisse pas ton vieux iPhone ou Samsung prendre la poussière. 
                Chez <span className="text-white font-bold">Xeption</span>, on upgrade ton setup. Tu paies juste la différence.
                </p>
            </div>

            <ul className="space-y-4">
              {[
                "Estimation Flash au bureau",
                "Transfert de données Secure",
                "Upgrade immédiat"
              ].map((item, i) => (
                <li key={i} className="flex items-center text-gray-200">
                  <div className="bg-green-500/10 p-1.5 rounded-none border border-green-500/30 mr-4 backdrop-blur-sm">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="font-tech text-lg uppercase tracking-wide">{item}</span>
                </li>
              ))}
            </ul>

            <button className="bg-white/90 backdrop-blur text-black px-8 py-3 font-tech font-bold uppercase tracking-widest hover:bg-xeption-gold transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              Estimer mon appareil
            </button>
          </div>

          <div className="flex-1 relative w-full flex justify-center">
             <div className="relative w-64 h-64 md:w-80 md:h-80">
                <div className="absolute inset-0 border-2 border-dashed border-gray-600 rounded-full animate-spin-slow"></div>
                <div className="absolute inset-4 border border-white/10 rounded-full"></div>
                
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-black/60 backdrop-blur-md w-32 h-32 rounded-full border border-xeption-gold/30 shadow-[0_0_30px_rgba(255,215,0,0.15)] z-20">
                    <RefreshCw className="w-12 h-12 text-xeption-gold" />
                </div>
                
                {/* Floating Elements */}
                <div className="absolute top-0 left-0 bg-black/80 backdrop-blur p-3 border border-white/10 text-xs font-mono text-gray-400">iPhone 12</div>
                <div className="absolute bottom-0 right-0 bg-xeption-gold text-black p-3 font-bold font-tech text-sm shadow-[0_0_15px_rgba(255,215,0,0.4)]">iPhone 15 Pro</div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TrocSection;