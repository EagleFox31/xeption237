import { REVENUE_DEFINITION_SHORT } from './dashboardAnalytics';

export type TargetPeriodKind = 'daily' | 'monthly';
export type TargetScopeType = 'staff' | 'store';

export interface TargetProgressSlice {
  target_id: string | null;
  target_amount: number | null;
  actual_amount: number;
  achievement_percent: number | null;
  remaining: number | null;
  achieved: boolean;
}

export interface BonusRuleRow {
  id: string;
  label: string;
  min_achievement_percent: number;
  bonus_amount: number;
  sort_order: number;
  active: boolean;
}

export interface StaffBonusStatus {
  rule_id: string;
  label: string;
  min_achievement_percent: number;
  bonus_amount: number;
  earned: boolean;
}

export interface StaffTargetProgress {
  staff_id: string;
  staff_name: string;
  store_id: string | null;
  store_name: string | null;
  daily: TargetProgressSlice | null;
  monthly: TargetProgressSlice | null;
  monthly_bonuses: StaffBonusStatus[];
}

export interface StoreTargetProgress {
  store_id: string;
  store_name: string;
  daily: TargetProgressSlice | null;
  monthly: TargetProgressSlice | null;
}

export interface SalesTargetsProgress {
  period: {
    day_from: string;
    day_to: string;
    month_from: string;
    month_to: string;
  };
  bonus_rules: BonusRuleRow[];
  staff: StaffTargetProgress[];
  stores: StoreTargetProgress[];
}

const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const parseSlice = (raw: unknown): TargetProgressSlice | null => {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    target_id: (o.target_id as string | null) ?? null,
    target_amount: o.target_amount != null ? num(o.target_amount) : null,
    actual_amount: num(o.actual_amount),
    achievement_percent: o.achievement_percent != null ? num(o.achievement_percent) : null,
    remaining: o.remaining != null ? num(o.remaining) : null,
    achieved: Boolean(o.achieved),
  };
};

export const parseSalesTargetsProgress = (data: unknown): SalesTargetsProgress => {
  const d = (data ?? {}) as Record<string, unknown>;
  const period = (d.period ?? {}) as Record<string, string>;

  return {
    period: {
      day_from: period.day_from ?? '',
      day_to: period.day_to ?? '',
      month_from: period.month_from ?? '',
      month_to: period.month_to ?? '',
    },
    bonus_rules: ((d.bonus_rules ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      label: String(r.label ?? ''),
      min_achievement_percent: num(r.min_achievement_percent),
      bonus_amount: num(r.bonus_amount),
      sort_order: num(r.sort_order),
      active: r.active !== false,
    })),
    staff: ((d.staff ?? []) as Record<string, unknown>[]).map((s) => ({
      staff_id: String(s.staff_id),
      staff_name: String(s.staff_name ?? ''),
      store_id: (s.store_id as string | null) ?? null,
      store_name: (s.store_name as string | null) ?? null,
      daily: parseSlice(s.daily),
      monthly: parseSlice(s.monthly),
      monthly_bonuses: ((s.monthly_bonuses ?? []) as Record<string, unknown>[]).map((b) => ({
        rule_id: String(b.rule_id),
        label: String(b.label ?? ''),
        min_achievement_percent: num(b.min_achievement_percent),
        bonus_amount: num(b.bonus_amount),
        earned: Boolean(b.earned),
      })),
    })),
    stores: ((d.stores ?? []) as Record<string, unknown>[]).map((s) => ({
      store_id: String(s.store_id),
      store_name: String(s.store_name ?? ''),
      daily: parseSlice(s.daily),
      monthly: parseSlice(s.monthly),
    })),
  };
};

export const formatFcfaShort = (n: number) =>
  `${Math.round(n).toLocaleString('fr-FR')} F`;

export const formatAchievementPercent = (percent: number | null) =>
  percent == null ? '—' : `${percent.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;

export const TARGET_REVENUE_HINT = REVENUE_DEFINITION_SHORT;

export const periodKindLabel: Record<TargetPeriodKind, string> = {
  daily: 'Journalier',
  monthly: 'Mensuel',
};

export const scopeTypeLabel: Record<TargetScopeType, string> = {
  staff: 'Vendeur',
  store: 'Boutique',
};
