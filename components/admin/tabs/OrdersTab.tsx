
import React, { useMemo, useState } from 'react';
import { Order } from '../../../types';
import { generateInvoiceHTML } from '../../../utils/invoiceGenerator';
import {
  canIssueInvoice,
  canCancelOrder,
  getInvoiceGateLabel,
  getInvoiceHint,
  getOrderActionHint,
  getOrderStatusLabel,
  SALES_PAGE_HINT,
} from '../../../utils/orderWorkflow';
import { Eye, Printer, Download, CreditCard } from 'lucide-react';
import OrderDetailModal from '../modals/OrderDetailModal';
import OrderCollectPaymentModal from '../modals/OrderCollectPaymentModal';
import TableShell from '../shared/TableShell';
import { adminUi } from '../shared/adminUi';
import type { OrderPaymentUiState } from '../../../hooks/admin/useOrderPayment';
import { useDueFeedbackInvites } from '../../../hooks/useDueFeedbackInvites';
import OrderFeedbackInviteButton from '../OrderFeedbackInviteButton';

type OrderFilter = 'all' | 'active' | 'cancelled';
type OrderSort = 'date-desc' | 'date-asc' | 'total-desc' | 'total-asc' | 'customer' | 'status';

interface OrdersTabProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: Order['status']) => void;
  onCancelOrder: (order: Order) => void;
  onCollectPayment: (order: Order) => void;
  paymentUiState: OrderPaymentUiState;
  paymentError: string | null;
  collectingOrder: Order | null;
  onCloseCollectPayment: () => void;
  onInitiateCampay: (phone: string) => Promise<void>;
  onMarkCashPaid: () => Promise<void>;
}

const statusStyles: Record<Order['status'], string> = {
  pending: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
  confirmed: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
  shipped: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
  ready: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10',
  delivered: 'border-green-500/30 text-green-500 bg-green-500/10',
  cancelled: 'border-red-500/30 text-red-400 bg-red-500/10',
  refused: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
  returned: 'border-slate-500/30 text-slate-300 bg-slate-500/10',
};

const FILTER_OPTIONS: { id: OrderFilter; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'active', label: 'En cours' },
  { id: 'cancelled', label: 'Annulées' },
];

const SORT_OPTIONS: { id: OrderSort; label: string }[] = [
  { id: 'date-desc', label: 'Tri : plus récentes' },
  { id: 'date-asc', label: 'Tri : plus anciennes' },
  { id: 'total-desc', label: 'Tri : montant ↓' },
  { id: 'total-asc', label: 'Tri : montant ↑' },
  { id: 'customer', label: 'Tri : client A–Z' },
  { id: 'status', label: 'Tri : étape' },
];

const STATUS_SORT_ORDER: Record<Order['status'], number> = {
  pending: 0,
  confirmed: 1,
  shipped: 2,
  ready: 3,
  refused: 4,
  delivered: 5,
  returned: 6,
  cancelled: 7,
};

const orderTimestamp = (order: Order) => {
  if (order.createdAt) return new Date(order.createdAt).getTime();
  const parts = order.date.split('/');
  if (parts.length === 3) {
    return new Date(+parts[2], +parts[1] - 1, +parts[0]).getTime();
  }
  return 0;
};

