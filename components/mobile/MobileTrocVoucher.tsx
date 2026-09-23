import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Info,
  Check,
  Copy,
  Loader2,
  Banknote,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { TradeInRequest, TrocEvaluationResult } from '../../types';
import { resolveVoucherReference, buildBonPortalUrl } from '../../utils/trocVoucherRef';
import { resolveVoucherValidityDays } from '../../utils/voucherValidity';
import { buildWhatsAppUrl, buildTradeInVoucherShareMessage } from '../../utils/whatsappShare';
import { resolveTrocTargetSummary, type TrocTargetSummary } from '../../services/trocCheckoutService';
import { downloadTradeInVoucher } from '../../utils/tradeInVoucherGenerator';
import { copyToClipboard } from '../../utils/clipboard';
import { trackTrocChoice } from '../../utils/analytics';

export interface MobileTrocVoucherProps {
  request: TradeInRequest;
  result?: TrocEvaluationResult | null;
  onNewEvaluation: () => void;
  onSellInstead?: () => void;
}

const formatF = (amount: number): string =>
  new Intl.NumberFormat('fr-FR').format(Math.max(0, Math.round(amount)));

export const MobileTrocVoucher: React.FC<MobileTrocVoucherProps> = ({
  request,
  result,
  onSellInstead,
}) => {
  const voucherRef = resolveVoucherReference(request);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedRef, setCopiedRef] = useState(false);
  const [targetSummary, setTargetSummary] = useState<TrocTargetSummary | null>(null);
  const [dlStatus, setDlStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const autoDownloadFired = useRef(false);

  useEffect(() => {
    document.body.classList.add('hide-mobile-bottom-nav');
    return () => document.body.classList.remove('hide-mobile-bottom-nav');
  }, []);

  const creditValue =
    result?.tradeInValueCredit || result?.tradeInValue || request.trade_in_value || 270000;
  const cashValue =
    result?.tradeInValueCash || Math.round((creditValue * 0.85) / 5000) * 5000;
  const minVal = Math.min(creditValue, cashValue);
  const maxVal = Math.max(creditValue, cashValue);
  const displayMin = minVal < maxVal ? minVal : Math.round((maxVal * 0.85) / 5000) * 5000;
  const displayMax = maxVal;

  const validityDays = resolveVoucherValidityDays(request.voucher_expires_at, request.created_at);

  useEffect(() => {
    let isMounted = true;
    resolveTrocTargetSummary(request)
      .then((s) => { if (isMounted && s) setTargetSummary(s); })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [request]);

  // Génération QR + auto-download PDF une fois le QR prêt
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(buildBonPortalUrl(voucherRef), {
      margin: 1,
      width: 240,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then(async (url) => {
        if (!isMounted) return;
        setQrDataUrl(url);
        // Auto-download une seule fois
        if (autoDownloadFired.current) return;
        autoDownloadFired.current = true;
        setDlStatus('pending');
        try {
          await downloadTradeInVoucher(request, targetSummary);
          if (isMounted) setDlStatus('done');
        } catch {
          if (isMounted) setDlStatus('error');
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  // targetSummary intentionnellement absent : on déclenche dès que le QR est prêt
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucherRef]);

  const handleCopy = async () => {
    if (!voucherRef) return;
    const ok = await copyToClipboard(voucherRef);
    if (ok) { setCopiedRef(true); setTimeout(() => setCopiedRef(false), 2000); }
  };

  const whatsappUrl = buildWhatsAppUrl(
    buildTradeInVoucherShareMessage(request, { reste: targetSummary?.reste }),
  );

  const deviceBrand = request.device_brand || 'Smartphone';
  const deviceModel = request.device_model || '';
  const grade = (result?.tradeInGrade || request.trade_in_grade || 'A').toUpperCase();
  const imeiLabel = request.imei_status === 'valid' ? 'IMEI Garanti' : 'IMEI Vérifié';

  return (
    <div className="w-full min-h-[calc(100dvh-132px)] flex flex-col px-4 pt-2 pb-32 relative overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

        {/* Lueur ambiante */}
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-gradient-to-bl from-amber-400/15 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* En-tête compact */}
        <div className="text-center pt-1 pb-2 shrink-0">
          <h1 className="text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ffe680] via-[#f5bf26] to-[#d99706] tracking-tight leading-tight">
            Ton Bon de Reprise Officiel
          </h1>
          <p className="text-zinc-500 text-[11px] font-sans mt-0.5">
            Présente ce bon à la boutique Mfoundi Mall
          </p>
        </div>

        {/* ── Ticket VIP compact ── */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#141419] via-[#0f0f13] to-[#0a0a0d] border-2 border-amber-400/80 p-4 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
          {/* Encoches latérales */}
          <div className="absolute top-12 -left-3 w-5 h-5 rounded-full bg-[#09090c] border-r-2 border-amber-400/80 pointer-events-none" />
          <div className="absolute top-12 -right-3 w-5 h-5 rounded-full bg-[#09090c] border-l-2 border-amber-400/80 pointer-events-none" />

          {/* Badge VIP */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-black font-tech font-black text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(251,191,36,0.5)]">
            VIP
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
              <span>#{voucherRef}</span>
              {copiedRef
                ? <Check className="w-3 h-3 text-emerald-400" />
                : <Copy className="w-3 h-3 text-zinc-400" />}
            </button>
          </div>

          {/* Modèle + Grade — compact */}
          <div className="pt-2 pb-2.5">
            <div className="text-zinc-300 font-tech font-bold text-[11px] tracking-wide text-center leading-snug">
              {deviceBrand} {deviceModel} · Grade {grade} · {imeiLabel}
            </div>
          </div>

          {/* ── Deux colonnes : QR gauche | Infos droite ── */}
          <div className="flex gap-3 items-stretch">
            {/* Colonne gauche : QR Code */}
            <div className="shrink-0 w-[130px] h-[130px] rounded-2xl bg-white flex items-center justify-center p-2.5 shadow-[0_0_16px_rgba(255,255,255,0.1)] ring-2 ring-amber-400/20">
              {qrDataUrl
                ? <img src={qrDataUrl} alt={`QR ${voucherRef}`} className="w-full h-full object-contain pointer-events-none" />
                : <Loader2 className="w-6 h-6 text-zinc-800 animate-spin" />}
            </div>

            {/* Colonne droite : Prix + Échange + Validité */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              {/* Prix */}
              <div>
                <div className="text-zinc-400 text-[9px] font-tech uppercase tracking-widest mb-0.5">
                  Valeur estimée
                </div>
                <div className="font-tech font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffe680] via-[#facc15] to-[#eab308] leading-tight text-[15px]">
                  {formatF(displayMin)} –<br />{formatF(displayMax)} FCFA
                </div>
              </div>

              {/* Échange + Reste (si présent) */}
              {targetSummary ? (
                <div className="mt-2 rounded-xl bg-[#171720] border border-amber-400/25 p-2">
                  <div className="text-[9.5px] text-zinc-400 leading-tight">Échange contre</div>
                  <div className="text-white font-tech font-bold text-[11px] truncate mt-0.5">
                    {targetSummary.name}
                  </div>
                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/5">
                    <span className="text-zinc-400 text-[9.5px] uppercase tracking-wide font-tech">Reste</span>
                    <span className="text-amber-400 font-tech font-black text-[11px]">
                      {targetSummary.reste > 0 ? `${formatF(targetSummary.reste)} F` : '0 F ✓'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 rounded-xl bg-[#171720] border border-white/8 p-2 text-center">
                  <div className="text-zinc-500 text-[9.5px] font-sans leading-snug">
                    Reprise cash · sans obligation d'achat
                  </div>
                </div>
              )}

              {/* Validité */}
              <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[9px] font-sans whitespace-nowrap">
                Valable {validityDays} j · Mfoundi Mall
              </div>
            </div>
          </div>
        </div>

        {/* Info CNI — compact */}
        <div className="mt-3 rounded-2xl bg-amber-400/8 border border-amber-400/25 px-3 py-2.5 flex items-start gap-2 text-left">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span className="text-[11px] text-amber-200/80 font-sans leading-snug">
            Présente une <strong className="text-amber-200">CNI ou passeport</strong> + la facture d'achat de l'appareil en boutique.
          </span>
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

      {/* ── Barre fixe en bas : 2 CTAs côte à côte ── */}
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
              <span className="font-tech font-black text-[11px] uppercase tracking-wider">Accélérer l'échange</span>
            </div>
            <span className="text-[9px] font-normal text-emerald-200 font-sans">Contacter Xeption</span>
          </a>
          {onSellInstead && (
            <button
              type="button"
              onClick={() => { trackTrocChoice('sell_to_xeption'); onSellInstead(); }}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 border border-amber-400/50 flex flex-col items-center justify-center gap-0.5 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(251,191,36,0.3)] text-black"
            >
              <div className="flex items-center gap-1.5">
                <Banknote className="w-4 h-4 shrink-0" />
                <span className="font-tech font-black text-[11px] uppercase tracking-wider">Vendre mon tél</span>
              </div>
              <span className="text-black/60 text-[9px] font-sans">Offre de rachat direct</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileTrocVoucher;
