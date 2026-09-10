import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  Download,
  RefreshCw,
  Loader2,
  MessageCircle,
  Calendar,
  BadgeCheck,
  FileText,
  AlertTriangle,
  Copy,
  Check,
  Smartphone,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  X,
} from 'lucide-react';
import type { Product, TradeInRequest } from '../../types';
import { buildWhatsAppUrl, buildTradeInVoucherShareMessage, buildTradeInAppointmentMessage } from '../../utils/whatsappShare';
import { generateCertificate, TierNotEligibleError, type TrocCertificate } from '../../services/trocEvaluationService';
import { resolveVoucherExpiryIso, resolveVoucherValidityDays } from '../../utils/voucherValidity';
import { resolveVoucherReference } from '../../utils/trocVoucherRef';
import { resolveTrocTargetSummary, type TrocTargetSummary } from '../../services/trocCheckoutService';
import { copyToClipboard } from '../../utils/clipboard';
import { getProductDisplayName } from '../../utils/productDisplay';
import { updateTrocVoucherTarget } from '../../services/trocVoucherLookupService';
import { saveTrocDraft } from '../../utils/trocStorage';
import TrocUpgradeChoice from './TrocUpgradeChoice';

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
  const [copiedRef, setCopiedRef] = useState(false);

  const handleCopyRef = async () => {
    if (!voucherRef) return;
    const ok = await copyToClipboard(voucherRef);
    if (ok) {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const expiryIso = resolveVoucherExpiryIso(voucher_expires_at, created_at);
  const validityDays = resolveVoucherValidityDays(voucher_expires_at, created_at);
  const phoneDisplay = formatPhone(customer_phone);
  const imeiDisplay = formatImei(imei);

  // Appareil souhaite et reste a payer. Resolus a l'affichage : les dossiers
  // deja enregistres portent target_product_id, donc les anciens bons se
  // completent sans migration, et un tarif qui bouge reste refletee.
  const [target, setTarget] = useState<TrocTargetSummary | null>(initialTarget ?? null);
  const [internalSelectingTarget, setInternalSelectingTarget] = useState(false);
  const [isUpdatingTarget, setIsUpdatingTarget] = useState(false);
  const isCertEligible = tier === 'premium' || tier === 'safety';

  const modalScrollRef = useRef<HTMLDivElement>(null);

  // Verrouiller le scroll d'arrière-plan et réinitialiser le scroll interne au sommet dès l'ouverture
  useEffect(() => {
    if (!internalSelectingTarget) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Assurer que la modale commence en haut immédiatement
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInternalSelectingTarget(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [internalSelectingTarget]);

  const effectiveRequest: TradeInRequest = {
    ...request,
    target_product_id: target?.productId ?? request.target_product_id,
    target_product_name: target?.name ?? request.target_product_name,
  };

  const handleSelectTarget = async (product: Product) => {
    setIsUpdatingTarget(true);
    try {
      const phoneDigits = (customer_phone ?? '').replace(/\D/g, '');
      const phoneSuffix = phoneDigits.slice(-4);
      const displayName = getProductDisplayName(product);

      if (voucherRef && phoneSuffix.length === 4) {
        try {
          await updateTrocVoucherTarget(
            voucherRef,
            phoneSuffix,
            product.id,
            displayName,
          );
        } catch (e) {
          console.warn('[troc] Erreur liaison cible serveur, repli local', e);
        }
      }

      const summary: TrocTargetSummary = {
        productId: product.id,
        name: displayName,
        price: product.price,
        stock: product.stock,
        credit: Number(trade_in_value ?? 0),
        reste: Math.max(0, Math.round(product.price - Number(trade_in_value ?? 0))),
      };
      setTarget(summary);
      setInternalSelectingTarget(false);

      // Persistance dans le brouillon local pour survivre à F5
      saveTrocDraft({
        savedRequest: {
          id: request.id,
          voucher_reference: voucherRef,
          voucher_expires_at: request.voucher_expires_at,
          created_at: request.created_at,
          target_product_id: product.id,
          target_product_name: displayName,
        },
      });
    } catch (err) {
      console.error('Erreur sélection cible:', err);
    } finally {
      setIsUpdatingTarget(false);
    }
  };

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
      await downloadTradeInVoucher(effectiveRequest, target);
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
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <h1 className="text-3xl font-tech font-bold text-white tracking-widest break-all">{voucherRef}</h1>
            {voucherRef && (
              <button
                type="button"
                onClick={handleCopyRef}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-tech font-bold uppercase tracking-wider transition-all border ${
                  copiedRef
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    : 'bg-white/5 hover:bg-xeption-gold/15 text-white/70 hover:text-xeption-gold border-white/15 hover:border-xeption-gold/40'
                }`}
                title="Copier la référence du bon"
                aria-label="Copier la référence du bon"
              >
                {copiedRef ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-xeption-gold" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            )}
          </div>
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

        {topRight ? (
          <div className="shrink-0 w-full sm:w-auto sm:max-w-[280px] self-stretch sm:self-start">
            {topRight}
          </div>
        ) : (
          <div className="shrink-0 w-full sm:w-auto self-stretch sm:self-start flex sm:justify-end">
            <button
              type="button"
              onClick={() => setInternalSelectingTarget(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-xeption-gold/40 bg-xeption-gold/10 hover:bg-xeption-gold/20 text-xeption-gold text-xs font-tech font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,215,0,0.15)]"
            >
              <Smartphone className="w-4 h-4" />
              {target || request.target_product_name ? "Changer d'appareil" : "Choisir un appareil"}
            </button>
          </div>
        )}
      </div>

      {changeTargetPanel && (
        <div className="rounded-xl border border-xeption-gold/25 bg-xeption-gold/[0.04] p-4 sm:p-5 -mt-1">
          {changeTargetPanel}
        </div>
      )}

      {/* Modale de sélection d'un appareil pour le bon (Mobile & Laptop) — attachée directement au document.body via Portal */}
      {internalSelectingTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setInternalSelectingTarget(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-xeption-gold/40 bg-[#0c0c0e] shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* En-tête fixe de la modale */}
              <div className="flex items-center justify-between gap-4 p-4 sm:p-5 border-b border-white/10 bg-white/[0.02] shrink-0">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-xeption-gold/20 text-xeption-gold text-[10px] font-tech font-bold uppercase tracking-wider mb-1">
                    <Sparkles className="w-3.5 h-3.5" /> Nouvelle acquisition
                  </div>
                  <h2 className="text-base sm:text-xl font-tech font-bold text-white uppercase tracking-wider">
                    Choisir un appareil pour votre bon
                  </h2>
                  <p className="text-xs text-white/60 font-sans mt-0.5">
                    Votre bon de reprise de <strong className="text-xeption-gold font-bold">{formatFCFA(trade_in_value ?? 0)}</strong> est déduit en temps réel de chaque modèle ci-dessous.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInternalSelectingTarget(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 transition-colors shrink-0"
                  title="Fermer la sélection"
                  aria-label="Fermer la sélection"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corps défilable de la modale */}
              <div ref={modalScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
                {isUpdatingTarget ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-xeption-gold">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="font-tech text-xs uppercase tracking-wider">Liaison de l&apos;appareil à votre bon…</p>
                  </div>
                ) : (
                  <TrocUpgradeChoice
                    credit={trade_in_value ?? 0}
                    deviceBrand={device_brand}
                    onSelect={handleSelectTarget}
                  />
                )}
              </div>

              {/* Pied de la modale */}
              <div className="p-3 sm:p-4 border-t border-white/10 bg-black/60 flex justify-between items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setInternalSelectingTarget(false)}
                  className="text-xs text-white/60 hover:text-white font-tech uppercase tracking-wider transition-colors px-3 py-1.5"
                >
                  Fermer sans changer
                </button>
                <span className="text-[11px] text-white/40 font-sans hidden sm:inline">
                  Cliquez sur « Troquer contre celui-ci » pour lier l&apos;appareil
                </span>
              </div>
            </div>
          </div>,
          document.body
        )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Encart Nouvelle acquisition si aucun appareil cible n'a encore été choisi */}
        {!target && !request.target_product_name && (
          <div className="sm:col-span-2 rounded-xl border border-xeption-gold/40 bg-gradient-to-br from-xeption-gold/15 via-black/60 to-[#1c1c16] p-5 text-left shadow-[0_0_30px_rgba(255,215,0,0.12)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-xeption-gold/20 border border-xeption-gold/40 text-xeption-gold text-[10px] font-tech font-bold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Nouvelle acquisition
                </div>
                <h3 className="font-tech font-bold text-base sm:text-lg text-white uppercase tracking-wide">
                  Utiliser ce bon pour un nouvel appareil
                </h3>
                <p className="text-xs text-white/70 font-sans mt-1 leading-relaxed max-w-xl">
                  Déduisez immédiatement vos <strong className="text-xeption-gold font-bold">{formatFCFA(trade_in_value ?? 0)}</strong> sur un nouveau smartphone en stock. Choisissez votre modèle pour connaître votre reste à payer exact.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInternalSelectingTarget(true)}
                className="shrink-0 inline-flex items-center justify-center gap-2 bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest px-5 py-3.5 text-xs shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all rounded-sm font-semibold"
              >
                <Smartphone className="w-4 h-4" /> Choisir mon appareil
              </button>
            </div>
          </div>
        )}

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
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[10px] font-tech uppercase tracking-widest text-white/80">
                Appareil souhaité
              </p>
              <button
                type="button"
                onClick={() => setInternalSelectingTarget(true)}
                className="inline-flex items-center gap-1 text-[11px] font-tech font-bold uppercase tracking-wider text-xeption-gold hover:text-white transition-colors"
              >
                Changer d'appareil <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="font-tech font-bold text-white text-base">
              {target?.name || request.target_product_name}
            </p>

            {target ? (
              <div className="mt-4 rounded-lg border border-white/15 bg-black/40 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/10 bg-white/[0.04] flex items-center justify-between">
                  <p className="text-[10px] font-tech uppercase tracking-widest text-white/60">
                    Détail de l&apos;échange
                  </p>
                  <span className="text-[10px] font-tech uppercase text-xeption-gold/80">
                    Offre combinée
                  </span>
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

      {/* Actions principales et boutons */}
      <div className="flex flex-col gap-3">
        {/* Bouton unique principal pour nouvelle acquisition */}
        <button
          type="button"
          onClick={() => setInternalSelectingTarget(true)}
          className="w-full flex items-center justify-center gap-2 bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-4 px-4 text-xs sm:text-sm shadow-[0_0_20px_rgba(255,215,0,0.25)] transition-all rounded-sm font-semibold"
        >
          <Smartphone className="w-4 h-4 shrink-0" />
          {target || request.target_product_name ? "Changer d'appareil souhaité" : "Choisir un appareil avec ce bon"}
        </button>

        {/* Boutons de téléchargement, WhatsApp et rendez-vous */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="min-w-0 flex items-center justify-center gap-2 bg-white/5 border border-white/20 hover:border-white/40 text-white font-tech font-bold uppercase tracking-widest py-3.5 sm:py-4 px-3 text-xs sm:text-sm transition-all disabled:opacity-60 disabled:cursor-wait"
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
            href={buildWhatsAppUrl(buildTradeInVoucherShareMessage(effectiveRequest, { reste: target?.reste }))}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex items-center justify-center gap-2 bg-green-600/20 border border-green-600/40 hover:bg-green-600/40 text-green-400 font-tech font-bold uppercase tracking-widest py-3.5 px-3 text-xs sm:text-sm transition-all rounded-sm text-center"
          >
            <MessageCircle className="w-4 h-4 shrink-0" /> Envoyer par WhatsApp
          </a>

          <a
            href={buildWhatsAppUrl(buildTradeInAppointmentMessage(effectiveRequest))}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex items-center justify-center gap-2 bg-white/5 border border-white/20 hover:border-xeption-gold/30 text-white/80 hover:text-white font-tech font-bold uppercase tracking-widest py-3.5 px-3 text-xs sm:text-sm transition-all text-center"
          >
            <Calendar className="w-4 h-4 shrink-0" /> Prendre rendez-vous
          </a>

          <button
            onClick={onPrint}
            className="min-w-0 flex items-center justify-center gap-2 bg-white/5 border border-white/20 hover:border-white/30 text-white/70 hover:text-white font-tech font-bold uppercase tracking-widest py-3.5 px-3 text-xs sm:text-sm transition-all"
          >
            <Printer className="w-4 h-4 shrink-0" /> Imprimer
          </button>
        </div>
      </div>

      {!hideNewEvaluation && (
      <button
        onClick={onNewEvaluation}
        className="w-full text-white/70 hover:text-white font-tech font-bold uppercase tracking-widest py-3 text-xs transition-all"
      >
        Nouvelle estimation
      </button>
      )}
    </div>
  );
};
