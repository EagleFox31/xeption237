import React, { useState } from 'react';
import { ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import type { TrocDeviceForm } from '../../types';
import type { ImeiDeviceInfo } from '../../services/trocEvaluationService';
import { ChameleoMascot } from './ChameleoMascot';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrocQuickFormProps {
  form: TrocDeviceForm;
  onChange: (form: TrocDeviceForm) => void;
  onNext: () => void;
  imeiStatus: string;
  imeiBlacklistStatus: string;
  imeiDeviceInfo: ImeiDeviceInfo | null;
  isCheckingImei: boolean;
  onCheckImei: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidName  = (v: string) => v.trim().length >= 2 && !/\d/.test(v);
const isValidPhone = (v: string) => /^[62]\d{8}$/.test(v);
const isValidImei  = (v: string) => /^\d{15}$/.test(v);

const inputCls = 'w-full bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-xl text-white px-4 py-3.5 text-sm font-sans placeholder-gray-500 focus:border-xeption-gold/60 focus:bg-white/[0.06] focus:shadow-[0_0_15px_rgba(255,215,0,0.15)] outline-none transition-all duration-300';
const labelCls = 'block text-[10px] font-tech uppercase tracking-widest text-gray-400 mb-1.5';

// ─── Component ────────────────────────────────────────────────────────────────

export const TrocQuickForm: React.FC<TrocQuickFormProps> = ({
  form, onChange, onNext,
  imeiStatus, imeiBlacklistStatus, imeiDeviceInfo,
  isCheckingImei, onCheckImei,
}) => {
  const [imeiInput, setImeiInput]       = useState(form.imei || '');
  const [manualModel, setManualModel]   = useState('');
  const [powersOn, setPowersOn]         = useState(true);
  const [checked, setChecked]           = useState(false);
  const [pendingCheck, setPendingCheck] = useState(false);

  const patch = (partial: Partial<TrocDeviceForm>) => onChange(partial as TrocDeviceForm);

  // Déclenche le check APRÈS que form.imei est propagé dans le hook
  React.useEffect(() => {
    if (pendingCheck && form.imei === imeiInput.trim() && form.imei.length === 15) {
      setPendingCheck(false);
      setChecked(true);
      onCheckImei();
    }
  }, [form.imei, pendingCheck]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerify = () => {
    patch({ imei: imeiInput.trim() });
    setPendingCheck(true);
  };

  // Ce qu'on sait sur l'appareil après le check
  const deviceLabel = imeiDeviceInfo
    ? `${imeiDeviceInfo.brand ?? ''} ${imeiDeviceInfo.model ?? ''}`.trim()
    : null;

  const needsManualModel = checked && imeiStatus === 'valid' && !deviceLabel;
  const checkFailed      = checked && imeiStatus === 'check_failed';
  const blacklisted      = imeiBlacklistStatus === 'blacklisted';
  const imeiOk           = checked && imeiStatus === 'valid' && !blacklisted;

  // Sync imeiDeviceInfo → form quand le check revient
  React.useEffect(() => {
    if (imeiOk && imeiDeviceInfo) {
      patch({
        deviceBrand: imeiDeviceInfo.brand ?? form.deviceBrand,
        deviceModel: imeiDeviceInfo.model ?? form.deviceModel,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imeiOk]);

  const effectiveModel = deviceLabel || manualModel || form.deviceModel;
  const canProceed =
    isValidName(form.customerName) &&
    isValidPhone(form.customerPhone) &&
    imeiOk &&
    effectiveModel.length >= 2 &&
    powersOn;

  const blockingReason = !canProceed
    ? !isValidName(form.customerName)            ? (form.customerName.trim().length < 2 ? 'Prénom requis' : 'Prénom invalide — chiffres non acceptés')
    : !isValidPhone(form.customerPhone)          ? 'Numéro de téléphone invalide'
    : !imeiOk                                    ? 'Vérification IMEI requise'
    : effectiveModel.length < 2                  ? 'Modèle requis'
    : !powersOn                                  ? 'Appareil hors service — évaluation en boutique'
    : null
    : null;

  const handleNext = () => {
    patch({ powersOn });
    onNext();
  };

  const quickInspectorMsg = isCheckingImei
    ? "Vérification IMEI & modèle en cours... 🧐🔍"
    : imeiOk
      ? `Modèle identifié : ${effectiveModel || 'Appareil validé'} ! ✨`
      : blacklisted
        ? "Appareil signalé sur liste noire."
        : "Entre ton IMEI pour lancer le diagnostic automatique ! 🔍";

  return (
    <div className="p-6 sm:p-8 flex flex-col gap-6">

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-tech font-bold uppercase text-white tracking-wider">Ton appareil</h2>
          <p className="text-xs text-gray-300 mt-1 font-sans">3 infos et l'IA Xeption s'occupe de l'estimation instantanée.</p>
        </div>

        {/* Mascotte Xepti Inspecteur Loupe */}
        <div className="shrink-0 -my-2">
          <ChameleoMascot 
            size="sm"
            pose="inspector"
            state={isCheckingImei ? 'scanning' : imeiOk ? 'happy' : 'idle'}
            message={quickInspectorMsg}
          />
        </div>
      </div>

      {/* ── Champs principaux ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Prénom *</label>
            <input type="text" placeholder="Ton prénom"
              value={form.customerName}
              onChange={e => patch({ customerName: e.target.value })}
              className={`${inputCls} ${form.customerName.length > 0 && !isValidName(form.customerName) ? 'border-red-500/70' : ''}`} />
            {form.customerName.length > 0 && !isValidName(form.customerName) && (
              <p className="text-[11px] text-red-400 mt-1 font-sans">
                {/\d/.test(form.customerName) ? 'Les chiffres ne sont pas acceptés dans un prénom' : 'Prénom trop court'}
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Téléphone *</label>
            <input type="tel" placeholder="677 123 456"
              value={form.customerPhone}
              onChange={e => patch({ customerPhone: e.target.value })}
              className={`${inputCls} ${form.customerPhone.length > 0 && !isValidPhone(form.customerPhone) ? 'border-red-500/70' : ''}`} />
            {form.customerPhone.length > 0 && !isValidPhone(form.customerPhone) && (
              <p className="text-[11px] text-red-400 mt-1 font-sans">Numéro invalide — 9 chiffres, commence par 6 ou 2 (ex : 677 123 456)</p>
            )}
          </div>
        </div>

        {/* IMEI */}
        <div>
          <label className={labelCls}>IMEI</label>
          <div className="mb-3 px-4 py-3 bg-xeption-gold/10 backdrop-blur-md border border-xeption-gold/30 rounded-xl shadow-[0_0_20px_rgba(255,215,0,0.1)] text-sm font-sans text-gray-200 leading-relaxed">
            Sur l'appareil à troquer, ouvre le clavier d'appel et compose <span className="text-xeption-gold font-mono font-bold text-base drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">*#06#</span>. Plusieurs numéros peuvent s'afficher — prends le premier (<strong className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">IMEI 1</strong>).
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="15 chiffres"
              value={imeiInput}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 15);
                setImeiInput(v);
                setChecked(false);
              }}
              maxLength={15}
              className={`${inputCls} font-mono tracking-widest flex-1`}
            />
            <button type="button"
              disabled={!isValidImei(imeiInput) || isCheckingImei}
              onClick={handleVerify}
              className="shrink-0 px-5 bg-xeption-gold hover:bg-white hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] rounded-xl text-black font-tech font-bold uppercase tracking-widest text-xs transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2">
              {isCheckingImei
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : 'Vérifier'}
            </button>
          </div>

          {/* Résultat IMEI */}
          {isCheckingImei && (
            <p className="text-xs text-gray-500 mt-2 font-sans">Vérification en cours…</p>
          )}

          {blacklisted && (
            <div className="mt-3 px-4 py-3 bg-red-950/50 border border-red-800/50 text-red-300 text-sm font-sans">
              Cet IMEI est signalé comme volé ou bloqué. Évaluation impossible en ligne — passe en boutique.
            </div>
          )}

          {imeiOk && deviceLabel && (
            <div className="mt-3 flex items-center gap-2 text-sm font-sans text-green-300">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Appareil identifié : <span className="font-bold text-white">{deviceLabel}</span>
            </div>
          )}

          {needsManualModel && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs text-gray-400 font-sans">IMEI propre — modèle non reconnu. Quel est le modèle ?</p>
              <input type="text" placeholder="ex : Galaxy A54, iPhone 13…"
                value={manualModel}
                onChange={e => { setManualModel(e.target.value); patch({ deviceModel: e.target.value }); }}
                className={inputCls} />
            </div>
          )}

          {checkFailed && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs text-amber-300 font-sans">
                Vérification indisponible pour l'instant. Indique quand même le modèle — le technicien confirmera en boutique.
              </p>
              <input type="text" placeholder="ex : Galaxy A54, iPhone 13…"
                value={manualModel}
                onChange={e => { setManualModel(e.target.value); patch({ deviceModel: e.target.value }); }}
                className={inputCls} />
            </div>
          )}
        </div>
      </div>

      {/* ── Question s'allume ─────────────────────────────────────────────── */}
      {(imeiOk || checkFailed) && !blacklisted && (
        <div className="border-t border-white/5 pt-5 flex flex-col gap-3">
          <p className="text-sm font-sans text-gray-200">L'appareil s'allume normalement ?</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setPowersOn(true)}
              className={`flex-1 py-3 text-xs font-tech font-bold uppercase tracking-wider border rounded-xl transition-all duration-300 ${
                powersOn ? 'bg-xeption-gold border-xeption-gold text-black shadow-[0_0_20px_rgba(255,215,0,0.3)]' : 'bg-white/[0.02] border-white/10 text-gray-300 hover:border-xeption-gold/30 hover:bg-white/[0.05]'
              }`}>
              Oui
            </button>
            <button type="button" onClick={() => setPowersOn(false)}
              className={`flex-1 py-3 text-xs font-tech font-bold uppercase tracking-wider border rounded-xl transition-all duration-300 ${
                !powersOn ? 'bg-red-900/50 border-red-700/60 text-red-300 shadow-[0_0_20px_rgba(220,38,38,0.2)]' : 'bg-white/[0.02] border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/[0.05]'
              }`}>
              Non
            </button>
          </div>
          {!powersOn && (
            <div className="px-4 py-3 bg-red-950/50 border border-red-800/50 text-red-300 text-sm font-sans">
              L'appareil ne s'allume pas — l'évaluation en ligne n'est pas possible. Passe directement en boutique.
            </div>
          )}
        </div>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-end gap-2 pt-2 border-t border-white/5">
        {blockingReason && (
          <p className="text-[11px] text-red-400 font-sans">{blockingReason}</p>
        )}
        <button type="button" disabled={!canProceed}
          onClick={handleNext}
          className="inline-flex items-center gap-2 px-6 py-3 bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none hover:shadow-[0_0_30px_rgba(255,215,0,0.5)]">
          Passer aux photos <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
