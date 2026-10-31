import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const Boom = () => {
  throw new Error('boom');
};

describe('ErrorBoundary', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('affiche l’écran d’erreur par défaut sans fallback', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByText('Une erreur est survenue')).toBeTruthy();
  });

  it('fallback={null} n’affiche rien (pas de bloc sous le footer)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<ErrorBoundary fallback={null}><Boom /></ErrorBoundary>);
    expect(container.innerHTML).toBe('');
  });

  it('rend le fallback fourni', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary fallback={<p>secours</p>}><Boom /></ErrorBoundary>);
    expect(screen.getByText('secours')).toBeTruthy();
  });
});
