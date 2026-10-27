import { describe, expect, it } from 'vitest';
import {
  offerPatchIfChanged,
  RECALC_LOCKED_STATUSES,
  tradeInRowToPricingInput,
} from '../../supabase/functions/_shared/tradeInRecalc';

describe('tradeInRowToPricingInput', () => {
  it('remappe les colonnes snake_case vers le body de computeOfferV2', () => {
    const input = tradeInRowToPricingInput({
      device_brand: 'Samsung', device_model: 'Galaxy Z Fold5', battery_health: 88,
      screen_condition: 'micro_rayures', powers_on: true, has_water_damage: false, has_invoice: null,
    });
    expect(input).toMatchObject({
      deviceBrand: 'Samsung', deviceModel: 'Galaxy Z Fold5', batteryHealth: 88,
      screenCondition: 'micro_rayures', powersOn: true, hasWaterDamage: false,
    });
    // null en base → undefined, pour garder les défauts de computeConditionScore.
    expect(input.hasInvoice).toBeUndefined();
  });
});

describe('offerPatchIfChanged', () => {
  const row = { trade_in_value: 0, trade_in_grade: 'refuse', blocker_reason: 'no_base_price' };

  it('renvoie le patch quand l’offre change (cas TRC-1792843872)', () => {
    const next = { trade_in_value: 300000, trade_in_grade: 'excellent', blocker_reason: null };
    expect(offerPatchIfChanged(row, next)).toEqual(next);
  });

  it('second recalcul identique = aucune écriture', () => {
    expect(offerPatchIfChanged(row, { ...row })).toBeNull();
    expect(offerPatchIfChanged({ blocker_reason: null }, { blocker_reason: undefined })).toBeNull();
  });
});

describe('RECALC_LOCKED_STATUSES', () => {
  it('verrouille un bon utilisé, pas un dossier en attente', () => {
    expect(RECALC_LOCKED_STATUSES.has('completed')).toBe(true);
    expect(RECALC_LOCKED_STATUSES.has('pending')).toBe(false);
  });
});
