import { describe, expect, it } from 'vitest';
import {
  HR_PERIODS, HR_TARGET_PRESETS_K, type HrMember, type HrPeriodKey,
  memberLine, objectivePrompt, parseObjectiveTag, parseTargetAmount
} from '../supabase/functions/_shared/telegramHr';

const uuid = '0f8b6a1e-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
const fits = (data: string) => new TextEncoder().encode(data).length <= 64;

describe('parseTargetAmount', () => {
  it.each(['1500000', '1 500 000', '1.500.000', '1500k', '1,5m', '1 500 000 FCFA', '1.5M'])('%s → 1 500 000', input => {
    expect(parseTargetAmount(input)).toBe(1_500_000);
  });

  it('accepts 0 (remove the target)', () => {
    expect(parseTargetAmount('0')).toBe(0);
  });

  it.each(['-5', 'abc', '', '2000000000', '1,2345k', '1.5.0m', '15.00'])('%s → null', input => {
    expect(parseTargetAmount(input)).toBeNull();
  });
});

describe('objective prompt tag', () => {
  it('round-trips period and staff id', () => {
    expect(parseObjectiveTag(objectivePrompt('w', uuid, 'Jo'))).toEqual({ period: 'w', staffId: uuid });
  });

  it('rejects unknown periods and malformed ids', () => {
    expect(parseObjectiveTag('#OBJ:x:' + uuid)).toBeNull();
    expect(parseObjectiveTag('#OBJ:w:not-a-uuid')).toBeNull();
    expect(parseObjectiveTag('Bonjour')).toBeNull();
  });
});

describe('callback_data stays under the 64-byte Telegram limit', () => {
  it('for every preset, period and HR route', () => {
    for (const p of Object.keys(HR_PERIODS) as HrPeriodKey[]) {
      for (const k of [0, ...HR_TARGET_PRESETS_K[p]]) expect(fits(`nav:rh_ov:${p}:${k}:${uuid}`)).toBe(true);
      expect(fits(`nav:rh_op:${p}:${uuid}`)).toBe(true);
      expect(fits(`nav:rh_oc:${p}:${uuid}`)).toBe(true);
    }
    for (const data of [`nav:rh_x:0:${uuid}`, `nav:rh_xc:${uuid}`, `nav:rh_m:${uuid}`, `nav:rh_o:${uuid}`]) {
      expect(fits(data)).toBe(true);
    }
  });
});

describe('memberLine', () => {
  const member: HrMember = {
    id: uuid, name: '<b>x</b>', role: 'vendeur', phone: '690000000', store_code: 'B1', store_name: 'B1',
    has_account: true, active: false, telegram_linked: false, targets: {}
  };

  it('escapes the name and shows status', () => {
    const line = memberLine(member);
    expect(line).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(line).toContain('Vendeur');
    expect(line).toContain('⛔ désactivé');
    expect(line).toContain('Telegram ❌');
  });

  it('flags members without account', () => {
    expect(memberLine({ ...member, has_account: false })).toContain('👻 sans compte');
  });
});
