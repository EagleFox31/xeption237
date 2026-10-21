import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  calculateProductPreset,
  parseManualSplitReply,
  parseSplitTag,
  presetRatios,
  splitTag,
  stockBulkBrandListCb,
  stockBulkCatListCb,
  stockBulkExecCb,
  stockBulkMenuCb,
  stockBulkPreviewCb,
  stockSplitManualCb,
  stockSplitPresetCb,
  stockSplitScreenCb
} from '../supabase/functions/_shared/telegramStock';

const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const sql = read('supabase/migrations/20261021_006_telegram_staff_stock_redistribute.sql');

describe('Stock Redistribution : helpers', () => {
  it('parse la saisie manuelle avec ou sans reliquat siège', () => {
    // Format "M O S"
    expect(parseManualSplitReply('3 2 0', 5)).toEqual({ mfoundi: 3, olembe: 2, siege: 0 });
    expect(parseManualSplitReply('10 5 1', 16)).toEqual({ mfoundi: 10, olembe: 5, siege: 1 });

    // Format "M O" (reliquat calculé automatiquement vers Siège)
    expect(parseManualSplitReply('3 2', 6)).toEqual({ mfoundi: 3, olembe: 2, siege: 1 });
    expect(parseManualSplitReply('5 5', 10)).toEqual({ mfoundi: 5, olembe: 5, siege: 0 });

    // Rejets
    expect(parseManualSplitReply('3 3 0', 5)).toBeNull(); // somme != total
    expect(parseManualSplitReply('4 2', 5)).toBeNull();   // 4+2 > 5
    expect(parseManualSplitReply('abc def', 5)).toBeNull();
    expect(parseManualSplitReply('-1 5', 4)).toBeNull();
  });

  it('calcule correctement les presets par produit', () => {
    // 50/50 avec nombre pair
    expect(calculateProductPreset(10, '5050')).toEqual({ mfoundi: 5, olembe: 5, siege: 0 });
    // 50/50 avec nombre impair (reliquat conservé au siège)
    expect(calculateProductPreset(5, '5050')).toEqual({ mfoundi: 2, olembe: 2, siege: 1 });
    // 100% Mfoundi
    expect(calculateProductPreset(8, '100m')).toEqual({ mfoundi: 8, olembe: 0, siege: 0 });
    // 100% Olembe
    expect(calculateProductPreset(8, '100o')).toEqual({ mfoundi: 0, olembe: 8, siege: 0 });
    // 100% Siège (rapatriement)
    expect(calculateProductPreset(8, '100s')).toEqual({ mfoundi: 0, olembe: 0, siege: 8 });
  });

  it('les ratios de masse totalisent toujours 100%', () => {
    for (const preset of ['5050', '100m', '100o', '100s', '7030']) {
      const { m, o, s } = presetRatios(preset);
      expect(m + o + s).toBe(100);
    }
  });

  it('le tag ForceReply splitTag s’encode et se décode parfaitement', () => {
    const tag = splitTag('samsung-s24-ultra');
    expect(parseSplitTag(`Entrez la répartition\n${tag}`)).toEqual({ productId: 'samsung-s24-ultra' });
    expect(parseSplitTag(`${tag} et du texte après`)).toBeNull();
  });

  it('toutes les callback_data tiennent dans la limite Telegram de 64 octets', () => {
    const pid = 'samsung-galaxy-s24-ultra-512gb-titanium';
    expect(new TextEncoder().encode(stockSplitScreenCb(pid, 'android')).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(stockSplitPresetCb('5050', pid, 'android')).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(stockSplitManualCb(pid, 'android')).length).toBeLessThanOrEqual(64);

    expect(new TextEncoder().encode(stockBulkMenuCb()).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(stockBulkCatListCb()).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(stockBulkBrandListCb()).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(stockBulkPreviewCb('c', 'phones', '5050')).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(stockBulkExecCb('b', 'Samsung', '5050')).length).toBeLessThanOrEqual(64);
  });
});

describe('Stock Redistribution : migration SQL', () => {
  it('exige le rang Direction (rank >= 2)', () => {
    expect(sql).toContain("IF v_actor.o_rank < 2 THEN");
    expect(sql).toContain("RAISE EXCEPTION 'Direction only' USING ERRCODE = '42501'");
    expect(sql.match(/public\._telegram_staff_actor\(p_telegram_user_id\)/g)).toHaveLength(3);
  });

  it('utilise _store_stock_delta avec le motif canonique redistribution', () => {
    expect(sql).toContain("'redistribution'::public.stock_movement_reason");
    expect(sql.match(/public\._store_stock_delta\(/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it('applique les deltas négatifs avant les deltas positifs pour éviter les blocages de stock', () => {
    const negIndex = sql.indexOf("IF v_delta_mfoundi < 0 THEN");
    const posIndex = sql.indexOf("IF v_delta_mfoundi > 0 THEN");
    expect(negIndex).toBeGreaterThan(-1);
    expect(posIndex).toBeGreaterThan(negIndex);
  });

  it('vérifie l’invariant de somme totale', () => {
    expect(sql).toContain("v_target_total <> v_total_stock");
    expect(sql).toContain("'sum_mismatch'");
  });

  it('révoque PUBLIC et autorise uniquement service_role', () => {
    for (const fn of [
      'telegram_staff_redistribute_product(text, text, integer, integer, integer)',
      'telegram_staff_redistribute_bulk(text, text, text, integer, integer, integer)',
      'telegram_staff_redistribute_preview(text, text, text, integer, integer, integer)'
    ]) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${fn} FROM PUBLIC, anon, authenticated;`);
      expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.${fn} TO service_role;`);
    }
  });
});

describe('Stock Redistribution : intégration Bot', () => {
  const bot = read('supabase/functions/telegram-bot-entry/index.ts');

  it('propose le bouton de répartition de modèle uniquement pour la Direction', () => {
    expect(bot).toContain('staff.rank >= RANK_DIRECTION && product.stock > 0 && cbFits(stockSplitScreenCb(product.id, backCat))');
    expect(bot).toContain('action === "sps"');
    expect(bot).toContain('action === "spp"');
    expect(bot).toContain('action === "spm"');
  });

  it('propose le bouton de ventilation en masse dans les catégories pour la Direction', () => {
    expect(bot).toContain('if (staff.rank >= RANK_DIRECTION) {');
    expect(bot).toContain('rows.push([{ text: "🔀 Ventilation en masse (Réseau)", callback_data: stockBulkMenuCb() }]);');
    expect(bot).toContain('action === "sbm"');
    expect(bot).toContain('action === "sbp"');
    expect(bot).toContain('action === "sbe"');
  });

  it('appelle les RPC autorisées et gère le ForceReply #SPLIT:', () => {
    expect(bot).toContain('supabase.rpc("telegram_staff_redistribute_product"');
    expect(bot).toContain('supabase.rpc("telegram_staff_redistribute_bulk"');
    expect(bot).toContain('supabase.rpc("telegram_staff_redistribute_preview"');
    expect(bot).toContain('parseSplitTag(');
  });
});

