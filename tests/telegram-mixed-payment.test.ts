import { describe, expect, it } from 'vitest';
import {
  payLabel,
  salePrompt,
  saleRecap,
  saleMixedCashPrompt,
  parseMixedCashTag,
  saleMixedChoiceCb,
  parseSaleMixedChoiceCb,
  formatSplitDetail,
  type PaymentSplitItem
} from '../supabase/functions/_shared/telegramSale';
import { formatSaleReceiptText, type SaleReceiptData } from '../supabase/functions/_shared/saleReceipt';
import { screenCashReportHub, type StaffMember, type TelegramCashDeps } from '../supabase/functions/_shared/telegramCashScreens';
import { getPaymentMethodLabel } from '../utils/paymentMethods';

const sampleSplit: PaymentSplitItem[] = [
  { channel: 'cash', amount: 30000 },
  { channel: 'om', amount: 20000 }
];

describe('Lot 3 — Paiement mixte au comptoir (telegramSale.ts)', () => {
  it('formats split details cleanly', () => {
    expect(formatSplitDetail(sampleSplit)).toBe('Espèces 30 000 FCFA + OM 20 000 FCFA');
  });

  it('formats payLabel for MIXED with and without split', () => {
    expect(payLabel('MIXED', sampleSplit)).toBe('🔀 Mixte (Espèces 30 000 FCFA + OM 20 000 FCFA)');
    expect(payLabel('MIXED')).toBe('🔀 Mixte (Espèces + Mobile)');
    expect(payLabel('CASH')).toBe('💵 Espèces');
    expect(payLabel('OM')).toBe('🟠 Orange Money');
    expect(payLabel('MOMO')).toBe('🟡 MTN MoMo');
  });

  it('generates and parses mixed cash prompt tags (#SMX:)', () => {
    const productId = '11111111-2222-3333-4444-555555555555';
    const prompt = saleMixedCashPrompt(productId, 'iPhone 13 128 Go', 50000);
    expect(prompt).toContain('Paiement mixte');
    expect(prompt).toContain('50 000 FCFA');
    expect(prompt).toContain(`#SMX:${productId}`);
    expect(parseMixedCashTag(prompt)).toEqual({ productId });
    expect(parseMixedCashTag('Sans tag')).toBeNull();
  });

  it('builds and parses callback for mobile choice in mixed sale', () => {
    const productId = '11111111-2222-3333-4444-555555555555';
    const cbO = saleMixedChoiceCb('O', productId, 30000);
    expect(cbO).toBe(`nav:spx:O:${productId}:30000`);
    expect(new TextEncoder().encode(cbO).length).toBeLessThanOrEqual(64);

    const parsedO = parseSaleMixedChoiceCb(cbO);
    expect(parsedO).toEqual({ mobileCode: 'O', productId, cashAmount: 30000 });

    const cbM = saleMixedChoiceCb('M', productId, 15000);
    const parsedM = parseSaleMixedChoiceCb(cbM);
    expect(parsedM).toEqual({ mobileCode: 'M', productId, cashAmount: 15000 });

    expect(parseSaleMixedChoiceCb('nav:invalid')).toBeNull();
    expect(parseSaleMixedChoiceCb('nav:spx:X:prod:100')).toBeNull();
  });

  it('formats salePrompt and saleRecap with mixed payment detail', () => {
    const draftId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const prompt = salePrompt(draftId, 'Galaxy S23', 50000, 'MIXED', sampleSplit);
    expect(prompt).toContain('🔀 Mixte (Espèces 30 000 FCFA + OM 20 000 FCFA)');
    expect(prompt).toContain(`#VTE:${draftId}`);

    const recap = saleRecap({
      lines: [{ name: 'Galaxy S23', quantity: 1, unit_price: 50000 }],
      payment_method: 'MIXED',
      payment_split: sampleSplit,
      customer_name: 'Paul',
      customer_phone: '699000001'
    });
    expect(recap).toContain('Paiement : 🔀 Mixte (Espèces 30 000 FCFA + OM 20 000 FCFA)');
    expect(recap).toContain('Total à encaisser : <b>50 000 FCFA</b>');
  });

  it('formats WhatsApp customer receipt with mixed payment ventilation', () => {
    const receiptData: SaleReceiptData = {
      order_id: 'POS-TG-202610-001',
      lines: [{ name: 'iPhone 13 128 Go', quantity: 1, unit_price: 50000 }],
      total: 50000,
      payment_method: 'MIXED',
      payment_split: sampleSplit,
      store_name: 'Boutique Bastos',
      customer_name: 'Paul',
      customer_phone: '699000001'
    };
    const receiptText = formatSaleReceiptText(receiptData);
    expect(receiptText).toContain('Moyen de paiement : Mixte (Espèces 30 000 FCFA + OM 20 000 FCFA)');
    expect(receiptText).toContain('Total payé : 50 000 FCFA');
  });

  it('ERP payment methods label helper recognizes MIXED without adding it to web POS options', () => {
    expect(getPaymentMethodLabel('MIXED')).toBe('Paiement mixte');
    expect(getPaymentMethodLabel('CASH')).toBe('Espèces');
    expect(getPaymentMethodLabel('OM')).toBe('Orange Money');
    expect(getPaymentMethodLabel('MOMO')).toBe('MTN MoMo');
  });
});

