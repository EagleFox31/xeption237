import React, { useEffect, useState } from 'react';
import { Printer, Download, RefreshCw, Loader2, MessageCircle, Calendar, BadgeCheck, FileText, AlertTriangle } from 'lucide-react';
import type { TradeInRequest } from '../../types';
import { buildWhatsAppUrl, buildTradeInVoucherShareMessage, buildTradeInAppointmentMessage } from '../../utils/whatsappShare';
import { generateCertificate, TierNotEligibleError, type TrocCertificate } from '../../services/trocEvaluationService';
import { resolveVoucherExpiryIso, resolveVoucherValidityDays } from '../../utils/voucherValidity';
import { resolveVoucherReference } from '../../utils/trocVoucherRef';
import { resolveTrocTargetSummary, type TrocTargetSummary } from '../../services/trocCheckoutService';

interface TrocVoucherProps {
  request: TradeInRequest;
  onPrint: () => void;
  onNewEvaluation: () => void;
  /** Cible déjà résolue (page /bon) — évite un second appel catalogue. */
  initialTarget?: TrocTargetSummary | null;
  hideNewEvaluation?: boolean;
  /** Action compacte en haut à droite (ex. changer l'appareil souhaité). */
  topRight?: React.ReactNode;
  /** Panneau expansible sous l'en-tête (ex. choix d'un nouvel appareil). */
  changeTargetPanel?: React.ReactNode;
}

const formatFCFA = (amount: number): string =>
  new Intl.NumberFormat('fr-FR').format(amount).replace(/\s/g, '.') + ' FCFA';

const formatPhone = (phone?: string | null): string | null => {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 9) return phone?.trim() || null;
  const local = digits.startsWith('237') ? digits.slice(3) : digits;
  if (local.length === 9) {
    return `+237 ${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7)}`;
  }
  return phone?.trim() || null;
};

