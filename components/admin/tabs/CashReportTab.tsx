import React from 'react';
import { RefreshCw, Wallet, TrendingUp, TrendingDown, Landmark, Crown } from 'lucide-react';
import { useCashReportStats } from '../../../hooks/admin/useCashReportStats';
import StatCard from '../shared/StatCard';
import BarChart, { SERIES_PALETTE, type BarChartSeries } from '../shared/charts/BarChart';
import { formatFcfa } from '../../../utils/dashboardAnalytics';
import type { CashPeriodPreset } from '../../../utils/cashReportStats';
import {
  average,
  bossShareTone,
  burdenTone,
  coverageTone,
  signTone,
  versusAverageTone,
  type FigureTone,
} from '../../../utils/cashReportTones';

const PERIODS: { value: CashPeriodPreset; label: string }[] = [
  { value: 'all', label: 'Depuis le début' },
  { value: 'thisMonth', label: 'Mois en cours' },
  { value: 'lastMonth', label: 'Mois précédent' },
  { value: 'last30', label: '30 jours' },
  { value: 'last90', label: '90 jours' },
];

const MONTH_FORMATTER = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const MONTH_SHORT_FORMATTER = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const MILLION = 1_000_000;
const THOUSAND = 1_000;

const formatMonth = (month: string): string => MONTH_FORMATTER.format(new Date(`${month}-01T00:00:00Z`));
const formatMonthShort = (month: string): string => MONTH_SHORT_FORMATTER.format(new Date(`${month}-01T00:00:00Z`));
const formatDate = (iso: string): string => DATE_FORMATTER.format(new Date(`${iso}T00:00:00Z`));
const pct = (ratio: number | null): string => (ratio === null ? '—' : `${(ratio * 100).toFixed(0)} %`);
/** Libellé d'axe compact : « 1,2 M », « 450 k ». */
const formatTick = (n: number): string =>
  n >= MILLION
    ? `${(n / MILLION).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`
    : n >= THOUSAND
      ? `${Math.round(n / THOUSAND)} k`
      : `${Math.round(n)}`;

const TONE_CLASS: Record<FigureTone, string> = {
  good: 'text-emerald-300',
  neutral: 'text-white/85',
  bad: 'text-rose-300',
};
const toneClass = (tone: FigureTone): string => TONE_CLASS[tone];
const TONE_BAR_CLASS: Record<FigureTone, string> = {
  good: 'bg-emerald-400',
  neutral: 'bg-amber-400',
  bad: 'bg-rose-400',
};

const SOURCE_LABELS: Record<string, string> = { whatsapp_backfill: 'WhatsApp', bot: 'Bot' };
const INFLOW_COLOR = '#34d399';
const OUTFLOW_COLOR = '#fb7185';
const GOLD = '#FFD700';

/** Select compact (sans le `w-full` de `adminUi.input`) pour tenir sur une ligne. */
const selectClass =
  'rounded-md bg-[#0d0d12] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-xeption-gold/60 focus:ring-2 focus:ring-xeption-gold/20 transition-colors';
const thClass = 'px-3 py-2 text-left text-[10px] font-tech uppercase tracking-widest text-white/60 whitespace-nowrap';
const tdClass = 'px-3 py-2 text-sm text-white/85 whitespace-nowrap';
const tdNum = `${tdClass} text-right tabular-nums`;

const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <section className="rounded-lg border border-white/15 bg-[#0d0d12] shadow-lg shadow-black/40 p-4">
    <div className="flex items-center justify-between gap-3 mb-3">
      <h3 className="text-[11px] font-tech uppercase tracking-widest text-white/80">{title}</h3>
      {hint && <p className="text-[10px] font-sans text-white/40 text-right">{hint}</p>}
    </div>
    {children}
  </section>
);

const EmptyRow: React.FC<{ colSpan: number }> = ({ colSpan }) => (
  <tr>
    <td colSpan={colSpan} className={`${tdClass} text-center text-white/45 py-6`}>
      Aucun rapport sur la sélection.
    </td>
  </tr>
);

