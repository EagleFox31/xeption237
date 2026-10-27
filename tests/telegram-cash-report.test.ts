import { describe, it, expect } from "vitest";
import {
  buildProgressBar,
  formatDailyCashReport,
  formatDailyCashReportForWhatsApp,
  formatDateFr,
  parseAmount,
  parseDebtLine,
  parseDebtsText,
  parseExpenseLine,
  parseExpensesText,
  parseCustomerNameAndPhone,
  isLikelyAmount,
  isValidCustomerName,
  formatCustomerName,
  crPrompt,
  parseCrTag,
  type CashReportData
} from "../supabase/functions/_shared/telegramCashReport";

describe("telegramCashReport helpers", () => {
  it("builds clean progress bars", () => {
    expect(buildProgressBar(0)).toBe("░░░░░░░░░░ 0%");
    expect(buildProgressBar(50)).toBe("▓▓▓▓▓░░░░░ 50%");
    expect(buildProgressBar(71)).toBe("▓▓▓▓▓▓▓░░░ 71%");
    expect(buildProgressBar(100)).toBe("▓▓▓▓▓▓▓▓▓▓ 100%");
    expect(buildProgressBar(120)).toBe("▓▓▓▓▓▓▓▓▓▓ 100%");
  });

  it("formats dates from ISO to French DD/MM/YYYY", () => {
    expect(formatDateFr("2026-10-22")).toBe("22/10/2026");
    expect(formatDateFr("2026-10-22T00:00:00Z")).toBe("22/10/2026");
  });

  it("parses amounts with various formats and additions", () => {
    expect(parseAmount("150.000f")).toBe(150000);
    expect(parseAmount("15 000 F")).toBe(15000);
    expect(parseAmount("2000")).toBe(2000);
    expect(parseAmount("125k")).toBe(125000);
    expect(parseAmount("50k")).toBe(50000);
    expect(parseAmount("1M")).toBe(1000000);
    expect(parseAmount("1 M")).toBe(1000000);
    expect(parseAmount("1M FCFA")).toBe(1000000);
    expect(parseAmount("1 million")).toBe(1000000);
    expect(parseAmount("1.5m")).toBe(1500000);
    expect(parseAmount("2,2M")).toBe(2200000);
    expect(parseAmount("125k + 25k")).toBe(150000);
    expect(parseAmount("60.000f + 150.000f")).toBe(210000);
    expect(parseAmount("170.000f + 95.000f")).toBe(265000);
  });

  it("parses expense lines from real store reports", () => {
    expect(parseExpenseLine("* transport 2.000f")).toEqual({ label: "transport", amount: 2000 });
    expect(parseExpenseLine("* depot boss 5.000f")).toEqual({ label: "depot boss", amount: 5000 });
    expect(parseExpenseLine("Transport journalier = 1000F")).toEqual({ label: "Transport journalier", amount: 1000 });
    expect(parseExpenseLine("• prépayer : 3000f")).toEqual({ label: "prépayer", amount: 3000 });
  });

  it("parses multiple expense lines", () => {
    const raw = `
* transport 2.000f 
* depot boss 5.000f
* prépayer 3000f
* Sorties boss 2500f
    `;
    const expenses = parseExpensesText(raw);
    expect(expenses).toHaveLength(4);
    expect(expenses[0].amount).toBe(2000);
    expect(expenses[1].amount).toBe(5000);
    expect(expenses[2].amount).toBe(3000);
    expect(expenses[3].amount).toBe(2500);
  });

  it("parses debt lines accurately", () => {
    const d1 = parseDebtLine("Mr yves Dell 5510 10.000f (691553252)");
    expect(d1).toEqual({
      customer_name: "Mr yves",
      device_model: "Dell 5510",
      amount_due: 10000,
      remaining: 10000,
      phone: "691553252"
    });

    const d2 = parseDebtLine("*Franc allu ,iPhone 8 = 15 000 F");
    expect(d2?.customer_name).toBe("Franc allu");
    expect(d2?.device_model).toBe("iPhone 8");
    expect(d2?.amount_due).toBe(15000);

    const d3 = parseDebtLine("Mr Ibrahim s26ultra 60.000f + 150.000f (690139586)");
    expect(d3?.customer_name).toBe("Mr Ibrahim");
    expect(d3?.device_model).toBe("s26ultra");
    expect(d3?.amount_due).toBe(210000);
    expect(d3?.phone).toBe("690139586");

    const d4 = parseDebtLine("Donald=12 000 F");
    expect(d4?.customer_name).toBe("Donald");
    expect(d4?.amount_due).toBe(12000);

    const d5 = parseDebtLine("Stevy Akaa Iphone 11 125k (621162160)");
    expect(d5?.customer_name).toBe("Stevy Akaa");
    expect(d5?.device_model).toBe("Iphone 11");
    expect(d5?.amount_due).toBe(125000);
    expect(d5?.phone).toBe("621162160");
  });

  it("formats the full daily cash report matching the store template", () => {
    const data: CashReportData = {
      store_name: "Boutique Mfoundi Mall",
      report_date: "2026-10-22",
      operators: ["Jordan LADZOU", "Yannick LADZOU", "Sefora SOH"],
      opening_cash: 147000,
      inflow_items: [
        { label: "Sony", amount: 30000, seller_name: "Jordan" },
        { label: "HP EliteBook 830 G6", amount: 150000, seller_name: "Yannick" },
        { label: "Arachide", amount: 2000 },
        { label: "HP ProBook 440 G6", amount: 150000, seller_name: "Jordan" }
      ],
      outflow_items: [
        { label: "Transport journalier", amount: 2000 },
        { label: "Dépôt boss", amount: 5000 },
        { label: "Prépayé", amount: 3000 },
        { label: "Sorties boss", amount: 2500 }
      ],
      debts: [
        { customer_name: "Mr Yves", device_model: "Dell 5510", amount_due: 10000, phone: "691553252" },
        { customer_name: "Mr Ibrahim", device_model: "S26 Ultra", amount_due: 210000, phone: "690139586" }
      ],
      observations: "Passage de plusieurs clients visiteurs.",
      staff_progress: [
        {
          staff_id: "staff-1",
          staff_name: "Jordan LADZOU",
          today_sales: 180000,
          weekly_actual: 680000,
          weekly_target: 1000000,
          monthly_actual: 2450000,
          monthly_target: 4000000
        }
      ]
    };

    const formatted = formatDailyCashReport(data);

    expect(formatted).toContain("RAPPORT DU 22/10/2026");
    expect(formatted).toContain("Boutique Mfoundi Mall");
    expect(formatted).toContain("Jordan LADZOU / Yannick LADZOU / Sefora SOH");
    expect(formatted).toContain("147 000 FCFA"); // Solde matin
    expect(formatted).toContain("332 000 FCFA"); // Total entrées
    expect(formatted).toContain("12 500 FCFA");  // Total sorties
    expect(formatted).toContain("466 500 FCFA"); // Reste en caisse (147k + 332k - 12.5k)
    expect(formatted).toContain("Mr Yves (Dell 5510) : <b>10 000 FCFA</b> · <code>691553252</code>");
    expect(formatted).toContain("Passage de plusieurs clients visiteurs.");
    expect(formatted).toContain("PROGRESSION DES OBJECTIFS STAFF");
    expect(formatted).toContain("68%");
    expect(formatted).toContain("61%");

    const waFormatted = formatDailyCashReportForWhatsApp(data);
    expect(waFormatted).toContain("*RAPPORT DU 22/10/2026*");
    expect(waFormatted).toContain("*Boutique Mfoundi Mall*");
    expect(waFormatted).toContain("147 000 FCFA");
    expect(waFormatted).toContain("*Total entré : 332 000 FCFA*");
    expect(waFormatted).toContain("*10 000 FCFA* · 691553252");
    expect(waFormatted).not.toContain("<b>");
    expect(waFormatted).not.toContain("</b>");
  });

  it("handles CrTag prompt creation and tag extraction", () => {
    const prompt = crPrompt("OPEN", "11111111-2222-3333-4444-555555555555", "Entrez le solde matin :");
    expect(prompt).toContain("#CR_OPEN:11111111-2222-3333-4444-555555555555");

    const tag = parseCrTag(prompt);
    expect(tag).toEqual({
      action: "OPEN",
      targetId: "11111111-2222-3333-4444-555555555555"
    });

    const debtTag = parseCrTag("Répondez avec le montant payé.\n\n#CR_PAYDEBT:99999999-8888-7777-6666-555555555555");
    expect(debtTag).toEqual({
      action: "PAYDEBT",
      targetId: "99999999-8888-7777-6666-555555555555"
    });
  });

  it("parses customer name and phone accurately for step-by-step debt creation", () => {
    expect(parseCustomerNameAndPhone("Alain Kamga 699123456")).toEqual({
      customerName: "Alain Kamga",
      phone: "699123456",
      isValid: true
    });

    expect(parseCustomerNameAndPhone("Ibrahim (690139586)")).toEqual({
      customerName: "Ibrahim",
      phone: "690139586",
      isValid: true
    });

    expect(parseCustomerNameAndPhone("Mme Brigitte +237 6 77 88 99 00")).toEqual({
      customerName: "Mme Brigitte",
      phone: "677889900",
      isValid: true
    });

    expect(parseCustomerNameAndPhone("raoul kamba")).toEqual({
      customerName: "Raoul Kamba",
      phone: "",
      isValid: true
    });

    expect(parseCustomerNameAndPhone("Donald")).toEqual({
      customerName: "Donald",
      phone: "",
      isValid: true
    });

    expect(parseCustomerNameAndPhone("*Franc allu")).toEqual({
      customerName: "Franc Allu",
      phone: "",
      isValid: true
    });

    // Rejects amount entries as client names
    expect(parseCustomerNameAndPhone("250k")).toEqual({
      customerName: "",
      phone: "",
      isValid: false
    });

    expect(parseCustomerNameAndPhone("150 000")).toEqual({
      customerName: "",
      phone: "",
      isValid: false
    });

    expect(parseCustomerNameAndPhone("")).toEqual({
      customerName: "",
      phone: "",
      isValid: false
    });
  });

  it("detects likely amounts vs product descriptions", () => {
    expect(isLikelyAmount("250k")).toBe(true);
    expect(isLikelyAmount("50k")).toBe(true);
    expect(isLikelyAmount("10000")).toBe(true);
    expect(isLikelyAmount("25.000f")).toBe(true);
    expect(isLikelyAmount("1.5M")).toBe(true);
    expect(isLikelyAmount("100k + 50k")).toBe(true);

    expect(isLikelyAmount("iPhone 11")).toBe(false);
    expect(isLikelyAmount("Dell Latitude 5510")).toBe(false);
    expect(isLikelyAmount("Samsung S24")).toBe(false);
    expect(isLikelyAmount("Chargeur 65W")).toBe(false);
    expect(isLikelyAmount("Ecran 4K")).toBe(false);
  });
});

