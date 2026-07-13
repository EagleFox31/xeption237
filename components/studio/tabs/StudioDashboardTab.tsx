import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Package, Sparkles } from 'lucide-react';
import type { Product } from '../../../types';
import { isWeakProductDescription } from '../../../utils/productDescription';
import { productNeedsAiEnrichment } from '../../../utils/productIngestionNeeds';

interface StudioDashboardTabProps {
  products: Product[];
}

const StudioDashboardTab: React.FC<StudioDashboardTabProps> = ({ products }) => {
  const stats = useMemo(() => {
    const weakDesc = products.filter((p) =>
      isWeakProductDescription(p.description, p.name),
    );
    const needsAi = products.filter((p) => productNeedsAiEnrichment(p));
    const noImage = products.filter(
      (p) => !p.image?.trim() || p.image.includes('icon-192x192'),
    );
    const byCategory = new Map<string, number>();
    products.forEach((p) => {
      const key = p.category || '—';
      byCategory.set(key, (byCategory.get(key) || 0) + 1);
    });
    return {
      total: products.length,
      weakDesc: weakDesc.length,
      needsAi: needsAi.length,
      noImage: noImage.length,
      byCategory: Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]),
      weakSamples: weakDesc.slice(0, 8).map((p) => p.name),
    };
  }, [products]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-tech uppercase text-white">Tableau de bord Studio</h2>
        <p className="text-sm text-gray-400 mt-1">
          Santé du catalogue — outils réservés au créateur / super admin.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Produits', value: stats.total, ok: true },
          { label: 'Descriptions faibles', value: stats.weakDesc, ok: stats.weakDesc === 0 },
          { label: 'À enrichir (IA)', value: stats.needsAi, ok: stats.needsAi === 0 },
          { label: 'Sans vraie photo', value: stats.noImage, ok: stats.noImage < 5 },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-white/10 bg-black/40 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <Package className="w-4 h-4 text-violet-400" />
              {card.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
            <div className="text-[10px] uppercase text-gray-500 font-tech mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-white/10 bg-black/40 p-4">
          <h3 className="text-xs font-tech uppercase tracking-widest text-gray-400 mb-3">
            Par catégorie
          </h3>
          <ul className="space-y-2 text-sm">
            {stats.byCategory.map(([cat, count]) => (
              <li key={cat} className="flex justify-between text-gray-300">
                <span>{cat}</span>
                <span className="font-mono text-white">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/40 p-4">
          <h3 className="text-xs font-tech uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            Actions rapides
          </h3>
          <ul className="text-sm text-gray-400 space-y-2">
            <li>→ <strong className="text-gray-200">Import produits</strong> : funnel JSON + DeepSeek</li>
            <li>→ <strong className="text-gray-200">Structure</strong> : marques, gammes, types</li>
            <li>→ <strong className="text-gray-200">Import photos</strong> : compléter les placeholders</li>
            <li>→ <strong className="text-gray-200">ERP</strong> : caisse, commandes, staff (sidebar)</li>
          </ul>
          {stats.weakSamples.length > 0 && (
            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-[10px] uppercase text-amber-500/90 font-tech mb-2">
                Descriptions à corriger (extrait)
              </p>
              <ul className="text-xs text-gray-500 space-y-1 font-mono">
                {stats.weakSamples.map((name) => (
                  <li key={name} className="truncate">{name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudioDashboardTab;
