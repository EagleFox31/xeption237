import React from 'react';
import { Truck, ShieldCheck } from 'lucide-react';

export interface MobileTrustBandeauProps {
  className?: string;
}

export const MobileTrustBandeau: React.FC<MobileTrustBandeauProps> = ({
  className = '',
}) => {
  return (
    <div className={`px-4 py-2 w-full ${className}`}>
      <div className="w-full rounded-2xl bg-[#121214] border border-amber-500/30 p-3.5 flex items-center justify-between shadow-lg">
        {/* Colonne 1 : Livraison Express Yaoundé & Douala */}
        <div className="flex-1 flex items-center space-x-2.5 pr-2 border-r border-white/10">
          <Truck className="w-6 h-6 text-amber-400 shrink-0 stroke-[1.7]" />
          <div className="flex flex-col text-left min-w-0">
            <span className="font-tech text-white text-xs sm:text-sm font-bold truncate">
              Livraison Express
            </span>
            <span className="text-zinc-400 text-[11px] truncate">
              Yaoundé &amp; Douala
            </span>
          </div>
        </div>

        {/* Colonne 2 : Garantie 12 Mois */}
        <div className="flex-1 flex items-center space-x-2.5 pl-3">
          <ShieldCheck className="w-6 h-6 text-amber-400 shrink-0 stroke-[1.7]" />
          <div className="flex flex-col text-left min-w-0">
            <span className="font-tech text-white text-xs sm:text-sm font-bold truncate">
              Garantie 12 Mois
            </span>
            <span className="text-zinc-400 text-[11px] truncate">
              Appareils certifiés
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileTrustBandeau;
