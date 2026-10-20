import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  isGeneratedStaffEmail, normalizeStaffPhone, staffLoginEmailFromPhone,
} from '../utils/staffLoginEmail';

describe('staff login identifier from phone', () => {
  it.each([
    ['+237 6 41 89 10 31', '641891031'],
    ['237671679131', '671679131'],
    ['6 91 34 12 24', '691341224'],
  ])('normalizes %s', (raw, expected) => {
    expect(normalizeStaffPhone(raw)).toBe(expected);
  });

  it('rejects partial or foreign numbers', () => {
    expect(normalizeStaffPhone('89103')).toBeNull();
    expect(normalizeStaffPhone('+33 6 12 34 56 78')).toBeNull();
    expect(staffLoginEmailFromPhone('')).toBeNull();
  });

  it('derives a stable technical email, recognised as generated', () => {
    const email = staffLoginEmailFromPhone('+237 6 94 99 59 70');
    expect(email).toBe('237694995970@staff.xeptionetwork.shop');
    expect(isGeneratedStaffEmail(email)).toBe(true);
    expect(isGeneratedStaffEmail('boss@gmail.com')).toBe(false);
  });
});

describe('migration 008 contract', () => {
  const sql = readFileSync('supabase/migrations/20261020_008_staff_stores_phone_login_guard.sql', 'utf8');
  it('only a super_admin can manage a super_admin row', () => {
    expect(sql).toContain('BEFORE INSERT OR UPDATE OR DELETE ON public.staff');
    expect(sql).toMatch(/lower\(s\.role\) = 'super_admin'/);
  });
  it('phone login needs the full 9-digit number (no fragment lookup)', () => {
    expect(sql).toContain("public._staff_phone_digits(p_identifier) ~ '^[0-9]{9}$'");
    expect(sql).not.toMatch(/ILIKE|LIKE '%/);
  });
  it('stores are inserted idempotently', () => {
    expect(sql).toContain('ON CONFLICT (code) DO NOTHING');
  });
});
