import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { normalizeVoucherLookupRef as tsHelper } from "../utils/trocVoucherRef.ts";
import { normalizeVoucherLookupRef as sharedHelper } from "../supabase/functions/_shared/trocVoucher.ts";

// Simulation fidèle de la fonction PL/pgSQL public.normalize_voucher_lookup_ref(p_raw text)
function sqlNormalizeVoucherLookupRef(raw: string | null | undefined): string {
  if (raw == null) return "";
  let v_ref = raw.trim().replace(/\s+/g, "").toUpperCase();
  if (v_ref.startsWith("TR-TRC-") || v_ref.startsWith("TR-TRC")) {
    v_ref = v_ref.substring(3); // substr(v_ref, 4) en SQL 1-indexé = substring(3) en JS 0-indexé
  }
  return v_ref;
}

describe("normalizeVoucherLookupRef parity (TS vs _shared vs SQL)", () => {
  const testCases = [
    { input: "TR-TRC-1792843872", expected: "TRC-1792843872" },
    { input: "tr-trc-1792843872", expected: "TRC-1792843872" },
    { input: "  TR-TRC-1792843872  ", expected: "TRC-1792843872" },
    { input: "TR-TRC1792843872", expected: "TRC1792843872" },
    { input: "tr-trc1792843872", expected: "TRC1792843872" },
    { input: "TRC-1792843872", expected: "TRC-1792843872" },
    { input: "trc-1792843872", expected: "TRC-1792843872" },
    { input: "  TRC- 1792843872 ", expected: "TRC-1792843872" },
    { input: "TR-9999", expected: "TR-9999" }, // Ne commence pas par TR-TRC -> inchangé
    { input: "TRC9999", expected: "TRC9999" },
    { input: "VOUCHER-123", expected: "VOUCHER-123" },
    { input: "", expected: "" },
  ];

  for (const tc of testCases) {
    it(`normalise "${tc.input}" -> "${tc.expected}" de façon identique`, () => {
      expect(tsHelper(tc.input)).toBe(tc.expected);
      expect(sharedHelper(tc.input)).toBe(tc.expected);
      expect(sqlNormalizeVoucherLookupRef(tc.input)).toBe(tc.expected);
    });
  }

  it("vérifie que la migration SQL contient bien la définition exacte", () => {
    const migration = readFileSync(
      "supabase/migrations/20261029_001_pos_sale_troc_voucher.sql",
      "utf8"
    );
    expect(migration).toContain("FUNCTION public.normalize_voucher_lookup_ref(p_raw text)");
    expect(migration).toContain("substr(v_ref, 4)");
    expect(migration).toContain("v_ref LIKE 'TR-TRC-%' OR v_ref LIKE 'TR-TRC%'");
  });
});
