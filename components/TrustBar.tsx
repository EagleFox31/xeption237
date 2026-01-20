
import React from 'react';
import { Truck, ShieldCheck, Smartphone, CheckCircle2 } from 'lucide-react';

const TrustBar: React.FC = () => {
  const features = [
    {
      icon: Truck,
      title: "Livraison Express",
      desc: "Expédition 24h Ydé/Dla & tout le Cameroun.",
      iconColor: "text-blue-400",
      bgGlow: "group-hover:bg-blue-500/20",
      borderGlow: "group-hover:border-blue-500/50"
    },
    {
      icon: Smartphone,
      title: "Paiement Mobile",
      desc: "Payez via OM ou MoMo à la livraison.",
      iconColor: "text-white",
      bgGlow: "group-hover:bg-orange-500/20",
      borderGlow: "group-hover:border-orange-500/50"
    },
    {
      icon: ShieldCheck,
      title: "Garantie Incluse",
      desc: "Jusqu'à 12 mois de couverture SAV.",
      iconColor: "text-green-400",
      bgGlow: "group-hover:bg-green-500/20",
      borderGlow: "group-hover:border-green-500/50"
    },
    {
      icon: CheckCircle2,
      title: "100% Authentique",
      desc: "Produits scellés ou certifiés conformes.",
      iconColor: "text-xeption-gold",
      bgGlow: "group-hover:bg-xeption-gold/20",
      borderGlow: "group-hover:border-xeption-gold/50"
    }
  ];

  return (
    <div className="relative z-20 px-4 mt-8 mb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Container Principal en Grid pour casser la monotonie horizontale pure sur desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {features.map((item, idx) => (
                <div 
                    key={idx} 
                    className="group relative bg-[#09090b]/60 backdrop-blur-xl border border-white/5 rounded-xl p-5 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-default hover:shadow-2xl"
                >
                    {/* Effet de lueur au survol (Gradient Background) */}
                    <div className={`absolute inset-0 opacity-0 ${item.bgGlow} transition-opacity duration-500`}></div>
                    
                    <div className="relative z-10 flex flex-row items-center gap-4">
                        {/* Icon Container avec bordure lumineuse */}
                        <div className={`w-12 h-12 rounded-full bg-black/50 border border-white/10 flex items-center justify-center shrink-0 ${item.borderGlow} transition-colors shadow-lg group-hover:scale-110 duration-300`}>
                             <item.icon className={`w-6 h-6 ${item.iconColor}`} strokeWidth={1.5} />
                        </div>
                        
                        {/* Text Content */}
                        <div className="flex flex-col">
                            <h3 className="text-white font-tech font-bold uppercase tracking-wide text-sm md:text-base group-hover:text-white transition-colors drop-shadow-md">
                                {item.title}
                            </h3>
                            <p className="text-gray-400 text-xs font-medium leading-relaxed mt-1 group-hover:text-gray-300 transition-colors">
                                {item.title === "Paiement Mobile" ? (
                                    <span>
                                        Payez via <span className="text-orange-500 font-bold">OM</span> ou <span className="text-yellow-400 font-bold">MoMo</span>.
                                    </span>
                                ) : (
                                    item.desc
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Petite barre de progression décorative en bas */}
                    <div className={`absolute bottom-0 left-0 w-full h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left ${
                        idx === 0 ? 'bg-blue-500' : 
                        idx === 1 ? 'bg-gradient-to-r from-orange-500 to-yellow-400' :
                        idx === 2 ? 'bg-green-500' : 'bg-xeption-gold'
                    }`}></div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
};

export default TrustBar;