describe('Lot 3 — Corrections rapport de caisse & ventilation réelle en caisse', () => {
  const staff: StaffMember = {
    telegram_user_id: 'tg_100',
    auth_user_id: 'auth_100',
    id: 'staff_100',
    name: 'Amina Vendeuse',
    role: 'vendeur',
    rank: 1,
    store: { id: 'store_bastos', name: 'Bastos', code: 'bastos' },
    scope_store_code: null
  };

  it('Bug fix 1 & 2 : lit les clés réelles SQL (product_name, seller_name) et ne compte en caisse que la part espèces', async () => {
    let capturedDraft: any = null;

    const mockSupabase = {
      rpc: async (fn: string) => {
        if (fn === 'telegram_staff_cash_report_init') {
          return {
            data: {
              success: true,
              store_id: 'store_bastos',
              store_name: 'Bastos',
              report_date: '2026-10-28',
              suggested_opening_cash: 100000,
              operators: [{ name: 'Amina Vendeuse' }],
              today_pos_sales: [
                // Vente 1 : 100% Cash
                {
                  order_id: 'CMD-1',
                  product_name: 'Écouteurs Pro',
                  amount: 15000,
                  cash_amount: 15000,
                  mobile_amount: 0,
                  seller_name: 'Amina Vendeuse',
                  payment_method: 'CASH'
                },
                // Vente 2 : 100% OM (ne doit PAS aller dans la caisse physique)
                {
                  order_id: 'CMD-2',
                  product_name: 'Chargeur Rapide',
                  amount: 20000,
                  cash_amount: 0,
                  mobile_amount: 20000,
                  seller_name: 'Amina Vendeuse',
                  payment_method: 'OM'
                },
                // Vente 3 : Mixte (30 000 Cash + 10 000 MoMo) -> seuls 30 000 vont dans la caisse physique
                {
                  order_id: 'CMD-3',
                  product_name: 'Coque Blindée',
                  amount: 40000,
                  cash_amount: 30000,
                  mobile_amount: 10000,
                  seller_name: 'Boris Vendeur',
                  payment_method: 'MIXED'
                }
              ],
              active_debts: [],
              staff_progress: [],
              draft: null
            },
            error: null
          };
        }
        return { data: null, error: null };
      },
      from: (table: string) => ({
        upsert: (payload: any) => ({
          select: () => ({
            single: async () => {
              capturedDraft = payload;
              return { data: { id: 'draft_1', ...payload }, error: null };
            }
          })
        })
      })
    };

    const deps: TelegramCashDeps = {
      supabase: mockSupabase,
      listStores: async () => [staff.store!],
      homeRow: [{ text: '🏠 Accueil', callback_data: 'nav:home' }]
    };

    const screen = await screenCashReportHub(staff, 'bastos', deps);

    expect(screen.text).toContain('Bastos');
    expect(capturedDraft).not.toBeNull();

    // Vérification des entrées en caisse physique :
    // Vente 1 : +15 000 FCFA (Écouteurs Pro, Amina Vendeuse)
    // Vente 2 (OM) : EXCLUE du tiroir-caisse
    // Vente 3 (Mixte) : +30 000 FCFA (Coque Blindée (espèces), Boris Vendeur)
    const inflows = capturedDraft.inflow_items;
    expect(inflows).toHaveLength(2);

    expect(inflows[0]).toEqual({
      label: 'Écouteurs Pro',
      amount: 15000,
      seller_name: 'Amina Vendeuse'
    });

    expect(inflows[1]).toEqual({
      label: 'Coque Blindée (espèces)',
      amount: 30000,
      seller_name: 'Boris Vendeur'
    });

    // Total entrées en caisse = 15 000 + 30 000 = 45 000 FCFA (et non 75 000 FCFA !)
    const totalCashInflow = inflows.reduce((sum: number, it: any) => sum + it.amount, 0);
    expect(totalCashInflow).toBe(45000);

    // Les vendeurs de TOUTES les ventes (y compris Boris et les ventes OM) sont bien répertoriés
    expect(capturedDraft.operators).toContain('Amina Vendeuse');
    expect(capturedDraft.operators).toContain('Boris Vendeur');
  });
});
