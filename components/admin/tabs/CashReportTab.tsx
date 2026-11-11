import React from 'react';
import { RefreshCw, Wallet, TrendingUp, TrendingDown, Landmark, CalendarCheck, Crown } from 'lucide-react';
import { useCashReportStats } from '../../../hooks/admin/useCashReportStats';
import { adminUi } from '../shared/adminUi';
import StatCard from '../shared/StatCard';
import { formatFcfa } from '../../../utils/dashboardAnalytics';
import type { CashPeriodPreset } from '../../../utils/cashReportStats';

const PERIODS: { value: CashPeriodPreset; label: string }[] = [
  { value: 'all', label: 'Depuis le début' },
  { value: 'thisMonth', label: 'Mois en cours' },
  { value: 'lastMonth', label: 'Mois précédent' },
  { value: 'last30', label: '30 jours' },
  { value: 'last90', label: '90 jours' },
];

const MONTH_FORMATTER = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

const formatMonth = (month: string): string => MONTH_FORMATTER.format(new Date(`${month}-01T00:00:00Z`));
const formatDate = (iso: string): string => DATE_FORMATTER.format(new Date(`${iso}T00:00:00Z`));
const pct = (ratio: number | null): string => (ratio === null ? '—' : `${(ratio * 100).toFixed(0)} %`);
const money = (n: number | null): string => (n === null ? '—' : formatFcfa(n));

const thClass = 'px-3 py-2 text-left text-[10px] font-tech uppercase tracking-widest text-white/60 whitespace-nowrap';
const tdClass = 'px-3 py-2 text-sm text-white/85 whitespace-nowrap';
const tdNum = `${tdClass} text-right tabular-nums`;