const CashReportTab: React.FC = () => {
  const stats = useCashReportStats();
  const { totals, monthlyInflow, monthEndDebts, weekdays, bossShare, coverage } = stats;

  const grandInflow = totals.reduce((s, t) => s + t.inflow, 0);
  const grandOutflow = totals.reduce((s, t) => s + t.outflow, 0);
  const grandCash = totals.reduce((s, t) => s + t.finalCash, 0);
  const grandNet = grandInflow - grandOutflow;
  const latestDebts = monthEndDebts.length > 0 ? monthEndDebts[monthEndDebts.length - 1] : null;
  const storeColumns = totals.map((t, i) => ({
    id: t.storeId,
    name: t.storeName,
    color: SERIES_PALETTE[i % SERIES_PALETTE.length],
  }));

  const avgDailyAcrossStores = average(totals.map((t) => t.avgInflowPerDay));
  const monthlyTotalAvg = average(monthlyInflow.map((m) => m.total));
  const storeMonthlyAvg: Record<string, number> = Object.fromEntries(
    storeColumns.map((s) => [
      s.id,
      average(monthlyInflow.map((m) => m.byStore[s.id]).filter((v): v is number => v !== undefined)),
    ]),
  );
  const weekdayAvg = average(weekdays.map((d) => d.avgInflow).filter((v): v is number => v !== null));

  const storeFlowSeries: BarChartSeries[] = [
    { key: 'in', label: 'Entrées', color: INFLOW_COLOR, values: totals.map((t) => t.inflow) },
    { key: 'out', label: 'Sorties', color: OUTFLOW_COLOR, values: totals.map((t) => t.outflow) },
  ];
  const monthlySeries: BarChartSeries[] = storeColumns.map((s) => ({
    key: s.id,
    label: s.name,
    color: s.color,
    values: monthlyInflow.map((m) => m.byStore[s.id] ?? 0),
  }));
  const debtsSeries: BarChartSeries[] = storeColumns.map((s) => ({
    key: s.id,
    label: s.name,
    color: s.color,
    values: monthEndDebts.map((m) => m.byStore[s.id]?.amount ?? 0),
  }));
  const weekdaySeries: BarChartSeries[] = [
    { key: 'avg', label: 'Entrée moyenne', color: GOLD, values: weekdays.map((d) => d.avgInflow ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-tech text-white uppercase tracking-widest flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-400" />
            Bilan caisse
          </h2>
          <p className="text-xs text-white/50 mt-1 font-sans">
            {stats.reportCount} rapport{stats.reportCount > 1 ? 's' : ''} sur la sélection
            {stats.totalReportCount !== stats.reportCount ? ` · ${stats.totalReportCount} au total` : ''} · données live
          </p>
        </div>
        <div className="flex flex-row flex-wrap items-center gap-2">
          <select value={stats.storeId} onChange={(e) => stats.setStoreId(e.target.value)} className={selectClass} aria-label="Boutique">
            <option value="">Toutes les boutiques</option>
            {stats.stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={stats.period}
            onChange={(e) => stats.setPeriod(e.target.value as CashPeriodPreset)}
            className={selectClass}
            aria-label="Période"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void stats.refresh()}
            disabled={stats.isLoading}
            className="p-2 rounded-md border border-white/15 bg-[#0d0d12] text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${stats.isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard solid label="Entrées" value={formatFcfa(grandInflow)} icon={TrendingUp} tone="green" />
        <StatCard
          solid
          label="Sorties"
          value={formatFcfa(grandOutflow)}
          sub={`Net ${grandNet >= 0 ? '+' : ''}${formatFcfa(grandNet)}`}
          icon={TrendingDown}
          tone={grandNet >= 0 ? 'white' : 'red'}
        />
        <StatCard solid label="Caisse finale" value={formatFcfa(grandCash)} sub="Somme des dernières clôtures" icon={Landmark} tone="gold" />
        <StatCard
          solid
          label="Dettes en cours"
          value={latestDebts ? formatFcfa(latestDebts.total) : '—'}
          sub={latestDebts ? `Fin ${formatMonth(latestDebts.month)}` : undefined}
          icon={Crown}
          tone={latestDebts && latestDebts.total > 0 ? 'red' : 'green'}
        />
      </div>

      <Section title="Entrées vs sorties par boutique" hint="Vert = entrées · rouge = sorties">
        <BarChart categories={totals.map((t) => t.storeName)} series={storeFlowSeries} formatValue={formatFcfa} formatTick={formatTick} height={200} />
      </Section>

      <Section title="Totaux par boutique" hint="Moy. / jour : vert = au-dessus de la moyenne des boutiques, rouge = en dessous">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className={thClass}>Boutique</th>
                <th className={`${thClass} text-right`}>Jours</th>
                <th className={`${thClass} text-right`}>Entrées</th>
                <th className={`${thClass} text-right`}>Sorties</th>
                <th className={`${thClass} text-right`}>Net</th>
                <th className={`${thClass} text-right`}>Caisse finale</th>
                <th className={`${thClass} text-right`}>Moy. / jour</th>
                <th className={thClass}>Meilleur jour</th>
                <th className={`${thClass} text-right`}>Jours à 0</th>
              </tr>
            </thead>
            <tbody>
              {totals.length === 0 && <EmptyRow colSpan={9} />}
              {totals.map((t) => (
                <tr key={t.storeId} className="border-b border-white/5">
                  <td className={`${tdClass} font-semibold`}>
                    {t.storeName}
                    <span className="block text-[10px] text-white/40">
                      {formatDate(t.firstDate)} → {formatDate(t.lastDate)}
                    </span>
                  </td>
                  <td className={tdNum}>{t.days}</td>
                  <td className={`${tdNum} text-emerald-300`}>{formatFcfa(t.inflow)}</td>
                  <td className={`${tdNum} text-rose-300`}>{formatFcfa(t.outflow)}</td>
                  <td className={`${tdNum} font-semibold ${toneClass(signTone(t.net))}`}>{formatFcfa(t.net)}</td>
                  <td className={`${tdNum} text-amber-300`}>{formatFcfa(t.finalCash)}</td>
                  <td className={`${tdNum} ${toneClass(versusAverageTone(t.avgInflowPerDay, avgDailyAcrossStores))}`}>
                    {formatFcfa(t.avgInflowPerDay)}
                  </td>
                  <td className={tdClass}>
                    {t.bestDay ? (
                      <>
                        {formatDate(t.bestDay.date)} · <span className="text-emerald-300">{formatFcfa(t.bestDay.amount)}</span>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={`${tdNum} font-semibold ${toneClass(burdenTone(t.zeroDays))}`}>{t.zeroDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Section title="Entrées mensuelles par boutique" hint="Vert = mois au-dessus de la moyenne de la boutique, rouge = en dessous">
          <BarChart
            categories={monthlyInflow.map((m) => formatMonthShort(m.month))}
            series={monthlySeries}
            formatValue={formatFcfa}
            formatTick={formatTick}
            height={220}
          />
          <div className="overflow-x-auto mt-3">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={thClass}>Mois</th>
                  {storeColumns.map((s) => (
                    <th key={s.id} className={`${thClass} text-right`}>
                      {s.name}
                    </th>
                  ))}
                  <th className={`${thClass} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {monthlyInflow.length === 0 && <EmptyRow colSpan={storeColumns.length + 2} />}
                {monthlyInflow.map((m) => (
                  <tr key={m.month} className="border-b border-white/5">
                    <td className={`${tdClass} capitalize`}>{formatMonth(m.month)}</td>
                    {storeColumns.map((s) => {
                      const v = m.byStore[s.id];
                      return (
                        <td key={s.id} className={`${tdNum} ${v === undefined ? '' : toneClass(versusAverageTone(v, storeMonthlyAvg[s.id]))}`}>
                          {v !== undefined ? formatFcfa(v) : '—'}
                        </td>
                      );
                    })}
                    <td className={`${tdNum} font-semibold ${toneClass(versusAverageTone(m.total, monthlyTotalAvg))}`}>{formatFcfa(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Restant dû des dettes en fin de mois" hint="Dernier rapport du mois de chaque boutique · vert = aucune dette">
          <BarChart
            categories={monthEndDebts.map((m) => formatMonthShort(m.month))}
            series={debtsSeries}
            stacked
            formatValue={formatFcfa}
            formatTick={formatTick}
            height={220}
          />
          <div className="overflow-x-auto mt-3">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={thClass}>Mois</th>
                  {storeColumns.map((s) => (
                    <th key={s.id} className={`${thClass} text-right`}>
                      {s.name}
                    </th>
                  ))}
                  <th className={`${thClass} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {monthEndDebts.length === 0 && <EmptyRow colSpan={storeColumns.length + 2} />}
                {monthEndDebts.map((m) => (
                  <tr key={m.month} className="border-b border-white/5">
                    <td className={`${tdClass} capitalize`}>{formatMonth(m.month)}</td>
                    {storeColumns.map((s) => {
                      const cell = m.byStore[s.id];
                      return (
                        <td
                          key={s.id}
                          className={`${tdNum} ${cell ? toneClass(burdenTone(cell.amount)) : ''}`}
                          title={cell ? `${cell.count} dette(s) au ${formatDate(cell.reportDate)}` : undefined}
                        >
                          {cell ? formatFcfa(cell.amount) : '—'}
                        </td>
                      );
                    })}
                    <td className={`${tdNum} font-semibold ${toneClass(burdenTone(m.total))}`}>{formatFcfa(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Section title="Entrée moyenne par jour de semaine" hint="Vert = au-dessus de la moyenne hebdo, rouge = en dessous">
          <BarChart
            categories={weekdays.map((d) => d.label.slice(0, 3))}
            series={weekdaySeries}
            formatValue={formatFcfa}
            formatTick={formatTick}
            height={200}
          />
          <ul className="grid grid-cols-7 gap-1 mt-2 text-center">
            {weekdays.map((d) => (
              <li key={d.index}>
                <p
                  className={`text-xs tabular-nums font-semibold ${
                    d.avgInflow === null ? 'text-white/40' : toneClass(versusAverageTone(d.avgInflow, weekdayAvg))
                  }`}
                >
                  {d.avgInflow === null ? '—' : formatTick(d.avgInflow)}
                </p>
                <p className="text-[10px] text-white/40">{d.reports} j</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Part des sorties « boss »" hint="Libellés de sortie contenant « boss » · vert ≤ 15 %, rouge > 30 %">
          <div className="flex items-baseline gap-3 mb-4">
            <span className={`text-3xl font-bold font-tech tabular-nums ${toneClass(bossShareTone(bossShare.share))}`}>
              {pct(bossShare.share)}
            </span>
            <span className="text-xs text-white/55">
              {formatFcfa(bossShare.bossOutflow)} sur {formatFcfa(bossShare.totalOutflow)} de sorties
            </span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className={thClass}>Boutique</th>
                <th className={`${thClass} text-right`}>Boss</th>
                <th className={`${thClass} text-right`}>Sorties</th>
                <th className={`${thClass} text-right`}>Part</th>
              </tr>
            </thead>
            <tbody>
              {bossShare.byStore.length === 0 && <EmptyRow colSpan={4} />}
              {bossShare.byStore.map((s) => (
                <tr key={s.storeId} className="border-b border-white/5">
                  <td className={tdClass}>{s.storeName}</td>
                  <td className={tdNum}>{formatFcfa(s.bossOutflow)}</td>
                  <td className={tdNum}>{formatFcfa(s.totalOutflow)}</td>
                  <td className={`${tdNum} font-semibold ${toneClass(bossShareTone(s.share))}`}>{pct(s.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      <Section title="Couverture des rapports" hint="Jours renseignés / jours calendaires · vert ≥ 90 %, rouge < 70 %">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className={thClass}>Boutique</th>
                <th className={thClass}>Période</th>
                <th className={`${thClass} text-right`}>Jours calendaires</th>
                <th className={`${thClass} text-right`}>Renseignés</th>
                <th className={`${thClass} text-right`}>Manquants</th>
                <th className={`${thClass} text-right`}>Couverture</th>
                <th className={thClass}>Source</th>
              </tr>
            </thead>
            <tbody>
              {coverage.length === 0 && <EmptyRow colSpan={7} />}
              {coverage.map((c) => {
                const tone = coverageTone(c.coverage);
                return (
                  <tr key={c.storeId} className="border-b border-white/5">
                    <td className={`${tdClass} font-semibold`}>{c.storeName}</td>
                    <td className={tdClass}>
                      {formatDate(c.firstDate)} → {formatDate(c.lastDate)}
                    </td>
                    <td className={tdNum}>{c.calendarDays}</td>
                    <td className={`${tdNum} text-emerald-300`}>{c.reportedDays}</td>
                    <td className={`${tdNum} ${toneClass(burdenTone(c.missingDays))}`}>{c.missingDays}</td>
                    <td className={`${tdNum} font-semibold ${toneClass(tone)}`}>
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <span className={`block h-full ${TONE_BAR_CLASS[tone]}`} style={{ width: `${Math.round((c.coverage ?? 0) * 100)}%` }} />
                        </span>
                        {pct(c.coverage)}
                      </span>
                    </td>
                    <td className={`${tdClass} text-xs text-white/55`}>
                      {Object.entries(c.bySource)
                        .map(([src, n]) => `${SOURCE_LABELS[src] ?? src} ${n}`)
                        .join(' · ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};

export default CashReportTab;
