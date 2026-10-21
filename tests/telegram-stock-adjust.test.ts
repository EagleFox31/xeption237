import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  parseCorrectionReply, parseReceiveReply, parseStockTag, stockCorrectCb, stockReceiveCb, stockTag
} from '../supabase/functions/_shared/telegramStock';
import { DEFAULT_STAFF_EVENT_TYPES, eventIcon } from '../supabase/functions/_shared/staffNotify';

const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const sql = read('supabase/migrations/20261021_004_telegram_staff_stock_adjust.sql');
const bot = read('supabase/functions/telegram-bot-entry/index.ts');

describe('Stock Telegram : helpers', () => {
  it('parse la quantité reçue (1..500)', () => {
    expect(parseReceiveReply('5')).toBe(5);
    expect(parseReceiveReply(' +12 ')).toBe(12);
    expect(parseReceiveReply('0')).toBeNull();
    expect(parseReceiveReply('501')).toBeNull();
    expect(parseReceiveReply('-3')).toBeNull();
    expect(parseReceiveReply('cinq')).toBeNull();
  });

  it('parse la correction : chiffre compté + motif obligatoire', () => {
    expect(parseCorrectionReply('8 casse')).toEqual({ counted: 8, reason: 'casse' });
    expect(parseCorrectionReply('0, écran   fissuré')).toEqual({ counted: 0, reason: 'écran fissuré' });
    expect(parseCorrectionReply('8')).toBeNull();
    expect(parseCorrectionReply('8 ok')).toBeNull();
    expect(parseCorrectionReply('10001 inventaire')).toBeNull();
    expect(parseCorrectionReply('8 ' + 'x'.repeat(81))).toBeNull();
  });

  it('le tag ForceReply fait l’aller-retour et seul un tag final est reconnu', () => {
    const text = 'Correction : iPhone\nStock actuel : 3\n' + stockTag('C', 'iphone-15-pro', 'YDE');
    expect(parseStockTag(text)).toEqual({ op: 'C', productId: 'iphone-15-pro', storeCode: 'YDE' });
    expect(parseStockTag('#STK:X:p:YDE')).toBeNull();
    expect(parseStockTag('#STK:R:p:YDE suite')).toBeNull();
  });

  it('les callbacks tiennent dans 64 octets pour un identifiant usuel', () => {
    const pid = 'samsung-galaxy-s24-ultra-512';
    expect(new TextEncoder().encode(stockReceiveCb(pid, 'DLA')).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(stockCorrectCb(pid, 'DLA')).length).toBeLessThanOrEqual(64);
  });
});

describe('Stock Telegram : migration', () => {
  it('ré-identifie l’acteur et revérifie rang et boutique', () => {
    expect(sql).toContain("RAISE EXCEPTION 'Responsable only' USING ERRCODE = '42501'");
    expect(sql).toContain("RAISE EXCEPTION 'Store outside scope' USING ERRCODE = '42501'");
    expect(sql.match(/FROM public\._telegram_staff_actor\(p_telegram_user_id\)/g)).toHaveLength(2);
    expect(sql.match(/public\._telegram_stock_store\(v_actor\.o_rank, v_actor\.o_store_id, p_store_code\)/g)).toHaveLength(2);
  });

  it('est idempotente par clé de requête', () => {
    expect(sql.match(/pg_advisory_xact_lock\(hashtext\('telegram_stock:' \|\| p_request_key\)\)/g)).toHaveLength(2);
    expect(sql.match(/'reason', 'already_done'/g)).toHaveLength(2);
    expect(sql).toContain("ON CONFLICT (dedup_key) DO NOTHING");
  });

  it('passe par _store_stock_delta et refuse de descendre sous le réservé', () => {
    expect(sql.match(/public\._store_stock_delta\(/g)).toHaveLength(2);
    expect(sql).toContain("'reason', 'below_reserved'");
    expect(sql).toContain("'stock_correction'");
  });

  it('seul le bot (service_role) exécute les RPC, le helper est fermé', () => {
    expect(sql).toContain('REVOKE ALL ON FUNCTION public._telegram_stock_store(int, uuid, text) FROM PUBLIC, anon, authenticated;');
    for (const fn of [
      'telegram_staff_stock_receive(text, text, text, integer, text)',
      'telegram_staff_stock_correct(text, text, text, integer, text, text)'
    ]) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${fn}\n  FROM PUBLIC, anon, authenticated;`);
      expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.${fn} TO service_role;`);
    }
  });
});

describe('Stock Telegram : bot et notifications', () => {
  it('affiche les boutons pour les responsables+ et route sr / sk', () => {
    expect(bot).toContain('staff.rank >= RANK_RESPONSABLE && (staff.rank >= RANK_DIRECTION || staff.store?.id === store.id)');
    expect(bot).toContain('action === "sr" || action === "sk"');
    expect(bot).toContain('parseStockTag(');
    expect(bot).toContain('const requestKey = `${chatId}:${String(reply?.message_id ?? "")}`;');
    expect(bot).toContain('supabase.rpc("telegram_staff_stock_receive"');
    expect(bot).toContain('supabase.rpc("telegram_staff_stock_correct"');
  });

  it('relaie stock_correction vers le groupe staff', () => {
    expect(DEFAULT_STAFF_EVENT_TYPES).toContain('stock_correction');
    expect(eventIcon('stock_correction')).toBe('✏️');
  });
});
