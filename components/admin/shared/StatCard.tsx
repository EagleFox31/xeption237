
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { adminUi } from './adminUi';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: 'gold' | 'green' | 'cyan' | 'neutral';
}

const toneStyles: Record<NonNullable<StatCardProps['tone']>, string> = {
  gold: 'text-xeption-gold',
  green: 'text-emerald-400',
  cyan: 'text-cyan-400',
  neutral: 'text-white/40',
};

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'gold',
}) => {
  const accent = toneStyles[tone];

  return (
    <div className={`${adminUi.card} ${adminUi.surfaceHover} relative overflow-hidden group`}>
        <div className="absolute right-0 top-0 opacity-[0.07] translate-x-1/4 -translate-y-1/4 pointer-events-none">
            <Icon className={`w-28 h-28 ${accent}`} />
        </div>
        <div className="relative z-10">
            <p className={`${adminUi.label} mb-2`}>{label}</p>
            <p className="text-2xl md:text-3xl font-bold text-white font-tech tabular-nums">
                {value}
            </p>
            {sub && <p className={`mt-1 ${adminUi.muted} text-xs`}>{sub}</p>}
        </div>
    </div>
  );
};

export default StatCard;
