
import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Truck, Loader2 } from 'lucide-react';
import {
  DeliveryZoneModal,
  useDeliveryZones,
} from './delivery/deliveryZoneUi';

interface DeliveryEstimatorProps {
  variant?: 'standalone' | 'carousel';
}

const DeliveryEstimator: React.FC<DeliveryEstimatorProps> = ({ variant = 'standalone' }) => {
  const { zones, selectedZone, setSelectedZone, isLoading } = useDeliveryZones();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (variant !== 'standalone') return;
    const handleScroll = () => setIsScrolled(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [variant]);

  const isCarousel = variant === 'carousel';

  if (isLoading || !selectedZone) {
    if (isCarousel) {
      return (
        <div className="flex items-center justify-center gap-2 w-full max-w-full rounded-full border border-white/10 bg-[#09090b]/90 px-4 py-2.5 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        </div>
      );
    }
    return null;
  }

  const chipButton = (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className={`
        group flex items-center transition-all duration-300 min-w-0 max-w-full
        ${isCarousel
          ? 'gap-3 w-auto max-w-full rounded-full border border-white/10 bg-[#09090b]/90 backdrop-blur-xl pl-1 pr-4 py-2 shadow-sm hover:border-xeption-gold/50'
          : `gap-3 pl-1 pr-4 py-1.5 rounded-full bg-[#09090b]/80 backdrop-blur-xl border border-white/10 hover:border-xeption-gold/50 shadow-lg hover:shadow-xeption-gold/10 ${isScrolled ? 'scale-95 opacity-90' : 'scale-100 opacity-100'}`
        }
      `}
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-xeption-gold to-orange-500 flex items-center justify-center shadow-md shrink-0">
        <MapPin className="w-4 h-4 text-black" />
      </div>

      {isCarousel ? (
        <div className="flex flex-col items-start text-left flex-1 min-w-0">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-0.5">
            Livrer à :{' '}
            <span className="text-white group-hover:text-xeption-gold transition-colors">
              {selectedZone.name}
            </span>
          </span>
          <div className="flex items-center gap-2 text-xs font-mono text-xeption-gold font-bold leading-none whitespace-nowrap">
            <span className="flex items-center gap-1">
              <Truck className="w-3 h-3 shrink-0" /> {selectedZone.delay}
            </span>
            <span className="w-1 h-1 bg-gray-600 rounded-full shrink-0" />
            <span>
              {selectedZone.price === 0 ? 'Gratuit' : `${selectedZone.price.toLocaleString()} FCFA`}
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-start text-left flex-1 min-w-0">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-0.5 truncate max-w-full">
              Livrer à :{' '}
              <span className="text-white group-hover:text-xeption-gold transition-colors">
                {selectedZone.name}
              </span>
            </span>
            <div className="flex items-center gap-2 text-xs font-mono text-xeption-gold font-bold leading-none">
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" /> {selectedZone.delay}
              </span>
              <span className="w-1 h-1 bg-gray-600 rounded-full" />
              <span>
                {selectedZone.price === 0 ? 'Gratuit' : `${selectedZone.price.toLocaleString()} FCFA`}
              </span>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors ml-2 shrink-0" />
        </>
      )}

      {isCarousel && (
        <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors shrink-0" />
      )}
    </button>
  );

  return (
    <>
      {isCarousel ? chipButton : (
        <div className="flex justify-center mb-1 relative z-30 px-4">{chipButton}</div>
      )}

      <DeliveryZoneModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        zones={zones}
        selectedZone={selectedZone}
        onSelectZone={setSelectedZone}
      />
    </>
  );
};

export default DeliveryEstimator;
