import React from 'react';
import { Check, FileCheck2, Shield, Sparkles } from 'lucide-react';
import {
  formatTrocFee,
  TROC_TIER_LABELS,
  TROC_TIER_PRICES,
  type TrocTier,
} from '../../utils/trocPricing';

interface TierSelectorProps {
  value: TrocTier;
  onChange: (tier: TrocTier) => void;
  disabled?: boolean;
}

const TIERS: {
  id: TrocTier;
  tagline: string;
  features: string[];
  popular?: boolean;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'express',
    tagline: 'Estimation rapide',
    features: ['Analyse IA de vos photos', "Rapport d'expertise texte"],
    Icon: Sparkles,
  },
  {
    id: 'premium',
    tagline: 'Dossier complet',
    popular: true,
    features: ['Tout Express', 'Certificat PDF + QR de vérification'],
    Icon: FileCheck2,
  },
  {
    id: 'safety',
    tagline: 'Tranquillité maximale',
    features: ['Tout Premium', 'Vérif IMEI blacklist mondiale'],
    Icon: Shield,
  },
];

export const TierSelector: React.FC<TierSelectorProps> = ({ value, onChange, disabled }) => (
  <div className="flex flex-col gap-3" role="radiogroup" aria-label="Choisir votre formule">
    <p className="text-neutral-400 text-xs font-medium uppercase tracking-wide">
      Choisissez votre formule
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {TIERS.map(({ id, tagline, features, popular, Icon }) => {
        const selected = value === id;
        const price = formatTrocFee(TROC_TIER_PRICES[id], { short: true });

        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={[
              'relative flex flex-col text-left rounded-xl border p-4 transition-all',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              selected
                ? 'border-xeption-gold bg-xeption-gold/10 shadow-[0_0_20px_rgba(255,215,0,0.12)]'
                : 'border-neutral-700 bg-neutral-900/60 hover:border-neutral-500',
              popular && !selected ? 'ring-1 ring-xeption-gold/30' : '',
            ].join(' ')}
          >
            {popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-tech font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-xeption-gold text-black">
                Le + populaire
              </span>
            )}

            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={[
                    'shrink-0 p-1.5 rounded-lg border',
                    selected ? 'border-xeption-gold/40 bg-xeption-gold/15' : 'border-neutral-600 bg-neutral-800',
                  ].join(' ')}
                >
                  <Icon className={`w-4 h-4 ${selected ? 'text-xeption-gold' : 'text-neutral-400'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold font-tech uppercase tracking-wide">
                    {TROC_TIER_LABELS[id]}
                  </p>
                  <p className="text-neutral-500 text-[10px] truncate">{tagline}</p>
                </div>
              </div>
              <div
                className={[
                  'shrink-0 w-5 h-5 rounded-full border flex items-center justify-center',
                  selected ? 'border-xeption-gold bg-xeption-gold' : 'border-neutral-600',
                ].join(' ')}
                aria-hidden
              >
                {selected && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
              </div>
            </div>

            <p className="text-xeption-gold font-tech font-bold text-lg mb-2">{price}</p>

            <ul className="space-y-1">
              {features.map((f) => (
                <li key={f} className="text-neutral-400 text-[11px] leading-snug flex gap-1.5">
                  <span className="text-xeption-gold/80 shrink-0">·</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </button>
        );
      })}
    </div>
  </div>
);
