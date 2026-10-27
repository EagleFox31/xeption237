import { describe, expect, it } from 'vitest';
import {
  customerContactTask,
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

describe('customerContactTask', () => {
  const row = {
    id: 'r1', voucher_reference: 'TRC-1792843872', device_brand: 'Samsung', device_model: 'Galaxy Z Fold5',
    customer_name: 'Client Test', customer_phone: '690000000', voucher_expires_at: '2026-10-31T12:11:06Z',
    trade_in_value: 0, trade_in_value_cash: 0, blocker_reason: 'no_base_price',
  };
  const fixed = { trade_in_value: 305000, trade_in_value_cash: 255000, blocker_reason: null };

  it('crée la tâche staff quand l’offre vue par le client change', () => {
    const task = customerContactTask(row, fixed);
    expect(task).toMatchObject({
      event_type: 'troc_submitted', link_to_tab: 'troc', link_to_id: 'TRC-1792843872',
      dedup_key: 'troc.contact-client.TRC-1792843872.305000',
    });
    expect(task?.message).toContain('Client Test (690000000)');
    expect(task?.message).toContain("305000 FCFA bon d'achat / 255000 FCFA cash");
    expect(task?.message).toContain("valable jusqu'au 31/10/2026");
  });

  it('même recalcul rejoué = même dedup_key (pas de doublon)', () => {
    expect(customerContactTask(row, fixed)?.dedup_key).toBe(customerContactTask(row, fixed)?.dedup_key);
  });

  it('aucune tâche si seule une colonne interne bouge, ou sans téléphone', () => {
    expect(customerContactTask(row, { ai_score_color: 'green', trade_in_value: 0 })).toBeNull();
    expect(customerContactTask({ ...row, customer_phone: ' ' }, fixed)).toBeNull();
  });

  it('offre devenue refusée : pas de bon à joindre', () => {
    const task = customerContactTask({ ...row, ...fixed, blocker_reason: null }, {
      trade_in_value: 0, trade_in_value_cash: 0, blocker_reason: 'too_old',
    });
    expect(task?.message).toContain('Offre corrigée : refusée (too_old)');
    expect(task?.message).not.toContain('Joindre le bon');
    expect(task?.dedup_key).toBe('troc.contact-client.TRC-1792843872.too_old');
  });
});

describe('RECALC_LOCKED_STATUSES', () => {
  it('verrouille un bon utilisé, pas un dossier en attente', () => {
    expect(RECALC_LOCKED_STATUSES.has('completed')).toBe(true);
    expect(RECALC_LOCKED_STATUSES.has('pending')).toBe(false);
  });
});
