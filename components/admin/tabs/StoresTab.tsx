import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, Loader2, Lock, Pencil, Users } from 'lucide-react';
import { Product, Staff, Store, StockReservationOverview, PendingOrderReservation, ShipmentReservationAlert } from '../../../types';
import { getProductDisplayName } from '../../../utils/productDisplay';
import TableShell from '../shared/TableShell';
import { adminUi } from '../shared/adminUi';
import ProductStockSplitModal from '../modals/ProductStockSplitModal';
import type { ProductStockMismatch } from '../../../types';

interface StoresTabProps {
  stores: Store[];
  staffMembers: Staff[];
  products: Product[];
  loading: boolean;
  mismatches: ProductStockMismatch[];
  mismatchesLoading: boolean;
  reservations: StockReservationOverview[];
  pendingWithReservations: PendingOrderReservation[];
  shipmentAlerts: ShipmentReservationAlert[];
  reservationsLoading: boolean;
  onEditStore: (store: Store) => void;
  onRefresh: () => Promise<void>;
  onRefreshMismatches: () => Promise<void>;
  onRefreshReservations: () => Promise<void>;
  loadAllocations: (productId: string, stores: Store[]) => Promise<{ store_id: string; quantity: number }[]>;
  onSaveAllocations: (productId: string, allocations: { store_id: string; quantity: number }[]) => Promise<void>;
}

