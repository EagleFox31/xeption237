/**
 * Pure helpers for the Telegram bot "Gestion RH" section (direction only).
 * No Deno / npm imports: shared by telegram-bot-entry and the vitest suite.
 * Authorization never relies on anything here — the SQL RPCs re-check the sender.
 */

export type HrPeriodKey = "d" | "w" | "m";

export const HR_PERIODS: Record<HrPeriodKey, { kind: "daily" | "weekly" | "monthly"; label: string }> = {
  d: { kind: "daily", label: "Jour" },
  w: { kind: "weekly", label: "Semaine" },
  m: { kind: "monthly", label: "Mois" }
};

/** One-tap target presets, in thousands of FCFA (keeps callback_data short). */
export const HR_TARGET_PRESETS_K: Record<HrPeriodKey, number[]> = {
  d: [50, 100, 200, 300, 500],
  w: [250, 500, 1000, 1500, 2500],
  m: [1000, 2000, 3000, 5000, 8000]
};

/** Same bound as telegram_staff_set_sales_target. */
export const HR_MAX_TARGET_XAF = 1_000_000_000;

/** Staff without store, in nav:rh_s:<code>. */
export const NO_STORE = "_";

export const UUID_RE = /^[0-9a-f-]{36}$/;

export const ROLE_LABEL: Record<string, string> = {
  vendeur: "Vendeur", editor: "Vendeur",
  responsable: "Responsable", manager: "Responsable", manager_vente: "Manager ventes",
  direction: "Direction", admin: "Direction",
  super_admin: "Super admin"
};

export interface HrMember {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  store_code: string | null;
  store_name: string | null;
  has_account: boolean;
  active: boolean;
  telegram_linked: boolean;
  targets: Partial<Record<"daily" | "weekly" | "monthly", number>>;
}

export interface HrPending {
  request_id: string;
  staff_id: string;
  name: string;
  store_name: string | null;
  requested_at: string;
}

export const isHrPeriod = (value: string): value is HrPeriodKey =>
  Object.prototype.hasOwnProperty.call(HR_PERIODS, value);

export const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const UNIT_FACTOR: Record<string, number> = { "": 1, k: 1_000, m: 1_000_000 };

/**
 * Amount typed by the direction: "1500000", "1 500 000", "1.500.000", "1500k", "1,5m",
 * optional "FCFA"/"XAF". Returns an integer in [0, HR_MAX_TARGET_XAF], else null.
 */
export function parseTargetAmount(text: string): number | null {
  const raw = text.toLowerCase().replace(/fcfa|xaf/g, "").replace(/[\s_]/g, "");
  const match = /^(\d+(?:[.,]\d+)*)([km]?)$/.exec(raw);
  if (!match) return null;
  const [, digits, unit] = match;
  let value: number;
  if (unit) {
    // With a unit, a single separator is a decimal mark ("1,5m").
    if ((digits.match(/[.,]/g) ?? []).length > 1) return null;
    value = Number(digits.replace(",", ".")) * UNIT_FACTOR[unit];
  } else {
    // Without a unit, separators are thousands groups ("1.500.000").
    if (/[.,]/.test(digits) && !/^\d{1,3}([.,]\d{3})+$/.test(digits)) return null;
    value = Number(digits.replace(/[.,]/g, ""));
  }
  value = Math.round(value * 1000) / 1000;
  if (!Number.isInteger(value) || value < 0 || value > HR_MAX_TARGET_XAF) return null;
  return value;
}

const OBJECTIVE_TAG_RE = /#OBJ:([dwm]):([0-9a-f-]{36})\s*$/;

/** ForceReply prompt; the trailing tag carries the context so the bot stays stateless. */
export function objectivePrompt(period: HrPeriodKey, staffId: string, name: string): string {
  return "✏️ Objectif " + HR_PERIODS[period].label.toLowerCase() + " pour " + name +
    " : répondez à ce message avec le montant en FCFA (ex. 1500000, 1,5m ou 0 pour retirer).\n" +
    "#OBJ:" + period + ":" + staffId;
}

export function parseObjectiveTag(text: string): { period: HrPeriodKey; staffId: string } | null {
  const match = OBJECTIVE_TAG_RE.exec(text);
  return match ? { period: match[1] as HrPeriodKey, staffId: match[2] } : null;
}

export function memberLine(m: HrMember): string {
  const status = !m.has_account ? " · 👻 sans compte" : !m.active ? " · ⛔ désactivé" : "";
  return "• <b>" + escapeHtml(m.name) + "</b> — " + escapeHtml(ROLE_LABEL[m.role] ?? m.role) +
    (m.phone ? " · 📞 " + escapeHtml(m.phone) : "") +
    " · Telegram " + (m.telegram_linked ? "✅" : "❌") + status;
}
