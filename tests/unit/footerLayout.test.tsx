import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from '../../components/Footer';

describe('Footer — structure et liens', () => {
  it('affiche les colonnes principales et les liens crawlables', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    // Titres principaux
    expect(screen.getByText('Xeption')).toBeDefined();
    expect(screen.getByText('Rayons')).toBeDefined();
    expect(screen.getByText('Conseils & SAV')).toBeDefined();
    expect(screen.getByText('Zones desservies au Cameroun')).toBeDefined();
    expect(screen.getByText('Rejoindre la communauté')).toBeDefined();

    // Liens essentiels présents et crawlables
    const iphoneLink = screen.getByRole('link', { name: /iPhone au Cameroun/i });
    expect(iphoneLink.getAttribute('href')).toBe('/categorie/iphone-cameroun');

    const guidesLink = screen.getByRole('link', { name: /Guides d'achat/i });
    expect(guidesLink.getAttribute('href')).toBe('/guides');

    const savLink = screen.getByRole('link', { name: /Aide & SAV/i });
    expect(savLink.getAttribute('href')).toBe('/aide');

    const trocLink = screen.getByRole('link', { name: /Reprise Smart Troc/i });
    expect(trocLink.getAttribute('href')).toBe('/troc');

    // Liens juridiques
    expect(screen.getByRole('link', { name: /Mentions légales/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /CGV/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /Confidentialité/i })).toBeDefined();
  });
});
