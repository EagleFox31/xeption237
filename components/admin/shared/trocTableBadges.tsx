import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, Zap, Shield, Award } from 'lucide-react';
import type { TrocPayment } from '../../../types';

export const TROC_TIER_CONFIG: Record<
  TrocPayment['tier'],
  { label: string; className: string; icon: React.ReactNode }
> = {
  express: {
    label: 'Express',
    className: 'bg-neutral-500/15 text-neutral-300 border-neutral-500/30',
    icon: <Zap className="w-3 h-3" />,
  },
  premium: {
    label: 'Premium',
    className: 'bg-xeption-gold/15 text-xeption-gold border-xeption-gold/40',
    icon: <Award className="w-3 h-3" />,
  },
  safety: {
    label: 'Sûreté',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    icon: <Shield className="w-3 h-3" />,
  },
};

export const TROC_PAYMENT_STATUS_CONFIG: Record<
  TrocPayment['status'],
  { label: string; className: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'En attente',
    className: 'bg-yellow-500/20 text-yellow-400',
    icon: <Clock className="w-3 h-3" />,
  },
  paid: {
    label: 'Payé',
    className: 'bg-green-500/20 text-green-400',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  failed: {
    label: 'Échoué',
    className: 'bg-red-500/20 text-red-400',
    icon: <XCircle className="w-3 h-3" />,
  },
  expired: {
    label: 'Expiré',
    className: 'bg-neutral-500/20 text-neutral-400',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
};

export const TierBadge: React.FC<{ tier?: TrocPayment['tier'] | null }> = ({ tier }) => {
  if (!tier) return <span className="text-white/40 text-xs">—</span>;
  const cfg = TROC_TIER_CONFIG[tier] ?? TROC_TIER_CONFIG.express;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-tech uppercase border ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

export const PaymentStatusBadge: React.FC<{ status?: TrocPayment['status'] | null }> = ({ status }) => {
  if (!status) return <span className="text-white/40 text-xs">—</span>;
  const cfg = TROC_PAYMENT_STATUS_CONFIG[status] ?? TROC_PAYMENT_STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

const CHANNEL_CONFIG: Record<
  TrocPayment['channel'],
  { label: string; className: string }
> = {
  om: {
    label: 'Orange',
    className: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
  momo: {
    label: 'MTN',
    className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  },
};

export const PaymentChannelBadge: React.FC<{ channel?: TrocPayment['channel'] | null }> = ({
  channel,
}) => {
  if (!channel) return null;
  const cfg = CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG.om;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-tech uppercase border ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
};
