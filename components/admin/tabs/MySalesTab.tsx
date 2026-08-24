import React, { useEffect } from 'react';
import { Calendar, Loader2, PartyPopper, Receipt, TrendingUp, AlertTriangle } from 'lucide-react';
import { adminUi } from '../shared/adminUi';
import TargetProgressCard from '../targets/TargetProgressCard';
import { getPaymentMethodLabel } from '../../../utils/paymentMethods';
import { getOrderStatusLabel } from '../../../utils/orderWorkflow';
import type { StaffSalesSummary, StaffSaleRow } from '../../../hooks/admin/useMySales';
import type { StaffTargetProgress } from '../../../utils/salesTargets';
import type { Order } from '../../../types';

interface MySalesTabProps {
  staffName: string;
  storeName: string | null;
  summary: StaffSalesSummary;
  sales: StaffSaleRow[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  loading: boolean;
  onRefresh: () => void;
  targetProgress?: StaffTargetProgress | null;
  targetsLoading?: boolean;
}

const formatDayInput = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const MySalesTab: React.FC<MySalesTabProps> = ({
  staffName,
  storeName,
  summary,
  sales,
  selectedDate,
  onDateChange,
  loading,
  onRefresh,
  targetProgress,
  targetsLoading,
}) => {
  useEffect(() => {
    void onRefresh();
  }, [onRefresh, selectedDate]);

  const dailyAchieved = targetProgress?.daily?.achieved;
  const monthlyAchieved = targetProgress?.monthly?.achieved;

  return (
    <div className="animate-in fade-in space-y-4 h-[calc(100vh-140px)] flex flex-col">
      {!storeName && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-sm p-3 flex items-start gap-2 text-amber-200 text-sm shrink-0">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Aucune boutique rattachée à ton compte — tes ventes s&apos;affichent quand même, mais la direction doit te rattacher pour le suivi par magasin.</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 shrink-0">
        <label className="flex items-center gap-2 text-sm text-white/80">
          <Calendar className="h-4 w-4 text-xeption-gold" />
          <span className="font-medium">Jour</span>
          <input
            type="date"
            value={formatDayInput(selectedDate)}
            onChange={(e) => {
              const [y, m, d] = e.target.value.split('-').map(Number);
              if (y && m && d) onDateChange(new Date(y, m - 1, d));
            }}
            className="bg-black/50 border border-white/20 text-white px-3 py-2 rounded-sm text-sm focus:border-xeption-gold outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => onDateChange(new Date())}
          className={`${adminUi.btnGhost} text-xs`}
        >
          Aujourd&apos;hui
        </button>
        <span className="text-xs text-white/50 ml-auto">
          {staffName}
          {storeName ? ` · ${storeName}` : ''}
        </span>
      </div>

      {(targetsLoading || targetProgress) && (
        <div className="space-y-3 shrink-0">
          {(dailyAchieved || monthlyAchieved) && (
            <div className={`${adminUi.hintCard} border-emerald-500/40 flex items-start gap-2`}>
              <PartyPopper className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-white/85 leading-snug">
                {dailyAchieved && monthlyAchieved
                  ? 'Objectifs du jour et du mois atteints — bravo !'
                  : dailyAchieved
                    ? 'Objectif du jour atteint — bravo !'
                    : 'Objectif du mois atteint — bravo !'}
              </p>
            </div>
          )}
          {targetsLoading && !targetProgress ? (
            <div className="flex justify-center py-6 text-white/40">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : targetProgress ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <TargetProgressCard title="Objectif du jour" slice={targetProgress.daily} />
              <TargetProgressCard title="Objectif du mois" slice={targetProgress.monthly} />
            </div>
          ) : null}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3 shrink-0">
        <div className={`${adminUi.surface} p-4`}>
          <p className="text-[10px] uppercase tracking-widest text-white/55 mb-1">Ventes</p>
          <p className="text-2xl font-bold text-white font-mono">{summary.saleCount}</p>
        </div>
        <div className={`${adminUi.surface} p-4`}>
          <p className="text-[10px] uppercase tracking-widest text-white/55 mb-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Encaissé
          </p>
          <p className="text-2xl font-bold text-xeption-gold font-mono">
            {summary.totalAmount.toLocaleString('fr-FR')}{' '}
            <span className="text-xs text-white/60">FCFA</span>
          </p>
        </div>
        <div className={`${adminUi.surface} p-4`}>
          <p className="text-[10px] uppercase tracking-widest text-white/55 mb-1">Remises</p>
          <p className="text-2xl font-bold text-amber-300 font-mono">
            {summary.discountTotal.toLocaleString('fr-FR')}{' '}
            <span className="text-xs text-white/60">FCFA</span>
          </p>
        </div>
      </div>

      <div className={`${adminUi.surface} flex-1 min-h-0 overflow-hidden flex flex-col`}>
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 shrink-0">
          <Receipt className="h-4 w-4 text-xeption-gold" />
          <h3 className={adminUi.cardTitle}>Détail des ventes</h3>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-white/50">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-white/55 p-8 text-center">
            Aucune vente enregistrée pour cette journée.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead className={adminUi.tableHead}>
                <tr>
                  <th className="px-4 py-3">Heure</th>
                  <th className="px-4 py-3">Réf.</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Articles</th>
                  <th className="px-4 py-3">Paiement</th>
                  <th className="px-4 py-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                {sales.map((sale) => (
                  <tr key={sale.orderId} className="hover:bg-white/5 align-top">
                    <td className="px-4 py-3 text-xs text-white/70 whitespace-nowrap">
                      {formatTime(sale.saleDate)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-xeption-gold">
                      #{sale.orderId}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-white">{sale.customerName}</span>
                      {sale.customerPhone && (
                        <span className="text-[10px] text-white/55">{sale.customerPhone}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/75 max-w-[220px]">
                      {sale.items.length > 0 ? (
                        <ul className="space-y-0.5">
                          {sale.items.map((item) => (
                            <li key={item.id} className="truncate">
                              {item.quantity}× {item.name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span>{sale.itemCount} article(s)</span>
                      )}
                      <span className="block text-[10px] text-white/45 mt-1">
                        {getOrderStatusLabel(sale.status as Order['status'])}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/80">
                      {getPaymentMethodLabel(sale.paymentMethod)}
                      {sale.discountAmount > 0 && (
                        <span className="block text-[10px] text-amber-300 mt-0.5">
                          −{sale.discountAmount.toLocaleString('fr-FR')} remise
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-white whitespace-nowrap">
                      {sale.total.toLocaleString('fr-FR')} F
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MySalesTab;
