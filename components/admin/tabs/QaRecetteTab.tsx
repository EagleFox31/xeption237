import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  RotateCcw,
  ShieldAlert,
  Filter,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Clock,
  User,
  Layers,
  Flame,
  Check,
  X,
  Search,
  Table as TableIcon,
  LayoutGrid,
  ShoppingBag,
  CreditCard,
  Package,
  ArrowLeftRight,
  FileText,
  Shield,
  Globe,
  type LucideIcon,
} from 'lucide-react';
import { adminUi } from '../shared/adminUi';
import { useQaTestRuns, type QaStatus } from '../../../hooks/admin/useQaTestRuns';
import {
  QA_TESTS,
  QA_SECTIONS,
  QA_PRIORITY_LABEL,
  type QaPriority,
  type QaSection,
} from '../../../constants/qaTestCatalog';

const PRIORITY_BADGES: Record<QaPriority, { label: string; cls: string }> = {
  blocking: {
    label: 'Bloquant',
    cls: 'bg-red-500/15 text-red-300 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.15)]',
  },
  important: {
    label: 'Important',
    cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
  },
  nice: {
    label: 'Confort',
    cls: 'bg-white/5 text-gray-300 border-white/15',
  },
};

const SECTION_CONFIG: Record<string, { label: string; icon: LucideIcon }> = {
  shop: { label: 'Boutique', icon: ShoppingBag },
  pos: { label: 'Caisse POS', icon: CreditCard },
  stock: { label: 'Stock', icon: Package },
  troc: { label: 'Troc', icon: ArrowLeftRight },
  invoices: { label: 'Factures', icon: FileText },
  superadmin: { label: 'Superadmin', icon: Shield },
};

