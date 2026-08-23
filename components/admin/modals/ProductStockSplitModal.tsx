import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Package, X } from 'lucide-react';
import { Product, Store } from '../../../types';
import { getProductDisplayName } from '../../../utils/productDisplay';
import { adminUi } from '../shared/adminUi';

interface ProductStockSplitModalProps {
  product: Product;
  stores: Store[];
  onClose: () => void;
  loadAllocations: (productId: string, stores: Store[]) => Promise<{ store_id: string; quantity: number }[]>;
  onSave: (productId: string, allocations: { store_id: string; quantity: number }[]) => Promise<void>;
}

const ProductStockSplitModal: React.FC<ProductStockSplitModalProps> = ({
  product,
  stores,
  onClose,
  loadAllocations,
  onSave,
}) => {
  const [rows, setRows] = useState<{ store_id: string; quantity: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeStores = useMemo(() => stores.filter((s) => s.active), [stores]);
  const catalogStock = product.stock ?? 0;
  const allocated = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const isBalanced = allocated === catalogStock;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const initial = await loadAllocations(product.id, activeStores);
        if (!cancelled) {
          if (initial.length) setRows(initial);
          else {
            const defaultStore = stores.find((s) => s.is_default) ?? activeStores[0];
            setRows(
              activeStores.map((s) => ({
                store_id: s.id,
                quantity: s.id === defaultStore?.id ? catalogStock : 0,
              })),
            );
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Chargement impossible');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product.id, catalogStock, activeStores, stores, loadAllocations]);

  const setQty = (storeId: string, qty: number) => {
    setRows((prev) =>
      prev.map((r) => (r.store_id === storeId ? { ...r, quantity: Math.max(0, qty) } : r)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isBalanced) {
      setError(`Le total (${allocated}) doit égaler le stock catalogue (${catalogStock}).`);
      return;
    }
    setSaving(true);
    try {
      await onSave(product.id, rows);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className={`${adminUi.surface} w-full sm:max-w-xl rounded-t-xl sm:rounded-lg max-h-[90vh] flex flex-col`}>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-white/10 shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg font-bold font-tech text-white uppercase truncate">Répartir le stock</h3>
            <p className="mt-1 text-sm text-white/60 truncate">{getProductDisplayName(product)}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="p-2 text-white/60 hover:text-white shrink-0" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            <div className={`${adminUi.hintCard} flex items-center gap-3`}>
              <Package className="h-5 w-5 text-xeption-gold shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">Stock catalogue : {catalogStock}</p>
                <p className={`text-xs mt-0.5 ${isBalanced ? 'text-emerald-300' : 'text-amber-300'}`}>
                  Réparti : {allocated} {isBalanced ? '— OK' : `— il manque ${catalogStock - allocated}`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8 text-white/60">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {activeStores.map((store) => {
                  const row = rows.find((r) => r.store_id === store.id);
                  const qty = row?.quantity ?? 0;
                  return (
                    <div key={store.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{store.name}</p>
                        {store.city && <p className="text-xs text-white/50">{store.city}</p>}
                      </div>
                      <input
                        type="number"
                        min={0}
                        className={`${adminUi.input} w-24 text-center`}
                        value={qty}
                        onChange={(e) => setQty(store.id, parseInt(e.target.value, 10) || 0)}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {error && (
              <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 p-5 border-t border-white/10 shrink-0">
            <button type="button" onClick={onClose} disabled={saving} className={adminUi.btnGhost}>
              Annuler
            </button>
            <button type="submit" disabled={saving || loading || !isBalanced} className={adminUi.btnPrimary}>
              {saving ? 'Enregistrement…' : 'Valider la répartition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductStockSplitModal;
