import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  parsePcPubPriceTag,
  parsePcTag,
  parseProductPrice,
  parseProductStock,
  prodAiEnrichCb,
  prodChangePriceCb,
  prodCreateBrandCb,
  prodCreateCancelCb,
  prodCreateCatCb,
  prodCreateCondCb,
  prodCreateConfirmCb,
  prodCreateDupCb,
  prodCreateRamCb,
  prodCreateSkipPhotosCb,
  prodCreateStartCb,
  prodCreateStorageCb,
  prodCreateStoreCb,
  prodPendingListCb,
  prodPublishCb,
  prodRejectCb,
  prodRejectConfirmCb,
  prodReviewCb,
  PC_TAG_NAME,
  PC_TAG_PRICE,
  PC_TAG_STOCK
} from '../supabase/functions/_shared/telegramProductCreate';

const read = (path: string) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const sql = read('supabase/migrations/20261021_007_product_visibility_and_telegram_create.sql');

describe('Product Creation Telegram : Helpers', () => {
  it('parse les prix FCFA correctement', () => {
    expect(parseProductPrice('450 000')).toBe(450000);
    expect(parseProductPrice('450000')).toBe(450000);
    expect(parseProductPrice('450k')).toBe(450000);
    expect(parseProductPrice('150K')).toBe(150000);
    expect(parseProductPrice('100')).toBeNull(); // Trop bas (< 500)
    expect(parseProductPrice('gratuit')).toBeNull();
  });

  it('parse le stock initial (1..500)', () => {
    expect(parseProductStock('1')).toBe(1);
    expect(parseProductStock('10')).toBe(10);
    expect(parseProductStock('500')).toBe(500);
    expect(parseProductStock('0')).toBeNull();
    expect(parseProductStock('501')).toBeNull();
    expect(parseProductStock('-5')).toBeNull();
  });

  it('détecte les tags ForceReply', () => {
    expect(parsePcTag(`Entrez le nom\n${PC_TAG_NAME}`)).toBe('NAME');
    expect(parsePcTag(`Entrez le prix\n${PC_TAG_PRICE}`)).toBe('PRICE');
    expect(parsePcTag(`Entrez le stock\n${PC_TAG_STOCK}`)).toBe('STOCK');
    expect(parsePcTag('Message ordinaire')).toBeNull();
  });

  it('toutes les callbacks font moins de 64 octets', () => {
    const uuid = '2dd28c3e-7799-4bbd-93ee-f2de886db036';
    expect(new TextEncoder().encode(prodCreateStartCb('MFOUNDI')).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodCreateStoreCb('MFOUNDI')).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodCreateDupCb('yes')).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodCreateCatCb('computer')).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodCreateBrandCb(uuid)).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodCreateStorageCb('256 Go')).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodCreateRamCb('12 Go')).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodCreateCondCb('refurbished')).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodCreateSkipPhotosCb()).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodCreateConfirmCb()).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodCreateCancelCb()).length).toBeLessThanOrEqual(64);
    // Callbacks Direction
    expect(new TextEncoder().encode(prodPendingListCb()).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodReviewCb(uuid)).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodAiEnrichCb(uuid)).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodChangePriceCb(uuid)).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodPublishCb(uuid)).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodRejectCb(uuid)).length).toBeLessThanOrEqual(64);
    expect(new TextEncoder().encode(prodRejectConfirmCb(uuid)).length).toBeLessThanOrEqual(64);
  });

  it('extrait le productId depuis le tag ForceReply de prix public', () => {
    const uuid = '2dd28c3e-7799-4bbd-93ee-f2de886db036';
    expect(parsePcPubPriceTag(`Entrez le nouveau prix\n#PC:PUB_PRICE:${uuid}`)).toBe(uuid);
    expect(parsePcPubPriceTag('Pas de tag')).toBeNull();
  });
});

