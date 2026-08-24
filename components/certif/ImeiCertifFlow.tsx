import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle, XCircle, AlertCircle, Loader2, Shield, ArrowRight, FileText, BadgeCheck, AlertTriangle,
} from 'lucide-react';
import { TrocPayment } from '../troc/TrocPayment';
import { ChameleoMascot } from '../troc/ChameleoMascot';
// Validation partagee : 15 chiffres NE SUFFIT PAS. Luhn accepte le tout-zero,
// et un IMEI de test envoye a check-imei fait cascader un lookup fournisseur.
import { isValidImei } from '../../utils/imeiValidation';
import {
  checkImei,
  createPayment,
  generateImeiCertificate,
  getPaymentStatus,
  type ImeiCertificate,
  type ImeiDeviceInfo,
} from '../../services/trocEvaluationService';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'form' | 'payment' | 'certificate';
type PayState = 'idle' | 'initiating' | 'pending' | 'polling' | 'paid' | 'failed' | 'expired' | 'timeout';

interface ImeiResult {
  status: 'valid' | 'invalid' | 'check_failed';
  blacklistStatus: 'unknown' | 'clear' | 'blacklisted';
  deviceInfo: ImeiDeviceInfo | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidName  = (v: string) => v.trim().length >= 2 && !/\d/.test(v);
const isValidPhone = (v: string) => /^[62]\d{8}$/.test(v);

const makeCertifKey = () => `certif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const inputCls = 'w-full bg-black/40 border border-white/10 text-white px-4 py-3.5 text-sm font-sans placeholder-gray-600 focus:border-xeption-gold/60 outline-none transition-all';
const labelCls = 'block text-[10px] font-tech uppercase tracking-widest text-gray-400 mb-1.5';

const CERTIF_STEPS = ['Vérification', 'Paiement', 'Certificat'];
const CERTIF_STEP_INDEX: Record<Step, number> = { form: 0, payment: 1, certificate: 2 };

const verifyUrl = (qrToken: string) =>
  `${typeof window !== 'undefined' ? window.location.origin : 'https://xeptionetwork.shop'}/verify/${qrToken}`;

// ─── Stepper interne ──────────────────────────────────────────────────────────

const CertifStepper: React.FC<{ step: Step }> = ({ step }) => {
  const current = CERTIF_STEP_INDEX[step];
  return (
    <div className="flex items-center justify-between px-1 py-4">
      {CERTIF_STEPS.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-7 h-7 flex items-center justify-center border text-[11px] font-tech font-bold transition-all ${
                done   ? 'bg-emerald-500 border-emerald-500 text-black'
                : active ? 'bg-emerald-500/10 border-emerald-400 text-emerald-400'
                : 'border-white/15 text-gray-600'
              }`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-[9px] font-tech uppercase tracking-widest ${
                active ? 'text-emerald-400' : done ? 'text-gray-400' : 'text-gray-700'
              }`}>{label}</span>
            </div>
            {i < CERTIF_STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${i < current ? 'bg-emerald-500/40' : 'bg-white/8'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Component principal ──────────────────────────────────────────────────────

export const ImeiCertifFlow: React.FC = () => {
  const [step, setStep]               = useState<Step>('form');
  const [name, setName]               = useState('');
  const [phone, setPhone]             = useState('');
  const [imeiInput, setImeiInput]     = useState('');
  const [imeiResult, setImeiResult]   = useState<ImeiResult | null>(null);
  const [isChecking, setIsChecking]   = useState(false);
  const [checkError, setCheckError]   = useState<string | null>(null);
  const [payState, setPayState]       = useState<PayState>('idle');
  const [payRef, setPayRef]           = useState<string | null>(null);
  const [payAmount, setPayAmount]     = useState(0);
  const [payError, setPayError]       = useState<string | null>(null);
  const [cert, setCert]               = useState<ImeiCertificate | null>(null);
  const [isGenCert, setIsGenCert]     = useState(false);
  const [certError, setCertError]     = useState<string | null>(null);

  const sessionKey = useRef(makeCertifKey()).current;
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const toRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (toRef.current)   { clearTimeout(toRef.current);    toRef.current   = null; }
  };

  // ── Génération PDF serveur après paiement ───────────────────────────────────

  useEffect(() => {
    if (step !== 'certificate' || !payRef || !imeiResult || cert) return;
    let cancelled = false;

    const run = async () => {
      setIsGenCert(true);
      setCertError(null);
      try {
        const result = await generateImeiCertificate({
          sessionKey,
          paymentReference: payRef,
          customerName: name,
          imei: imeiInput,
          deviceBrand: imeiResult.deviceInfo?.brand,
          deviceModel: imeiResult.deviceInfo?.model,
          imeiStatus: imeiResult.status,
          blacklistStatus: imeiResult.blacklistStatus,
        });
        if (!cancelled) setCert(result);
      } catch {
        if (!cancelled) {
          setCertError('Génération du certificat impossible. Réessaie dans quelques instants.');
        }
      } finally {
        if (!cancelled) setIsGenCert(false);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [step, payRef, imeiResult, cert, sessionKey, name, imeiInput]);

  // ── Check IMEI ──────────────────────────────────────────────────────────────

  const handleCheck = async () => {
    if (!isValidImei(imeiInput)) return;
    setIsChecking(true);
    setCheckError(null);
    setImeiResult(null);
    try {
      const res = await checkImei(imeiInput);
      setImeiResult({
        status:          res.status,
        blacklistStatus: res.blacklistStatus,
        deviceInfo:      res.deviceInfo ?? null,
      });
    } catch {
      setCheckError('Vérification indisponible pour l\'instant. Réessaie dans quelques secondes.');
    } finally {
      setIsChecking(false);
    }
  };

  // ── Paiement ────────────────────────────────────────────────────────────────

  const handleInitiate = async (payPhone: string) => {
    setPayState('initiating');
    setPayError(null);
    try {
      const { reference, amount } = await createPayment(sessionKey, payPhone, {
        customerName: name,
        tier: 'certif',
      });
      setPayRef(reference);
      setPayAmount(amount);
      setPayState('pending');

      pollRef.current = setInterval(async () => {
        const poll = await getPaymentStatus(sessionKey, reference);
        if (!poll) return;
        if (poll.status === 'paid') {
          clearTimers();
          setPayState('paid');
          setStep('certificate');
        } else if (poll.status === 'failed' || poll.status === 'expired') {
          clearTimers();
          setPayState(poll.status as PayState);
        }
      }, 5000);

      toRef.current = setTimeout(() => {
        clearTimers();
        setPayState('timeout');
      }, 5 * 60 * 1000);

    } catch (e: unknown) {
      setPayState('failed');
      setPayError((e as Error)?.message ?? 'Échec du paiement');
    }
  };

  const handleRetry = () => {
    clearTimers();
    setPayState('idle');
    setPayError(null);
  };

  // ── Données dérivées ────────────────────────────────────────────────────────

  const deviceLabel = imeiResult?.deviceInfo
    ? `${imeiResult.deviceInfo.brand} ${imeiResult.deviceInfo.model}`.trim()
    : null;

  const isBlacklisted = imeiResult?.blacklistStatus === 'blacklisted';
  const isValid       = imeiResult?.status === 'valid';
  const canGetCertif  =
    isValidName(name) && isValidPhone(phone) &&
    imeiResult !== null &&
    !isBlacklisted &&
    imeiResult.status !== 'invalid';

  const imeiStatusLabel = (s: string) => {
    if (s === 'valid') return 'Valide';
    if (s === 'invalid') return 'Invalide';
    return 'Non confirmé';
  };

  const blacklistLabel = (s: string) => {
    if (s === 'clear') return 'Propre ✓';
    if (s === 'blacklisted') return 'Signalé';
    return 'Inconnu';
  };

  // ── Render : certificat ─────────────────────────────────────────────────────

  if (step === 'certificate') {
    return (
      <div className="p-6 sm:p-8 flex flex-col gap-6">
        <CertifStepper step="certificate" />

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/15 border border-emerald-400/40 text-emerald-400 text-[10px] font-tech font-bold uppercase tracking-widest">
            <BadgeCheck className="w-3.5 h-3.5" /> Certifié Xeption
          </div>
          <h2 className="text-lg font-tech font-bold uppercase text-white tracking-wider mt-2">
            {isGenCert ? 'Génération en cours…' : 'Certificat prêt'}
          </h2>
          <p className="text-xs text-gray-500 font-sans">
            PDF officiel avec QR de vérification — distinct du rapport Smart Troc.
          </p>
        </div>

        <div className="bg-black/40 border border-white/10 divide-y divide-white/5">
          {[
            { label: 'Client',      value: name },
            { label: 'Appareil',    value: deviceLabel ?? 'Non identifié' },
            { label: 'IMEI',        value: imeiInput, mono: true },
            { label: 'Format IMEI', value: imeiStatusLabel(imeiResult?.status ?? 'check_failed') },
            { label: 'Liste noire', value: blacklistLabel(imeiResult?.blacklistStatus ?? 'unknown'), color: imeiResult?.blacklistStatus === 'clear' ? 'text-emerald-400' : 'text-gray-400' },
            { label: 'Référence',   value: cert?.reference ?? payRef ?? sessionKey, mono: true, small: true },
          ].map(({ label, value, mono, small, color }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-[10px] font-tech uppercase tracking-widest text-gray-500">{label}</span>
              <span className={`text-sm font-sans text-right ${mono ? 'font-mono tracking-widest' : ''} ${small ? 'text-xs text-gray-600' : 'text-gray-200'} ${color ?? ''}`}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {isGenCert && (
          <p className="text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            Génération du certificat PDF…
          </p>
        )}

        {certError && (
          <div className="flex items-start gap-2 px-4 py-3 bg-red-950/50 border border-red-800/50 text-red-300 text-sm font-sans">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            {certError}
          </div>
        )}

        {cert && !isGenCert && (
          <div className="flex flex-col gap-3">
            {cert.reused && (
              <p className="text-[10px] text-gray-500 font-sans text-center">Certificat déjà émis pour cette session.</p>
            )}
            <a
              href={cert.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="w-full flex items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/40 text-emerald-300 font-tech font-bold uppercase tracking-widest py-3.5 text-xs transition-all"
            >
              <FileText className="w-4 h-4" /> Télécharger le certificat PDF
            </a>
            <p className="text-[10px] text-gray-500 font-sans text-center">
              Vérification en ligne :{' '}
              <a href={verifyUrl(cert.qrToken)} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline font-mono">
                {verifyUrl(cert.qrToken)}
              </a>
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Render : paiement ───────────────────────────────────────────────────────

  if (step === 'payment') {
    return (
      <div className="p-6 sm:p-8 flex flex-col gap-6">
        <CertifStepper step="payment" />
        <div>
          <h2 className="text-sm font-tech font-bold uppercase text-white tracking-wider mb-1">Frais de certification</h2>
          <p className="text-xs text-gray-500 font-sans">Paiement requis pour générer le certificat officiel Certifié Xeption</p>
        </div>
        {payError && (
          <div className="px-4 py-3 bg-red-950/50 border border-red-800/50 text-red-300 text-sm font-sans">{payError}</div>
        )}
        <TrocPayment
          selectedTier="certif"
          paymentAmount={payAmount || undefined}
          initialPhone={phone}
          paymentState={payState as any}
          error={payError}
          onInitiate={handleInitiate}
          onRetry={handleRetry}
        />
      </div>
    );
  }

  // ── Render : formulaire ─────────────────────────────────────────────────────

  const inspectorMsg = isChecking
    ? "J'inspecte l'IMEI dans les bases officielles et blacklist... 🧐🔍"
    : imeiResult?.blacklistStatus === 'clear'
      ? "Appareil 100% propre et vérifié ! ✨"
      : imeiResult?.blacklistStatus === 'blacklisted'
        ? "Attention ! Cet IMEI est signalé sur liste noire."
        : "Tape le code *#06# sur ton clavier pour obtenir ton IMEI ! 🔍";

  return (
    <div className="p-6 sm:p-8 flex flex-col gap-6">
      <CertifStepper step="form" />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 text-[9px] font-tech font-bold uppercase tracking-widest mb-2">
            <Shield className="w-3 h-3" /> Certifié Xeption
          </div>
          <h2 className="text-xl font-tech font-bold uppercase text-white tracking-wider">Vérifier un appareil</h2>
          <p className="text-xs text-gray-300 mt-1 font-sans">IMEI · Blacklist mondiale · Certificat PDF officiel instantané</p>
        </div>

        {/* Mascotte Xepti Inspecteur Loupe */}
        <div className="shrink-0 -my-2">
          <ChameleoMascot 
            size="sm"
            pose="inspector"
            state={isChecking ? 'scanning' : imeiResult?.blacklistStatus === 'clear' ? 'happy' : 'idle'}
            message={inspectorMsg}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Identité */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Votre prénom *</label>
            <input type="text" placeholder="Prénom"
              value={name}
              onChange={e => setName(e.target.value)}
              className={`${inputCls} ${name.length > 0 && !isValidName(name) ? 'border-red-500/70' : ''}`} />
            {name.length > 0 && !isValidName(name) && (
              <p className="text-[11px] text-red-400 mt-1 font-sans">
                {/\d/.test(name) ? 'Les chiffres ne sont pas acceptés' : 'Prénom trop court'}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Téléphone *</label>
            <input type="tel" placeholder="677 123 456"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className={`${inputCls} ${phone.length > 0 && !isValidPhone(phone) ? 'border-red-500/70' : ''}`} />
            {phone.length > 0 && !isValidPhone(phone) && (
              <p className="text-[11px] text-red-400 mt-1 font-sans">9 chiffres, commence par 6 ou 2</p>
            )}
          </div>
        </div>

        {/* IMEI */}
        <div>
          <label className={labelCls}>IMEI de l'appareil *</label>
          <div className="mb-3 px-4 py-3 bg-emerald-500/10 border border-emerald-400/25 text-sm font-sans text-gray-200 leading-relaxed">
            Sur l'appareil à vérifier, ouvre le clavier d'appel et compose{' '}
            <span className="text-emerald-400 font-mono font-bold text-base">*#06#</span>.
            Plusieurs numéros peuvent s'afficher — prends le premier (<strong className="text-white">IMEI 1</strong>).
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="15 chiffres"
              value={imeiInput}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 15);
                setImeiInput(v);
                setImeiResult(null);
                setCheckError(null);
              }}
              maxLength={15}
              className={`${inputCls} font-mono tracking-widest flex-1`} />
            <button type="button"
              disabled={!isValidImei(imeiInput) || isChecking}
              onClick={handleCheck}
              className="shrink-0 px-5 bg-emerald-500 hover:bg-emerald-400 text-black font-tech font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2">
              {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vérifier'}
            </button>
          </div>

          {isChecking && (
            <p className="text-xs text-gray-500 mt-2 font-sans">Vérification en cours…</p>
          )}

          {checkError && (
            <p className="text-xs text-amber-400 mt-2 font-sans">{checkError}</p>
          )}

          {imeiResult && !isBlacklisted && isValid && (
            <div className="mt-3 flex items-center gap-2 text-sm font-sans text-emerald-300">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {deviceLabel
                ? <>Appareil identifié : <span className="font-bold text-white ml-1">{deviceLabel}</span></>
                : 'IMEI valide — appareil non répertorié dans notre base'}
            </div>
          )}

          {imeiResult && imeiResult.blacklistStatus === 'clear' && (
            <div className="mt-2 flex items-center gap-2 text-xs font-sans text-emerald-400">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              Non signalé sur la liste noire mondiale
            </div>
          )}

          {isBlacklisted && (
            <div className="mt-3 px-4 py-3 bg-red-950/50 border border-red-800/50 text-red-300 text-sm font-sans flex items-start gap-2">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Cet IMEI est signalé comme volé ou bloqué. Aucun certificat ne peut être émis pour cet appareil.
            </div>
          )}

          {imeiResult?.status === 'check_failed' && (
            <div className="mt-3 px-4 py-3 bg-amber-950/40 border border-amber-800/40 text-amber-300 text-sm font-sans flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Vérification partielle — le certificat mentionnera le statut comme non confirmé.
            </div>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-end gap-2 pt-2 border-t border-white/5">
        {!canGetCertif && imeiResult && (
          <p className="text-[11px] text-gray-500 font-sans">
            {isBlacklisted
              ? 'Certificat non disponible pour un appareil blacklisté'
              : imeiResult.status === 'invalid'
                ? 'IMEI invalide — certificat non disponible'
                : !isValidName(name) || !isValidPhone(phone)
                  ? 'Complète tes informations pour continuer'
                  : ''}
          </p>
        )}
        <button type="button"
          disabled={!canGetCertif}
          onClick={() => setStep('payment')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-tech font-bold uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          Obtenir le certificat <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