const QaRecetteTab: React.FC = () => {
  const { runs, loading, error, savingId, progress, blockingTotal, setVerdict, resetVerdict } =
    useQaTestRuns();
  const [section, setSection] = useState<QaSection | 'all'>('all');
  const [blockingOnly, setBlockingOnly] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>('table');

  const visible = useMemo(
    () =>
      QA_TESTS.filter((t) => {
        if (section !== 'all' && t.section !== section) return false;
        if (blockingOnly && t.priority !== 'blocking') return false;
        if (openOnly) {
          const r = runs[t.id];
          if (r && r.status !== 'fail') return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchLabel = t.label.toLowerCase().includes(q);
          const matchExpected = t.expected.toLowerCase().includes(q);
          const matchId = t.id.toLowerCase().includes(q);
          if (!matchLabel && !matchExpected && !matchId) return false;
        }
        return true;
      }),
    [section, blockingOnly, openOnly, searchQuery, runs],
  );

  const pct = progress.total ? Math.round((progress.tested / progress.total) * 100) : 0;
  const passedCount = Object.values(runs).filter((r) => r.status === 'pass').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      
      {/* ── 1. KPI & STATS AÉRÉS ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Progression */}
        <div className="bg-[#0e0e11]/80 backdrop-blur-xl border border-white/10 p-5 rounded-xl shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-tech font-bold uppercase tracking-widest text-gray-400">Progression</span>
            <span className="text-xs font-tech font-bold px-2 py-0.5 rounded-full bg-xeption-gold/15 text-xeption-gold border border-xeption-gold/30">
              {pct}%
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-tech font-extrabold text-white">{progress.tested}</span>
              <span className="text-xs font-sans text-gray-400">/ {progress.total} tests validés</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-xeption-gold transition-all duration-700 shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Validés (Passe) */}
        <div className="bg-[#0e0e11]/80 backdrop-blur-xl border border-white/10 p-5 rounded-xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-tech font-bold uppercase tracking-widest text-gray-400">Tests Conformes</span>
            <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-tech font-extrabold text-emerald-400">{passedCount}</span>
            <span className="text-xs font-sans text-emerald-300/70">succès</span>
          </div>
        </div>

        {/* Bloquants */}
        <div className={`bg-[#0e0e11]/80 backdrop-blur-xl border p-5 rounded-xl shadow-xl flex flex-col justify-between ${
          progress.blockingLeft === 0 
            ? 'border-emerald-500/40' 
            : 'border-red-500/40'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-tech font-bold uppercase tracking-widest text-gray-400">Bloquants Restants</span>
            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
              progress.blockingLeft === 0 
                ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-400' 
                : 'bg-red-500/15 border border-red-400/30 text-red-400'
            }`}>
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-tech font-extrabold ${
              progress.blockingLeft === 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {progress.blockingLeft}
            </span>
            <span className="text-xs font-sans text-gray-400 flex items-center gap-1">
              {progress.blockingLeft === 0 ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
                  Prêt à déployer
                </>
              ) : (
                `sur ${blockingTotal} critiques`
              )}
            </span>
          </div>
        </div>

        {/* Anomalies */}
        <div className="bg-[#0e0e11]/80 backdrop-blur-xl border border-white/10 p-5 rounded-xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-tech font-bold uppercase tracking-widest text-gray-400">En Échec</span>
            <div className="w-6 h-6 rounded-md bg-red-500/15 border border-red-400/30 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-tech font-extrabold ${
              progress.failures > 0 ? 'text-red-400' : 'text-white'
            }`}>
              {progress.failures}
            </span>
            <span className="text-xs font-sans text-gray-400">
              {progress.failures === 0 ? 'Aucun bug' : 'à corriger'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. BARRE DE FILTRES & SWITCH VUE ──────────────────────────────────── */}
      <div className="bg-[#0e0e11]/90 backdrop-blur-2xl border border-white/10 p-4 sm:p-5 rounded-xl shadow-xl space-y-4">
        
        {/* Ligne 1 : Onglets Modules avec Icônes SVG */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setSection('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-tech font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${
                section === 'all'
                  ? 'bg-xeption-gold text-black border-xeption-gold shadow-[0_0_12px_rgba(255,215,0,0.25)]'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              <span>Tout</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                section === 'all' ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-300'
              }`}>
                {QA_TESTS.length}
              </span>
            </button>

            {QA_SECTIONS.map((s) => {
              const count = QA_TESTS.filter((t) => t.section === s.id).length;
              const isSelected = section === s.id;
              const info = SECTION_CONFIG[s.id] || { label: s.label, icon: Layers };
              const IconComp = info.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  title={s.hint}
                  className={`px-3 py-1.5 rounded-lg text-xs font-tech font-bold uppercase tracking-wider transition-all flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-xeption-gold text-black border-xeption-gold shadow-[0_0_12px_rgba(255,215,0,0.25)]'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5 shrink-0" />
                  <span>{info.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Switch Vue Tableau / Vue Cartes */}
          <div className="flex items-center gap-1 bg-black/40 border border-white/10 p-1 rounded-lg">
            <button
              onClick={() => setDisplayMode('table')}
              className={`p-1.5 rounded-md text-xs font-tech flex items-center gap-1.5 transition-all ${
                displayMode === 'table' ? 'bg-white/15 text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
              title="Vue Tableau"
            >
              <TableIcon className="w-3.5 h-3.5 text-xeption-gold" />
              <span className="hidden sm:inline">Tableau</span>
            </button>
            <button
              onClick={() => setDisplayMode('cards')}
              className={`p-1.5 rounded-md text-xs font-tech flex items-center gap-1.5 transition-all ${
                displayMode === 'cards' ? 'bg-white/15 text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
              title="Vue Cartes"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-xeption-gold" />
              <span className="hidden sm:inline">Cartes</span>
            </button>
          </div>
        </div>

        {/* Ligne 2 : Recherche & Filtres Rapides */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par nom, ID (#T-S01) ou résultat..."
              className="w-full bg-black/50 border border-white/10 text-white pl-10 pr-4 py-2 rounded-lg text-xs font-sans placeholder-gray-500 focus:border-xeption-gold/60 outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setBlockingOnly((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-tech font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                blockingOnly
                  ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              Bloquants
            </button>

            <button
              onClick={() => setOpenOnly((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-tech font-bold uppercase tracking-wider transition-all border flex items-center gap-1.5 ${
                openOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Non validés / Échecs
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. TABLEAU DE RECETTE PROPRE ET VECTORIEL ─────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 text-red-200 rounded-xl text-sm font-sans flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-gray-400 font-tech uppercase tracking-widest text-sm flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-xeption-gold border-t-transparent rounded-full animate-spin" />
          Chargement de la recette...
        </div>
      ) : visible.length === 0 ? (
        <div className="p-16 text-center bg-[#0e0e11]/40 border border-white/10 rounded-xl text-gray-400 font-sans space-y-2">
          <p className="text-base text-gray-200 font-medium">Aucun test ne correspond à vos filtres.</p>
          <p className="text-xs text-gray-500">Essayez de réinitialiser la recherche ou de changer de section.</p>
        </div>
      ) : displayMode === 'table' ? (
        /* VUE TABLEAU MODERNE (100% ICÔNES SVG LUCIDE) */
        <div className="bg-[#0e0e11]/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/60 text-[11px] font-tech font-bold uppercase tracking-widest text-gray-400 select-none">
                  <th className="py-4 px-5 w-28">ID & Niveau</th>
                  <th className="py-4 px-4 w-36">Module</th>
                  <th className="py-4 px-5">Cas de Test & Résultat Attendu</th>
                  <th className="py-4 px-5 w-48">Verdict & Inspecteur</th>
                  <th className="py-4 px-5 text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {visible.map((t) => {
                  const run = runs[t.id];
                  const busy = savingId === t.id;
                  const priorityInfo = PRIORITY_BADGES[t.priority];
                  const sectionInfo = SECTION_CONFIG[t.section] || { label: t.section, icon: Layers };
                  const SectionIcon = sectionInfo.icon;
                  const isPassed = run?.status === 'pass';
                  const isFailed = run?.status === 'fail';
                  const isSkipped = run?.status === 'skip';

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        isPassed
                          ? 'bg-emerald-950/[0.06]'
                          : isFailed
                            ? 'bg-red-950/[0.12]'
                            : ''
                      }`}
                    >
                      {/* 1. ID & Priorité */}
                      <td className="py-4 px-5 align-top">
                        <div className="space-y-1.5">
                          <span className="font-mono text-xs font-bold text-xeption-gold px-2 py-0.5 bg-xeption-gold/10 border border-xeption-gold/30 rounded inline-block">
                            {t.id}
                          </span>
                          <div>
                            <span className={`text-[10px] font-tech font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-block ${priorityInfo.cls}`}>
                              {priorityInfo.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Module avec Icône Lucide */}
                      <td className="py-4 px-4 align-top">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-300 font-medium px-2.5 py-1 bg-white/5 rounded-md border border-white/10 whitespace-nowrap">
                          <SectionIcon className="w-3.5 h-3.5 text-xeption-gold shrink-0" />
                          <span>{sectionInfo.label}</span>
                        </span>
                      </td>

                      {/* 3. Description & Résultat Attendu */}
                      <td className="py-4 px-5 align-top">
                        <div className="space-y-1.5">
                          <p className="text-sm font-bold text-white leading-snug">
                            {t.label}
                          </p>
                          <div className="bg-black/40 border border-white/5 rounded-lg p-2.5 text-xs text-gray-300 leading-relaxed">
                            <span className="text-xeption-gold/90 font-tech font-bold uppercase tracking-wider mr-1.5">Attendu :</span>
                            {t.expected}
                          </div>
                        </div>
                      </td>

                      {/* 4. Verdict & Inspecteur */}
                      <td className="py-4 px-5 align-top">
                        <div className="space-y-1.5">
                          {isPassed && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-tech font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Conforme
                            </span>
                          )}
                          {isFailed && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-tech font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-400/40">
                              <XCircle className="w-3.5 h-3.5 text-red-400" />
                              En Échec
                            </span>
                          )}
                          {isSkipped && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-tech font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-gray-300 border border-white/20">
                              <MinusCircle className="w-3.5 h-3.5" />
                              N/A
                            </span>
                          )}
                          {!run && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-tech uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 text-gray-500 border border-white/10">
                              <Clock className="w-3.5 h-3.5" />
                              À tester
                            </span>
                          )}

                          {run && (
                            <div className="text-[11px] text-gray-400 space-y-0.5 pt-0.5">
                              <p className="text-gray-300 font-medium truncate max-w-[170px] flex items-center gap-1">
                                <User className="w-3 h-3 text-xeption-gold/80 shrink-0" />
                                {run.tested_by_name ?? 'Staff Xeption'}
                              </p>
                              <p className="text-gray-500 text-[10px]">
                                {new Date(run.tested_at).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                })}
                              </p>
                              {run.note && (
                                <p className="text-red-300 italic text-[11px] bg-red-950/30 px-2 py-0.5 rounded border border-red-500/20 mt-1">
                                  « {run.note} »
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Boutons Actions */}
                      <td className="py-4 px-5 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Valider */}
                          <button
                            type="button"
                            disabled={busy}
                            title="Valider (Passe)"
                            onClick={() => void setVerdict(t.id, 'pass')}
                            className={`p-2 rounded-lg font-tech font-bold text-xs transition-all border ${
                              isPassed
                                ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.35)]'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-400'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>

                          {/* Échoue */}
                          <button
                            type="button"
                            disabled={busy}
                            title="Signaler échec"
                            onClick={() => {
                              const note = window.prompt('Décrivez l’anomalie constatée :') ?? undefined;
                              void setVerdict(t.id, 'fail', note);
                            }}
                            className={`p-2 rounded-lg font-tech font-bold text-xs transition-all border ${
                              isFailed
                                ? 'bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.35)]'
                                : 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/25 hover:border-red-400'
                            }`}
                          >
                            <X className="w-4 h-4" />
                          </button>

                          {/* Skip N/A */}
                          <button
                            type="button"
                            disabled={busy}
                            title="Non applicable (N/A)"
                            onClick={() => void setVerdict(t.id, 'skip')}
                            className={`p-2 rounded-lg font-tech text-xs transition-all border ${
                              isSkipped
                                ? 'bg-white text-black border-white shadow'
                                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>

                          {/* Reset */}
                          {run && (
                            <button
                              type="button"
                              disabled={busy}
                              title="Réinitialiser le test"
                              onClick={() => void resetVerdict(t.id)}
                              className="p-2 rounded-lg border border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VUE CARTES */
        <div className="space-y-4">
          {visible.map((t) => {
            const run = runs[t.id];
            const busy = savingId === t.id;
            const priorityInfo = PRIORITY_BADGES[t.priority];
            const isPassed = run?.status === 'pass';
            const isFailed = run?.status === 'fail';
            const isSkipped = run?.status === 'skip';

            return (
              <div
                key={t.id}
                className={`bg-[#0e0e11]/80 backdrop-blur-xl border rounded-xl p-5 transition-all ${
                  isPassed
                    ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/10 to-transparent'
                    : isFailed
                      ? 'border-red-500/40 bg-gradient-to-r from-red-950/20 to-transparent'
                      : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-xeption-gold px-2 py-0.5 bg-xeption-gold/10 border border-xeption-gold/30 rounded">
                        {t.id}
                      </span>
                      <span className={`text-[10px] font-tech font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${priorityInfo.cls}`}>
                        {priorityInfo.label}
                      </span>
                      {isPassed && <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Conforme</span>}
                      {isFailed && <span className="text-[10px] text-red-400 font-bold uppercase flex items-center gap-1"><XCircle className="w-3 h-3"/> Échec</span>}
                    </div>
                    <h3 className="text-base font-bold text-white">{t.label}</h3>
                    <p className="text-xs text-gray-300 bg-black/40 p-2.5 rounded-lg border border-white/5">
                      <strong className="text-xeption-gold uppercase">Attendu :</strong> {t.expected}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void setVerdict(t.id, 'pass')}
                      className={`px-3.5 py-2 rounded-lg font-tech font-bold text-xs uppercase ${
                        isPassed ? 'bg-emerald-500 text-black' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const note = window.prompt('Anomalie :') ?? undefined;
                        void setVerdict(t.id, 'fail', note);
                      }}
                      className={`px-3.5 py-2 rounded-lg font-tech font-bold text-xs uppercase ${
                        isFailed ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-300 border border-red-500/30'
                      }`}
                    >
                      Échec
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void setVerdict(t.id, 'skip')}
                      className={`px-2.5 py-2 rounded-lg text-xs ${
                        isSkipped ? 'bg-white text-black' : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      N/A
                    </button>
                    {run && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void resetVerdict(t.id)}
                        className="p-2 rounded-lg border border-white/10 bg-white/5 text-gray-400"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default QaRecetteTab;
