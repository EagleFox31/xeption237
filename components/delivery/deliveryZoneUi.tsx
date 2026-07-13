import React, { useEffect, useState } from 'react';
import { MapPin, Clock, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { DeliveryZone } from '../../types';

export const NATIONWIDE_DELIVERY_LABEL = 'Livraison · Tout le 237';

export function shortCityLabel(name: string): string {
  const trimmed = name.trim();
  const beforeParen = trimmed.split('(')[0]?.trim();
  return beforeParen || trimmed;
}

/** Tarifs officiels par ville (alignés admin / checkout). */
export const DELIVERY_ZONE_PRICE_BY_CITY: Partial<Record<string, number>> = {
  Yaoundé: 1000,
};

export function normalizeDeliveryZones(zones: DeliveryZone[]): DeliveryZone[] {
  return zones.map((zone) => {
    const city = shortCityLabel(zone.name);
    const officialPrice = DELIVERY_ZONE_PRICE_BY_CITY[city];
    return officialPrice != null ? { ...zone, price: officialPrice } : zone;
  });
}

export function useDeliveryZones() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const { data, error } = await supabase
          .from('delivery_zones')
          .select('*')
          .eq('active', true)
          .order('price', { ascending: true });

        if (error) throw error;
        if (data) {
          const list = normalizeDeliveryZones(data as DeliveryZone[]);
          setZones(list);
          const defaultZone =
            list.find((z) => z.name.includes('Yaoundé')) ?? list[0] ?? null;
          setSelectedZone(defaultZone);
        }
      } catch (err) {
        console.error('Error fetching delivery zones:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchZones();
  }, []);

  return { zones, selectedZone, setSelectedZone, isLoading };
}

export const DeliveryZoneModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  zones: DeliveryZone[];
  selectedZone: DeliveryZone | null;
  onSelectZone: (zone: DeliveryZone) => void;
}> = ({ isOpen, onClose, zones, selectedZone, onSelectZone }) => {
  if (!isOpen || !selectedZone) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold font-tech text-white uppercase tracking-wide">
              Où êtes-vous ?
            </h3>
            <p className="text-xs text-gray-400">On calcule le délai et le prix exact.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-black/50 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2 custom-scrollbar">
          {zones.map((zone) => (
            <button
              key={zone.id}
              type="button"
              onClick={() => {
                onSelectZone(zone);
                onClose();
              }}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 group ${
                selectedZone.id === zone.id
                  ? 'bg-xeption-gold/10 border-xeption-gold/50'
                  : 'bg-black/40 border-white/5 hover:bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                    selectedZone.id === zone.id
                      ? 'bg-xeption-gold text-black border-xeption-gold'
                      : 'bg-white/5 text-gray-500 border-white/10 group-hover:border-white/30'
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div
                    className={`font-bold text-sm uppercase ${
                      selectedZone.id === zone.id ? 'text-xeption-gold' : 'text-white'
                    }`}
                  >
                    {zone.name}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {zone.delay}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono font-bold text-white text-sm">
                  {zone.price.toLocaleString()} FCFA
                </div>
                {selectedZone.id === zone.id && (
                  <div className="flex items-center gap-1 text-[10px] text-xeption-gold font-bold justify-end mt-1 uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3" /> Sélectionné
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 bg-blue-500/10 border-t border-blue-500/20 text-center">
          <p className="text-[10px] text-blue-300 font-medium flex items-center justify-center gap-2">
            <AlertCircle className="w-3 h-3" />
            <span>
              Paiement à la livraison uniquement pour{' '}
              <span className="text-white font-bold">Yaoundé</span> et{' '}
              <span className="text-white font-bold">Douala</span>.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
