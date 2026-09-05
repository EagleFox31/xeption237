import { describe, expect, it } from 'vitest';
import {
  isOfflinePosAlreadySynced,
  isOfflinePosStockConflict,
  isOfflinePosTransientError,
} from './offlinePosQueue';

describe('offlinePosQueue helpers', () => {
  it('reconnaît une commande déjà synchronisée (RPC jsonb)', () => {
    expect(isOfflinePosAlreadySynced('Commande déjà enregistrée: POS-123456')).toBe(true);
  });

  it('reconnaît une coupure réseau transitoire', () => {
    expect(isOfflinePosTransientError('Failed to fetch')).toBe(true);
    expect(isOfflinePosTransientError('NetworkError when attempting to fetch resource.')).toBe(true);
  });

  it('ne confond pas un conflit stock avec une erreur réseau', () => {
    expect(isOfflinePosStockConflict('Stock insuffisant pour le produit X')).toBe(true);
    expect(isOfflinePosTransientError('Stock insuffisant pour le produit X')).toBe(false);
  });

  it('ne marque pas une erreur métier comme transitoire', () => {
    expect(isOfflinePosTransientError('Remise supérieure au sous-total')).toBe(false);
  });
});
