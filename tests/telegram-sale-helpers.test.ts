import { describe, expect, it } from 'vitest';
import {
  PAY_CODES, isPayCode, parseCustomerReply, parseSaleTag, saleCancelCb, saleConfirmCb,
  salePayCb, salePrompt, saleRecap, saleStartCb
} from '../supabase/functions/_shared/telegramSale';
import { POS_PAYMENT_OPTIONS } from '../utils/paymentMethods';

const uuid = '0f8b6a1e-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
const fits = (data: string) => new TextEncoder().encode(data).length <= 64;

describe('parseCustomerReply', () => {
  it.each([
    ['Paul 699123456', 'Paul'],
    ['Paul Biya, +237 6 99 12 34 56', 'Paul Biya'],
    ['Awa : 00237699123456', 'Awa'],
    ['Jean-Marc 699.12.34.56', 'Jean-Marc']
  ])('%s', (input, name) => {
    expect(parseCustomerReply(input)).toEqual({ name, phone: '699123456' });
  });

  it.each(['699123456', 'Paul', 'Paul 222123456', 'Paul 69912345', 'Paul 6991234567', 'P4ul 699123456', 'x'.repeat(61) + ' 699123456'])(
    '%s → null', input => {
      expect(parseCustomerReply(input)).toBeNull();
    }
  );
});

describe('sale prompt tag', () => {
  it('round-trips the draft id', () => {
    expect(parseSaleTag(salePrompt(uuid, 'iPhone 13', 310000, 'OM'))).toEqual({ draftId: uuid });
  });

  it('ignores the objective tag and malformed ids', () => {
    expect(parseSaleTag('#OBJ:w:' + uuid)).toBeNull();
    expect(parseSaleTag('#VTE:not-a-uuid')).toBeNull();
  });
});

describe('payment codes', () => {
  it('map to payment methods known by the ERP', () => {
    const known = POS_PAYMENT_OPTIONS.map(o => o.id);
    for (const method of Object.values(PAY_CODES)) expect(known).toContain(method);
    expect(isPayCode('C')).toBe(true);
    expect(isPayCode('toString')).toBe(false);
  });
});

describe('callback_data', () => {
  it('fits Telegram 64 bytes with 36-char ids', () => {
    for (const cb of [saleStartCb(uuid), salePayCb('M', uuid), saleConfirmCb(uuid), saleCancelCb(uuid)]) {
      expect(fits(cb)).toBe(true);
    }
  });
});

describe('saleRecap', () => {
  it('escapes customer input and shows the total', () => {
    const text = saleRecap({
      lines: [{ name: 'iPhone <13>', quantity: 1, unit_price: 310000 }],
      payment_method: 'CASH', customer_name: '<b>Paul</b>', customer_phone: '699123456'
    });
    expect(text).toContain('&lt;b&gt;Paul&lt;/b&gt;');
    expect(text).toContain('iPhone &lt;13&gt;');
    expect(text.replace(/\s/g, ' ')).toMatch(/310 000 FCFA/);
    expect(text).toContain('Espèces');
  });
});