const matchesOrderSearch = (order: Order, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const statusLabel = getOrderStatusLabel(order.status).toLowerCase();
  const delivery =
    order.deliveryMode === 'pickup' ? 'retrait boutique' : 'livraison';
  const haystack = [
    order.id,
    order.customerName,
    order.customerEmail,
    order.customerPhone,
    order.customerCity,
    order.date,
    String(order.total),
    order.status,
    statusLabel,
    delivery,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
};

const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  onUpdateStatus,
  onCancelOrder,
  onCollectPayment,
  paymentUiState,
  paymentError,
  collectingOrder,
  onCloseCollectPayment,
  onInitiateCampay,
  onMarkCashPaid,
}) => {
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const { invites: dueInvites, refresh: refreshInvites, markSent } = useDueFeedbackInvites();
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [sort, setSort] = useState<OrderSort>('date-desc');
  const [search, setSearch] = useState('');

  const displayedOrders = useMemo(() => {
    let list = orders;
    if (filter === 'active') {
      list = list.filter(
        (o) =>
          o.status !== 'delivered' &&
          o.status !== 'cancelled' &&
          o.status !== 'returned'
      );
    } else if (filter === 'cancelled') {
      list = list.filter((o) => o.status === 'cancelled');
    }
    if (search.trim()) {
      list = list.filter((o) => matchesOrderSearch(o, search));
    }

    const sorted = [...list];
    switch (sort) {
      case 'date-asc':
        sorted.sort((a, b) => orderTimestamp(a) - orderTimestamp(b));
        break;
      case 'total-desc':
        sorted.sort((a, b) => b.total - a.total);
        break;
      case 'total-asc':
        sorted.sort((a, b) => a.total - b.total);
        break;
      case 'customer':
        sorted.sort((a, b) => a.customerName.localeCompare(b.customerName, 'fr'));
        break;
      case 'status':
        sorted.sort(
          (a, b) =>
            STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status] ||
            orderTimestamp(b) - orderTimestamp(a)
        );
        break;
      default:
        sorted.sort((a, b) => orderTimestamp(b) - orderTimestamp(a));
    }
    return sorted;
  }, [orders, filter, sort, search]);

  const needsPayment = (o: Order) =>
    o.paymentStatus !== 'paid' &&
    o.status !== 'pending' &&
    o.status !== 'cancelled' &&
    o.status !== 'delivered' &&
    ['confirmed', 'shipped', 'ready'].includes(o.status);

  const canComplete = (o: Order) => o.paymentStatus === 'paid';

  const handleComplete = (o: Order) => {
    if (!canComplete(o) && needsPayment(o)) {
      onCollectPayment(o);
      return;
    }
    onUpdateStatus(o.id, 'delivered');
    window.setTimeout(() => {
      void refreshInvites();
    }, 400);
  };

  const handlePrint = (order: Order) => {
    const html = generateInvoiceHTML(order);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const handleDownloadPDF = async (order: Order) => {
    const html = generateInvoiceHTML(order);
    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.width = '700px';
    element.style.background = 'white';

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.appendChild(element);
    document.body.appendChild(container);

    const safeName = order.customerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default;
      await html2pdf()
        .set({
          margin: 0,
          filename: `Facture_${order.id}_${safeName}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(element)
        .save();
    } catch {
      alert('Impossible de générer le PDF pour le moment.');
    } finally {
      document.body.removeChild(container);
    }
  };

  return (
    <div className="animate-in fade-in h-[calc(100vh-140px)] flex flex-col">
      <div className={`mb-3 shrink-0 ${adminUi.hintCard}`}>
        <p className={`${adminUi.body} leading-snug`}>{SALES_PAGE_HINT}</p>
      </div>

      <div className="flex-1 min-h-0 relative">
        <TableShell
          className="h-full border-t border-white/10"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Réf., client, téléphone, ville…"
          filterOptions={FILTER_OPTIONS}
          filterValue={filter}
          onFilterChange={(id) => setFilter(id as OrderFilter)}
          sortOptions={SORT_OPTIONS}
          sortValue={sort}
          onSortChange={(id) => setSort(id as OrderSort)}
          resultCount={displayedOrders.length}
          resultLabel="commande"
        >
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead className={adminUi.tableHead}>
              <tr>
                <th className="px-4 py-3">Réf.</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Livraison</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Étape</th>
                <th className="px-4 py-3 text-right">À faire</th>
                <th className="px-4 py-3 text-right">Facture client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300 text-sm">
              {displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className={adminUi.emptyCell}>
                    {search.trim()
                      ? 'Aucune commande trouvée pour cette recherche.'
                      : 'Aucune commande pour ce filtre.'}
                  </td>
                </tr>
              ) : (
                displayedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 font-mono text-xs font-bold text-xeption-gold">
                      #{o.id}
                    </td>
                    <td className="px-4 py-4 text-xs text-white/80 whitespace-nowrap">
                      {o.date}
                    </td>
                    <td className="px-4 py-4">
                      <span className="block font-bold text-white">{o.customerName}</span>
                      <span className="text-[10px] text-white/65">
                        {o.customerEmail || o.customerPhone}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-white">
                      {o.deliveryMode === 'pickup' ? 'Retrait boutique' : 'Livraison'}
                      {o.customerCity && (
                        <span className="block text-[10px] text-white/65">{o.customerCity}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-white whitespace-nowrap">
                      {o.total.toLocaleString()} FCFA
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${statusStyles[o.status]}`}
                      >
                        {getOrderStatusLabel(o.status)}
                      </span>
                      {o.paymentStatus === 'paid' && o.status !== 'cancelled' && (
                        <span className="block text-[9px] text-green-400/90 mt-1 uppercase tracking-wider">
                          Payé
                        </span>
                      )}
                      {o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'returned' && (
                        <p className="text-[10px] text-white/70 mt-1.5 max-w-[140px] leading-tight">
                          {getOrderActionHint(o)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setViewingOrder(o)}
                          className="p-2 bg-white/5 hover:bg-white/20 text-white rounded transition-colors"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {o.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(o.id, 'confirmed')}
                            className="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1.5 rounded uppercase font-bold"
                          >
                            Valider
                          </button>
                        )}
                        {o.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateStatus(o.id, o.deliveryMode === 'delivery' ? 'shipped' : 'ready')
                            }
                            className="text-[10px] bg-yellow-600 hover:bg-yellow-500 text-black px-2.5 py-1.5 rounded uppercase font-bold"
                          >
                            Expédier
                          </button>
                        )}
                        {o.status === 'shipped' && (
                          <>
                            {needsPayment(o) && (
                              <button
                                type="button"
                                onClick={() => onCollectPayment(o)}
                                className="text-[10px] bg-xeption-gold hover:bg-white text-black px-2.5 py-1.5 rounded uppercase font-bold flex items-center gap-1"
                              >
                                <CreditCard className="w-3 h-3" />
                                Encaisser
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleComplete(o)}
                              className="text-[10px] bg-green-600 hover:bg-green-500 text-white px-2.5 py-1.5 rounded uppercase font-bold"
                            >
                              Terminer
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateStatus(o.id, 'refused')}
                              className="text-[10px] border border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-black px-2.5 py-1.5 rounded uppercase font-bold"
                            >
                              Refus livraison
                            </button>
                          </>
                        )}
                        {o.status === 'ready' && (
                          <>
                            {needsPayment(o) && (
                              <button
                                type="button"
                                onClick={() => onCollectPayment(o)}
                                className="text-[10px] bg-xeption-gold hover:bg-white text-black px-2.5 py-1.5 rounded uppercase font-bold flex items-center gap-1"
                              >
                                <CreditCard className="w-3 h-3" />
                                Encaisser
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleComplete(o)}
                              className="text-[10px] bg-green-600 hover:bg-green-500 text-white px-2.5 py-1.5 rounded uppercase font-bold"
                            >
                              Terminer
                            </button>
                          </>
                        )}
                        {o.status === 'refused' && (
                          <button
                            type="button"
                            onClick={() => onUpdateStatus(o.id, 'returned')}
                            className="text-[10px] bg-slate-600 hover:bg-slate-500 text-white px-2.5 py-1.5 rounded uppercase font-bold"
                          >
                            Retour reçu
                          </button>
                        )}
                        {canCancelOrder(o) && (
                          <button
                            type="button"
                            onClick={() => onCancelOrder(o)}
                            className="text-[10px] border border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-2.5 py-1.5 rounded uppercase font-bold"
                          >
                            Annuler
                          </button>
                        )}
                        {o.status === 'delivered' &&
                          dueInvites
                            .filter((invite) => invite.order_id === o.id && invite.kind === 'service')
                            .map((invite) => (
                              <OrderFeedbackInviteButton
                                key={invite.token}
                                invite={invite}
                                onSent={markSent}
                              />
                            ))}
                        {o.status === 'delivered' &&
                          dueInvites
                            .filter((invite) => invite.order_id === o.id && invite.kind === 'product')
                            .map((invite) => (
                              <OrderFeedbackInviteButton
                                key={invite.token}
                                invite={invite}
                                onSent={markSent}
                              />
                            ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1 min-w-[88px]">
                        {canIssueInvoice(o) ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handlePrint(o)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                              title="Imprimer la facture"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPDF(o)}
                              className="p-2 text-xeption-gold hover:bg-xeption-gold/10 rounded transition-colors"
                              title="Télécharger PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span
                            className="text-[10px] text-white/75 text-right leading-tight max-w-[130px]"
                            title={getInvoiceHint(o.status)}
                          >
                            {getInvoiceGateLabel(o.status)}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableShell>
      </div>

      {viewingOrder && (
        <OrderDetailModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
      )}

      {collectingOrder && (
        <OrderCollectPaymentModal
          order={collectingOrder}
          uiState={paymentUiState}
          error={paymentError}
          onClose={onCloseCollectPayment}
          onInitiateCampay={onInitiateCampay}
          onMarkCashPaid={onMarkCashPaid}
        />
      )}
    </div>
  );
};

export default OrdersTab;