const formatImei = (imei?: string | null): string | null => {
  const digits = (imei ?? '').replace(/\D/g, '');
  if (digits.length < 14) return null;
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const TrocVoucher: React.FC<TrocVoucherProps> = ({
  request,
  onPrint,
  onNewEvaluation,
  initialTarget,
  hideNewEvaluation,
  topRight,
  changeTargetPanel,
}) => {
  const {
    customer_name,
    customer_phone,
    device_brand,
    device_model,
    trade_in_value,
    created_at,
    voucher_expires_at,
    tier,
    id: tradeInId,
    imei,
  } = request;
  const voucherRef = resolveVoucherReference(request);
  const [isDownloading, setIsDownloading] = useState(false);
  const expiryIso = resolveVoucherExpiryIso(voucher_expires_at, created_at);
  const validityDays = resolveVoucherValidityDays(voucher_expires_at, created_at);
  const phoneDisplay = formatPhone(customer_phone);
  const imeiDisplay = formatImei(imei);

  // Appareil souhaite et reste a payer. Resolus a l'affichage : les dossiers
  // deja enregistres portent target_product_id, donc les anciens bons se
  // completent sans migration, et un tarif qui bouge reste refletee.
  const [target, setTarget] = useState<TrocTargetSummary | null>(initialTarget ?? null);
  const isCertEligible = tier === 'premium' || tier === 'safety';

  // ─── Certificat PDF (Premium / Sûreté uniquement) ─────────────────────────
  const [cert, setCert]           = useState<TrocCertificate | null>(null);
  const [isGenCert, setIsGenCert] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);

  // Génération auto à l'ouverture du voucher si éligible
  useEffect(() => {
    if (!isCertEligible || !tradeInId || cert) return;
    let cancelled = false;
    const run = async () => {
      setIsGenCert(true);
      setCertError(null);
      try {
        const result = await generateCertificate(tradeInId);
        if (!cancelled) setCert(result);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof TierNotEligibleError) {
          setCertError('Certificat non inclus dans votre formule.');
        } else {
          setCertError('Génération du certificat impossible. Réessayez plus tard.');
        }
      } finally {
        if (!cancelled) setIsGenCert(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [isCertEligible, tradeInId, cert]);

  useEffect(() => {
    if (initialTarget !== undefined) {
      setTarget(initialTarget);
      return;
    }
    let cancelled = false;
    void (async () => {
      const summary = await resolveTrocTargetSummary(request);
      if (!cancelled) setTarget(summary);
    })();
    return () => { cancelled = true; };
  }, [request.target_product_id, request.trade_in_value, initialTarget]);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      // On reutilise le resume deja resolu a l'affichage : le PDF montre donc
      // exactement les montants que le client a sous les yeux.
      const { downloadTradeInVoucher } = await import('../../utils/tradeInVoucherGenerator');
      await downloadTradeInVoucher(request, target);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-white/20 pb-5">
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-xeption-gold/10 border border-xeption-gold/20 text-xeption-gold text-[10px] font-tech font-bold uppercase tracking-widest mb-4">
            <RefreshCw className="w-3 h-3" /> Smart Troc - Bon de reprise
          </div>
          <h1 className="text-3xl font-tech font-bold text-white tracking-widest break-all">{voucherRef}</h1>
          {voucherRef && !hideNewEvaluation && (
            <p className="text-[10px] text-white/60 font-sans mt-2">
              <a
                href={`/bon?ref=${encodeURIComponent(voucherRef)}`}
                className="inline-flex items-center gap-1 text-xeption-gold underline hover:text-white font-tech uppercase tracking-wide"
              >
                Suivre mon bon Smart Troc
              </a>
            </p>
          )}
          <p className="text-xs text-white/70 font-sans mt-1">Emis le {formatDate(created_at)}</p>
        </div>

        {topRight && (
          <div className="shrink-0 w-full sm:w-auto sm:max-w-[280px] self-stretch sm:self-start">
            {topRight}
          </div>
        )}
      </div>

      {changeTargetPanel && (
        <div className="rounded-xl border border-xeption-gold/25 bg-xeption-gold/[0.04] p-4 sm:p-5 -mt-1">
          {changeTargetPanel}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#1c1c16]/90 border border-white/20 px-4 py-3 rounded-sm min-w-0">
          <p className="text-[10px] font-tech uppercase tracking-widest text-white/80 mb-0.5">Client</p>
          <p className="font-tech font-bold text-white truncate">{customer_name}</p>
          {phoneDisplay && (
            <p className="text-sm font-mono text-white/90 mt-1 tracking-wide">{phoneDisplay}</p>
          )}
        </div>

        <div className="bg-[#1c1c16]/90 border border-white/20 px-4 py-3 rounded-sm min-w-0">
          <p className="text-[10px] font-tech uppercase tracking-widest text-white/80 mb-0.5">Appareil</p>
          <p className="font-tech font-bold text-white leading-snug">{device_brand} {device_model}</p>
          {imeiDisplay && (
            <p className="text-xs font-mono text-white/75 mt-1.5 break-all">
              <span className="text-white/50 font-tech uppercase tracking-widest text-[9px] mr-2">IMEI</span>
              {imeiDisplay}
            </p>
          )}
        </div>

        <div className="sm:col-span-2 bg-xeption-gold/10 border border-xeption-gold/30 px-4 py-5 text-center shadow-[0_0_20px_rgba(255,215,0,0.1)]">
          <p className="text-[10px] font-tech uppercase tracking-widest text-white/80 mb-1">Valeur de reprise estimée</p>
          <p className="text-4xl font-tech font-bold text-xeption-gold">{formatFCFA(trade_in_value ?? 0)}</p>
          <p className="text-xs font-tech text-white/70 uppercase tracking-widest mt-1">
            Sous reserve de validation en boutique
          </p>
        </div>


        {/* Appareil souhaite — n'apparait que si le client en a choisi un. */}
        {(target || request.target_product_name) && (
          <div className="sm:col-span-2 bg-[#1c1c16]/90 border border-white/20 px-4 py-3 rounded-sm">
            <p className="text-[10px] font-tech uppercase tracking-widest text-white/80 mb-2">
              Appareil souhaité
            </p>
            <p className="font-tech font-bold text-white">
              {target?.name || request.target_product_name}
            </p>

            {target ? (
              <div className="mt-4 rounded-lg border border-white/15 bg-black/40 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/10 bg-white/[0.04]">
                  <p className="text-[10px] font-tech uppercase tracking-widest text-white/60">
                    Détail de l&apos;échange
                  </p>
                </div>
                <div className="px-4 py-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-white/85">Prix boutique</span>
                    <span className="font-mono text-sm text-white tabular-nums shrink-0">
                      {formatFCFA(target.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-white/85">Votre reprise</span>
                    <span className="font-mono text-sm text-xeption-gold tabular-nums shrink-0">
                      − {formatFCFA(target.credit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-3 mt-0.5 border-t border-xeption-gold/35 bg-xeption-gold/[0.06] -mx-4 px-4 py-3">
                    <span className="text-[10px] font-tech uppercase tracking-widest text-white font-bold">
                      Reste à payer
                    </span>
                    <span className="font-tech font-bold text-xl text-xeption-gold tabular-nums shrink-0">
                      {target.reste > 0 ? formatFCFA(target.reste) : '0 FCFA'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // Cible retiree du catalogue : le nom reste vrai, pas le prix.
              <p className="mt-2 text-[10px] text-white/60 font-sans italic">
                Prix à confirmer en boutique.
              </p>
            )}
          </div>
        )}
        <div className="sm:col-span-2 bg-[#1c1c16]/90 border border-white/20 px-4 py-3 rounded-sm text-center">
          <p className="text-[10px] font-tech uppercase tracking-widest text-white">
            Valable {validityDays} jours — jusqu&apos;au {formatDate(expiryIso)}
          </p>
          <p className="text-[9px] text-white/75 font-sans mt-1 italic">
            Durée selon l&apos;âge du modèle repris (7, 10 ou 14 jours). Offre sous réserve de
            vérification physique en boutique Xeption Network et du dédouanement de l&apos;appareil.
          </p>
        </div>
      </div>

      {/* Certificat PDF — Premium / Sûreté uniquement */}
      {isCertEligible && (
        <div className="bg-gradient-to-br from-xeption-gold/15 to-transparent border border-xeption-gold/30 rounded-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <BadgeCheck className="w-4 h-4 text-xeption-gold" />
            <p className="text-[10px] font-tech uppercase tracking-widest text-xeption-gold">
              Certificat d'expertise inclus ({tier === 'safety' ? 'Sûreté' : 'Premium'})
            </p>
          </div>

          {isGenCert && (
            <p className="text-xs text-white/80 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Génération du certificat PDF…
            </p>
          )}

          {certError && (
            <div className="flex items-start gap-2 text-xs text-red-300">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{certError}</span>
            </div>
          )}

          {cert && !isGenCert && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-tech text-white/80">
                Réf : <span className="text-xeption-gold">{cert.reference}</span>
                {cert.reused && <span className="text-white/70"> (déjà émis)</span>}
              </p>
              <a
                href={cert.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full flex items-center justify-center gap-2 bg-xeption-gold/20 hover:bg-xeption-gold/40 border border-xeption-gold/40 text-xeption-gold font-tech font-bold uppercase tracking-widest py-2.5 text-xs transition-all rounded-sm"
              >
                <FileText className="w-4 h-4" /> Télécharger le certificat PDF
              </a>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="min-w-0 flex items-center justify-center gap-2 bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-3.5 sm:py-4 px-3 text-xs sm:text-sm shadow-[0_0_20px_rgba(255,215,0,0.25)] transition-all disabled:opacity-60 disabled:cursor-wait"
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> Génération du PDF…
            </>
          ) : (
            <>
              <Download className="w-4 h-4 shrink-0" /> Télécharger le bon
            </>
          )}
        </button>

        <a
          href={buildWhatsAppUrl(buildTradeInVoucherShareMessage(request, { reste: target?.reste }))}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex items-center justify-center gap-2 bg-green-600/20 border border-green-600/40 hover:bg-green-600/40 text-green-400 font-tech font-bold uppercase tracking-widest py-3.5 px-3 text-xs sm:text-sm transition-all rounded-sm text-center"
        >
          <MessageCircle className="w-4 h-4 shrink-0" /> Envoyer le bon par WhatsApp
        </a>

        <a
          href={buildWhatsAppUrl(buildTradeInAppointmentMessage(request))}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex items-center justify-center gap-2 bg-white/5 border border-white/20 hover:border-xeption-gold/30 text-white/80 hover:text-white font-tech font-bold uppercase tracking-widest py-3.5 px-3 text-xs sm:text-sm transition-all text-center"
        >
          <Calendar className="w-4 h-4 shrink-0" /> Prendre rendez-vous en boutique
        </a>

        <button
          onClick={onPrint}
          className="min-w-0 flex items-center justify-center gap-2 bg-white/5 border border-white/20 hover:border-white/30 text-white/70 hover:text-white font-tech font-bold uppercase tracking-widest py-3.5 px-3 text-xs sm:text-sm transition-all"
        >
          <Printer className="w-4 h-4 shrink-0" /> Imprimer
        </button>
      </div>

      {!hideNewEvaluation && (
      <button
        onClick={onNewEvaluation}
        className="w-full text-white/70 hover:text-white font-tech font-bold uppercase tracking-widest py-3 text-xs transition-all"
      >
        Nouvelle évaluation
      </button>
      )}
    </div>
  );
};
