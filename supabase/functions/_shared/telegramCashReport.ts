/**
 * Pure helpers for the daily store cash report & debts management.
 * No Deno / npm imports: shared by telegram-bot-entry and the vitest suite.
 */

export interface InflowItem {
  label: string;
  amount: number;
  seller_name?: string;
}

export interface OutflowItem {
  label: string;
  amount: number;
}

export interface DebtItem {
  id?: string;
  customer_name: string;
  device_model?: string;
  amount_due: number;
  amount_paid?: number;
  remaining?: number;
  phone?: string;
}

export interface StaffProgressItem {
  staff_id: string;
  staff_name: string;
  today_sales: number;
  weekly_actual: number;
  weekly_target?: number | null;
  monthly_actual: number;
  monthly_target?: number | null;
}

export interface CashReportData {
  store_name: string;
  report_date: string; // ISO or YYYY-MM-DD
  operators: string[];
  opening_cash: number;
  inflow_items: InflowItem[];
  outflow_items: OutflowItem[];
  debts?: DebtItem[];
  debt_items?: DebtItem[];
  observations?: string | null;
  staff_progress: StaffProgressItem[];
}

export const escapeHtml = (value: string): string =>
  (value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const formatMoney = (amount: number): string =>
  new Intl.NumberFormat("fr-FR").format(Math.round(amount || 0)).replace(/[\u202f\u00a0]/g, " ") + " FCFA";

/**
 * Visual progress bar: e.g. ▓▓▓▓▓▓▓░░░ 70%
 */
export function buildProgressBar(percent: number, width = 10): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  return "▓".repeat(filled) + "░".repeat(empty) + " " + clamped + "%";
}

export function formatDateFr(dateStr: string): string {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return dateStr;
}

/**
 * Parses numeric amount from strings like: "150.000f", "15 000 F", "2000", "60.000f + 150.000f", "125k", "50k", "1.5m"
 */
export function parseAmount(text: string): number {
  if (!text) return 0;
  // Handle sums like "60.000f + 150.000f" or "125k + 25k"
  const parts = text.split("+");
  let total = 0;
  for (const part of parts) {
    let clean = part.toLowerCase().replace(/fcfa|xaf|f/g, "").replace(/[\s\u00a0\u202f_]/g, "");
    if (!clean) continue;

    // Detect 'k' (thousand) or 'm' / 'million' suffix
    let multiplier = 1;
    if (/[k]$/.test(clean)) {
      multiplier = 1000;
      clean = clean.slice(0, -1);
    } else if (/millions?$/.test(clean)) {
      multiplier = 1000000;
      clean = clean.replace(/millions?$/, "");
    } else if (/[m]$/.test(clean)) {
      multiplier = 1000000;
      clean = clean.slice(0, -1);
    } else if (/mil$/.test(clean)) {
      multiplier = 1000000;
      clean = clean.slice(0, -3);
    }

    if (multiplier > 1) {
      // With multiplier: comma or dot is decimal separator (e.g. "1.5m" or "2,5k" or "125k")
      clean = clean.replace(",", ".");
      const num = parseFloat(clean);
      if (!isNaN(num) && num > 0) total += Math.round(num * multiplier);
    } else {
      // Without multiplier: dots are thousand separators ("150.000" -> 150000)
      clean = clean.replace(/[.]/g, "").replace(",", ".");
      const num = parseFloat(clean);
      if (!isNaN(num) && num > 0) total += Math.round(num);
    }
  }
  return total;
}

/**
 * Parses single or multi-line expenses:
 * "* transport 2.000f"
 * "* depot boss 5.000f"
 * "Transport journalier = 1000F"
 * "prepayer 3000f"
 */
export function parseExpenseLine(line: string): OutflowItem | null {
  const clean = line.replace(/^[*•\-–]\s*/, "").trim();
  if (!clean) return null;

  // Match: <label> [:=]? <amount>
  const match = clean.match(/^(.*?)(?:[:=]|\s+)\s*([\d\s.,]+(?:k|m|mil|fcfa|f)?)$/i);
  if (!match) return null;

  const label = match[1].trim();
  const amount = parseAmount(match[2]);
  if (!label || amount <= 0) return null;

  return { label, amount };
}

export function parseExpensesText(text: string): OutflowItem[] {
  const lines = (text || "").split("\n");
  const items: OutflowItem[] = [];
  for (const line of lines) {
    const item = parseExpenseLine(line);
    if (item) items.push(item);
  }
  return items;
}

/**
 * Parses debt lines like:
 * "Mr yves Dell 5510 10.000f (691553252)"
 * "*Franc allu ,iPhone 8 = 15 000 F"
 * "Mr Ibrahim s26ultra 60.000f + 150.000f (690139586)"
 * "Donald=12 000 F"
 * "Marcel, iphone 17PM=875 000F (657210468)"
 * "Stevy Akaa Iphone 11 125k (621162160)"
 */
