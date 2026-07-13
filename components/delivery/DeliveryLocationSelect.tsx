import React from 'react';
import { CheckCircle, MapPin, Loader2 } from 'lucide-react';
import { DeliveryZone } from '../../types';
import { getNeighborhoodsForZoneName } from '../../constants/deliveryNeighborhoods';

type DeliveryLocationSelectProps = {
  step: number;
  zones: DeliveryZone[];
  selectedZoneId: string;
  neighborhood: string;
  onZoneChange: (zone: DeliveryZone) => void;
  onNeighborhoodChange: (value: string) => void;
  isLoading?: boolean;
  isValid: boolean;
};

export const DeliveryLocationSelect: React.FC<DeliveryLocationSelectProps> = ({
  step,
  zones,
  selectedZoneId,
  neighborhood,
  onZoneChange,
  onNeighborhoodChange,
  isLoading,
  isValid,
}) => {
  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const neighborhoods = selectedZone ? getNeighborhoodsForZoneName(selectedZone.name) : [];
  const zoneSelected = Boolean(selectedZoneId);
  const showSuccess = isValid;

  const selectClass = (filled: boolean) =>
    `w-full bg-black/50 border rounded-lg text-white text-sm pl-10 pr-3 py-2.5 outline-none transition-all appearance-none cursor-pointer ${
      filled
        ? 'border-green-500/30 focus:border-green-400'
        : 'border-white/10 focus:border-xeption-gold focus:shadow-[0_0_0_1px_rgba(255,215,0,0.3),0_0_20px_rgba(255,215,0,0.08)]'
    }`;

  return (
    <div
      className={`relative rounded-xl border p-3 transition-all duration-500 ${
        showSuccess
          ? 'border-green-500/35 bg-green-500/[0.06] shadow-[0_0_24px_rgba(34,197,94,0.07)]'
          : 'border-white/10 bg-black/30 hover:border-white/20 hover:bg-black/40'
      }`}
    >
      <div className="flex items-start gap-2.5 mb-2">
        <div
          className={`w-8 h-8 lg:w-7 lg:h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-tech border-2 shrink-0 transition-all duration-500 ${
            showSuccess
              ? 'border-green-500 bg-green-500/20 text-green-400 scale-110 shadow-[0_0_12px_rgba(34,197,94,0.35)]'
              : 'border-white/15 bg-black/50 text-gray-500'
          }`}
        >
          {showSuccess ? <CheckCircle className="h-3.5 w-3.5" /> : step}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white font-bold uppercase text-[11px] tracking-wider">Où on te livre ?</span>
          <p
            className={`text-[10px] mt-0.5 line-clamp-2 transition-colors duration-300 ${
              showSuccess ? 'text-green-400/90' : 'text-gray-500'
            }`}
          >
            {showSuccess
              ? `Livraison · ${selectedZone?.name}, ${neighborhood}`
              : 'Choisis ta ville, puis ton quartier'}
          </p>
        </div>
        {showSuccess && <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-gray-500 text-xs">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des villes…
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative group">
            <MapPin
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors ${
                zoneSelected ? 'text-xeption-gold' : 'text-gray-600 group-focus-within:text-xeption-gold'
              }`}
            />
            <select
              value={selectedZoneId}
              onChange={(e) => {
                const zone = zones.find((z) => z.id === e.target.value);
                if (zone) onZoneChange(zone);
              }}
              className={selectClass(zoneSelected)}
              aria-label="Ville de livraison"
            >
              <option value="" disabled>Choisir la ville</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id} className="bg-[#111]">
                  {zone.name} — {zone.price.toLocaleString('fr-FR')} FCFA
                </option>
              ))}
            </select>
          </div>

          <div className="relative group">
            <MapPin
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none transition-colors ${
                neighborhood ? 'text-xeption-gold' : 'text-gray-600 group-focus-within:text-xeption-gold'
              }`}
            />
            <select
              value={neighborhood}
              onChange={(e) => onNeighborhoodChange(e.target.value)}
              disabled={!zoneSelected}
              className={`${selectClass(Boolean(neighborhood))} disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label="Quartier de livraison"
            >
              <option value="" disabled>
                {zoneSelected ? 'Choisir le quartier' : 'Ville d\'abord'}
              </option>
              {neighborhoods.map((q) => (
                <option key={q} value={q} className="bg-[#111]">
                  {q}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {selectedZone && (
        <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1.5">
          <span className="text-xeption-gold font-mono font-bold">
            {selectedZone.price.toLocaleString('fr-FR')} FCFA
          </span>
          <span>· délai {selectedZone.delay}</span>
        </p>
      )}
    </div>
  );
};
