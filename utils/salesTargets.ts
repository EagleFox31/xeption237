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

/**
 * Prime effectivement due pour le mois — **un seul palier, le plus haut atteint**.
 *
 * Les paliers ne se cumulent PAS : à 130 % d'un objectif, les paliers 100 % et
 * 120 % sont tous deux franchis, mais seul le second est versé (30 000 F, pas
 * 45 000). Règle arbitrée par la direction le 2026-09-06.
 *
 * Elle n'était écrite nulle part : ni `ROADMAP_ERP.md` §7, ni UC-V-03, ni
 * UC-D-04 ne disent ce qu'on VERSE — ils décrivent un tableau de bord (seuils,
 * taux d'atteinte) et s'arrêtent là. La base, de son côté, se contente de
 * marquer chaque règle « atteinte ou non ». Le montant dû n'existait donc nulle
 * part, et deux personnes lisant le même écran pouvaient calculer deux paies
 * différentes. C'est ici, et seulement ici, qu'il est désormais décidé.
 *
 * Départage : le seuil le plus élevé gagne ; à seuil égal, le montant le plus
 * élevé — deux règles au même seuil sont une erreur de saisie, mais il vaut
 * mieux un choix stable qu'un ordre dépendant de la base.
 */
export const awardedBonus = (
  bonuses: StaffBonusStatus[] | null | undefined,
): StaffBonusStatus | null => {
  const acquis = (bonuses ?? []).filter((b) => b.earned);
  if (acquis.length === 0) return null;
  return acquis.reduce((meilleur, b) =>
    b.min_achievement_percent > meilleur.min_achievement_percent ||
    (b.min_achievement_percent === meilleur.min_achievement_percent &&
      b.bonus_amount > meilleur.bonus_amount)
      ? b
      : meilleur,
  );
};

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
