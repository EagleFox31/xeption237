/**
 * Tests d'intégration — TrocUpgradeChoice (comparateur ≤5, tranches 1-2).
 * Valide l'affichage des cartes (reste à payer / couvert) et le handoff onSelect(product)
 * qui alimente la liaison cible ↔ dossier. Couvre SCENARIO_RACHAT_ET_CIBLE.md A1/A4.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const products = [
  { id: 'p1', name: 'iPhone 11 Pro', price: 120000, stock: 2, image: 'https://cdn.example.com/p1.jpg', brand: 'b1', release_year: 2019, description: 'Écran 5.8" · 64 Go' },
  { id: 'p2', name: 'iPhone 15 Pro Max', price: 890000, stock: 5, image: 'https://cdn.example.com/p2.jpg', brand: 'b2', release_year: 2023, description: 'Écran 6.7" · 256 Go' },
];

vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        gt: () => ({ eq: () => Promise.resolve({ data: products, error: null }) }),
      }),
    }),
  },
}));

import TrocUpgradeChoice from '../../components/troc/TrocUpgradeChoice';

beforeEach(() => vi.clearAllMocks());

describe('TrocUpgradeChoice — comparateur (tranches 1-2)', () => {
  it('A4 — affiche le rappel du crédit plafond', async () => {
    render(<TrocUpgradeChoice credit={120000} deviceBrand="iPhone" onSelect={vi.fn()} />);
    // Matcher spécifique : « jusqu'à » apparaît aussi dans « compare jusqu'à 5 ».
    await waitFor(() =>
      expect(screen.getByText(/jusqu'à\s*120\s*000\s*fcfa/i)).toBeInTheDocument(),
    );
  });

  it('A1 — un appareil ≤ crédit est marqué « Couvert par ton crédit »', async () => {
    render(<TrocUpgradeChoice credit={120000} deviceBrand="iPhone" onSelect={vi.fn()} />);
    // iPhone 11 Pro (120000) = crédit → couvert.
    await waitFor(() => expect(screen.getByText(/couvert par ton crédit/i)).toBeInTheDocument());
  });

  it('A1 — clic « Troquer contre celui-ci » remonte le produit choisi via onSelect', async () => {
    const onSelect = vi.fn();
    render(<TrocUpgradeChoice credit={120000} deviceBrand="iPhone" onSelect={onSelect} />);

    const buttons = await screen.findAllByRole('button', { name: /troquer contre/i });
    fireEvent.click(buttons[0]);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: expect.any(String) });
  });
});
