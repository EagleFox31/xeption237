import React from 'react';
import { Gamepad2, Laptop, Package, Smartphone, Sparkles, Tablet } from 'lucide-react';
import type { DeviceCategoryId } from '../../types';

export type DeviceTradeOption = {
  id: DeviceCategoryId;
  label: string;
  subtitle: string;
  badge: string;
  available: boolean;
  tooltip?: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const DEVICE_OPTIONS: DeviceTradeOption[] = [
  {
    id: 'phone',
    label: 'Téléphone',
    subtitle: 'Estimation IA active maintenant',
    badge: 'Ouvert',
    available: true,
    icon: Smartphone,
  },
  {
    id: 'tablet',
    label: 'Tablette',
    subtitle: 'Flow dédié en préparation',
    badge: 'Cool bientôt',
    available: false,
    tooltip: "On prépare une vraie cote tablette. Pas du faux automatique bricolé.",
    icon: Tablet,
  },
  {
    id: 'laptop',
    label: 'PC portable / MacBook',
    subtitle: 'Argus en cours de calibrage',
    badge: 'Cool bientôt',
    available: false,
    tooltip: "Les laptops arrivent quand le moteur sera propre : RAM, SSD, batterie, écran, pas juste du blabla.",
    icon: Laptop,
  },
  {
    id: 'console',
    label: 'Console',
    subtitle: 'PlayStation, Xbox, Switch et dérivés',
    badge: 'Cool bientôt',
    available: false,
    tooltip: "Les consoles auront leur propre logique de reprise. On ne va pas les faire passer dans un moteur téléphone.",
    icon: Gamepad2,
  },
  {
    id: 'other',
    label: 'Montre, écouteurs, accessoires',
    subtitle: 'Autres appareils tech hors catégories principales',
    badge: 'Cool bientôt',
    available: false,
    tooltip: "On ouvrira les autres catégories quand la reprise sera sérieuse, pas à la loterie.",
    icon: Package,
  },
];

export const DeviceChoiceCard: React.FC<{
  option: DeviceTradeOption;
  onSelect: (id: DeviceTradeOption['id']) => void;
}> = ({ option, onSelect }) => {
  const Icon = option.icon;

  if (option.available) {
    return (
      <button
        type="button"
        onClick={() => onSelect(option.id)}
        className="group relative w-full text-left bg-black/60 border border-white/10 hover:border-xeption-gold/40 transition-all duration-300 p-5 rounded-sm overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-xeption-gold/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="w-12 h-12 border border-xeption-gold/30 bg-xeption-gold/10 flex items-center justify-center shadow-[0_0_15px_rgba(255,215,0,0.15)] mb-4">
              <Icon className="w-5 h-5 text-xeption-gold" />
            </div>
            <p className="text-white font-tech font-bold uppercase tracking-wider text-base">{option.label}</p>
            <p className="text-[11px] text-gray-400 font-sans mt-2 leading-relaxed">{option.subtitle}</p>
          </div>
          <span className="shrink-0 text-[10px] font-tech uppercase tracking-widest px-2 py-1 border border-xeption-gold/30 bg-xeption-gold/10 text-xeption-gold">
            {option.badge}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div
      className="group relative bg-black/35 border border-white/10 p-5 rounded-sm opacity-65 cursor-not-allowed overflow-visible"
      aria-disabled="true"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="w-12 h-12 border border-white/10 bg-white/5 flex items-center justify-center mb-4">
            <Icon className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-gray-300 font-tech font-bold uppercase tracking-wider text-base">{option.label}</p>
          <p className="text-[11px] text-gray-500 font-sans mt-2 leading-relaxed">{option.subtitle}</p>
        </div>
        <span className="shrink-0 text-[10px] font-tech uppercase tracking-widest px-2 py-1 border border-white/10 bg-white/5 text-gray-400">
          {option.badge}
        </span>
      </div>

      <div className="pointer-events-none absolute left-5 right-5 top-full mt-3 z-20 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200">
        <div className="bg-black/95 border border-xeption-gold/20 shadow-2xl px-4 py-3 text-[11px] text-gray-200 leading-relaxed">
          <span className="block text-xeption-gold font-tech uppercase tracking-widest text-[10px] mb-1">Cool bientôt</span>
          {option.tooltip}
        </div>
      </div>
    </div>
  );
};

export const DeviceCategorySelector: React.FC<{
  onSelect: (id: DeviceCategoryId) => void;
}> = ({ onSelect }) => {
  return (
    <div className="space-y-8">
      <div className="w-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl p-6 sm:p-8 lg:p-10">
        <div className="flex items-center gap-2 text-xeption-gold text-[10px] font-tech uppercase tracking-widest mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Choix du device
        </div>
        <h2 className="text-2xl font-tech font-bold uppercase text-white tracking-wider mb-3">
          Tu veux troquer <span className="text-xeption-gold">quoi</span> ?
        </h2>
        <p className="text-sm text-gray-300 font-sans leading-relaxed max-w-xl">
          On ne balance pas des estimations au hasard. Chez Xeption, chaque catégorie ouvre quand
          son moteur est vraiment prêt. Là, le Smart Troc tourne déjà sur les téléphones. Le reste
          arrive proprement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5 items-stretch">
        {DEVICE_OPTIONS.map((option) => (
          <DeviceChoiceCard
            key={option.id}
            option={option}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="w-full bg-black/40 border border-white/10 px-5 py-4 sm:px-6">
        <p className="text-[10px] font-tech uppercase tracking-widest text-gray-300 mb-2">
          Maintenant disponible
        </p>
        <p className="text-xs text-gray-400 leading-relaxed font-sans">
          Téléphones uniquement : photos réelles, contrôle IMEI, paiement de filtrage, estimation IA,
          puis validation finale en boutique.
        </p>
      </div>
    </div>
  );
};
