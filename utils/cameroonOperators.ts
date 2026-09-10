export type CameroonOperator = 'mtn' | 'orange';

const ORANGE_PREFIXES = new Set([
  '655', '656', '657', '658', '659',
  '690', '691', '692', '693', '694', '695', '696', '697', '698', '699',
]);

const MTN_PREFIXES = new Set([
  '650', '651', '652', '653', '654',
  '670', '671', '672', '673', '674', '675', '676', '677', '678', '679',
  '680', '681', '682', '683', '684', '685', '686', '687', '688', '689',
]);

/**
 * Détection heuristique opérateur Mobile Money (Cameroun) depuis le numéro local 9 chiffres.
 * Affichage UI uniquement — CamPay route côté serveur.
 */
export const detectCameroonOperator = (phone: string): CameroonOperator | null => {
  const digits = phone.replace(/\D/g, '').replace(/^237/, '');
  if (!/^[62]\d{8}$/.test(digits)) return null;
  const prefix = digits.slice(0, 3);
  if (ORANGE_PREFIXES.has(prefix)) return 'orange';
  if (MTN_PREFIXES.has(prefix)) return 'mtn';
  if (prefix.startsWith('69')) return 'orange';
  if (prefix.startsWith('67') || prefix.startsWith('68')) return 'mtn';
  return null;
};

export const OPERATOR_LABELS: Record<CameroonOperator, string> = {
  mtn: 'MTN MoMo',
  orange: 'Orange Money',
};
