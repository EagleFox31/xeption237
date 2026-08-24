import React from 'react';
import { AlertTriangle, ClipboardCheck, Loader2, PackageX, RefreshCw } from 'lucide-react';
import { adminUi } from '../shared/adminUi';
import {
  CATALOG_HEALTH_LIST_PREVIEW,
  catalogHealthRuleLabel,
  type CatalogHealthFinding,
  type CatalogHealthSummary,
} from '../../../utils/catalogHealth';

interface CatalogHealthCardProps {
  summary: CatalogHealthSummary;
  loading: boolean;
  scanning: boolean;
  error: string | null;
  onRescan: () => void;
  onSnooze: (id: string) => void;
  onOpenProduct?: (productId: string) => void;
}

const FindingRow: React.FC<{
  finding: CatalogHealthFinding;
  onOpenProduct?: (productId: string) => void;
  onSnooze?: (id: string) => void;
}> = ({ finding, onOpenProduct, onSnooze }) => (
  <li className="flex items-start justify-between gap-2 p-2.5 rounded-md border border-white/10 bg-black/20 text-sm">
    <div className="min-w-0">
      {onOpenProduct ? (
        <button
          type="button"
          onClick={() => onOpenProduct(finding.productId)}
          className="text-left text-white hover:text-xeption-gold truncate max-w-full"
        >
          {finding.productName}
        </button>
      ) : (
        <span className="text-white truncate block">{finding.productName}</span>
      )}
      <p className="text-[11px] text-white/70 mt-0.5">{finding.title || catalogHealthRuleLabel(finding.ruleCode)}</p>
    </div>
    {onSnooze && (
      <button
        type="button"
        onClick={() => onSnooze(finding.id)}
        className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-white/80 hover:text-white border border-white/15 rounded px-2 py-1"
      >
        Plus tard
      </button>
    )}
  </li>
);

const CatalogHealthCard: React.FC<CatalogHealthCardProps> = ({
  summary,
  loading,
  scanning,
  error,
  onRescan,
  onSnooze,
  onOpenProduct,
}) => {
  const dataPreview = summary.data.slice(0, CATALOG_HEALTH_LIST_PREVIEW);
  const metierPreview = summary.metier.slice(0, CATALOG_HEALTH_LIST_PREVIEW);
  const dataRest = summary.openData - dataPreview.length;
  const metierRest = summary.openMetier - metierPreview.length;

  return (
    <section className={adminUi.card}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className={adminUi.cardTitle}>
            <ClipboardCheck className="h-4 w-4 text-xeption-gold" />
            Contrôle catalogue
          </h3>
          <p className="mt-1 text-sm text-white">
            {summary.openTotal === 0
              ? 'Rien à signaler : fiches complètes et stock suivi.'
              : `${summary.openData} fiche${summary.openData > 1 ? 's' : ''} à corriger, ${summary.openMetier} rupture${summary.openMetier > 1 ? 's' : ''} à traiter.`}
          </p>
        </div>
        <button
          type="button"
          onClick={onRescan}
          disabled={scanning || loading}
          className={`${adminUi.btnGhost} text-xs py-2`}
        >
          {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Relancer le contrôle
        </button>
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-300">{error}</p>
      )}

      {loading && summary.openTotal === 0 ? (
        <div className="flex justify-center py-8 text-white/50">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-amber-200 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              Fiches incomplètes
              <span className="ml-auto font-tech text-lg text-amber-300 tabular-nums">{summary.openData}</span>
            </h4>
            {dataPreview.length === 0 ? (
              <p className={adminUi.muted}>Toutes les fiches ont un nom, une photo et un prix.</p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {dataPreview.map((f) => (
                  <FindingRow key={f.id} finding={f} onOpenProduct={onOpenProduct} />
                ))}
              </ul>
            )}
            {dataRest > 0 && (
              <p className="mt-2 text-xs text-white/70">Et {dataRest} autre{dataRest > 1 ? 's' : ''} — ouvre la fiche pour corriger.</p>
            )}
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-red-200 mb-2 flex items-center gap-2">
              <PackageX className="h-3.5 w-3.5 text-red-400" />
              Ruptures de stock
              <span className="ml-auto font-tech text-lg text-red-300 tabular-nums">{summary.openMetier}</span>
            </h4>
            {metierPreview.length === 0 ? (
              <p className={adminUi.muted}>Pas de rupture sur les fiches vendables.</p>
            ) : (
              <ul className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                {metierPreview.map((f) => (
                  <FindingRow
                    key={f.id}
                    finding={f}
                    onOpenProduct={onOpenProduct}
                    onSnooze={onSnooze}
                  />
                ))}
              </ul>
            )}
            {metierRest > 0 && (
              <p className="mt-2 text-xs text-white/70">Et {metierRest} autre{metierRest > 1 ? 's' : ''} en rupture.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default CatalogHealthCard;
