import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Info } from 'lucide-react';
import type { TradeInRequest, TrocEvaluationResult } from '../../types';

export interface MobileMarketplacePassProps {
  request: TradeInRequest;
  result?: TrocEvaluationResult | null;
  onBack: () => void;
}

const formatF = (amount: number): string =>
  new Intl.NumberFormat('fr-FR').format(Math.max(0, Math.round(amount)));

const round5k = (n: number) => Math.round(n / 5000) * 5000;

export const MobileMarketplacePass: React.FC<MobileMarketplacePassProps> = ({
  request,
  result,
  onBack,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('hide-mobile-bottom-nav');
    return () => document.body.classList.remove('hide-mobile-bottom-nav');
  }, []);

  const creditValue =
    result?.tradeInValueCredit || result?.tradeInValue || request.trade_in_value || 0;

  const sellMax        = round5k(creditValue * 0.9);
  const marketplaceMin = round5k(creditValue * 1.05);
  const marketplaceMax = round5k(creditValue * 1.3);

  const deviceBrand = request.device_brand || 'Smartphone';
  const deviceModel = request.device_model || '';
  const deviceLabel = deviceModel.toLowerCase().startsWith(deviceBrand.toLowerCase())
    ? deviceModel
    : `${deviceBrand} ${deviceModel}`.trim();
  const grade = (result?.tradeInGrade || request.trade_in_grade || 'A').toUpperCase();
  const imeiLabel = request.imei_status === 'valid' ? 'IMEI Garanti' : 'IMEI Vérifié';

  const handleContinue = () => {
    navigate('/marketplace/lister', {
      state: { request, result, sellMax, marketplaceMax },
    });
  };

  return (
    <div className="w-full min-h-[calc(100dvh-132px)] flex flex-col px-4 pt-2 pb-32 relative overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

      <div className="absolute -top-16 -right-16 w-72 h-72 bg-gradient-to-bl from-amber-400/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-zinc-200 hover:text-white text-[11px] font-tech transition-colors mb-2 shrink-0"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Recommencer
      </button>

      <div className="text-center pt-1 pb-4 shrink-0">
        <h1 className="text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ffe680] via-[#f5bf26] to-[#d99706] tracking-tight leading-tight">
          Ton téléphone est prêt à vendre
        </h1>
      </div>

      {/* Récap appareil */}
      <div className="rounded-2xl bg-[#0f0f13] border border-white/10 px-4 py-4 space-y-2">
        <div className="text-zinc-400 text-[9px] font-tech uppercase tracking-widest">Ton appareil</div>
        <div className="text-white font-tech font-bold text-[15px] leading-snug">{deviceLabel}</div>
        <div className="text-zinc-300 text-[11px] font-sans">Grade {grade} · {imeiLabel}</div>
      </div>

      {/* Fourchette marketplace */}
      {marketplaceMax > 0 && (
        <div className="mt-3 rounded-2xl bg-amber-400/8 border border-amber-400/25 px-4 py-4">
          <div className="text-amber-300 text-[10px] font-tech uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Prix conseillé sur la marketplace
          </div>
          <div className="text-white font-tech font-black text-[20px]">
            {formatF(marketplaceMin)} – {formatF(marketplaceMax)} FCFA
          </div>
          <div className="mt-2 text-[11px] text-zinc-300 font-sans leading-relaxed">
            Tu peux ajuster ce prix à l'étape suivante.
          </div>
        </div>
      )}

      <div className="mt-3 rounded-2xl bg-zinc-900/60 border border-white/8 px-3 py-2.5 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
        <span className="text-[11px] text-zinc-300 font-sans leading-snug">
          Frais de publication à partir de 100 XAF. Tu gardes ton téléphone jusqu'à la vente.
        </span>
      </div>

      {/* CTA fixe bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0d]/95 backdrop-blur-xl border-t border-white/10 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.9)]">
        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-black font-tech font-black text-[13px] uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(251,191,36,0.3)]"
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          Vendre à quelqu'un
        </button>
      </div>
    </div>
  );
};

export default MobileMarketplacePass;
