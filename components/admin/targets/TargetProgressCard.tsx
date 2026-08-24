import React from 'react';
import { CheckCircle2, Target } from 'lucide-react';
import { adminUi } from '../shared/adminUi';
import {
  formatAchievementPercent,
  formatFcfaShort,
  type TargetProgressSlice,
} from '../../../utils/salesTargets';

interface TargetProgressCardProps {
  title: string;
  slice: TargetProgressSlice | null;
  emptyHint?: string;
}

const TargetProgressCard: React.FC<TargetProgressCardProps> = ({
  title,
  slice,
  emptyHint = 'Objectif non défini par la direction.',
}) => {
  if (!slice?.target_amount) {
    return (
      <div className={`${adminUi.card} border-dashed border-white/15`}>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-white/45" />
          <h4 className="text-sm font-tech uppercase text-white/70">{title}</h4>
        </div>
        <p className={adminUi.muted}>{emptyHint}</p>
        {slice && slice.actual_amount > 0 && (
          <p className="text-xs text-white/60 mt-2">
            Encaissé : {formatFcfaShort(slice.actual_amount)}
          </p>
        )}
      </div>
    );
  }

  const percent = slice.achievement_percent ?? 0;
  const barWidth = Math.min(100, Math.max(4, percent));

  return (
    <div
      className={`${adminUi.card} relative overflow-hidden ${
        slice.achieved ? 'border-emerald-500/40' : ''
      }`}
    >
      {slice.achieved && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-emerald-400 text-[10px] font-bold uppercase">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Atteint
        </div>
      )}
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-xeption-gold" />
        <h4 className="text-sm font-tech uppercase text-white">{title}</h4>
      </div>

      <div className="flex items-end justify-between gap-3 mb-3">
        <div>
          <p className="text-2xl font-bold text-white font-mono tabular-nums">
            {formatFcfaShort(slice.actual_amount)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-white/50 mt-1">
            sur {formatFcfaShort(slice.target_amount)}
          </p>
        </div>
        <p className="text-xl font-bold text-xeption-gold font-mono tabular-nums">
          {formatAchievementPercent(slice.achievement_percent)}
        </p>
      </div>

      <div className="h-2.5 rounded-full bg-white/8 overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            slice.achieved
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-300'
              : 'bg-gradient-to-r from-xeption-gold to-amber-200'
          }`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {!slice.achieved && slice.remaining != null && slice.remaining > 0 && (
        <p className="text-xs text-white/60">
          Il reste {formatFcfaShort(slice.remaining)} pour l&apos;objectif.
        </p>
      )}
    </div>
  );
};

export default TargetProgressCard;
