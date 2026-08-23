import React from 'react';
import type { TradeInRequest } from '../../../types';
import { redemptionState, voucherDaysLeft } from '../../../utils/trocRedemption';

/**
 * Pastille d'état du bon de reprise (échéance + grâce). Rien si le dossier n'a pas d'échéance.
 * Partagée entre la liste des dossiers et la modale de rachat.
 */
export const VoucherExpiryBadge: React.FC<{
  request: Pick<TradeInRequest, 'voucher_expires_at'>;
  className?: string;
}> = ({ request, className = '' }) => {
  if (!request.voucher_expires_at) return null;

  const state = redemptionState(request);
  const days = voucherDaysLeft(request);

  const config: Record<'valid' | 'grace' | 'stale', { label: string; cls: string }> = {
    valid: {
      label: days != null && days <= 0 ? "Expire auj." : `Expire ${days} j`,
      cls: 'bg-green-500/15 text-green-300 border-green-500/30',
    },
    grace: { label: 'Grâce', cls: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
    stale: { label: 'Expiré', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  };

  if (state === 'no_expiry') return null;
  const cfg = config[state];

  return (
    <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium ${cfg.cls} ${className}`}>
      {cfg.label}
    </span>
  );
};

export default VoucherExpiryBadge;
