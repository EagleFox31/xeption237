import { describe, it, expect, vi } from "vitest";
import {
  screenCashReportDebts,
  handleDebtReply,
  type TelegramDebtDeps
} from "../supabase/functions/_shared/telegramDebtScreens.ts";
import type { StaffMember } from "../supabase/functions/_shared/telegramCashScreens.ts";

describe("telegramDebtScreens", () => {
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

  it("screenCashReportDebts affiche la liste des dettes actives et les boutons d'encaissement", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "debt-1",
                  customer_name: "Alain Kamga",
                  device_model: "iPhone 11",
                  amount_due: 150000,
                  amount_paid: 50000,
                  phone: "699123456",
                  status: "active"
                }
              ]
            })
          })
        })
      })
    });

    const deps: TelegramDebtDeps = {
      supabase: { from: mockFrom },
      homeRow: dummyHomeRow,
      renderHub: vi.fn()
    };

    const screen = await screenCashReportDebts(dummyStaff, "store-1", deps);
    expect(screen.text).toContain("Gestion des Dettes & Crédits Clients");
    expect(screen.text).toContain("Alain Kamga");
    expect(screen.text).toContain("iPhone 11");
    expect(screen.text).toContain("100 000 FCFA"); // rem = 150k - 50k
    expect(screen.reply_markup.inline_keyboard?.[0][0].text).toContain("Encaisser : Alain Kamga");
  });

  it("screenCashReportDebts affiche un message vide si aucune dette", async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [] })
          })
        })
      })
    });

    const deps: TelegramDebtDeps = {
      supabase: { from: mockFrom },
      homeRow: dummyHomeRow,
      renderHub: vi.fn()
    };

    const screen = await screenCashReportDebts(dummyStaff, "store-1", deps);
    expect(screen.text).toContain("Aucune dette active");
  });

  it("handleDebtReply refuse un montant saisi à l'étape 1 (nom attendu)", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({ update: mockUpdate })
    };

    const deps: TelegramDebtDeps = {
      supabase: mockSupabase,
      homeRow: dummyHomeRow,
      renderHub: vi.fn()
    };

    const screen = await handleDebtReply(
      dummyStaff,
      { action: "DEBT_STEP1", targetId: "store-1" },
      "250k",
      deps
    );

    expect(screen).not.toBeNull();
    expect(screen?.text).toContain("Vous avez saisi un montant");
    expect(screen?.text).toContain("Étape 1/3");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ pending_action: "DEBT_STEP1" })
    );
  });

  it("handleDebtReply valide l'étape 1 et passe à l'étape 2", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({ update: mockUpdate })
    };

    const deps: TelegramDebtDeps = {
      supabase: mockSupabase,
      homeRow: dummyHomeRow,
      renderHub: vi.fn()
    };

    const screen = await handleDebtReply(
      dummyStaff,
      { action: "DEBT_STEP1", targetId: "store-1" },
      "Alain Kamga 699123456",
      deps
    );

    expect(screen).not.toBeNull();
    expect(screen?.text).toContain("Étape 2/3");
    expect(screen?.text).toContain("Alain Kamga");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        pending_action: "DEBT_STEP2",
        pending_target_id: JSON.stringify({ storeId: "store-1", customerName: "Alain Kamga", phone: "699123456" })
      })
    );
  });

  it("handleDebtReply refuse un montant saisi à l'étape 2 (produit attendu)", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({ update: mockUpdate })
    };

    const deps: TelegramDebtDeps = {
      supabase: mockSupabase,
      homeRow: dummyHomeRow,
      renderHub: vi.fn()
    };

    const targetPayload = JSON.stringify({ storeId: "store-1", customerName: "Alain", phone: "" });

    const screen = await handleDebtReply(
      dummyStaff,
      { action: "DEBT_STEP2", targetId: targetPayload },
      "125 000",
      deps
    );

    expect(screen).not.toBeNull();
    expect(screen?.text).toContain("Saisie incorrecte : produit attendu");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ pending_action: "DEBT_STEP2" })
    );
  });

  it("handleDebtReply valide l'étape 3 et enregistre la dette via telegram_staff_debt_add", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: { success: true } });
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [] })
          })
        })
      })
    });

    const mockSupabase = {
      rpc: mockRpc,
      from: mockFrom
    };

    const deps: TelegramDebtDeps = {
      supabase: mockSupabase,
      homeRow: dummyHomeRow,
      renderHub: vi.fn()
    };

    const targetPayload = JSON.stringify({
      storeId: "store-1",
      customerName: "Alain",
      phone: "699123456",
      deviceModel: "iPhone 11"
    });

    const screen = await handleDebtReply(
      dummyStaff,
      { action: "DEBT_STEP3", targetId: targetPayload },
      "75k",
      deps
    );

    expect(screen).not.toBeNull();
    expect(mockRpc).toHaveBeenCalledWith("telegram_staff_debt_add", {
      p_telegram_user_id: "123456",
      p_store_id: "store-1",
      p_customer_name: "Alain",
      p_device_model: "iPhone 11",
      p_amount: 75000,
      p_phone: "699123456"
    });
  });

  it("handleDebtReply encaisse une dette via PAYDEBT et ajoute l'entrée au draft", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: { success: true, customer_name: "Alain" },
      error: null
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })
    });

    const mockFrom = vi.fn((table: string) => {
      if (table === "store_debts") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { store_id: "store-1" }
              })
            })
          })
        };
      }
      if (table === "store_cash_drafts") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { inflow_items: [] }
                })
              })
            })
          }),
          update: mockUpdate
        };
      }
      return {};
    });

    const mockRenderHub = vi.fn().mockResolvedValue({ text: "Hub", reply_markup: {} });

    const deps: TelegramDebtDeps = {
      supabase: { rpc: mockRpc, from: mockFrom },
      homeRow: dummyHomeRow,
      renderHub: mockRenderHub
    };

    const screen = await handleDebtReply(
      dummyStaff,
      { action: "PAYDEBT", targetId: "debt-1" },
      "50 000",
      deps
    );

    expect(mockRpc).toHaveBeenCalledWith("telegram_staff_debt_settle", {
      p_telegram_user_id: "123456",
      p_debt_id: "debt-1",
      p_amount_paid: 50000
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        inflow_items: [
          {
            label: "Règlement dette Alain",
            amount: 50000,
            salesperson_name: "Amina"
          }
        ]
      })
    );
    expect(mockRenderHub).toHaveBeenCalledWith(dummyStaff, "store-1");
  });

  it("handleDebtReply renvoie null pour une action non-dette", async () => {
    const deps: TelegramDebtDeps = {
      supabase: {},
      homeRow: dummyHomeRow,
      renderHub: vi.fn()
    };

    const result = await handleDebtReply(
      dummyStaff,
      { action: "OPEN", targetId: "store-1" },
      "50000",
      deps
    );

    expect(result).toBeNull();
  });
});
