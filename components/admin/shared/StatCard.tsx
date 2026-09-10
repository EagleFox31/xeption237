import React from 'react';
import { LucideIcon } from 'lucide-react';
import { adminUi } from './adminUi';

/**
 * Carte d'indicateur.
 *
 * La couleur porte du SENS, pas de la décoration :
 *   gold    → l'argent (CA, montants encaissés)
 *   white   → un simple compteur, rien à signaler
 *   cyan    → un volume dans une autre unité (pièces, articles)
 *   green   → un objectif atteint, un état sain
 *   red     → un problème qui demande une action
 *
 * Avant, `tone` ne teintait que le filigrane d'icône à 7 % d'opacité : toutes
 * les cartes paraissaient identiques. La teinte agit désormais sur la bordure,
 * le fond, la pastille d'icône et la valeur.
 */

export type StatTone = 'gold' | 'white' | 'cyan' | 'green' | 'red';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: StatTone;
}

const TONES: Record<StatTone, { card: string; chip: string; value: string; ghost: string }> = {
  gold: {
    card: 'bg-xeption-gold/[0.07] border-xeption-gold/35 hover:border-xeption-gold/60',
    chip: 'bg-xeption-gold/15 border-xeption-gold/40 text-xeption-gold',
    value: 'text-xeption-gold',
    ghost: 'text-xeption-gold',
  },
  white: {
    card: 'bg-white/[0.05] border-white/20 hover:border-white/40',
    chip: 'bg-white/10 border-white/25 text-white',
    value: 'text-white',
    ghost: 'text-white',
  },
  cyan: {
    card: 'bg-cyan-500/[0.07] border-cyan-400/35 hover:border-cyan-400/60',
    chip: 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300',
    value: 'text-cyan-300',
    ghost: 'text-cyan-400',
  },
  green: {
    card: 'bg-emerald-500/[0.07] border-emerald-400/35 hover:border-emerald-400/60',
    chip: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300',
    value: 'text-emerald-300',
    ghost: 'text-emerald-400',
  },
  red: {
    card: 'bg-red-500/[0.08] border-red-400/40 hover:border-red-400/70',
    chip: 'bg-red-500/15 border-red-400/40 text-red-300',
    value: 'text-red-300',
    ghost: 'text-red-400',
  },
};

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon: Icon, tone = 'gold' }) => {
  const t = TONES[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-lg border p-5 backdrop-blur-md transition-colors duration-200 ${t.card}`}
    >
      {/* Filigrane discret — décoratif, ne porte aucune information. */}
      <div
        className="absolute right-0 top-0 opacity-[0.08] translate-x-1/4 -translate-y-1/4 pointer-events-none"
        aria-hidden
      >
        <Icon className={`w-28 h-28 ${t.ghost}`} />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className={adminUi.label}>{label}</p>
          <span
            className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-md border ${t.chip}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        </div>

        <p className={`text-2xl md:text-3xl font-bold font-tech tabular-nums ${t.value}`}>{value}</p>

        {sub && <p className="mt-1 text-xs text-white/70">{sub}</p>}
      </div>
    </div>
  );
};

export default StatCard;
