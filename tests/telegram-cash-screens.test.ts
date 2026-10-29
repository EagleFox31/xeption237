import { describe, it, expect, vi } from "vitest";
import {
  screenCashReportChooseStore,
  screenCashReportHub,
  screenCashReportExpenses,
  screenCashReportPreview,
  handleCashReportActionReply,
  type TelegramCashDeps,
  type StaffMember
} from "../supabase/functions/_shared/telegramCashScreens.ts";

describe("telegramCashScreens", () => {
  const dummyStaff: StaffMember = {
    telegram_user_id: "123456",
    auth_user_id: "auth-1",
    id: "staff-1",
    name: "Amina",
    role: "vendeur",
    rank: 0,
    store: { id: "store-1", name: "Mfoundi Mall", code: "MFOUNDI" },
    scope_store_code: null
  };

  const dummyHomeRow = [{ text: "🏠 Accueil", callback_data: "nav:main" }];

  it("screenCashReportChooseStore génère les boutons de sélection boutique", async () => {
    const deps: TelegramCashDeps = {
      supabase: null,
      listStores: async () => [
        { id: "s1", name: "Mfoundi", code: "MFOUNDI" },
        { id: "s2", name: "Olembe", code: "OLEMBE" }
      ],
      homeRow: dummyHomeRow
    };

    const screen = await screenCashReportChooseStore(dummyStaff, deps);
    expect(screen.text).toContain("Sélection Boutique");
    expect(screen.reply_markup.inline_keyboard).toEqual([
      [{ text: "🏪 Mfoundi", callback_data: "nav:cr_start:MFOUNDI" }],
      [{ text: "🏪 Olembe", callback_data: "nav:cr_start:OLEMBE" }],
      dummyHomeRow
    ]);
  });

  it("screenCashReportHub appelle telegram_staff_cash_report_init et affiche les totaux", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        store_id: "s1",
        store_name: "Mfoundi",
        report_date: "2026-10-27",
        suggested_opening_cash: 50000,
        today_pos_sales: [{ label: "Vente iPhone", amount: 120000, salesperson_name: "Amina" }],
        operators: ["Amina"],
        active_debts: [{ customer_name: "Paul", amount_due: 15000, remaining: 15000 }],
        draft: {
          opening_cash: 50000,
          inflow_items: [{ label: "Vente iPhone", amount: 120000 }],
          outflow_items: [{ label: "Transport", amount: 3000 }],
          operators: ["Amina"],
          observations: "Journée calme"
        }
      },
      error: null
    });

    const mockSupabase = {
      rpc: mockRpc,
      from: vi.fn()
    };

    const deps: TelegramCashDeps = {
      supabase: mockSupabase,
      listStores: async () => [],
      homeRow: dummyHomeRow
    };

    const screen = await screenCashReportHub(dummyStaff, "MFOUNDI", deps);
    expect(mockRpc).toHaveBeenCalledWith("telegram_staff_cash_report_init", {
      p_telegram_user_id: "123456",
      p_store_code: "MFOUNDI"
    });
    expect(screen.text).toContain("Rapport de Caisse & Clôture</b> — <b>Mfoundi");
    expect(screen.text).toContain("50 000 FCFA"); // opening
    expect(screen.text).toContain("120 000 FCFA"); // total inflow
    expect(screen.text).toContain("3 000 FCFA"); // total outflow
    expect(screen.text).toContain("167 000 FCFA"); // closing = 50k + 120k - 3k
    expect(screen.text).toContain("Journée calme");
  });

  it("screenCashReportExpenses affiche la liste des dépenses et les boutons de presets", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                outflow_items: [
                  { label: "Transport", amount: 2500 },
                  { label: "Ration", amount: 1500 }
                ],
                stores: { name: "Mfoundi" }
              }
            })
          })
        })
      })
    });

    const deps: TelegramCashDeps = {
      supabase: { from: mockFrom },
      listStores: async () => [],
      homeRow: dummyHomeRow
    };

    const screen = await screenCashReportExpenses(dummyStaff, "s1", deps);
    expect(screen.text).toContain("Gestion des Dépenses du Jour</b> — <b>Mfoundi");
    expect(screen.text).toContain("<b>Transport</b> : <b>2 500 FCFA</b>");
    expect(screen.text).toContain("<b>Ration</b> : <b>1 500 FCFA</b>");
    expect(screen.text).toContain("Total dépenses : 4 000 FCFA");
    expect(screen.reply_markup.inline_keyboard?.[0][0].text).toContain("Transport");
  });

  it("handleCashReportActionReply traite OPEN et retourne le hub", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    });
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        store_id: "s1",
        store_name: "Mfoundi",
        report_date: "2026-10-27",
        draft: { opening_cash: 75000, inflow_items: [], outflow_items: [], operators: [] }
      }
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({ update: mockUpdate }),
      rpc: mockRpc
    };

    const deps: TelegramCashDeps = {
      supabase: mockSupabase,
      listStores: async () => [],
      homeRow: dummyHomeRow
    };

    const screen = await handleCashReportActionReply(
      dummyStaff,
      { action: "OPEN", targetId: "s1" },
      "75k",
      deps
    );

    expect(screen).not.toBeNull();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ opening_cash: 75000 })
    );
  });

  it("handleCashReportActionReply retourne null pour une action non-caisse (dettes)", async () => {
    const deps: TelegramCashDeps = {
      supabase: {},
      listStores: async () => [],
      homeRow: dummyHomeRow
    };

    const result = await handleCashReportActionReply(
      dummyStaff,
      { action: "DEBT_STEP1", targetId: "s1" },
      "Alain 699123456",
      deps
    );

    expect(result).toBeNull();
  });

  it("handleCashReportActionReply traite IN et enregistre les entrées avec seller_name", async () => {
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              inflow_items: [{ label: "Vente existante", amount: 20000, seller_name: "Autre" }]
            }
          })
        })
      })
    });

    let savedInflowItems: any[] = [];
    const mockUpdate = vi.fn().mockImplementation((payload) => {
      savedInflowItems = payload.inflow_items;
      return {
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      };
    });

    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        success: true,
        store_id: "s1",
        store_name: "Mfoundi",
        report_date: "2026-10-27",
        draft: { opening_cash: 50000, inflow_items: [], outflow_items: [], operators: [] }
      }
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table) => {
        if (table === "store_cash_drafts") {
          return {
            select: mockSelect,
            update: mockUpdate
          };
        }
        return {};
      }),
      rpc: mockRpc
    };

    const deps: TelegramCashDeps = {
      supabase: mockSupabase,
      listStores: async () => [],
      homeRow: dummyHomeRow
    };

    const screen = await handleCashReportActionReply(
      dummyStaff,
      { action: "IN", targetId: "s1" },
      "Vente verre trempé 5000",
      deps
    );

    expect(screen).not.toBeNull();
    expect(mockUpdate).toHaveBeenCalled();
    expect(savedInflowItems).toHaveLength(2);
    expect(savedInflowItems[1]).toEqual({
      label: "Vente verre trempé",
      amount: 5000,
      seller_name: "Amina"
    });
    expect((savedInflowItems[1] as any).salesperson_name).toBeUndefined();
  });
});
