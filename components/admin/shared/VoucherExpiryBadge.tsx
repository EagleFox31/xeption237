import React from 'react';
import type { TradeInRequest } from '../../../types';
import {
  REDEMPTION_GRACE_DAYS,
  redemptionState,
  voucherDaysLeft,
} from '../../../utils/trocRedemption';

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

  // « Grâce » ne se comprenait pas hors du code : le vendeur voyait un mot seul,
  // sans savoir s'il devait honorer le bon ou le refuser. On dit desormais ce
  // qu'il reste a faire, et combien de temps il reste pour le faire.
  const graceLeft = Math.max(0, REDEMPTION_GRACE_DAYS + (days ?? 0));

  const config: Record<
    'valid' | 'grace' | 'stale',
    { label: string; titre: string; cls: string }
  > = {
    valid: {
      label: days != null && days <= 0 ? "Expire auj." : `Expire ${days} j`,
      titre: 'Bon de reprise encore valable',
      cls: 'bg-green-500/15 text-green-300 border-green-500/30',
    },
    grace: {
      // graceLeft == 0 : dernier jour de tolerance. « encore 0 j » se lisait
      // comme « plus rien » alors que le bon est encore honorable aujourd’hui.
      label:
        graceLeft === 0
          ? 'Expiré, dernier jour'
          : `Expiré, encore ${graceLeft} j`,
      titre: `Échéance dépassée, mais le bon reste honoré ${graceLeft} jour(s) — la clôture exigera un motif`,
      cls: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    },
    stale: {
      label: 'Expiré',
      titre: 'Délai de grâce écoulé : le crédit doit être réévalué avant toute clôture',
      cls: 'bg-red-500/15 text-red-300 border-red-500/30',
    },
  };

  if (state === 'no_expiry') return null;
  const cfg = config[state];

  return (
    <span
      title={cfg.titre}
      className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium ${cfg.cls} ${className}`}
    >
      {cfg.label}
    </span>
  );
};

export default VoucherExpiryBadge;