export function parseDebtLine(line: string): DebtItem | null {
  const clean = line.replace(/^[*•\-–]\s*/, "").trim();
  if (!clean || clean.length < 3) return null;

  let phone: string | undefined;
  let remaining = clean;

  // Extract phone in parentheses or at end (ex: (691553252) or 691553252)
  const phoneMatch = remaining.match(/[\s(]+(?:\+?237\s*)?([62]\d{8})[)\s]*$/);
  if (phoneMatch) {
    phone = phoneMatch[1];
    remaining = remaining.slice(0, phoneMatch.index).trim();
  }

  // Look for amount at the end:
  // 1) Explicit delimiter: = or : (e.g. "= 15 000 F", ": 15.000 F", "= 125k")
  let match = remaining.match(/[:=]\s*([0-9\s.,+]+(?:\s*(?:fcfa|f|k|m|mil))?)\s*$/i);

  // 2) Suffix with 'f', 'fcfa', 'k', 'm' without explicit delimiter (e.g. "10.000f", "125k", "60.000f + 150.000f")
  if (!match) {
    match = remaining.match(/(?:\s)\s*([0-9.,]+\s*(?:fcfa|f|k|m|mil)?(?:\s*\+\s*[0-9.,]+\s*(?:fcfa|f|k|m|mil)?)*)\s*$/i);
  }

  // 3) Trailing standalone number (e.g. "Donald 12000")
  if (!match) {
    match = remaining.match(/\s+([0-9][0-9\s.]*)\s*$/);
  }
  if (!match || match.index === undefined) return null;

  const amountStr = match[1];
  const amountDue = parseAmount(amountStr);
  if (amountDue <= 0) return null;

  let subjectPart = remaining.slice(0, match.index).replace(/[:=]\s*$/, "").trim();

  // Split customer name vs device if separator like comma or known model
  let customerName = subjectPart;
  let deviceModel: string | undefined;

  const commaSplit = subjectPart.split(/[,–-]/);
  if (commaSplit.length >= 2) {
    customerName = commaSplit[0].trim();
    deviceModel = commaSplit.slice(1).join(" ").trim();
  } else {
    // Check if starts with Mr/Mme
    const words = subjectPart.split(/\s+/);
    if (words.length >= 3 && /^(mr|m\.|mme|monsieur|madame)/i.test(words[0])) {
      customerName = words.slice(0, 2).join(" ");
      deviceModel = words.slice(2).join(" ");
    } else {
      // Check for common tech brand names to split without commas
      const brandMatch = subjectPart.match(/\b(iphone|ipad|macbook|samsung|dell|hp|lenovo|thinkpad|asus|acer|redmi|xiaomi|tecno|infinix|huawei|sony|galaxy)\b/i);
      if (brandMatch && brandMatch.index && brandMatch.index > 0) {
        customerName = subjectPart.slice(0, brandMatch.index).trim();
        deviceModel = subjectPart.slice(brandMatch.index).trim();
      }
    }
  }

  return {
    customer_name: customerName,
    device_model: deviceModel || undefined,
    amount_due: amountDue,
    remaining: amountDue,
    phone
  };
}

export function parseDebtsText(text: string): DebtItem[] {
  const lines = (text || "").split("\n");
  const items: DebtItem[] = [];
  for (const line of lines) {
    const item = parseDebtLine(line);
    if (item) items.push(item);
  }
  return items;
}

/**
 * Detects if a text input looks like an amount (e.g. "250k", "50000", "15 000 F", "1.5M")
 * rather than a name or product description.
 */
export function isLikelyAmount(text: string): boolean {
  const trimmed = (text || "").trim();
  if (!trimmed) return false;
  // If text is purely digits with optional thousand separators and currency
  if (/^\d+([.,\s]\d+)*\s*(f|fcfa|xaf)?$/i.test(trimmed)) return true;
  // If text matches amount patterns with k, m, mil (e.g. "250k", "50k", "1.5m", "1M", "1 million")
  if (/^(\d+(?:[.,]\d+)*)\s*(k|m|mil|millions?|fcfa|f|xaf)$/i.test(trimmed)) return true;
  // If text is an addition of amounts like "100k + 50k" or "10.000 + 5.000"
  if (/^[\d\s.,+kKmMfFfcfaFCFAxafXAF]+$/.test(trimmed) && /\d/.test(trimmed)) {
    const stripped = trimmed.toLowerCase().replace(/[\d\s.,+]/g, "").replace(/fcfa|xaf|millions?|mil|[kmf]/g, "");
    if (stripped.length === 0) return true;
  }
  return false;
}

