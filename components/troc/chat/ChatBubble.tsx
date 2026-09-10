import React from 'react';
import { Bot } from 'lucide-react';

interface BotBubbleProps {
  children: React.ReactNode;
  variant?: 'default' | 'error' | 'warning';
}

interface UserBubbleProps {
  label: string;
}

export const BotBubble: React.FC<BotBubbleProps> = ({ children, variant = 'default' }) => (
  <div className="flex items-start gap-3">
    <div className={`shrink-0 w-8 h-8 flex items-center justify-center border ${
      variant === 'error'
        ? 'border-red-500/40 bg-red-500/10'
        : variant === 'warning'
        ? 'border-amber-500/40 bg-amber-500/10'
        : 'border-xeption-gold/30 bg-xeption-gold/10'
    }`}>
      <Bot className={`w-4 h-4 ${
        variant === 'error' ? 'text-red-400' : variant === 'warning' ? 'text-amber-400' : 'text-xeption-gold'
      }`} />
    </div>
    <div className={`max-w-[85%] px-4 py-3 text-sm font-sans leading-relaxed ${
      variant === 'error'
        ? 'bg-red-950/50 border border-red-800/60 text-red-200'
        : variant === 'warning'
        ? 'bg-amber-950/40 border border-amber-700/40 text-amber-200'
        : 'bg-white/5 border border-white/10 text-white'
    }`}>
      {children}
    </div>
  </div>
);

export const UserBubble: React.FC<UserBubbleProps> = ({ label }) => (
  <div className="flex justify-end">
    <div className="max-w-[75%] px-4 py-2.5 bg-xeption-gold/20 border border-xeption-gold/30 text-xeption-gold text-sm font-sans font-medium">
      {label}
    </div>
  </div>
);

export const TypingIndicator: React.FC = () => (
  <div className="flex items-start gap-3">
    <div className="shrink-0 w-8 h-8 flex items-center justify-center border border-xeption-gold/30 bg-xeption-gold/10">
      <Bot className="w-4 h-4 text-xeption-gold" />
    </div>
    <div className="bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 bg-xeption-gold/60 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  </div>
);
