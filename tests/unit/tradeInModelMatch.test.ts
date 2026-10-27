import { describe, expect, it } from 'vitest';
import { matchTradeInModel, type CatalogModel } from '../../supabase/functions/_shared/tradeInModelMatch';

const row = (brand: string, model_name: string): CatalogModel => ({ id: model_name, brand, model_name, base_price: 1 });
const CATALOG = [
  row('Samsung', 'Z Fold 5'), row('Samsung', 'Z Fold 4'), row('Samsung', 'Galaxy S23 Ultra'),
  row('Apple', 'iPhone 15 Pro Max'), row('Apple', 'iPhone 15 Pro'), row('Apple', 'iPhone 15'),
  row('Xiaomi', 'Redmi Note 13'),
];
const match = (brand: string, model: string) => matchTradeInModel(brand, model, CATALOG)?.model_name ?? null;

describe('matchTradeInModel', () => {
  it('ignore « Galaxy », espaces et casse (cas TRC-1792843872)', () => {
    expect(match('Samsung', 'Galaxy Z Fold5')).toBe('Z Fold 5');
    expect(match('samsung', 'z fold 5')).toBe('Z Fold 5');
    expect(match('Samsung', 'S23 Ultra')).toBe('Galaxy S23 Ultra');
  });

  it('tolère les fautes de frappe', () => {
    expect(match('Samsung', 'Z Flod 5')).toBe('Z Fold 5');
    expect(match('Samsnug', 'Galaxy Z Fold 5')).toBe('Z Fold 5');
    expect(match('Apple', 'iphone 15 promax')).toBe('iPhone 15 Pro Max');
    expect(match('Apple', 'Iphone 15 pro mx')).toBe('iPhone 15 Pro Max');
    expect(match('Apple', 'iPhone 15 Pro')).toBe('iPhone 15 Pro');
    expect(match('Xiaomi', 'redmi note13')).toBe('Redmi Note 13');
  });

  it('ne change jamais de génération ni de marque', () => {
    expect(match('Samsung', 'Z Fold 6')).toBeNull();
    expect(match('Apple', 'iPhone 14 Pro')).toBeNull();
    expect(match('Apple', 'Z Fold 5')).toBeNull();
    expect(match('Samsung', 'téléphone')).toBeNull();
  });
});