/**
 * Validates a customer name: must contain at least 2 letters and not look like an amount or random symbols.
 */
export function isValidCustomerName(text: string): boolean {
  const trimmed = (text || "").trim();
  if (trimmed.length < 2) return false;
  if (isLikelyAmount(trimmed)) return false;
  if (!/[a-zA-ZÀ-ÿ]{2,}/.test(trimmed)) return false;
  return true;
}

/**
 * Formats a customer name nicely (Capitalizes each word).
 * e.g. "raoul kamba" → "Raoul Kamba"
 */
export function formatCustomerName(name: string): string {
  return (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Parses customer name and phone from free text input for debt creation.
 * e.g. "Alain Kamga 699123456" → { customerName: "Alain Kamga", phone: "699123456", isValid: true }
 *      "Ibrahim (690139586)" → { customerName: "Ibrahim", phone: "690139586", isValid: true }
 *      "Mme Brigitte +237 677889900" → { customerName: "Mme Brigitte", phone: "677889900", isValid: true }
 *      "Donald" → { customerName: "Donald", phone: "", isValid: true }
 *      "250k" → { customerName: "", phone: "", isValid: false }
 */
export function parseCustomerNameAndPhone(raw: string): { customerName: string; phone: string; isValid: boolean } {
  const trimmed = (raw || "").trim();
  if (!trimmed || isLikelyAmount(trimmed)) {
    return { customerName: "", phone: "", isValid: false };
  }

  const cleaned = trimmed.replace(/[()]/g, " ").trim();
  const match = /^(.*?)[\s,;:-]*((?:\+|00)?[\d\s.]{9,})$/.exec(cleaned);
  if (match) {
    let digits = match[2].replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.length === 12 && digits.startsWith("237")) digits = digits.slice(3);
    if (/^[62]\d{8}$/.test(digits)) {
      const name = match[1].replace(/^[*\s,;:-]+|[*\s,;:-]+$/g, "").trim();
      if (!name || isLikelyAmount(name) || !isValidCustomerName(name)) {
        return { customerName: "", phone: digits, isValid: false };
      }
      return { customerName: formatCustomerName(name), phone: digits, isValid: true };
    }
  }

  const fallbackName = trimmed.replace(/^[*\s,;:-]+|[*\s,;:-]+$/g, "").trim();
  if (!isValidCustomerName(fallbackName)) {
    return { customerName: "", phone: "", isValid: false };
  }
  return { customerName: formatCustomerName(fallbackName), phone: "", isValid: true };
}

/**
 * Formats the complete daily cash report ready to be sent to Telegram group.
 */
export function formatDailyCashReport(data: CashReportData): string {
  const dateStr = formatDateFr(data.report_date);
  const totalInflow = data.inflow_items.reduce((sum, item) => sum + item.amount, 0);
  const totalOutflow = data.outflow_items.reduce((sum, item) => sum + item.amount, 0);
  const closingCash = data.opening_cash + totalInflow - totalOutflow;

  const rawOperators = (data.operators as any[]) || [];
  const operators = rawOperators.map((o: any) => typeof o === "string" ? o : o?.name).filter(Boolean);
  const operatorsStr = operators.length > 0
    ? operators.map(escapeHtml).join(" / ")
    : "Équipe boutique";

  // Inflow lines
  let inflowLines = "";
  if (data.inflow_items.length === 0) {
    inflowLines = "<i>Pas d'entrée</i>";
  } else {
    inflowLines = data.inflow_items.map(item => {
      const seller = item.seller_name ? ` <i>(${escapeHtml(item.seller_name)})</i>` : "";
      return ` • ${escapeHtml(item.label)} : <b>${formatMoney(item.amount)}</b>${seller}`;
    }).join("\n");
  }

  // Outflow lines
  let outflowLines = "";
  if (data.outflow_items.length === 0) {
    outflowLines = "<i>Pas de sortie</i>";
  } else {
    outflowLines = data.outflow_items.map(item => {
      return ` • ${escapeHtml(item.label)} : <b>${formatMoney(item.amount)}</b>`;
    }).join("\n");
  }

  // Debts section
  let debtsSection = "";
  const debtList = data.debts ?? data.debt_items ?? [];
  const totalDebts = debtList.reduce((sum, d) => sum + (d.remaining ?? d.amount_due), 0);
  if (debtList.length > 0) {
    const debtLines = debtList.map(d => {
      const dev = d.device_model ? ` (${escapeHtml(d.device_model)})` : "";
      const ph = d.phone ? ` · <code>${escapeHtml(d.phone)}</code>` : "";
      const rem = d.remaining !== undefined ? d.remaining : d.amount_due;
      return ` • ${escapeHtml(d.customer_name)}${dev} : <b>${formatMoney(rem)}</b>${ph}`;
    }).join("\n");

    debtsSection =
      `\n📋 <b>LISTE DES DETTES &amp; CRÉANCES (${debtList.length}) :</b>\n` +
      `${debtLines}\n` +
      ` ──────────────────────────\n` +
      ` 📌 <b>Total à recouvrer : ${formatMoney(totalDebts)}</b>\n`;
  }

  // Observations
  let obsSection = "";
  if (data.observations && data.observations.trim()) {
    obsSection = `\n📝 <b>Observations :</b>\n${escapeHtml(data.observations.trim())}\n`;
  }

  // Staff targets progress
  let staffSection = "";
  if (data.staff_progress && data.staff_progress.length > 0) {
    const blocks: string[] = [];
    for (const sp of data.staff_progress) {
      const wPercent = sp.weekly_target && sp.weekly_target > 0
        ? Math.round((sp.weekly_actual / sp.weekly_target) * 100)
        : null;
      const mPercent = sp.monthly_target && sp.monthly_target > 0
        ? Math.round((sp.monthly_actual / sp.monthly_target) * 100)
        : null;

      let memberBlock = `👤 <b>${escapeHtml(sp.staff_name)}</b>\n`;
      memberBlock += ` • Ventes du jour : <b>${formatMoney(sp.today_sales)}</b>\n`;

      if (sp.weekly_target && wPercent !== null) {
        memberBlock += ` • Hebdo : ${formatMoney(sp.weekly_actual)} / ${formatMoney(sp.weekly_target)}\n   ${buildProgressBar(wPercent)}\n`;
      } else {
        memberBlock += ` • Ventes semaine : ${formatMoney(sp.weekly_actual)}\n`;
      }

      if (sp.monthly_target && mPercent !== null) {
        memberBlock += ` • Mensuel : ${formatMoney(sp.monthly_actual)} / ${formatMoney(sp.monthly_target)}\n   ${buildProgressBar(mPercent)}`;
      } else {
        memberBlock += ` • Ventes mois : ${formatMoney(sp.monthly_actual)}`;
      }

      blocks.push(memberBlock);
    }

    staffSection =
      `\n━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 <b>PROGRESSION DES OBJECTIFS STAFF</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      blocks.join("\n\n");
  }

  return (
    `📊 <b>RAPPORT DU ${dateStr}</b>\n\n` +
    `🏪 <b>${escapeHtml(data.store_name)}</b>\n\n` +
    `👤 <b>Opérateurs :</b> ${operatorsStr}\n\n` +
    `💰 <b>Solde trouvé en caisse ce matin :</b> ${formatMoney(data.opening_cash)}\n\n` +
    `📥 <b>Entrées du jour :</b>\n` +
    `${inflowLines}\n` +
    ` ──────────────────────────\n` +
    ` <b>Total entré : ${formatMoney(totalInflow)}</b>\n\n` +
    `📤 <b>Sorties du jour :</b>\n` +
    `${outflowLines}\n` +
    ` ──────────────────────────\n` +
    ` <b>Total sorti : ${formatMoney(totalOutflow)}</b>\n\n` +
    `💵 <b>Reste en caisse ce soir : ${formatMoney(closingCash)}</b>\n` +
    debtsSection +
    obsSection +
    staffSection
  );
}

/**
 * Converts Telegram HTML formatted report into clean WhatsApp-compatible text with native asterisks and line formats.
 */
export function formatDailyCashReportForWhatsApp(data: CashReportData): string {
  const telegramHtml = formatDailyCashReport(data);
  return telegramHtml
    .replace(/<b>(.*?)<\/b>/gi, "*$1*")
    .replace(/<i>(.*?)<\/i>/gi, "_$1_")
    .replace(/<code>(.*?)<\/code>/gi, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export type CrActionType = "OPEN" | "OPS" | "IN" | "OUT" | "OUT_PRESET" | "ADDDEBT" | "DEBT_STEP1" | "DEBT_STEP2" | "DEBT_STEP3" | "PAYDEBT" | "OBS";

export interface CrTag {
  action: CrActionType;
  targetId: string; // store_id or debt_id
}

export function parseCrTag(text: string): CrTag | null {
  const match = text.match(/#CR_(OPEN|OPS|IN|OUT|ADDDEBT|PAYDEBT|OBS):([0-9a-f-]{36})\s*$/);
  if (!match) return null;
  return {
    action: match[1] as CrActionType,
    targetId: match[2]
  };
}

export function crPrompt(action: CrActionType, targetId: string, instructions: string): string {
  return `${instructions}\n\n#CR_${action}:${targetId}`;
}