const ageLabel = (iso: string) => {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / (60 * 60 * 1000)));
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} jour${days > 1 ? 's' : ''}`;
};

const StoresTab: React.FC<StoresTabProps> = ({
  stores,
  staffMembers,
  products,
  loading,
  mismatches,
  mismatchesLoading,
  reservations,
  pendingWithReservations,
  shipmentAlerts,
  reservationsLoading,
  onEditStore,
  onRefresh,
  onRefreshMismatches,
  onRefreshReservations,
  loadAllocations,
  onSaveAllocations,
}) => {
  const [splitProduct, setSplitProduct] = useState<Product | null>(null);

  useEffect(() => {
    void onRefresh();
    void onRefreshMismatches();
    void onRefreshReservations();
  }, [onRefresh, onRefreshMismatches, onRefreshReservations]);

  const staffByStore = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of staffMembers) {
      if (s.store_id) map.set(s.store_id, (map.get(s.store_id) ?? 0) + 1);
    }
    return map;
  }, [staffMembers]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const openMismatch = (m: ProductStockMismatch) => {
    const product = productById.get(m.product_id);
    if (product) setSplitProduct(product);
  };

  return (
    <div className="animate-in fade-in space-y-6">
      <div className={adminUi.hintCard}>
        <p className="text-sm text-white/85 leading-relaxed">
          Crée tes points de vente, rattache chaque vendeur à une boutique, puis répartis le stock physique.
          Le total par produit doit rester égal au stock catalogue — tant que les ventes passent encore par le stock global.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className={`${adminUi.cardTitle} flex items-center gap-2`}>
          <Building2 className="h-4 w-4 text-xeption-gold" /> Boutiques
        </h3>
        {loading ? (
          <div className="flex justify-center py-12 text-white/50">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stores.map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => onEditStore(store)}
                className={`${adminUi.surface} text-left p-4 hover:border-xeption-gold/40 transition-colors group`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{store.name}</p>
                    <p className="text-xs text-white/50 mt-0.5">{store.city || 'Ville non renseignée'}</p>
                  </div>
                  <Pencil className="h-4 w-4 text-white/30 group-hover:text-xeption-gold shrink-0" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {store.is_default && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-xeption-gold/20 text-xeption-gold">
                      Siège
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      store.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {store.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/8 text-white/70 inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {staffByStore.get(store.id) ?? 0} vendeur(s)
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className={`${adminUi.cardTitle} flex items-center gap-2`}>
            <Lock className="h-4 w-4 text-cyan-400" /> Stock réservé (commandes web)
          </h3>
          <button
            type="button"
            onClick={() => void onRefreshReservations()}
            disabled={reservationsLoading}
            className={`${adminUi.btnGhost} text-xs`}
          >
            Actualiser
          </button>
        </div>

        {reservationsLoading ? (
          <div className="flex justify-center py-8 text-white/50">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : reservations.length === 0 && pendingWithReservations.length === 0 && shipmentAlerts.length === 0 ? (
          <div className={`${adminUi.surface} p-6 text-center text-sm text-white/60`}>
            Aucune unité bloquée par une réservation active.
          </div>
        ) : (
          <div className="space-y-3">
            {shipmentAlerts.length > 0 && (
              <div className={`${adminUi.surface} border border-orange-500/35 p-4 space-y-2`}>
                <p className="text-xs font-bold uppercase tracking-widest text-orange-300">
                  Colis dehors depuis 5 jours ou plus ({shipmentAlerts.length})
                </p>
                <p className="text-[11px] text-white/65 leading-relaxed">
                  Le stock reste bloqué tant que le colis n&apos;est pas livré, refusé puis revenu, ou perdu après 30 jours.
                </p>
                <ul className="space-y-1.5 text-sm">
                  {shipmentAlerts.slice(0, 8).map((row) => (
                    <li key={row.order_id} className="flex flex-wrap justify-between gap-2 text-white/85">
                      <span>
                        <span className="font-mono text-xeption-gold">{row.order_id}</span>
                        {' · '}
                        {row.customer_name}
                        {' · '}
                        <span className="text-[10px] uppercase text-white/55">{row.order_status}</span>
                      </span>
                      <span
                        className={`text-[11px] ${
                          row.alert_level === 'loss_pending' ? 'text-red-400' : 'text-amber-300'
                        }`}
                      >
                        {row.days_out} j dehors
                        {row.alert_level === 'loss_pending' ? ' — perte imminente' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {pendingWithReservations.length > 0 && (
              <div className={`${adminUi.surface} border border-amber-500/30 p-4 space-y-2`}>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
                  Commandes en attente de validation ({pendingWithReservations.length})
                </p>
                <p className="text-[11px] text-white/65 leading-relaxed">
                  Non validées sous 48 h, la réservation expire et le stock redevient vendable. Pense à accepter ou annuler.
                </p>
                <ul className="space-y-1.5 text-sm">
                  {pendingWithReservations.slice(0, 8).map((row) => (
                    <li key={row.order_id} className="flex flex-wrap justify-between gap-2 text-white/85">
                      <span>
                        <span className="font-mono text-xeption-gold">{row.order_id}</span>
                        {' · '}
                        {row.customer_name}
                      </span>
                      <span className="text-[11px] text-white/55">
                        réservé depuis {ageLabel(row.reserved_since)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reservations.length > 0 && (
              <TableShell>
                <table className="w-full text-left border-collapse">
                  <thead className={adminUi.tableHead}>
                    <tr>
                      <th className="px-4 py-3">Produit</th>
                      <th className="px-4 py-3">Réservé</th>
                      <th className="px-4 py-3">Commandes</th>
                      <th className="px-4 py-3">Plus ancienne</th>
                    </tr>
                  </thead>
                  <tbody className={adminUi.tableBody}>
                    {reservations.map((row) => {
                      const product = productById.get(row.product_id);
                      const label = product ? getProductDisplayName(product) : row.product_name;
                      return (
                        <tr key={row.product_id} className="hover:bg-white/5">
                          <td className="px-4 py-3 text-sm text-white font-medium">{label}</td>
                          <td className="px-4 py-3 text-sm text-cyan-300 font-mono">{row.reserved_qty}</td>
                          <td className="px-4 py-3 text-sm text-white/70">{row.order_count}</td>
                          <td className="px-4 py-3 text-sm text-white/55">
                            il y a {ageLabel(row.oldest_since)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableShell>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className={`${adminUi.cardTitle} flex items-center gap-2`}>
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Stock à répartir
          </h3>
          <button
            type="button"
            onClick={() => void onRefreshMismatches()}
            disabled={mismatchesLoading}
            className={`${adminUi.btnGhost} text-xs`}
          >
            Actualiser
          </button>
        </div>

        {mismatchesLoading ? (
          <div className="flex justify-center py-8 text-white/50">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : mismatches.length === 0 ? (
          <div className={`${adminUi.surface} p-6 text-center text-sm text-emerald-300`}>
            Tous les produits sont cohérents entre catalogue et boutiques.
          </div>
        ) : (
          <TableShell>
            <table className="w-full text-left border-collapse">
              <thead className={adminUi.tableHead}>
                <tr>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Catalogue</th>
                  <th className="px-4 py-3">Réparti</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={adminUi.tableBody}>
                {mismatches.slice(0, 50).map((m) => {
                  const product = productById.get(m.product_id);
                  const label = product ? getProductDisplayName(product) : m.product_name;
                  return (
                    <tr key={m.product_id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-sm text-white font-medium">{label}</td>
                      <td className="px-4 py-3 text-sm text-white/70">{m.catalog_stock}</td>
                      <td className="px-4 py-3 text-sm text-amber-300">{Number(m.distributed_stock)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openMismatch(m)}
                          disabled={!product}
                          className={`${adminUi.btnPrimary} text-xs py-1.5 px-3`}
                        >
                          Répartir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableShell>
        )}
        {mismatches.length > 50 && (
          <p className="text-xs text-white/50 text-center">+ {mismatches.length - 50} autres écarts — affine via Inventaire.</p>
        )}
      </section>

      {splitProduct && (
        <ProductStockSplitModal
          product={splitProduct}
          stores={stores}
          onClose={() => setSplitProduct(null)}
          loadAllocations={loadAllocations}
          onSave={async (productId, allocations) => {
            await onSaveAllocations(productId, allocations);
            await onRefreshMismatches();
          }}
        />
      )}
    </div>
  );
};

export default StoresTab;