const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <section className="rounded-sm border border-white/10 bg-white/[0.02] p-4">
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
  const latestDebts = monthEndDebts.length > 0 ? monthEndDebts[monthEndDebts.length - 1] : null;
  const storeColumns = totals.map((t) => ({ id: t.storeId, name: t.storeName }));
  const maxWeekday = Math.max(1, ...weekdays.map((d) => d.avgInflow ?? 0));

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
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={stats.storeId}
            onChange={(e) => stats.setStoreId(e.target.value)}
            className={`${adminUi.input} w-auto min-w-[10rem]`}
            aria-label="Boutique"
          >
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
            className={`${adminUi.input} w-auto min-w-[10rem]`}
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
            className="p-2 rounded-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${stats.isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Entrées" value={formatFcfa(grandInflow)} icon={TrendingUp} tone="gold" />
        <StatCard label="Sorties" value={formatFcfa(grandOutflow)} icon={TrendingDown} tone="white" />
        <StatCard label="Caisse finale" value={formatFcfa(grandCash)} sub="Somme des dernières clôtures" icon={Landmark} tone="cyan" />
        <StatCard
          label="Dettes en cours"
          value={latestDebts ? formatFcfa(latestDebts.total) : '—'}
          sub={latestDebts ? `Fin ${formatMonth(latestDebts.month)}` : undefined}
          icon={Crown}
          tone={latestDebts && latestDebts.total > 0 ? 'red' : 'green'}
        />
      </div>

      <Section title="Totaux par boutique" hint="Depuis le premier rapport de la sélection">
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
                  <td className={`${tdNum} text-amber-300`}>{formatFcfa(t.inflow)}</td>
                  <td className={tdNum}>{formatFcfa(t.outflow)}</td>
                  <td className={`${tdNum} ${t.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatFcfa(t.net)}</td>
                  <td className={tdNum}>{formatFcfa(t.finalCash)}</td>
                  <td className={tdNum}>{formatFcfa(t.avgInflowPerDay)}</td>
                  <td className={tdClass}>
                    {t.bestDay ? `${formatDate(t.bestDay.date)} · ${formatFcfa(t.bestDay.amount)}` : '—'}
                  </td>
                  <td className={`${tdNum} ${t.zeroDays > 0 ? 'text-rose-300' : ''}`}>{t.zeroDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Section title="Entrées mensuelles par boutique">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={thClass}>Mois</th>
                  {storeColumns.map((s) => (
                    <th key={s.id} className={`${thClass} text-right`}>{s.name}</th>
                  ))}
                  <th className={`${thClass} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {monthlyInflow.length === 0 && <EmptyRow colSpan={storeColumns.length + 2} />}
                {monthlyInflow.map((m) => (
                  <tr key={m.month} className="border-b border-white/5">
                    <td className={`${tdClass} capitalize`}>{formatMonth(m.month)}</td>
                    {storeColumns.map((s) => (
                      <td key={s.id} className={tdNum}>{m.byStore[s.id] !== undefined ? formatFcfa(m.byStore[s.id]) : '—'}</td>
                    ))}
                    <td className={`${tdNum} font-semibold text-amber-300`}>{formatFcfa(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Restant dû des dettes en fin de mois" hint="Dernier rapport du mois de chaque boutique">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={thClass}>Mois</th>
                  {storeColumns.map((s) => (
                    <th key={s.id} className={`${thClass} text-right`}>{s.name}</th>
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
                        <td key={s.id} className={tdNum} title={cell ? `${cell.count} dette(s) au ${formatDate(cell.reportDate)}` : undefined}>
                          {cell ? formatFcfa(cell.amount) : '—'}
                        </td>
                      );
                    })}
                    <td className={`${tdNum} font-semibold ${m.total > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{formatFcfa(m.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Section title="Entrée moyenne par jour de semaine" hint="Moyenne des rapports du jour concerné">
          <ol className="space-y-2">
            {weekdays.map((d) => {
              const width = d.avgInflow === null ? 0 : (d.avgInflow / maxWeekday) * 100;
              return (
                <li key={d.index} className="flex items-center gap-3 text-sm">
                  <span className="w-20 shrink-0 text-xs text-white/70 font-tech uppercase tracking-wider">{d.label}</span>
                  <div className="flex-1 relative h-7 rounded-sm bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500/70 to-amber-400/50 transition-all"
                      style={{ width: `${width}%` }}
                    />
                    <span className="absolute inset-y-0 left-2 flex items-center text-xs text-white tabular-nums">
                      {money(d.avgInflow)}
                      <span className="ml-2 text-white/40">({d.reports} j)</span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </Section>

        <Section title="Part des sorties « boss »" hint="Lignes de sortie dont le libellé contient « boss »">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold font-tech text-amber-300 tabular-nums">{pct(bossShare.share)}</span>
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
                  <td className={`${tdNum} font-semibold`}>{pct(s.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      <Section title="Couverture des rapports" hint="Jours renseignés rapportés aux jours calendaires jusqu'au dernier rapport">
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
              {coverage.map((c) => (
                <tr key={c.storeId} className="border-b border-white/5">
                  <td className={`${tdClass} font-semibold`}>{c.storeName}</td>
                  <td className={tdClass}>
                    {formatDate(c.firstDate)} → {formatDate(c.lastDate)}
                  </td>
                  <td className={tdNum}>{c.calendarDays}</td>
                  <td className={tdNum}>{c.reportedDays}</td>
                  <td className={`${tdNum} ${c.missingDays > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{c.missingDays}</td>
                  <td className={`${tdNum} font-semibold`}>
                    <span className="inline-flex items-center gap-1">
                      <CalendarCheck className="w-3.5 h-3.5 text-white/40" />
                      {pct(c.coverage)}
                    </span>
                  </td>
                  <td className={`${tdClass} text-xs text-white/55`}>
                    {Object.entries(c.bySource)
                      .map(([src, n]) => `${src === 'whatsapp_backfill' ? 'WhatsApp' : src === 'bot' ? 'Bot' : src} ${n}`)
                      .join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
};

export default CashReportTab;
