/**
 * Catalogue des valeurs fixes du formulaire Smart Troc.
 *
 * Les conditions d'état (écran/boîtier) sont dans trocConditions.ts
 * car elles sont aussi utilisées par les edge functions Supabase (_shared/conditions.ts).
 */

export const KNOWN_BRANDS = [
  'Samsung', 'Apple', 'Tecno', 'Infinix', 'Itel', 'Xiaomi', 'Huawei',
] as const;

// 'Autre' est volontairement séparé pour pouvoir le détecter côté logique.
export const BRANDS_WITH_OTHER = [...KNOWN_BRANDS, 'Autre'] as const;

export const STORAGES = ['16Go', '32Go', '64Go', '128Go', '256Go', '512Go'] as const;
export const RAMS     = ['2Go', '3Go', '4Go', '6Go', '8Go', '12Go', '16Go'] as const;

export const isKnownBrand = (value: string): boolean =>
  (KNOWN_BRANDS as readonly string[]).includes(value);
