import React, { useCallback, useMemo, useState } from 'react';
import { Loader2, Upload, Sparkles, CheckCircle2, AlertCircle, FileJson } from 'lucide-react';
import type { Brand, Product, ProductRange } from '../../../types';
import {
  detectIngestFormat,
  parseIngestInput,
  runProductIngestionFunnel,
  type IngestionProgress,
  type IngestionFunnelReport,
} from '../../../services/productIngestionFunnel';

interface ProductImportFunnelTabProps {
  products: Product[];
  brands: Brand[];
  ranges: ProductRange[];
  onUpdateProducts: (products: Product[]) => void;
}

const ProductImportFunnelTab: React.FC<ProductImportFunnelTabProps> = ({
  products,
  brands,
  ranges,
  onUpdateProducts,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [enrichWithAi, setEnrichWithAi] = useState(true);
  const [updateDuplicates, setUpdateDuplicates] = useState(true);
  const [progress, setProgress] = useState<IngestionProgress | null>(null);
  const [report, setReport] = useState<IngestionFunnelReport | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const sampleHint = useMemo(
    () =>
      'Collez un catalogue Mfoundi (`{ "rows": [...] }`) ou une liste JSON `[{ name, price, category, brandSlug, ... }]`.',
    [],
  );

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    setJsonText(text);
    setReport(null);
    setParseError(null);
    try {
      const raw = JSON.parse(text);
      const format = detectIngestFormat(raw);
      const drafts = parseIngestInput(format, raw);
      setPreviewCount(drafts.length);
    } catch (e) {
      setPreviewCount(null);
      setParseError(e instanceof Error ? e.message : 'JSON invalide');
    }
  }, []);

  const handleParsePreview = useCallback(() => {
    setParseError(null);
    setReport(null);
    try {
      const raw = JSON.parse(jsonText);
      const format = detectIngestFormat(raw);
      const drafts = parseIngestInput(format, raw);
      setPreviewCount(drafts.length);
    } catch (e) {
      setPreviewCount(null);
      setParseError(e instanceof Error ? e.message : 'JSON invalide');
    }
  }, [jsonText]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setReport(null);
    setLogs([]);
    setProgress(null);
    try {
      const raw = JSON.parse(jsonText);
      const format = detectIngestFormat(raw);
      const drafts = parseIngestInput(format, raw);

      const { report: funnelReport, products: nextProducts } = await runProductIngestionFunnel(
        drafts,
        products,
        brands,
        ranges,
        {
          enrichWithAi,
          updateDuplicates,
          onProgress: (p) => {
            setProgress(p);
            const icon =
              p.status === 'ok' ? '✓' : p.status === 'error' ? '✗' : p.status === 'skipped' ? '–' : '…';
            setLogs((prev) => [
              ...prev.slice(-80),
              `${icon} [${p.step}] ${p.name} — ${p.message || p.status}`,
            ]);
          },
        },
      );

      onUpdateProducts(nextProducts);
      setReport(funnelReport);
      setPreviewCount(drafts.length);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Échec du funnel');
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }, [jsonText, products, brands, ranges, enrichWithAi, updateDuplicates, onUpdateProducts]);

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/80 border border-white/10 rounded-lg p-4 md:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-xeption-gold/15 rounded-lg">
            <Sparkles className="w-5 h-5 text-xeption-gold" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-tech uppercase tracking-wide">
              Funnel d&apos;import produits
            </h2>
            <p className="text-sm text-gray-400 mt-1 max-w-2xl">
              Import multi-produits avec enrichissement automatique DeepSeek : description, specs,
              pros/cons et verdict court. Plus de stubs « Import Mfoundi » après l&apos;import.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-black/40 border border-white/15 rounded text-xs font-bold uppercase cursor-pointer hover:border-xeption-gold/50">
            <Upload className="w-4 h-4" />
            Fichier JSON
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
          <button
            type="button"
            onClick={handleParsePreview}
            disabled={!jsonText.trim() || running}
            className="inline-flex items-center gap-2 px-3 py-2 border border-white/15 rounded text-xs font-bold uppercase hover:border-white/40 disabled:opacity-50"
          >
            <FileJson className="w-4 h-4" />
            Analyser
          </button>
        </div>

        <textarea
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setPreviewCount(null);
            setParseError(null);
          }}
          placeholder={sampleHint}
          rows={8}
          className="w-full bg-black/50 border border-white/10 rounded p-3 text-sm text-gray-200 font-mono focus:border-xeption-gold outline-none"
        />

        {parseError && (
          <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {parseError}
          </p>
        )}
        {previewCount !== null && !parseError && (
          <p className="mt-2 text-sm text-emerald-400">
            {previewCount} produit{previewCount !== 1 ? 's' : ''} détecté{previewCount !== 1 ? 's' : ''}
          </p>
        )}

        <div className="flex flex-wrap gap-4 mt-4 text-xs">
          <label className="flex items-center gap-2 text-gray-300">
            <input
              type="checkbox"
              checked={enrichWithAi}
              onChange={(e) => setEnrichWithAi(e.target.checked)}
              disabled={running}
            />
            Enrichir avec DeepSeek après import
          </label>
          <label className="flex items-center gap-2 text-gray-300">
            <input
              type="checkbox"
              checked={updateDuplicates}
              onChange={(e) => setUpdateDuplicates(e.target.checked)}
              disabled={running}
            />
            Mettre à jour les doublons (prix / specs)
          </label>
        </div>

        <button
          type="button"
          onClick={handleRun}
          disabled={running || !jsonText.trim()}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-xeption-gold text-black font-bold uppercase text-xs rounded hover:bg-white transition-colors disabled:opacity-50"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Lancer le funnel
        </button>

        {running && progress && (
          <p className="mt-3 text-xs text-gray-400 font-mono">
            {progress.step} {progress.index}/{progress.total} — {progress.name}
          </p>
        )}
      </div>

      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Créés', value: report.created },
            { label: 'Mis à jour', value: report.updated },
            { label: 'Enrichis IA', value: report.enriched },
            { label: 'Erreurs', value: report.errors.length },
          ].map((item) => (
            <div key={item.label} className="bg-black/40 border border-white/10 rounded p-3 text-center">
              <div className="text-2xl font-bold text-white">{item.value}</div>
              <div className="text-[10px] uppercase text-gray-500 font-tech">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-white/10 text-xs font-tech uppercase text-gray-400">
            Journal
          </div>
          <div className="max-h-64 overflow-y-auto font-mono text-[11px] text-gray-400 space-y-1 p-2">
            {logs.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </div>
      )}

      {report && report.errors.length > 0 && (
        <div className="border border-red-500/30 bg-red-500/10 rounded p-3 text-sm text-red-300">
          <div className="flex items-center gap-2 font-bold mb-2">
            <AlertCircle className="w-4 h-4" />
            Erreurs ({report.errors.length})
          </div>
          <ul className="space-y-1 text-xs font-mono">
            {report.errors.map((err) => (
              <li key={`${err.name}-${err.step}`}>
                {err.name} [{err.step}]: {err.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report && report.errors.length === 0 && report.enriched > 0 && (
        <p className="text-sm text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Import terminé — fiches prêtes pour la boutique (photos via Import photos).
        </p>
      )}
    </div>
  );
};

export default ProductImportFunnelTab;