describe('Product Creation Telegram : Migration SQL', () => {
  it('ajoute is_published et backfill à true les produits existants', () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false");
    expect(sql).toContain("UPDATE public.products\nSET is_published = true");
  });

  it('ferme la lecture publique aux produits non publiés via RLS', () => {
    expect(sql).toContain("DROP POLICY IF EXISTS products_public_read ON public.products");
    expect(sql).toContain("USING (is_published = true OR public.is_staff_member())");
  });

  it('crée un produit masqué (is_published = false) lors du commit', () => {
    expect(sql).toContain("false, -- STRICTEMENT MASQUÉ DU SITE PUBLIC TANT QUE NON VALIDÉ");
  });

  it('attribue le stock via _store_stock_delta', () => {
    expect(sql).toContain("PERFORM public._store_stock_delta(");
  });

  it('seul service_role peut exécuter les RPCs du brouillon', () => {
    for (const fn of [
      'telegram_staff_product_draft_upsert(text, text, jsonb)',
      'telegram_staff_product_draft_cancel(text)',
      'telegram_staff_product_commit(text, text)'
    ]) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${fn} FROM PUBLIC, anon, authenticated;`);
      expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.${fn} TO service_role;`);
    }
  });

  it('migration 008 : validation, publication et rejet réservés à la Direction (rank >= 2)', () => {
    const sql008 = read('supabase/migrations/20261021_008_telegram_product_direction_publish.sql');
    expect(sql008).toContain("CREATE OR REPLACE FUNCTION public.telegram_staff_pending_products_count");
    expect(sql008).toContain("CREATE OR REPLACE FUNCTION public.telegram_staff_product_publish");
    expect(sql008).toContain("CREATE OR REPLACE FUNCTION public.telegram_staff_product_reject");
    expect(sql008).toContain("IF v_actor.o_rank < 2 THEN");
    expect(sql008).toContain("is_published = true");
  });
});

describe('Product Creation Telegram : Bot Integration', () => {
  const bot = read('supabase/functions/telegram-bot-entry/index.ts');

  it('propose le bouton de création pour les responsables et plus', () => {
    expect(bot).toContain('if (staff.rank >= RANK_RESPONSABLE) {');
    expect(bot).toContain('rows.push([{ text: "➕ Ajouter un produit (Magasin)", callback_data: prodCreateStartCb(store?.code ?? "") }]);');
  });

  it('propose le bouton des produits en attente pour la direction', () => {
    expect(bot).toContain('telegram_staff_pending_products_count');
    expect(bot).toContain('prodPendingListCb()');
  });

  it('gère les routes de callback du brouillon et de publication direction', () => {
    expect(bot).toContain('action === "pcs"');
    expect(bot).toContain('action === "pcst"');
    expect(bot).toContain('action === "pcdu"');
    expect(bot).toContain('action === "pcc"');
    expect(bot).toContain('action === "pcb"');
    expect(bot).toContain('action === "pcso"');
    expect(bot).toContain('action === "pcrm"');
    expect(bot).toContain('action === "pccn"');
    expect(bot).toContain('action === "pc_commit"');
    expect(bot).toContain('action === "pc_cancel"');
    // Direction routes
    expect(bot).toContain('action === "pcr_list"');
    expect(bot).toContain('action === "pcr_v"');
    expect(bot).toContain('action === "pcr_ai"');
    expect(bot).toContain('action === "pcr_pr"');
    expect(bot).toContain('action === "pcr_pub"');
    expect(bot).toContain('action === "pcr_del"');
    expect(bot).toContain('action === "pcr_del_cf"');
  });

  it('intègre DeepSeek et le productEnricher persona pour enrichir la fiche', () => {
    expect(bot).toContain('buildProductEnricherPrompt');
    expect(bot).toContain('deepseekChatJson');
    expect(bot).toContain('parseProductEnricherOutput');
  });

  it('traite les tags ForceReply et les photos', () => {
    expect(bot).toContain('parsePcTag(String(reply?.text ?? ""))');
    expect(bot).toContain('parsePcPubPriceTag(String(reply?.text ?? ""))');
    expect(bot).toContain('handleProdCreateNameReply(');
    expect(bot).toContain('handleProdCreatePriceReply(');
    expect(bot).toContain('handleProdCreateStockReply(');
    expect(bot).toContain('handleProdCreatePhotoMessage(');
  });

  it('utilise les RPC sécurisées', () => {
    expect(bot).toContain('supabase.rpc("telegram_staff_product_draft_upsert"');
    expect(bot).toContain('supabase.rpc("telegram_staff_product_commit"');
    expect(bot).toContain('supabase.rpc("telegram_staff_product_draft_cancel"');
    expect(bot).toContain('supabase.rpc("telegram_staff_product_publish"');
    expect(bot).toContain('supabase.rpc("telegram_staff_product_reject"');
  });
});


