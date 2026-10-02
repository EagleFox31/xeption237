import React from 'react';
import { RefreshCw, TrendingUp, Timer, TrendingDown, Target, BarChart3, ExternalLink } from 'lucide-react';
import { useTrocFunnelData, type FunnelPeriod } from '../../../hooks/admin/useTrocFunnelData';

const PERIODS: { value: FunnelPeriod; label: string }[] = [
  { value: 7,     label: '7 jours' },
  { value: 30,    label: '30 jours' },
  { value: 90,    label: '90 jours' },
  { value: 'all', label: 'Tout' },
];

const pct = (ratio: number): string => `${(ratio * 100).toFixed(1)} %`;
const int = (n: number): string => new Intl.NumberFormat('fr-FR').format(n);
const formatDays = (d: number | null): string =>
  d == null ? '—' : d < 1 ? `${(d * 24).toFixed(1)} h` : `${d.toFixed(1)} j`;

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: 'gold' | 'green' | 'red' | 'blue';
}

const TONE_CLASSES: Record<KpiCardProps['tone'], string> = {
  gold:  'from-amber-500/15 to-amber-500/5 border-amber-500/25 text-amber-300',
  green: 'from-emerald-500/15 to-emerald-500/5 border-emerald-500/25 text-emerald-300',
  red:   'from-rose-500/15 to-rose-500/5 border-rose-500/25 text-rose-300',
  blue:  'from-sky-500/15 to-sky-500/5 border-sky-500/25 text-sky-300',
};

const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon, tone }) => (
  <div className={`rounded-sm border bg-gradient-to-br ${TONE_CLASSES[tone]} p-4 flex items-start gap-3`}>
    <div className="shrink-0 opacity-80 mt-0.5">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] font-tech uppercase tracking-widest text-white/60">{label}</p>
      <p className="text-2xl font-bold font-tech text-white mt-1 leading-tight">{value}</p>
    </div>
  </div>
);

export const TrocDashboardTab: React.FC = () => {
  const { isLoading, period, setPeriod, kpis, funnel, submissionsPerDay, refresh, requestsCount } =
    useTrocFunnelData(30);

  const maxDay = Math.max(1, ...submissionsPerDay.map((d) => d.count));
  const maxFunnel = Math.max(1, ...funnel.map((s) => s.count));

  return (
    <div className="space-y-6">
      {/* Header + filtres */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-tech text-white uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            Conversion SMART TROC
          </h2>
          <p className="text-xs text-white/50 mt-1 font-sans">
            {requestsCount} dossier{requestsCount > 1 ? 's' : ''} sur la période · données live
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-sm border border-white/15 overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={String(p.value)}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-[11px] font-tech uppercase tracking-wider transition-colors ${
                  period === p.value
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-white/70 hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            className="p-2 rounded-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Soumissions"
          value={int(kpis.totalSubmissions)}
          icon={<Target className="w-4 h-4" />}
          tone="blue"
        />
        <KpiCard
          label="Taux de conversion"
          value={pct(kpis.conversionRate)}
          icon={<TrendingUp className="w-4 h-4" />}
          tone="green"
        />
        <KpiCard
          label="Taux d'abandon"
          value={pct(kpis.abandonRate)}
          icon={<TrendingDown className="w-4 h-4" />}
          tone="red"
        />
        <KpiCard
          label="Temps médian clôture"
          value={formatDays(kpis.medianDaysToComplete)}
          icon={<Timer className="w-4 h-4" />}
          tone="gold"
        />
      </div>

      {/* Funnel bars */}
      <div className="rounded-sm border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-tech uppercase tracking-widest text-white/80">
            Pipeline — décroissance par étape
          </h3>
          <p className="text-[10px] font-sans text-white/40">
            % entre parenthèses = conversion depuis l'étape précédente
          </p>
        </div>
        <ol className="space-y-2">
          {funnel.map((step) => {
            const width = (step.count / maxFunnel) * 100;
            return (
              <li key={step.status} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-xs text-white/70 font-tech uppercase tracking-wider">
                  {step.label}
                </span>
                <div className="flex-1 relative h-7 rounded-sm bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500/70 to-amber-400/50 transition-all"
                    style={{ width: `${width}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-3 text-xs font-tech text-white">
                    {int(step.count)}
                    {step.pctFromPrev != null && (
                      <span className="ml-2 text-white/60">
                        ({step.pctFromPrev.toFixed(0)} %)
                      </span>
                    )}
                  </span>
                </div>
                <span className="w-14 shrink-0 text-right text-xs text-white/50 font-tech">
                  {step.pctFromEntry.toFixed(0)} %
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Timeline submissions/jour */}
      <div className="rounded-sm border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-[11px] font-tech uppercase tracking-widest text-white/80 mb-4">
          Soumissions par jour ({period === 'all' ? '90 derniers jours' : `${period} derniers jours`})
        </h3>
        <div className="flex items-end gap-0.5 h-32">
          {submissionsPerDay.map((d) => {
            const h = (d.count / maxDay) * 100;
            return (
              <div
                key={d.date}
                className="flex-1 min-w-0 flex flex-col items-center group relative"
                title={`${d.date} : ${d.count}`}
              >
                <div
                  className="w-full bg-amber-500/40 hover:bg-amber-400/70 transition-colors rounded-t-sm"
                  style={{ height: `${Math.max(h, 2)}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-white/40 font-sans mt-2">
          <span>{submissionsPerDay[0]?.date ?? ''}</span>
          <span>{submissionsPerDay[submissionsPerDay.length - 1]?.date ?? ''}</span>
        </div>
      </div>

      {/* Note GA4 */}
      <div className="rounded-sm border border-sky-500/20 bg-sky-500/5 p-4">
        <h3 className="text-[11px] font-tech uppercase tracking-widest text-sky-300 mb-2">
          Métriques amont (vues, abandons par step)
        </h3>
        <p className="text-xs text-white/70 font-sans leading-relaxed">
          Les données <strong>avant soumission</strong> (vue du funnel, abandons à l'étape photos/IMEI,
          handoff WhatsApp, source/campaign) sont dans Google Analytics 4 via les events custom
          <code className="mx-1 px-1.5 py-0.5 rounded bg-white/10 text-sky-300 text-[11px]">troc_step_view</code>
          /
          <code className="mx-1 px-1.5 py-0.5 rounded bg-white/10 text-sky-300 text-[11px]">troc_payment_paid</code>.
          Depuis GA4 → <em>Explorer → Exploration en entonnoir</em>, créer un rapport avec ces events pour obtenir
          le drop-off par étape et le filtrage par source/campagne.
        </p>
        <a
          href="https://analytics.google.com/analytics/web/#/analysis"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] text-sky-300 hover:text-sky-200 font-tech uppercase tracking-wider mt-3"
        >
          Ouvrir GA4 <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export default TrocDashboardTab;
