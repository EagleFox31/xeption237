import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  saleTrocPromptCb,
  saleTrocChoiceCb,
  saleTrocConfirmExcessCb,
  saleTrocMixedChoiceCb,
  parseSaleTrocChoiceCb,
  parseSaleTrocMixedChoiceCb,
  saleTrocRefPrompt,
  parseTrocTag,
  saleTrocMixedCashPrompt,
  parseTrocMixedCashTag,
  saleRecap,
  payLabel
} from "../supabase/functions/_shared/telegramSale.ts";
import { normalizeVoucherLookupRef } from "../supabase/functions/_shared/trocVoucher.ts";
import { formatSaleReceiptText, type SaleReceiptData } from "../supabase/functions/_shared/saleReceipt.ts";

describe("Lot 4 — Vente comptoir avec bon troc", () => {
  describe("Normalisation de référence", () => {
    it("normalise fidèlement les références TR-TRC et TRC", () => {
      expect(normalizeVoucherLookupRef("  TR-TRC-1792843872  ")).toBe("TRC-1792843872");
      expect(normalizeVoucherLookupRef("tr-trc-1792843872")).toBe("TRC-1792843872");
      expect(normalizeVoucherLookupRef("TR-TRC1792843872")).toBe("TRC1792843872");
      expect(normalizeVoucherLookupRef("TRC-1792843872")).toBe("TRC-1792843872");
      expect(normalizeVoucherLookupRef("trc-1792843872")).toBe("TRC-1792843872");
      expect(normalizeVoucherLookupRef("  trc - 1792843872 ")).toBe("TRC-1792843872");
      expect(normalizeVoucherLookupRef("")).toBe("");
      expect(normalizeVoucherLookupRef(null)).toBe("");
    });
  });

  describe("Prompts et tags conversationnels", () => {
    const prodId = "11111111-2222-3333-4444-555555555555";
    const tradeInId = "TRC-1792843872";

    it("génère et parse le prompt de référence bon troc (#STR:)", () => {
      const prompt = saleTrocRefPrompt(prodId, "iPhone 13 128 Go", 250000);
      expect(prompt).toContain("Vente avec reprise — iPhone 13 128 Go (250 000 FCFA)");
      expect(prompt).toContain(`#STR:${prodId}`);

      const parsed = parseTrocTag(prompt);
      expect(parsed).toEqual({ productId: prodId });
      expect(parseTrocTag("Un message sans tag")).toBeNull();
    });

    it("génère et parse le prompt de reliquat mixte (#STMX:)", () => {
      const prompt = saleTrocMixedCashPrompt(prodId, tradeInId, "iPhone 13 128 Go", 100000);
      expect(prompt).toContain("Paiement mixte du reliquat — iPhone 13 128 Go (Reste : 100 000 FCFA)");
      expect(prompt).toContain(`#STMX:${prodId}:${tradeInId}`);

      const parsed = parseTrocMixedCashTag(prompt);
      expect(parsed).toEqual({ productId: prodId, tradeInId });
      expect(parseTrocMixedCashTag("Texte aléatoire")).toBeNull();
    });

    it("génère et parse les callbacks de choix de paiement avec reprise", () => {
      const cb = saleTrocChoiceCb("C", prodId, tradeInId);
      expect(cb).toBe(`nav:stc:C:${prodId}:${tradeInId}`);
      expect(parseSaleTrocChoiceCb(cb)).toEqual({
        payCode: "C",
        productId: prodId,
        tradeInId,
        confirmExcess: false
      });

      const cbExcess = saleTrocConfirmExcessCb("TROC", prodId, tradeInId);
      expect(cbExcess).toBe(`nav:stcx:TROC:${prodId}:${tradeInId}`);
      expect(parseSaleTrocChoiceCb(cbExcess)).toEqual({
        payCode: "TROC",
        productId: prodId,
        tradeInId,
        confirmExcess: true
      });
    });

    it("génère et parse les callbacks de reliquat mixte", () => {
      const cb = saleTrocMixedChoiceCb("O", prodId, tradeInId, 40000);
      expect(cb).toBe(`nav:stpx:O:${prodId}:${tradeInId}:40000`);
      expect(parseSaleTrocMixedChoiceCb(cb)).toEqual({
        mobileCode: "O",
        productId: prodId,
        tradeInId,
        cashAmount: 40000
      });
    });
  });

  describe("Récapitulatif de vente avec reprise", () => {
    it("affiche la déduction du bon et le solde net à payer", () => {
      const recap = saleRecap({
        lines: [{ name: "iPhone 13 128 Go", quantity: 1, unit_price: 250000 }],
        payment_method: "CASH",
        discount_amount: 150000,
        trade_in_ref: "TRC-1792843872",
        customer_name: "Jean Dupont",
        customer_phone: "699123456"
      });

      expect(recap).toContain("iPhone 13 128 Go — 250 000 FCFA");
      expect(recap).toContain("• Reprise (TRC-1792843872) : −150 000 FCFA");
      expect(recap).toContain("Total à encaisser : <b>100 000 FCFA</b>");
      expect(recap).toContain("Paiement : 💵 Espèces");
      expect(recap).toContain("Jean Dupont");
    });

    it("affiche le récapitulatif pour un bon couvrant 100% du panier", () => {
      const recap = saleRecap({
        lines: [{ name: "Xiaomi Redmi 14C", quantity: 1, unit_price: 90000 }],
        payment_method: "TROC",
        discount_amount: 90000,
        trade_in_ref: "TRC-1792843872",
        customer_name: "Aline",
        customer_phone: "699000111"
      });

      expect(recap).toContain("• Reprise (TRC-1792843872) : −90 000 FCFA");
      expect(recap).toContain("Total à encaisser : <b>0 FCFA</b>");
      expect(recap).toContain("Paiement : 🔁 Bon troc (100%)");
    });
  });

  describe("Reçu WhatsApp", () => {
    it("formate un reçu 100% bon troc", () => {
      const sale: SaleReceiptData = {
        order_id: "POS-TG-ABCDEF1234",
        lines: [{ name: "Xiaomi Redmi 14C", quantity: 1, unit_price: 90000 }],
        total: 0,
        discount_amount: 90000,
        trade_in_ref: "TRC-1792843872",
        payment_method: "TROC",
        store_name: "Boutique Bastos",
        customer_name: "Aline",
        customer_phone: "699000111"
      };

      const text = formatSaleReceiptText(sale);
      expect(text).toContain("• Reprise (TRC-1792843872) : −90 000 FCFA");
      expect(text).toContain("*Total payé : 0 FCFA*");
      expect(text).toContain("Moyen de paiement : Bon de reprise Smart Troc (100%)");
    });

    it("formate un reçu avec bon troc partiel + reliquat mixte", () => {
      const sale: SaleReceiptData = {
        order_id: "POS-TG-ABCDEF5678",
        lines: [{ name: "Galaxy S23", quantity: 1, unit_price: 350000 }],
        total: 150000,
        discount_amount: 200000,
        trade_in_ref: "TRC-1792843872",
        payment_method: "MIXED",
        payment_split: [
          { channel: "cash", amount: 50000 },
          { channel: "om", amount: 100000 }
        ],
        store_name: "Boutique Akwa",
        customer_name: "Derrick",
        customer_phone: "694606332"
      };

      const text = formatSaleReceiptText(sale);
      expect(text).toContain("• Reprise (TRC-1792843872) : −200 000 FCFA");
      expect(text).toContain("*Total payé : 150 000 FCFA*");
      expect(text).toContain("Moyen de paiement : Mixte (Espèces 50 000 FCFA + OM 100 000 FCFA)");
    });
  });

  describe("Contrat de la migration SQL (20261029_001)", () => {
    const sql = readFileSync(
      "supabase/migrations/20261029_001_pos_sale_troc_voucher.sql",
      "utf8"
    );

    it("ajoute trade_in_request_id avec ON DELETE SET NULL", () => {
      expect(sql).toContain(
        "ALTER TABLE public.telegram_sale_drafts\n  ADD COLUMN IF NOT EXISTS trade_in_request_id text REFERENCES public.trade_in_requests(id) ON DELETE SET NULL;"
      );
    });

    it("implémente telegram_staff_troc_voucher_check avec normalisation et contrôles stricts", () => {
      expect(sql).toContain("FUNCTION public.telegram_staff_troc_voucher_check(");
      expect(sql).toContain("public.normalize_voucher_lookup_ref(voucher_reference) = v_norm_ref");
      expect(sql).toContain("v_troc.completed_order_id IS NOT NULL OR v_troc.status = 'completed'");
      expect(sql).toContain("v_troc.status <> 'validated'");
      expect(sql).toContain("v_troc.voucher_expires_at IS NOT NULL AND v_troc.voucher_expires_at < now()");
      expect(sql).toContain("coalesce(v_troc.trade_in_value, 0) <= 0");
    });

    it("recalcule la déduction troc sur l'ensemble du sous-total du panier sous verrou", () => {
      expect(sql).toContain("v_subtotal := v_subtotal + v_price * (v_line->>'quantity')::int;");
      expect(sql).toContain("SELECT * INTO v_troc\n    FROM public.trade_in_requests\n    WHERE id = v_draft.trade_in_request_id\n    FOR UPDATE;");
      expect(sql).toContain("v_troc_discount := LEAST(v_subtotal, v_troc_credit);");
      expect(sql).toContain("v_credit_lost := GREATEST(0, v_troc_credit - v_subtotal);");
      expect(sql).toContain("v_total_discount := v_manual_discount + v_troc_discount;");
    });

    it("clôture le dossier troc atomiquement avec note de perte éventuelle", () => {
      expect(sql).toContain("UPDATE public.trade_in_requests");
      expect(sql).toContain("status = 'completed'");
      expect(sql).toContain("completed_order_id = v_draft.order_id");
      expect(sql).toContain("credit_applied = v_troc_discount");
      expect(sql).toContain("perte crédit non utilisé :");
    });

    it("n'écrit dans order_payments que si v_total > 0", () => {
      expect(sql).toContain("IF v_total > 0 THEN");
      expect(sql).toContain("INSERT INTO public.order_payments");
    });

    it("révoque PUBLIC et anon sur toutes les fonctions", () => {
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.normalize_voucher_lookup_ref(text) FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.telegram_staff_troc_voucher_check(text, text) FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.telegram_staff_sale_draft_open(text, text, text, jsonb, text) FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.telegram_staff_sale_draft_set_customer(text, uuid, text, text) FROM PUBLIC, anon;");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.telegram_staff_complete_sale(text, uuid) FROM PUBLIC, anon;");
    });
  });
});
