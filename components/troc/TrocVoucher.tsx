import React, { useState } from 'react';
import { Printer, Download, RefreshCw, Loader2 } from 'lucide-react';
import type { TradeInRequest } from '../../types';
import { downloadTradeInVoucher } from '../../utils/tradeInVoucherGenerator';

interface TrocVoucherProps {
  request: TradeInRequest;
  onPrint: () => void;
  onNewEvaluation: () => void;
}

const formatFCFA = (amount: number): string =>
  new Intl.NumberFormat('fr-FR').format(amount).replace(/\s/g, '.') + ' FCFA';

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const addDays = (iso: string, days: number): string => {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const TrocVoucher: React.FC<TrocVoucherProps> = ({ request, onPrint, onNewEvaluation }) => {
  const { voucher_reference, customer_name, device_brand, device_model, trade_in_value, created_at } = request;
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadTradeInVoucher(request);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="text-center border-b border-white/10 pb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-xeption-gold/10 border border-xeption-gold/20 text-xeption-gold text-[10px] font-tech font-bold uppercase tracking-widest mb-4">
          <RefreshCw className="w-3 h-3" /> Smart Troc - Bon de reprise
        </div>
        <h1 className="text-3xl font-tech font-bold text-white tracking-widest">{voucher_reference}</h1>
        <p className="text-xs text-white/70 font-sans mt-1">Emis le {formatDate(created_at)}</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="bg-black/40 border border-white/10 px-4 py-3 rounded-sm">
          <p className="text-[10px] font-tech uppercase tracking-widest text-gray-500 mb-0.5">Client</p>
          <p className="font-tech font-bold text-white">{customer_name}</p>
        </div>

        <div className="bg-black/40 border border-white/10 px-4 py-3 rounded-sm">
          <p className="text-[10px] font-tech uppercase tracking-widest text-gray-500 mb-0.5">Appareil</p>
          <p className="font-tech font-bold text-white">{device_brand} {device_model}</p>
        </div>

        <div className="bg-xeption-gold/10 border border-xeption-gold/30 px-4 py-5 text-center shadow-[0_0_20px_rgba(255,215,0,0.1)]">
          <p className="text-[10px] font-tech uppercase tracking-widest text-white/60 mb-1">Valeur de reprise estimée</p>
          <p className="text-4xl font-tech font-bold text-xeption-gold">{formatFCFA(trade_in_value ?? 0)}</p>
          <p className="text-xs font-tech text-white/70 uppercase tracking-widest mt-1">
            Sous reserve de validation en boutique
          </p>
        </div>

        <div className="bg-black/40 border border-white/10 px-4 py-3 rounded-sm text-center">
          <p className="text-[10px] font-tech uppercase tracking-widest text-white">
            Valable 30 jours - jusqu'au {addDays(created_at, 30)}
          </p>
          <p className="text-[9px] text-white/50 font-sans mt-1 italic">
            Offre valable sous reserve de verification physique en boutique Xeption Network
          </p>
        </div>
      </div>

      {/* Télécharger — prioritaire sur imprimer */}
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="w-full flex items-center justify-center gap-2 bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-4 text-sm shadow-[0_0_20px_rgba(255,215,0,0.25)] transition-all disabled:opacity-60 disabled:cursor-wait"
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Génération du PDF…
          </>
        ) : (
          <>
            <Download className="w-4 h-4" /> Télécharger le bon
          </>
        )}
      </button>

      <button
        onClick={onPrint}
        className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:border-white/30 text-gray-400 hover:text-white font-tech font-bold uppercase tracking-widest py-3 text-sm transition-all"
      >
        <Printer className="w-4 h-4" /> Imprimer
      </button>

      <button
        onClick={onNewEvaluation}
        className="w-full text-gray-600 hover:text-gray-400 font-tech font-bold uppercase tracking-widest py-3 text-xs transition-all"
      >
        Nouvelle évaluation
      </button>
    </div>
  );
};
