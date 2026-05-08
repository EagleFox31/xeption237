import type { TrocDeviceForm } from '../types';

const isValidPurchaseDate = (value?: string): boolean => {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  return d <= new Date();
};

/**
 * Valide le formulaire de declaration d'appareil pour le Smart Troc.
 * Retourne un tableau de messages d'erreur (vide = formulaire valide).
 */
export const validateTrocForm = (form: Partial<TrocDeviceForm>): string[] => {
  const errors: string[] = [];

  if (!form.customerName?.trim()) errors.push('Nom requis');
  if (!form.customerPhone?.trim()) errors.push('Téléphone requis');
  if (!form.deviceBrand?.trim()) errors.push('Marque requise');
  if (!form.deviceModel?.trim()) errors.push('Modèle requis');
  if (!form.purchaseDate?.trim()) errors.push("Date d'achat requise");
  if (!form.screenCondition?.trim()) errors.push("État de l'écran requis");
  if (!form.bodyCondition?.trim()) errors.push('État du boîtier requis');

  if (
    form.acquisitionCondition !== undefined &&
    !['new', 'used'].includes(form.acquisitionCondition)
  ) {
    errors.push("Condition d'achat invalide");
  }

  if (
    form.ownershipRank !== undefined &&
    !['unknown', 'first', 'second', 'third_plus'].includes(form.ownershipRank)
  ) {
    errors.push('Rang propriétaire invalide');
  }

  if (form.purchaseDate && !isValidPurchaseDate(form.purchaseDate)) {
    errors.push("Date d'achat invalide (date dans le futur non autorisée)");
  }

  if (
    form.batteryHealth !== undefined &&
    (form.batteryHealth < 0 || form.batteryHealth > 100)
  ) {
    errors.push('Santé batterie invalide (0–100)');
  }

  // Numéro camerounais : 9 chiffres, commence par 6 (mobile) ou 2 (fixe)
  if (
    form.customerPhone &&
    !/^[62]\d{8}$/.test(form.customerPhone.replace(/\s/g, ''))
  ) {
    errors.push('Numéro camerounais invalide');
  }

  return errors;
};

