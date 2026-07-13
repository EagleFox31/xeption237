import React from 'react';

/** Badges compacts MoMo / OM pour réassurance CTA (pas de assets externes). */
export const MobileMoneyLogos: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`} role="group" aria-label="Paiement Mobile Money accepté">
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-tech font-bold uppercase tracking-wider bg-[#FFCC00] text-black border border-black/10"
      title="MTN Mobile Money"
    >
      MoMo
    </span>
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-tech font-bold uppercase tracking-wider bg-[#FF6600] text-white border border-white/10"
      title="Orange Money"
    >
      OM
    </span>
  </div>
);
