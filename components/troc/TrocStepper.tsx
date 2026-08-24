import React from 'react';
import { Check } from 'lucide-react';

interface TrocStepperProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export const TrocStepper: React.FC<TrocStepperProps> = ({ currentStep, labels }) => {
  return (
    <div className="flex items-center justify-between w-full px-2 py-4">
      {labels.map((label, index) => {
        const isActive    = index === currentStep;
        const isCompleted = index < currentStep;
        return (
          <React.Fragment key={label}>
            <div
              className="flex flex-col items-center"
              data-active={isActive ? 'true' : 'false'}
              data-completed={isCompleted ? 'true' : 'false'}
            >
              <div className={`w-8 h-8 flex items-center justify-center text-xs font-tech font-bold border transition-all duration-300
                ${isCompleted
                  ? 'bg-xeption-gold/20 border-xeption-gold text-xeption-gold shadow-[0_0_10px_rgba(255,215,0,0.3)]'
                  : isActive
                  ? 'bg-xeption-gold text-black border-xeption-gold shadow-[0_0_15px_rgba(255,215,0,0.5)]'
                  : 'bg-white/5 border-white/20 text-white/50'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={`text-[9px] font-tech font-bold uppercase tracking-widest mt-1.5 transition-colors
                ${isActive ? 'text-xeption-gold' : isCompleted ? 'text-xeption-gold/60' : 'text-white/50'}`}
              >
                {label}
              </span>
            </div>
            {index < labels.length - 1 && (
              <div className={`flex-1 h-px mx-1 transition-all duration-300 ${isCompleted ? 'bg-xeption-gold/40' : 'bg-white/10'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
