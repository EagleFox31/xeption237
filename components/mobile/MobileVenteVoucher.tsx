import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Info, Check, Copy, TrendingUp } from 'lucide-react';
import type { TradeInRequest, TrocEvaluationResult } from '../../types';
import { resolveVoucherReference } from '../../utils/trocVoucherRef';
import { resolveVoucherValidityDays } from '../../utils/voucherValidity';
import { buildWhatsAppUrl, buildSellAppointmentMessage } from '../../utils/whatsappShare';
import { downloadSellVoucher } from '../../utils/tradeInVoucherGenerator';
import { copyToClipboard } from '../../utils/clipboard';
import { trackTrocChoice } from '../../utils/analytics';

export interface MobileVenteVoucherProps {
  request: TradeInRequest;
  result?: TrocEvaluationResult | null;
  onBack: () => void;
}

const formatF = (amount: number): string =>
  new Intl.NumberFormat('fr-FR').format(Math.max(0, Math.round(amount)));

const round5k = (n: number) => Math.round(n / 5000) * 5000;

export const MobileVenteVoucher: React.FC<MobileVenteVoucherProps> = ({
  request,
  result,
  onBack,
}) => {
  const navigate = useNavigate();
  const voucherRef = resolveVoucherReference(request);
  const [copiedRef, setCopiedRef] = useState(false);
  const [dlStatus, setDlStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const autoDownloadFired = useRef(false);

  useEffect(() => {
    document.body.classList.add('hide-mobile-bottom-nav');
    return () => document.body.classList.remove('hide-mobile-bottom-nav');
  }, []);

  const creditValue =
    result?.tradeInValueCredit || result?.tradeInValue || request.trade_in_value || 270000;
  const cashValue =
    result?.tradeInValueCash || round5k(creditValue * 0.85);

  const sellMin = round5k(Math.min(creditValue, cashValue) * 0.9);
  const sellMax = round5k(Math.max(creditValue, cashValue) * 0.9);

  const marketplaceMin = round5k(creditValue * 1.05);
  const marketplaceMax = round5k(creditValue * 1.3);

  const validityDays = resolveVoucherValidityDays(request.voucher_expires_at, request.created_at);

  useEffect(() => {
    if (autoDownloadFired.current) return;
    autoDownloadFired.current = true;
    let isMounted = true;
    setDlStatus('pending');
    downloadSellVoucher(request, { sellMin, sellMax })
      .then(() => { if (isMounted) setDlStatus('done'); })
      .catch(() => { if (isMounted) setDlStatus('error'); });
    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = async () => {
    if (!voucherRef) return;
    const ok = await copyToClipboard(voucherRef);
    if (ok) { setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000); }
  };

  const deviceBrand = request.device_brand || 'Smartphone';
  const deviceModel = request.device_model || '';
  // Évite "Xiaomi Xiaomi 14 T" si le modèle commence déjà par la marque
  const deviceLabel = deviceModel.toLowerCase().startsWith(deviceBrand.toLowerCase())
    ? deviceModel
    : `${deviceBrand} ${deviceModel}`.trim();
  const grade = (result?.tradeInGrade || request.trade_in_grade || 'A').toUpperCase();
  const imeiLabel = request.imei_status === 'valid' ? 'IMEI Garanti' : 'IMEI Vérifié';
  // Affichage ref : BON- au lieu de TRC- sur le bon de vente
  const displayRef = voucherRef.replace(/^TRC-/i, 'BON-');

  const whatsappUrl = buildWhatsAppUrl(
    buildSellAppointmentMessage(request, { sellMin, sellMax }),
  );

  const handleMarketplace = () => {
    trackTrocChoice('marketplace');
    navigate('/marketplace/lister', {
      state: { request, result, sellMax, marketplaceMax },
    });
  };

  return (
    <div className="w-full min-h-[calc(100dvh-132px)] flex flex-col px-4 pt-2 pb-32 relative overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

      {/* Lueur ambiante */}
      <div className="absolute -top-16 -right-16 w-72 h-72 bg-gradient-to-bl from-amber-400/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Retour */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-zinc-200 hover:text-white text-[11px] font-tech transition-colors mb-2 shrink-0"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Retour au bon d'échange
      </button>

      {/* En-tête */}
      <div className="text-center pt-1 pb-2 shrink-0">
        <h1 className="text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ffe680] via-[#f5bf26] to-[#d99706] tracking-tight leading-tight">
          Ton Bon de Vente Officiel
        </h1>
        <p className="text-zinc-300 text-[11px] font-sans mt-0.5">
          Prends RDV · Xeption rachète ton appareil
        </p>
      </div>

      {/* Ticket */}
      <div className="relative rounded-3xl bg-gradient-to-b from-[#141419] via-[#0f0f13] to-[#0a0a0d] border-2 border-amber-400/80 p-4 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
        {/* Encoches */}
        <div className="absolute top-12 -left-3 w-5 h-5 rounded-full bg-[#09090c] border-r-2 border-amber-400/80 pointer-events-none" />
        <div className="absolute top-12 -right-3 w-5 h-5 rounded-full bg-[#09090c] border-l-2 border-amber-400/80 pointer-events-none" />

        {/* Badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-black font-tech font-black text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(251,191,36,0.5)]">
          VENTE
        </div>

        {/* Logo + Ref */}
        <div className="flex items-center justify-between pt-0.5 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-1.5">
            <img
              src="https://res.cloudinary.com/dli0kdkg9/image/upload/v1768287078/logo_mbajfa.png"
              alt="Xeption"
              className="w-5 h-5 object-contain drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]"
            />
            <span className="font-tech text-sm font-black tracking-wider text-white flex items-baseline gap-1">
              XEPTION
              <span className="w-1 h-1 bg-xeption-red rounded-full inline-block shadow-[0_0_5px_#ff0033]" />
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-zinc-300 font-tech font-bold text-[11px] tracking-wider bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/10 transition-colors"
            title="Copier le numéro"
          >
            <span>#{displayRef}</span>
            {copiedRef
              ? <Check className="w-3 h-3 text-emerald-400" />
              : <Copy className="w-3 h-3 text-zinc-400" />}
          </button>
        </div>

        {/* Appareil + Grade */}
        <div className="pt-2 pb-2.5">
          <div className="text-zinc-300 font-tech font-bold text-[11px] tracking-wide text-center leading-snug">
            {deviceLabel} · Grade {grade} · {imeiLabel}
          </div>
        </div>

        {/* Prix de vente */}
        <div className="rounded-2xl bg-[#171720] border border-amber-400/20 p-3 text-center">
          <div className="text-zinc-400 text-[9px] font-tech uppercase tracking-widest mb-1">
            Estimation Xeption
          </div>
          <div className="font-tech font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffe680] via-[#facc15] to-[#eab308] text-[18px] leading-tight">
            {formatF(sellMin)} – {formatF(sellMax)} FCFA
          </div>
          <div className="text-zinc-400 text-[9px] font-sans mt-1">
            Montant confirmé lors du RDV en boutique
          </div>
        </div>

        {/* Validité */}
        <div className="mt-2.5 flex justify-center">
          <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[9px] font-sans whitespace-nowrap">
            Valable {validityDays} j · Mfoundi Mall
          </div>
        </div>
      </div>

      {/* Indicateur téléchargement */}
      {dlStatus === 'pending' && (
        <div className="mt-3 text-center text-[11px] text-zinc-400 font-sans">
          Ton bon se sauvegarde sur ton téléphone…
        </div>
      )}
      {dlStatus === 'done' && (
        <div className="mt-3 text-center text-[11px] text-emerald-400 font-sans">
          ✓ Bon PDF sauvegardé
        </div>
      )}
      {dlStatus === 'error' && (
        <div className="mt-3 text-center text-[11px] text-zinc-400 font-sans">
          Bon non sauvegardé — contacte l'équipe ci-dessous.
        </div>
      )}

      {/* Info documents */}
      <div className="mt-3 rounded-2xl bg-amber-400/8 border border-amber-400/25 px-3 py-2.5 flex items-start gap-2 text-left">
        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <span className="text-[11px] text-amber-200/80 font-sans leading-snug">
          Amène ton appareil + une <strong className="text-amber-200">CNI ou passeport</strong> lors du RDV. La facture d'achat est un plus si tu l'as encore.
        </span>
      </div>

      {/* Barre fixe en bas : 2 CTAs côte à côte */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0d]/95 backdrop-blur-xl border-t border-white/10 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.9)]">
        <div className="flex gap-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3.5 rounded-2xl bg-[#075e54] hover:bg-[#128c7e] border border-emerald-500/30 text-white flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(7,94,84,0.5)]"
          >
            <div className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 stroke-[2.2] shrink-0" />
              <span className="font-tech font-black text-[11px] uppercase tracking-wider">RDV en boutique</span>
            </div>
            <span className="text-[9px] font-normal text-emerald-200 font-sans">Envoie ton bon à Xeption</span>
          </a>
          <button
            type="button"
            onClick={handleMarketplace}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 border border-amber-400/50 text-black flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(251,191,36,0.3)]"
          >
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span className="font-tech font-black text-[11px] uppercase tracking-wider">Marketplace</span>
            </div>
            <span className="text-[9px] font-normal text-black/60 font-sans">Vendre à quelqu'un</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileVenteVoucher;
