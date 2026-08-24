import React, { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, MinusCircle, RotateCcw, ShieldAlert, Filter } from 'lucide-react';
import { adminUi } from '../shared/adminUi';
import { useQaTestRuns, type QaStatus } from '../../../hooks/admin/useQaTestRuns';
import {
  QA_TESTS,
  QA_SECTIONS,
  QA_PRIORITY_LABEL,
  type QaPriority,
  type QaSection,
} from '../../../constants/qaTestCatalog';

const PRIORITY_STYLE: Record<QaPriority, string> = {
  blocking: 'bg-red-500/15 text-red-200 border-red-400/40',
  important: 'bg-amber-500/15 text-amber-100 border-amber-400/40',
  nice: 'bg-white/5 text-white/70 border-white/15',
};

const STATUS_STYLE: Record<QaStatus, string> = {
  pass: 'bg-emerald-500/20 border-emerald-400/60 text-emerald-100',
  fail: 'bg-red-500/20 border-red-400/60 text-red-100',
  skip: 'bg-white/10 border-white/25 text-white/80',
};

const QaRecetteTab: React.FC = () => {
  const { runs, loading, error, savingId, progress, blockingTotal, setVerdict, resetVerdict } =
    useQaTestRuns();
  const [section, setSection] = useState<QaSection | 'all'>('all');
  const [blockingOnly, setBlockingOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);

  const visible = useMemo(
    () =>
      QA_TESTS.filter((t) => {
        if (section !== 'all' && t.section !== section) return false;
        if (blockingOnly && t.priority !== 'blocking') return false;
        if (openOnly) {
          const r = runs[t.id];
          // « Ouvert » = pas encore testé, ou testé et en échec.
          if (r && r.status !== 'fail') return false;
        }
        return true;
      }),
    [section, blockingOnly, openOnly, runs],
  );

  const pct = progress.total ? Math.round((progress.tested / progress.total) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Synthèse ─────────────────────────────────────────────────────── */}
      <section className={adminUi.card}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-tech font-bold text-white">
              {progress.tested} / {progress.total}
              <span className="text-sm text-white/70 font-sans font-normal ml-2">testés</span>
            </p>
            <p className="text-sm text-white/75 mt-1">
              {progress.failures > 0 ? (
                <span className="text-red-300 font-semibold">{progress.failures} en échec</span>
              ) : (
                <span className="text-emerald-300">Aucun échec</span>
              )}
              {' · '}
              {blockingTotal} bloquants au total
            </p>
          </div>

          <div
            className={`px-4 py-3 rounded-sm border text-center ${
              progress.blockingLeft === 0
                ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-100'
                : 'bg-red-500/15 border-red-400/50 text-red-100'
            }`}
          >
            <p className="text-3xl font-tech font-bold">{progress.blockingLeft}</p>
            <p className="text-xs uppercase tracking-widest mt-1">
              {progress.blockingLeft === 0 ? 'Prêt à lancer' : 'Bloquants restants'}
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-xeption-gold transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {progress.blockingLeft > 0 && (
          <p className="mt-3 text-sm text-amber-100 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            Un test bloquant non validé signifie qu’une perte d’argent ou de données reste
            possible. À traiter avant la mise en ligne.
          </p>
        )}
      </section>

      {/* ── Filtres ──────────────────────────────────────────────────────── */}
      <section className={`${adminUi.card} space-y-3`}>
        <div className="flex items-center gap-2 text-white/80 text-sm">
          <Filter className="h-4 w-4 text-xeption-gold" />
          Filtres
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSection('all')}
            className={section === 'all' ? adminUi.navActive : adminUi.navIdle}
          >
            Tout ({QA_TESTS.length})
          </button>
          {QA_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              title={s.hint}
              className={section === s.id ? adminUi.navActive : adminUi.navIdle}
            >
              {s.label} ({QA_TESTS.filter((t) => t.section === s.id).length})
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => setBlockingOnly((v) => !v)}
            className={blockingOnly ? adminUi.navActive : adminUi.navIdle}
          >
            Bloquants seulement
          </button>
          <button
            onClick={() => setOpenOnly((v) => !v)}
            className={openOnly ? adminUi.navActive : adminUi.navIdle}
          >
            Non validés ou en échec
          </button>
        </div>
      </section>

      {/* ── Liste ────────────────────────────────────────────────────────── */}
      {error && (
        <p className="text-red-300 text-sm bg-red-500/10 border border-red-400/30 rounded-sm p-3">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-white/70 text-sm">Chargement des verdicts…</p>
      ) : visible.length === 0 ? (
        <p className="text-white/70 text-sm">Aucun test ne correspond à ces filtres.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((t) => {
            const run = runs[t.id];
            const busy = savingId === t.id;
            return (
              <li
                key={t.id}
                className={`${adminUi.surface} rounded-sm border border-white/10 p-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-xeption-gold">{t.id}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${PRIORITY_STYLE[t.priority]}`}
                    >
                      {QA_PRIORITY_LABEL[t.priority]}
                    </span>
                    <span className="text-white font-medium">{t.label}</span>
                  </div>
                  <p className="text-sm text-white/75 mt-1">Attendu : {t.expected}</p>
                  {run && (
                    <p className="text-xs text-white/60 mt-1">
                      {run.tested_by_name ?? '—'} ·{' '}
                      {new Date(run.tested_at).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {run.note ? ` · ${run.note}` : ''}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {(['pass', 'fail', 'skip'] as QaStatus[]).map((s) => {
                    const Icon = s === 'pass' ? CheckCircle2 : s === 'fail' ? XCircle : MinusCircle;
                    const active = run?.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={busy}
                        title={s === 'pass' ? 'Passe' : s === 'fail' ? 'Échoue' : 'Non applicable'}
                        onClick={() => {
                          const note =
                            s === 'fail'
                              ? window.prompt('Que s’est-il passé ? (facultatif)') ?? undefined
                              : undefined;
                          void setVerdict(t.id, s, note);
                        }}
                        className={`p-2 rounded-sm border transition-colors disabled:opacity-50 ${
                          active ? STATUS_STYLE[s] : 'bg-black/30 border-white/15 text-white/60 hover:border-white/35'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                  {run && (
                    <button
                      type="button"
                      disabled={busy}
                      title="Repasser à non testé"
                      onClick={() => void resetVerdict(t.id)}
                      className="p-2 rounded-sm border border-white/15 bg-black/30 text-white/60 hover:border-white/35 disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default QaRecetteTab;
