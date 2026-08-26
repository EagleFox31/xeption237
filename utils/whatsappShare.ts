import type { TradeInRequest } from '../types';
import { CREDIT_BONUS_PERCENT } from './trocPricing';
import { resolveVoucherReference } from './trocVoucherRef';

/**
 * Messages WhatsApp — volontairement SANS emoji.
 *
 * Notre chaîne est propre : le fichier est en UTF-8 valide, `encodeURIComponent`
 * fait un aller-retour identique (l'emoji fete devient bien `%F0%9F%8E%89`), et
 * `index.html` declare `charset="UTF-8"`. Pourtant le client a recu des losanges
 * de remplacement (U+FFFD), qui signalent un decodage d'octets invalides : la
 * corruption est donc en aval, hors de notre portee.
 *
 * Plutôt que de courir après, on supprime la dépendance : ces messages sont
 * transférés, recopiés en SMS, lus sur des téléphones simples et collés dans
 * l'ERP. Les emoji vivent hors du plan multilingue de base et sont le premier
 * caractère à casser dans ces trajets. Ils n'apportaient aucune information —
 * la structure du texte suffit.
 *
 * Les accents, eux, RESTENT : ils vivent dans le plan de base et ne posent
 * aucun probleme. Une premiere version les avait retires aussi, par exces de
 * prudence, ce qui donnait « Valeur evaluee » a un client.
 */

export const XEPTION_STORE_WHATSAPP = '237641891031';

export const buildWhatsAppUrl = (message: string): string =>
  `https://wa.me/${XEPTION_STORE_WHATSAPP}?text=${encodeURIComponent(message)}`;

const formatFcfa = (amount: number): string =>
  new Intl.NumberFormat('fr-FR').format(amount).replace(/\s/g, '.') + ' XAF';

export const buildTradeInVoucherShareMessage = (
  request: TradeInRequest,
  opts?: { reste?: number },
): string => {
  const ref = resolveVoucherReference(request);
  const device = `${request.device_brand} ${request.device_model}`.trim();
  const value = request.trade_in_value ?? 0;
  const target = request.target_product_name?.trim() || '';
  const reste = opts?.reste;
  return [
    'MON ÉVALUATION SMART TROC — XEPTION NETWORK',
    '',
    `Appareil : ${device}`,
    `Valeur de reprise : ${formatFcfa(value)}`,
    ...(target ? [`Appareil souhaité : ${target}`] : []),
    ...(reste != null
      ? [`Reste à payer : ${reste > 0 ? formatFcfa(reste) : 'Rien à payer'}`]
      : []),
    `Référence : ${ref}`,
    '',
    `Crédit boutique disponible : +${CREDIT_BONUS_PERCENT} % selon offre en cours.`,
    'Je souhaite valider ma reprise en boutique.',
  ].join('\n');
};

export const buildTradeInAppointmentMessage = (request: TradeInRequest): string => {
  const ref = resolveVoucherReference(request);
  const device = `${request.device_brand} ${request.device_model}`.trim();
  const value = request.trade_in_value ?? 0;
  return [
    'Bonjour XEPTION, je viens pour valider ma reprise Smart Troc.',
    '',
    `Référence bon : ${ref}`,
    `Appareil : ${device}`,
    `Valeur évaluée : ${formatFcfa(value)}`,
    ...(request.target_product_name ? [`Appareil souhaité : ${request.target_product_name}`] : []),
  ].join('\n');
};
