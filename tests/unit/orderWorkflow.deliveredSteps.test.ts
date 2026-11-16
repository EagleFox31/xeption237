import { describe, it, expect } from 'vitest';
import {
  canMarkDelivered,
  isOrderOpen,
  ORDER_CANCEL_REASONS,
  ORDER_OPEN_STATUSES,
  ORDER_TRANSITIONS,
  planDeliveredSteps,
  UNREACHABLE_CANCEL_REASON,
  type OrderStatus,
} from '../../utils/orderWorkflow';

const ALL: OrderStatus[] = Object.keys(ORDER_TRANSITIONS) as OrderStatus[];

describe('planDeliveredSteps — « Livrée » depuis la fiche commande', () => {
  it('livraison : pending → confirmed → shipped, puis encaissement', () => {
    expect(planDeliveredSteps({ status: 'pending', deliveryMode: 'delivery' })).toEqual(['confirmed', 'shipped']);
    expect(planDeliveredSteps({ status: 'confirmed', deliveryMode: 'delivery' })).toEqual(['shipped']);
  });

  it('retrait boutique : pending → confirmed → ready, puis encaissement', () => {
    expect(planDeliveredSteps({ status: 'pending', deliveryMode: 'pickup' })).toEqual(['confirmed', 'ready']);
    expect(planDeliveredSteps({ status: 'confirmed', deliveryMode: 'pickup' })).toEqual(['ready']);
  });

  it('aucune étape quand la commande attend déjà l’encaissement ou est terminée', () => {
    for (const status of ['ready', 'shipped', 'delivered', 'cancelled', 'refused', 'returned'] as OrderStatus[]) {
      expect(planDeliveredSteps({ status, deliveryMode: 'delivery' })).toEqual([]);
    }
  });

  it('chaque plan respecte ORDER_TRANSITIONS et finit sur un statut qui peut passer à delivered', () => {
    for (const status of ALL) {
      for (const deliveryMode of ['delivery', 'pickup'] as const) {
        const steps = planDeliveredSteps({ status, deliveryMode });
        let from = status;
        for (const to of steps) {
          expect(ORDER_TRANSITIONS[from]).toContain(to);
          from = to;
        }
        if (steps.length) expect(ORDER_TRANSITIONS[from]).toContain('delivered');
        // Jamais de transition directe vers delivered : l'encaissement reste le seul chemin.
        expect(steps).not.toContain('delivered');
      }
    }
  });

  it('canMarkDelivered : vrai pour les statuts ouverts, faux pour les terminaux', () => {
    for (const status of ORDER_OPEN_STATUSES) expect(canMarkDelivered({ status, deliveryMode: 'delivery' })).toBe(true);
    for (const status of ['delivered', 'cancelled', 'refused', 'returned'] as OrderStatus[]) {
      expect(canMarkDelivered({ status, deliveryMode: 'delivery' })).toBe(false);
    }
  });
});

describe('statuts ouverts et motifs d’annulation', () => {
  it('isOrderOpen suit ORDER_OPEN_STATUSES', () => {
    expect(ALL.filter((status) => isOrderOpen({ status }))).toEqual(['pending', 'confirmed', 'ready', 'shipped']);
  });

  it('liste fermée de motifs, dont le motif « injoignable »', () => {
    expect(ORDER_CANCEL_REASONS).toContain(UNREACHABLE_CANCEL_REASON);
    expect(new Set(ORDER_CANCEL_REASONS).size).toBe(ORDER_CANCEL_REASONS.length);
    for (const r of ORDER_CANCEL_REASONS) expect(r.length).toBeLessThanOrEqual(80);
  });
});
