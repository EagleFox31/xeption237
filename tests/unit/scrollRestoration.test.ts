import { describe, expect, it } from 'vitest';
import { resolveScrollTarget } from '../../hooks/useScrollRestoration';

describe('resolveScrollTarget', () => {
  it('restaure la position mémorisée sur un retour arrière', () => {
    expect(resolveScrollTarget('POP', 1840)).toBe(1840);
  });

  it('remonte en haut pour une nouvelle navigation, même si une position existe', () => {
    expect(resolveScrollTarget('PUSH', 1840)).toBe(0);
    expect(resolveScrollTarget('REPLACE', 1840)).toBe(0);
  });

  it('remonte en haut sur un retour sans position connue', () => {
    expect(resolveScrollTarget('POP', undefined)).toBe(0);
  });
});
