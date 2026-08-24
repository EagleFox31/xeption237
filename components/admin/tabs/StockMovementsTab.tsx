import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  ClipboardList,
  Loader2,
  Package,
  RotateCcw,
  ScrollText,
  Send,
  Truck,
} from 'lucide-react';
import { Product, Staff, Store } from '../../../types';
import { normalizeStaffRole } from '../../../constants/staffRoles';
import { getProductDisplayName } from '../../../utils/productDisplay';
import { adminUi } from '../shared/adminUi';
import {
  STOCK_MOVEMENT_REASON_LABELS,
  TRANSFER_STATUS_LABELS,
} from '../../../utils/stockOperations';
import type { useStockOperations } from '../../../hooks/admin/useStockOperations';

type StockOps = ReturnType<typeof useStockOperations>;
type Segment = 'transfers' | 'inventory' | 'returns' | 'journal';

const SEGMENTS: { id: Segment; label: string; icon: React.ReactNode }[] = [
  { id: 'transfers', label: 'Transferts', icon: <ArrowLeftRight className="h-3.5 w-3.5" /> },
  { id: 'inventory', label: 'Inventaire', icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { id: 'returns', label: 'Retours SAV', icon: <RotateCcw className="h-3.5 w-3.5" /> },
  { id: 'journal', label: 'Journal', icon: <ScrollText className="h-3.5 w-3.5" /> },
];

interface StockMovementsTabProps {
  stores: Store[];
  products: Product[];
  currentStaff: Staff | null;
  stockOps: StockOps;
}

const StockMovementsTab: React.FC<StockMovementsTabProps> = ({
  stores,
  products,
  currentStaff,
  stockOps,
}) => {
  const role = normalizeStaffRole(currentStaff?.role);
  const canOperate = role === 'responsable' || role === 'direction' || role === 'super_admin';
  const defaultStoreId =
    role === 'direction' || role === 'super_admin'
      ? stores.find((s) => s.active)?.id ?? ''
      : currentStaff?.store_id ?? '';

  const [segment, setSegment] = useState<Segment>('transfers');
  const [storeFilter, setStoreFilter] = useState(defaultStoreId);

  const [fromStore, setFromStore] = useState(defaultStoreId);
  const [toStore, setToStore] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [draftProductId, setDraftProductId] = useState('');
  const [draftQty, setDraftQty] = useState('1');
  const [draftItems, setDraftItems] = useState<{ product_id: string; quantity: number }[]>([]);
  const [busy, setBusy] = useState(false);

  const [invStoreId, setInvStoreId] = useState(defaultStoreId);
  const [invNote, setInvNote] = useState('');
  const [countDraft, setCountDraft] = useState<Record<string, string>>({});

  const [retOrderId, setRetOrderId] = useState('');
  const [retProductId, setRetProductId] = useState('');
  const [retQty, setRetQty] = useState('1');
  const [retReason, setRetReason] = useState('');
  const [retDisposition, setRetDisposition] = useState<'restock' | 'sav'>('restock');
  const [retRefund, setRetRefund] = useState('');

  const activeStores = useMemo(() => stores.filter((s) => s.active), [stores]);

  const reload = useCallback(() => {
    if (segment === 'transfers') void stockOps.fetchTransfers(storeFilter || null);
    if (segment === 'journal') void stockOps.fetchMovements(storeFilter || null);
  }, [segment, stockOps, storeFilter]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addDraftItem = () => {
    const qty = Number(draftQty);
    if (!draftProductId || !Number.isFinite(qty) || qty <= 0) return;
    setDraftItems((prev) => {
      const i = prev.findIndex((x) => x.product_id === draftProductId);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + qty };
        return next;
      }
      return [...prev, { product_id: draftProductId, quantity: qty }];
    });
    setDraftProductId('');
    setDraftQty('1');
  };

  const handleCreateTransfer = async () => {
    if (!fromStore || !toStore || draftItems.length === 0) return;
    setBusy(true);
    try {
      await stockOps.createTransfer(fromStore, toStore, draftItems, transferNote);
      setDraftItems([]);
      setTransferNote('');
      await stockOps.fetchTransfers(storeFilter || null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur transfert');
    } finally {
      setBusy(false);
    }
  };

  const handleStartInventory = async () => {
    if (!invStoreId) return;
    setBusy(true);
    try {
      await stockOps.startInventory(invStoreId, invNote);
      setCountDraft({});
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur inventaire');
    } finally {
      setBusy(false);
    }
  };

  const saveLineCount = async (productId: string) => {
    if (!stockOps.inventorySession) return;
    const qty = Number(countDraft[productId]);
    if (!Number.isFinite(qty)) return;
    setBusy(true);
    try {
      await stockOps.updateInventoryCount(stockOps.inventorySession.id, productId, qty);
      await stockOps.loadInventorySession(stockOps.inventorySession.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur saisie');
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteInventory = async () => {
    if (!stockOps.inventorySession) return;
    if (!confirm('Valider l\'inventaire et appliquer les écarts au stock ?')) return;
    setBusy(true);
    try {
      await stockOps.completeInventory(stockOps.inventorySession.id, invNote);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur validation');
    } finally {
      setBusy(false);
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await stockOps.processReturn({
        orderId: retOrderId.trim(),
        productId: retProductId.trim(),
        quantity: Number(retQty),
        reason: retReason.trim(),
        disposition: retDisposition,
        refundAmount: retRefund ? Number(retRefund) : undefined,
      });
      setRetOrderId('');
      setRetProductId('');
      setRetReason('');
      setRetRefund('');
      alert('Retour enregistré.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Retour refusé');
    } finally {
      setBusy(false);
    }
  };

  const productName = (id: string) => {
    const p = products.find((x) => x.id === id);
    return p ? getProductDisplayName(p) : id;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className={adminUi.hintCard}>
        <p className={`${adminUi.body} leading-snug`}>
          Transferts en deux temps (envoi → transit → réception), inventaire avec écarts tracés,
          retours SAV après livraison. Chaque opération alimente le journal{' '}
          <code className="text-xeption-gold">stock_movements</code>.
        </p>
      </div>

      {stockOps.error && (
        <div className={`${adminUi.hintCard} border-red-500/40 text-red-300 text-sm`}>
          {stockOps.error}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className={adminUi.segmentGroup}>
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSegment(s.id)}
              className={adminUi.segmentBtn(segment === s.id)}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
        {(segment === 'transfers' || segment === 'journal') && (
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className={`${adminUi.input} w-auto min-w-[160px] text-xs`}
          >
            <option value="">Toutes les boutiques</option>
            {activeStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {segment === 'transfers' && (
        <>
          {stockOps.staleTransfers.length > 0 && (
            <div className={`${adminUi.hintCard} border-amber-500/40 flex gap-2 items-start`}>
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm text-white/85 space-y-1">
                <p className="font-medium">Transferts en transit depuis plus de 5 jours</p>
                {stockOps.staleTransfers.map((t) => (
                  <p key={t.id} className="text-white/70 text-xs">
                    {t.from_store_name} → {t.to_store_name} · {t.days_in_transit} j · {t.item_count}{' '}
                    ligne(s)
                  </p>
                ))}
              </div>
            </div>
          )}

          {canOperate && (
            <section className={adminUi.card}>
              <h3 className={`${adminUi.cardTitle} mb-4`}>
                <Truck className="h-4 w-4 text-cyan-400" />
                Nouveau transfert
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-3">
                <label className="text-xs text-white/70">
                  De
                  <select
                    value={fromStore}
                    onChange={(e) => setFromStore(e.target.value)}
                    className={`${adminUi.input} mt-1`}
                  >
                    <option value="">Choisir…</option>
                    {activeStores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-white/70">
                  Vers
                  <select
                    value={toStore}
                    onChange={(e) => setToStore(e.target.value)}
                    className={`${adminUi.input} mt-1`}
                  >
                    <option value="">Choisir…</option>
                    {activeStores.filter((s) => s.id !== fromStore).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-white/70 sm:col-span-2">
                  Note
                  <input
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className={`${adminUi.input} mt-1`}
                    placeholder="Optionnel"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <select
                  value={draftProductId}
                  onChange={(e) => setDraftProductId(e.target.value)}
                  className={`${adminUi.input} flex-1 min-w-[180px] text-xs`}
                >
                  <option value="">Produit…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {getProductDisplayName(p)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={draftQty}
                  onChange={(e) => setDraftQty(e.target.value)}
                  className={`${adminUi.input} w-20 text-xs font-mono`}
                />
                <button type="button" onClick={addDraftItem} className={adminUi.btnGhost}>
                  Ajouter
                </button>
              </div>
              {draftItems.length > 0 && (
                <ul className="text-xs text-white/80 mb-3 space-y-1">
                  {draftItems.map((i) => (
                    <li key={i.product_id}>
                      {i.quantity}× {productName(i.product_id)}
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                disabled={busy || !draftItems.length}
                onClick={handleCreateTransfer}
                className={adminUi.btnPrimary}
              >
                Créer le brouillon
              </button>
            </section>
          )}

          <section className={adminUi.card}>
            <h3 className={`${adminUi.cardTitle} mb-4`}>
              <ArrowLeftRight className="h-4 w-4 text-xeption-gold" />
              Transferts
            </h3>
            {stockOps.loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-white/40" />
              </div>
            ) : stockOps.transfers.length === 0 ? (
              <p className={adminUi.muted}>Aucun transfert.</p>
            ) : (
              <div className="space-y-3">
                {stockOps.transfers.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-white/10 bg-black/20 p-4 space-y-2"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <p className="text-white font-medium text-sm">
                          {t.from_store_name} → {t.to_store_name}
                        </p>
                        <p className="text-[10px] text-white/50 uppercase tracking-wider">
                          {TRANSFER_STATUS_LABELS[t.status]}
                          {t.days_in_transit != null && t.status === 'sent'
                            ? ` · ${t.days_in_transit} j en transit`
                            : ''}
                        </p>
                      </div>
                      {canOperate && (
                        <div className="flex flex-wrap gap-2">
                          {t.status === 'draft' && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={async () => {
                                  setBusy(true);
                                  try {
                                    await stockOps.sendTransfer(t.id);
                                    await stockOps.fetchTransfers(storeFilter || null);
                                  } catch (e) {
                                    alert(e instanceof Error ? e.message : 'Erreur');
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                                className={`${adminUi.btnPrimary} text-[10px] py-1.5`}
                              >
                                <Send className="h-3 w-3" />
                                Expédier
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={async () => {
                                  if (!confirm('Annuler ce brouillon ?')) return;
                                  setBusy(true);
                                  try {
                                    await stockOps.cancelTransfer(t.id);
                                    await stockOps.fetchTransfers(storeFilter || null);
                                  } catch (e) {
                                    alert(e instanceof Error ? e.message : 'Erreur');
                                  } finally {
                                    setBusy(false);
                                  }
                                }}
                                className={`${adminUi.btnGhost} text-[10px] py-1.5`}
                              >
                                Annuler
                              </button>
                            </>
                          )}
                          {t.status === 'sent' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  await stockOps.receiveTransfer(t.id);
                                  await stockOps.fetchTransfers(storeFilter || null);
                                } catch (e) {
                                  alert(e instanceof Error ? e.message : 'Erreur');
                                } finally {
                                  setBusy(false);
                                }
                              }}
                              className={`${adminUi.btnPrimary} text-[10px] py-1.5`}
                            >
                              Confirmer réception
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <ul className="text-xs text-white/70">
                      {t.items.map((i) => (
                        <li key={i.product_id}>
                          {i.quantity}× {i.product_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {segment === 'inventory' && canOperate && (
        <section className={adminUi.card}>
          <h3 className={`${adminUi.cardTitle} mb-4`}>
            <ClipboardList className="h-4 w-4 text-emerald-400" />
            Inventaire physique
          </h3>
          {!stockOps.inventorySession || stockOps.inventorySession.status !== 'open' ? (
            <div className="flex flex-wrap gap-3 items-end">
              <label className="text-xs text-white/70">
                Boutique
                <select
                  value={invStoreId}
                  onChange={(e) => setInvStoreId(e.target.value)}
                  className={`${adminUi.input} mt-1 block min-w-[160px]`}
                >
                  {activeStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-white/70 flex-1 min-w-[200px]">
                Motif / note
                <input
                  value={invNote}
                  onChange={(e) => setInvNote(e.target.value)}
                  className={`${adminUi.input} mt-1 block`}
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={handleStartInventory}
                className={adminUi.btnPrimary}
              >
                Lancer la session
              </button>
            </div>
          ) : (
            <>
              <p className={`${adminUi.muted} mb-4`}>
                Session ouverte — saisis les quantités comptées, puis valide.
              </p>
              <div className="overflow-x-auto max-h-[420px] custom-scrollbar">
                <table className="w-full text-left text-sm min-w-[520px]">
                  <thead className={adminUi.tableHead}>
                    <tr>
                      <th className="px-3 py-2">Produit</th>
                      <th className="px-3 py-2 text-right">Théorique</th>
                      <th className="px-3 py-2 text-right">Compté</th>
                      <th className="px-3 py-2 text-right">Écart</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className={adminUi.tableBody}>
                    {stockOps.inventoryLines.map((l) => {
                      const variance =
                        l.counted_qty != null ? l.counted_qty - l.expected_qty : null;
                      return (
                        <tr key={l.product_id}>
                          <td className="px-3 py-2 text-white">{l.product_name}</td>
                          <td className="px-3 py-2 text-right font-mono">{l.expected_qty}</td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              defaultValue={l.counted_qty ?? ''}
                              onChange={(e) =>
                                setCountDraft((d) => ({ ...d, [l.product_id]: e.target.value }))
                              }
                              className={`${adminUi.input} w-20 text-xs font-mono ml-auto`}
                            />
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-mono ${
                              variance != null && variance !== 0 ? 'text-amber-300' : ''
                            }`}
                          >
                            {variance ?? '—'}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => saveLineCount(l.product_id)}
                              className={`${adminUi.btnGhost} text-[10px] py-1`}
                            >
                              OK
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={handleCompleteInventory}
                className={`${adminUi.btnPrimary} mt-4`}
              >
                Valider l&apos;inventaire
              </button>
            </>
          )}
        </section>
      )}

      {segment === 'inventory' && !canOperate && (
        <p className={adminUi.muted}>Inventaire réservé au responsable boutique.</p>
      )}

      {segment === 'returns' && canOperate && (
        <section className={adminUi.card}>
          <h3 className={`${adminUi.cardTitle} mb-4`}>
            <RotateCcw className="h-4 w-4 text-amber-400" />
            Retour client (après livraison)
          </h3>
          <form onSubmit={handleReturn} className="grid gap-3 sm:grid-cols-2 max-w-2xl">
            <label className="text-xs text-white/70">
              N° commande
              <input
                required
                value={retOrderId}
                onChange={(e) => setRetOrderId(e.target.value)}
                className={`${adminUi.input} mt-1 font-mono`}
                placeholder="ORD-…"
              />
            </label>
            <label className="text-xs text-white/70">
              Produit
              <select
                required
                value={retProductId}
                onChange={(e) => setRetProductId(e.target.value)}
                className={`${adminUi.input} mt-1`}
              >
                <option value="">Choisir…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getProductDisplayName(p)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-white/70">
              Quantité
              <input
                required
                type="number"
                min={1}
                value={retQty}
                onChange={(e) => setRetQty(e.target.value)}
                className={`${adminUi.input} mt-1 font-mono`}
              />
            </label>
            <label className="text-xs text-white/70">
              Remboursement (FCFA)
              <input
                type="number"
                min={0}
                value={retRefund}
                onChange={(e) => setRetRefund(e.target.value)}
                className={`${adminUi.input} mt-1 font-mono`}
                placeholder="Optionnel → payment refunded"
              />
            </label>
            <label className="text-xs text-white/70 sm:col-span-2">
              Motif
              <input
                required
                value={retReason}
                onChange={(e) => setRetReason(e.target.value)}
                className={`${adminUi.input} mt-1`}
              />
            </label>
            <label className="text-xs text-white/70">
              Sortie stock
              <select
                value={retDisposition}
                onChange={(e) => setRetDisposition(e.target.value as 'restock' | 'sav')}
                className={`${adminUi.input} mt-1`}
              >
                <option value="restock">Revendable — réintégrer le stock</option>
                <option value="sav">Atelier SAV — pas de réintégration</option>
              </select>
            </label>
            <div className="flex items-end">
              <button type="submit" disabled={busy} className={adminUi.btnPrimary}>
                Enregistrer le retour
              </button>
            </div>
          </form>
        </section>
      )}

      {segment === 'returns' && !canOperate && (
        <p className={adminUi.muted}>Retours SAV réservés au responsable boutique.</p>
      )}

      {segment === 'journal' && (
        <section className={`${adminUi.card} overflow-hidden`}>
          <h3 className={`${adminUi.cardTitle} mb-4`}>
            <Package className="h-4 w-4 text-xeption-gold" />
            Journal des mouvements
          </h3>
          {stockOps.loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[520px] custom-scrollbar">
              <table className="w-full text-left text-sm min-w-[640px]">
                <thead className={adminUi.tableHead}>
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Boutique</th>
                    <th className="px-3 py-2">Produit</th>
                    <th className="px-3 py-2">Motif</th>
                    <th className="px-3 py-2 text-right">Δ</th>
                  </tr>
                </thead>
                <tbody className={adminUi.tableBody}>
                  {stockOps.movements.map((m) => (
                    <tr key={m.id} className="hover:bg-white/5">
                      <td className="px-3 py-2 text-xs text-white/60 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-3 py-2 text-xs">{m.store_name ?? '—'}</td>
                      <td className="px-3 py-2 text-white">{m.product_name}</td>
                      <td className="px-3 py-2 text-xs text-white/70">
                        {STOCK_MOVEMENT_REASON_LABELS[m.reason] ?? m.reason}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono font-bold ${
                          m.delta >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {m.delta > 0 ? '+' : ''}
                        {m.delta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stockOps.movements.length === 0 && (
                <p className={`${adminUi.muted} py-8 text-center`}>Aucun mouvement récent.</p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default StockMovementsTab;
