
import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Truck, Clock, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { DeliveryZone } from '../types';

const DeliveryEstimator: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  // Fetch Zones from DB
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const { data, error } = await supabase
          .from('delivery_zones')
          .select('*')
          .eq('active', true)
          .order('price', { ascending: true }); // Les moins chers (souvent locaux) en premier

        if (error) throw error;
        if (data) {
            setZones(data as DeliveryZone[]);
            // Par défaut on prend le premier (souvent Yaoundé si trié par prix/id, ou on cherche Yaoundé explicitement)
            const defaultZone = data.find((z: any) => z.name.includes('Yaoundé')) || data[0];
            setSelectedZone(defaultZone);
        }
      } catch (err) {
        console.error("Error fetching delivery zones:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchZones();

    const handleScroll = () => setIsScrolled(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isLoading || !selectedZone) return null; // Ne rien afficher tant que pas chargé

  return (
    <>
      {/* --- THE CHIP (Visible) --- */}
      <div className="flex justify-center -mt-6 mb-8 relative z-30 px-4">
        <button
          onClick={() => setIsOpen(true)}
          className={`
            group flex items-center gap-3 pl-1 pr-4 py-1.5 rounded-full transition-all duration-300
            bg-[#09090b]/80 backdrop-blur-xl border border-white/10 hover:border-xeption-gold/50 shadow-lg hover:shadow-xeption-gold/10
            ${isScrolled ? 'scale-95 opacity-90' : 'scale-100 opacity-100'}
          `}
        >
          {/* Icon Circle */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-xeption-gold to-orange-500 flex items-center justify-center shadow-md">
            <MapPin className="w-4 h-4 text-black animate-bounce-slow" />
          </div>

          {/* Text Info */}
          <div className="flex flex-col items-start text-left">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-0.5">
              Livrer à : <span className="text-white group-hover:text-xeption-gold transition-colors">{selectedZone.name}</span>
            </span>
            <div className="flex items-center gap-2 text-xs font-mono text-xeption-gold font-bold leading-none">
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" /> {selectedZone.delay}
              </span>
              <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
              <span>{selectedZone.price === 0 ? 'Gratuit' : `${selectedZone.price.toLocaleString()} FCFA`}</span>
            </div>
          </div>

          <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors ml-2" />
        </button>
      </div>

      {/* --- THE MODAL (Selection) --- */}
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold font-tech text-white uppercase tracking-wide">Où êtes-vous ?</h3>
                <p className="text-xs text-gray-400">On calcule le délai et le prix exact.</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 bg-black/50 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2 custom-scrollbar">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => { setSelectedZone(zone); setIsOpen(false); }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 group ${
                    selectedZone.id === zone.id 
                      ? 'bg-xeption-gold/10 border-xeption-gold/50' 
                      : 'bg-black/40 border-white/5 hover:bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                       selectedZone.id === zone.id ? 'bg-xeption-gold text-black border-xeption-gold' : 'bg-white/5 text-gray-500 border-white/10 group-hover:border-white/30'
                    }`}>
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className={`font-bold text-sm uppercase ${selectedZone.id === zone.id ? 'text-xeption-gold' : 'text-white'}`}>
                        {zone.name}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {zone.delay}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-white text-sm">{zone.price.toLocaleString()} FCFA</div>
                    {selectedZone.id === zone.id && (
                        <div className="flex items-center gap-1 text-[10px] text-xeption-gold font-bold justify-end mt-1 uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" /> Sélectionné
                        </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Footer Alert */}
            <div className="p-4 bg-blue-500/10 border-t border-blue-500/20 text-center">
               <p className="text-[10px] text-blue-300 font-medium flex items-center justify-center gap-2">
                 <AlertCircle className="w-3 h-3" />
                 <span>Paiement à la livraison uniquement pour <span className="text-white font-bold">Yaoundé</span> et <span className="text-white font-bold">Douala</span>.</span>
               </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeliveryEstimator;
