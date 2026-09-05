import React from 'react';
import { ChameleoMascot } from './ChameleoMascot';
import { TROC_MISSIONS, type TrocCoachView } from '../../utils/trocCoach';

interface TrocCoachBarProps {
  view: TrocCoachView;
}

export const TrocCoachBar: React.FC<TrocCoachBarProps> = ({ view }) => {
  return (
    <div className="bg-[#0a0a0c]/40 border border-white/20 px-3 py-3 mb-4 backdrop-blur-2xl rounded-xl flex items-center gap-3">
      <ChameleoMascot
        state={view.state}
        size="xs"
        showSpeechBubble={false}
        trackPointer={false}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-tech font-bold uppercase tracking-widest text-xeption-gold">
          Palier {view.missionIndex + 1} / {TROC_MISSIONS.length} — {view.title}
        </p>
        <p className="text-xs text-white/90 font-sans mt-0.5 leading-snug">{view.message}</p>
        <div className="flex gap-1 mt-2" aria-hidden>
          {TROC_MISSIONS.map((mission, index) => {
            const done = index < view.completedCount;
            const current = index === view.missionIndex && view.completedCount < TROC_MISSIONS.length;
            return (
              <span
                key={mission.id}
                title={mission.label}
                className={`h-1 flex-1 rounded-full ${
                  done
                    ? 'bg-xeption-gold'
                    : current
                      ? 'bg-xeption-gold/50'
                      : 'bg-white/10'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
