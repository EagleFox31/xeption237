import { describe, expect, it } from 'vitest';
// @ts-expect-error module .mjs sans déclarations de types
import { applySpecPatch } from '../../scripts/lib/specPatch.mjs';

const specs = [
  { label: 'RAM', value: '4 Go' },
  { label: 'Écran', value: '6,88"' },
  { label: 'Source', value: 'Mfoundi' },
];

describe('applySpecPatch', () => {
  it('remplace en place sans tenir compte de la casse ni des accents', () => {
    const next = applySpecPatch(specs, { set: [{ label: 'ecran', value: '6,88" HD+' }] });
    expect(next[1]).toEqual({ label: 'Écran', value: '6,88" HD+' });
  });

  it('retire les labels obsolètes et ajoute les nouveaux en fin de liste', () => {
    const next = applySpecPatch(specs, { set: [{ label: 'Batterie', value: '5200 mAh' }], remove: ['source'] });
    expect(next.map((s: { label: string }) => s.label)).toEqual(['RAM', 'Écran', 'Batterie']);
  });

  it('est idempotent même quand un label est à la fois dans set et remove', () => {
    const patch = { set: [{ label: 'RAM', value: '3 Go' }], remove: ['RAM', 'Source'] };
    const once = applySpecPatch(specs, patch);
    expect(applySpecPatch(once, patch)).toEqual(once);
    expect(once[0]).toEqual({ label: 'RAM', value: '3 Go' });
  });

  it('tolère des specs absentes', () => {
    expect(applySpecPatch(null, { set: [{ label: 'RAM', value: '3 Go' }] })).toEqual([{ label: 'RAM', value: '3 Go' }]);
  });
});
