import { describe, expect, it } from 'vitest';
import {
  formatSaleReceiptText,
  buildWhatsAppReceiptLink,
  buildSaleReceiptButton,
  normalizeCameroonPhone,
  formatReceiptDate,
  formatReceiptMoney,
  MAX_RECEIPT_TEXT_LENGTH,
  type SaleReceiptData
} from '../supabase/functions/_shared/saleReceipt';

describe('Lot 2 — Reçu client WhatsApp après vente comptoir (saleReceipt.ts)', () => {
  describe('normalizeCameroonPhone', () => {
    it.each([
      ['699000001', '237699000001'],
      ['+237 6 99 00 00 01', '237699000001'],
      ['237699000001', '237699000001'],
      ['00237699000001', '237699000001'],
      [' 6.99.00.00.01 ', '237699000001'],
      ['222000001', '237222000001']
    ])('normalise %s vers %s', (input, expected) => {
      expect(normalizeCameroonPhone(input)).toBe(expected);
    });

    it.each([
      undefined,
      null,
      '',
      '   ',
      '69900000', // 8 chiffres
      '6990000000', // 10 chiffres
      '123456789', // ne commence ni par 6 ni par 2
      'non-chiffres'
    ])('rejette %s en renvoyant null', (input) => {
      expect(normalizeCameroonPhone(input)).toBeNull();
    });
  });

  describe('buildWhatsAppReceiptLink', () => {
    it('génère un lien wa.me correct avec le numéro normalisé et le texte encodé', () => {
      const link = buildWhatsAppReceiptLink('699000001', 'Reçu de vente — 150 000 FCFA');
      expect(link).toBe('https://wa.me/237699000001?text=Re%C3%A7u%20de%20vente%20%E2%80%94%20150%20000%20FCFA');
    });

    it('renvoie null si le numéro est invalide ou absent (aucun bouton)', () => {
      expect(buildWhatsAppReceiptLink(null, 'Texte')).toBeNull();
      expect(buildWhatsAppReceiptLink('invalide', 'Texte')).toBeNull();
      expect(buildWhatsAppReceiptLink('', 'Texte')).toBeNull();
      expect(buildWhatsAppReceiptLink('12345', 'Texte')).toBeNull();
    });

    it('renvoie null si le texte est vide', () => {
      expect(buildWhatsAppReceiptLink('699000001', '')).toBeNull();
      expect(buildWhatsAppReceiptLink('699000001', '   ')).toBeNull();
    });
  });

  describe('formatReceiptDate', () => {
    it('formate la date au format local DD/MM/YYYY à HH"h"MI', () => {
      // 2026-10-28T00:15:00Z -> 01h15 à Douala (UTC+1)
      const d = new Date('2026-10-28T00:15:00Z');
      const formatted = formatReceiptDate(d);
      expect(formatted).toMatch(/28\/10\/2026 à 01h15/);
    });

    it('renvoie une chaîne vide sur date invalide', () => {
      expect(formatReceiptDate('date_invalide')).toBe('');
    });
  });

  describe('formatReceiptMoney', () => {
    it('formate correctement les montants avec séparateur FCFA', () => {
      expect(formatReceiptMoney(310000)).toMatch(/310 000 FCFA/);
      expect(formatReceiptMoney(0)).toMatch(/0 FCFA/);
    });
  });

  describe('formatSaleReceiptText', () => {
    const sampleSale: SaleReceiptData = {
      order_id: 'CMD-202610-001',
      lines: [
        { name: 'iPhone 13 128 Go', quantity: 1, unit_price: 310000 },
        { name: 'Adaptateur 20W', quantity: 2, unit_price: 15000 }
      ],
      total: 340000,
      payment_method: 'CASH',
      store_name: 'Boutique Bastos',
      customer_name: 'Paul',
      customer_phone: '699000001',
      created_at: new Date('2026-10-28T10:00:00Z')
    };

    it('produit un reçu complet, lisible et structuré en français pour WhatsApp', () => {
      const text = formatSaleReceiptText(sampleSale);

      expect(text).toContain('REÇU DE VENTE — XEPTION');
      expect(text).toContain('CMD-202610-001');
      expect(text).toContain('Boutique Bastos');
      expect(text).toContain('Client : Paul');
      expect(text).toContain('iPhone 13 128 Go — 310 000 FCFA');
      expect(text).toContain('Adaptateur 20W ×2 — 30 000 FCFA');
      expect(text).toContain('Total payé : 340 000 FCFA');
      expect(text).toContain('Espèces');
      expect(text).toContain('Appareils garantis');
    });

    it('inclut la ligne de remise lorsque discount_amount est supérieur à zéro', () => {
      const withDiscount: SaleReceiptData = {
        ...sampleSale,
        discount_amount: 10000,
        total: 330000
      };
      const text = formatSaleReceiptText(withDiscount);
      expect(text).toContain('Remise : −10 000 FCFA');
      expect(text).toContain('Total payé : 330 000 FCFA');
    });

    it('omet la ligne client si aucun nom n est fourni', () => {
      const anonSale: SaleReceiptData = {
        ...sampleSale,
        customer_name: undefined
      };
      const text = formatSaleReceiptText(anonSale);
      expect(text).not.toContain('Client :');
      expect(text).toContain('CMD-202610-001');
    });

    it('tronque proprement la liste d articles si le reçu dépasse la limite de taille', () => {
      const manyLines = Array.from({ length: 60 }, (_, i) => ({
        name: `Accessoire ultra longue référence numéro ${i + 1} édition spéciale`,
        quantity: 1,
        unit_price: 5000
      }));

      const bigSale: SaleReceiptData = {
        ...sampleSale,
        lines: manyLines,
        total: 300000
      };

      const text = formatSaleReceiptText(bigSale);
      expect(text.length).toBeLessThanOrEqual(MAX_RECEIPT_TEXT_LENGTH);
      expect(text).toContain('• ... [autres articles tronqués]');
      // Vérifie que les informations critiques restent présentes
      expect(text).toContain('CMD-202610-001');
      expect(text).toContain('Total payé : 300 000 FCFA');
      expect(text).toContain('Appareils garantis');
    });
  });

  describe('buildSaleReceiptButton', () => {
    const sampleSale: SaleReceiptData = {
      order_id: 'CMD-202610-002',
      lines: [{ name: 'Galaxy S23', quantity: 1, unit_price: 250000 }],
      total: 250000,
      payment_method: 'OM',
      store_name: 'Boutique Akwa',
      customer_name: 'Awa',
      customer_phone: '699000002',
      created_at: new Date('2026-10-28T11:00:00Z')
    };

    it('génère un bouton en ligne avec texte et URL wa.me valide', () => {
      const btn = buildSaleReceiptButton('699000002', sampleSale);
      expect(btn).not.toBeNull();
      expect(btn?.text).toBe('📲 Envoyer le reçu au client');
      expect(btn?.url).toMatch(/^https:\/\/wa\.me\/237699000002\?text=/);
    });

    it('renvoie null si le numéro est absent ou invalide', () => {
      expect(buildSaleReceiptButton(null, sampleSale)).toBeNull();
      expect(buildSaleReceiptButton(undefined, sampleSale)).toBeNull();
      expect(buildSaleReceiptButton('invalide', sampleSale)).toBeNull();
      expect(buildSaleReceiptButton('', sampleSale)).toBeNull();
    });
  });
});

