import type { TradeInRequest } from '../types';
import { CREDIT_BONUS_PERCENT } from './trocPricing';

export const XEPTION_STORE_WHATSAPP = '237697686684';

export const buildWhatsAppUrl = (message: string): string =>
  `https://wa.me/${XEPTION_STORE_WHATSAPP}?text=${encodeURIComponent(message)}`;

const formatFcfa = (amount: number): string =>
  new Intl.NumberFormat('fr-FR').format(amount).replace(/\s/g, '.') + ' XAF';

export const buildTradeInVoucherShareMessage = (request: TradeInRequest): string => {
  const ref = request.voucher_reference || request.id;
  const device = `${request.device_brand} ${request.device_model}`.trim();
  const value = request.trade_in_value ?? 0;
  return [
    '🎉 Mon évaluation Smart Troc XEPTION',
    '',
    `📱 ${device}`,
    `💰 Valeur de reprise : ${formatFcfa(value)}`,
    `📋 Référence : ${ref}`,
    `🏪 Crédit boutique disponible (+${CREDIT_BONUS_PERCENT} % selon offre en cours)`,
    '',
    'Je souhaite valider ma reprise en boutique.',
  ].join('\n');
};

export const buildTradeInAppointmentMessage = (request: TradeInRequest): string => {
  const ref = request.voucher_reference || request.id;
  const device = `${request.device_brand} ${request.device_model}`.trim();
  const value = request.trade_in_value ?? 0;
  return [
    'Bonjour XEPTION, je viens pour valider ma reprise Smart Troc.',
    '',
    `Référence bon : ${ref}`,
    `Appareil : ${device}`,
    `Valeur évaluée : ${formatFcfa(value)}`,
  ].join('\n');
};
