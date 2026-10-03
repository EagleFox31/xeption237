import type { TradeInProfile } from '../shared/commonTypes';

export const phoneProfile: TradeInProfile = {
  category: 'phone',
  steps: ['category', 'form', 'photos', 'imei', 'payment', 'result', 'voucher'],
  stepLabels: {
    category: 'Catégorie',
    form: 'Appareil',
    photos: 'Photos',
    imei: 'IMEI',
    payment: 'Paiement',
    result: 'Résultat',
    voucher: 'Bon',
  },
  identifierType: 'imei',
  requiredFields: [
    'customerName',
    'customerPhone',
    'deviceBrand',
    'deviceModel',
    'purchaseDate',
    'screenCondition',
    'bodyCondition',
  ],
};
