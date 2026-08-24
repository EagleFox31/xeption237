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

const inputCls = 'w-full bg-white/[0.09] backdrop-blur-md border border-white/20 rounded-xl text-white px-4 py-3.5 text-sm font-sans placeholder-gray-500 focus:border-xeption-gold/60 focus:bg-white/[0.09] focus:shadow-[0_0_15px_rgba(255,215,0,0.15)] outline-none transition-all duration-300';
const labelCls = 'block text-[10px] font-tech uppercase tracking-widest text-white/70 mb-1.5';
const sectionHeaderCls = 'flex h-full flex-col border-b border-white/20 pb-4 text-left';
const sectionTitleCls = 'text-xl font-tech font-bold uppercase text-white tracking-wider leading-tight';
const sectionDescCls = 'mt-1 text-xs font-sans leading-relaxed text-white/80';

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

  const deviceLabel = imeiDeviceInfo
    ? `${imeiDeviceInfo.brand ?? ''} ${imeiDeviceInfo.model ?? ''}`.trim()
    : null;

  const needsManualModel = checked && imeiStatus === 'valid' && !deviceLabel;
  const checkFailed      = checked && imeiStatus === 'check_failed';
  const blacklisted      = imeiBlacklistStatus === 'blacklisted';
  const imeiOk           = checked && imeiStatus === 'valid' && !blacklisted;

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

  // Les MEMES conditions que canProceed, nommees pour l'affichage. Une seule
  // verite : impossible que la barre annonce 5/5 alors que le bouton reste
  // desactive.
  const checklist = [
    { key: 'name',  label: 'Prénom',   done: isValidName(form.customerName) },
    { key: 'phone', label: 'Téléphone', done: isValidPhone(form.customerPhone) },
    { key: 'power', label: 'Allume',   done: powersOn === true },
    { key: 'imei',  label: 'IMEI',     done: Boolean(imeiOk) },
    { key: 'model', label: 'Modèle',   done: effectiveModel.length >= 2 },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const progressPct = Math.round((doneCount / checklist.length) * 100);

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
    <div className="grid grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-5 lg:items-start">

      {/* Progression — remplir un formulaire devient avancer vers son offre */}
      <div className="lg:col-span-2 rounded-xl border border-xeption-gold/25 bg-gradient-to-r from-xeption-gold/[0.12] to-transparent px-4 py-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-[11px] font-tech font-bold uppercase tracking-widest text-white/85">
            {doneCount === checklist.length
              ? 'Tout est prêt — lance ton estimation'
              : `Ton estimation se prépare — ${doneCount} sur ${checklist.length}`}
          </span>
          <span className={`font-tech text-lg font-black tabular-nums ${doneCount === checklist.length ? 'text-emerald-300' : 'text-xeption-gold'}`}>
            {progressPct}%
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${doneCount === checklist.length ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-400 to-xeption-gold'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {checklist.map((c) => (
            <span
              key={c.key}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-tech uppercase tracking-wide transition-colors duration-300 ${
                c.done
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-white/15 bg-white/[0.04] text-white/50'
              }`}
            >
              {c.done && <CheckCircle className="h-3 w-3 shrink-0" />}
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* Ligne 1 — en-têtes calés sur la même hauteur (laptop) */}
      <div className={sectionHeaderCls}>
        <h2 className={sectionTitleCls}>Ton appareil</h2>
        <p className={sectionDescCls}>3 infos et l'IA Xeption s'occupe de l'estimation instantanée.</p>
      </div>

      <div className={sectionHeaderCls}>
        <h2 className={sectionTitleCls}>Vérification IMEI</h2>
        <p className={sectionDescCls}>
          Compose <span className="font-mono font-semibold text-xeption-gold">*#06#</span> sur l'appareil
          {' '}— prends le premier numéro affiché (<strong className="text-white">IMEI 1</strong>).
        </p>
      </div>

      <div className="flex justify-center lg:hidden">
        <ChameleoMascot
          size="sm"
          pose="inspector"
          state={isCheckingImei ? 'scanning' : imeiOk ? 'happy' : 'idle'}
          message={quickInspectorMsg}
        />
      </div>

      {/* Ligne 2 — champs alignés */}
      <div className="flex flex-col gap-3">
        <div>
          <label className={labelCls}>Prénom *</label>
          <input type="text" placeholder="Ton prénom"
            value={form.customerName}
            onChange={e => patch({ customerName: e.target.value })}
            className={`${inputCls} ${form.customerName.length > 0 && !isValidName(form.customerName) ? 'border-red-500/70' : ''}`} />
          {form.customerName.length > 0 && !isValidName(form.customerName) && (
            <p className="mt-1 text-[11px] font-sans text-red-400">
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
            <p className="mt-1 text-[11px] font-sans text-red-400">Numéro invalide — 9 chiffres, commence par 6 ou 2 (ex : 677 123 456)</p>
          )}
        </div>

        {(imeiOk || checkFailed) && !blacklisted && (
          <div className="flex flex-col gap-3 border-t border-white/5 pt-5">
            <p className="text-sm font-sans text-white/90">L'appareil s'allume normalement ?</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setPowersOn(true)}
                className={`flex-1 rounded-xl border py-3 text-xs font-tech font-bold uppercase tracking-wider transition-all duration-300 ${
                  powersOn ? 'border-xeption-gold bg-xeption-gold text-black shadow-[0_0_20px_rgba(255,215,0,0.3)]' : 'border-white/20 bg-white/[0.08] text-white/80 hover:border-xeption-gold/30 hover:bg-white/[0.08]'
                }`}>
                Oui
              </button>
              <button type="button" onClick={() => setPowersOn(false)}
                className={`flex-1 rounded-xl border py-3 text-xs font-tech font-bold uppercase tracking-wider transition-all duration-300 ${
                  !powersOn ? 'border-red-700/60 bg-red-900/50 text-red-300 shadow-[0_0_20px_rgba(220,38,38,0.2)]' : 'border-white/20 bg-white/[0.08] text-white/80 hover:border-white/30 hover:bg-white/[0.08]'
                }`}>
                Non
              </button>
            </div>
            {!powersOn && (
              <div className="border border-red-800/50 bg-red-950/50 px-4 py-3 text-sm font-sans text-red-300">
                L'appareil ne s'allume pas — l'évaluation en ligne n'est pas possible. Passe directement en boutique.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="lg:hidden">
          <div className="mb-3 rounded-xl border border-xeption-gold/30 bg-xeption-gold/10 px-4 py-3 text-sm font-sans leading-relaxed text-white/90 shadow-[0_0_20px_rgba(255,215,0,0.1)]">
            Sur l'appareil à troquer, ouvre le clavier d'appel et compose{' '}
            <span className="font-mono text-base font-bold text-xeption-gold">*#06#</span>.
            Plusieurs numéros peuvent s'afficher — prends le premier (<strong className="text-white">IMEI 1</strong>).
          </div>
        </div>

        <div>
          <label className={labelCls}>Numéro IMEI</label>
          <div className="flex gap-2">
            <input type="text" placeholder="15 chiffres"
              value={imeiInput}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 15);
                setImeiInput(v);
                setChecked(false);
              }}
              maxLength={15}
              className={`${inputCls} flex-1 font-mono tracking-widest`}
            />
            <button type="button"
              disabled={!isValidImei(imeiInput) || isCheckingImei}
              onClick={handleVerify}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-xeption-gold px-5 text-xs font-tech font-bold uppercase tracking-widest text-black transition-all duration-300 hover:bg-white hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none">
              {isCheckingImei
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : 'Vérifier'}
            </button>
          </div>

          {isCheckingImei && (
            <p className="mt-2 text-xs font-sans text-white/60">Vérification en cours…</p>
          )}

          {blacklisted && (
            <div className="mt-3 border border-red-800/50 bg-red-950/50 px-4 py-3 text-sm font-sans text-red-300">
              Cet IMEI est signalé comme volé ou bloqué. Évaluation impossible en ligne — passe en boutique.
            </div>
          )}

          {imeiOk && deviceLabel && (
            <div className="mt-3 animate-in fade-in zoom-in-95 duration-500 rounded-xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 to-transparent px-4 py-3 shadow-[0_0_24px_rgba(16,185,129,0.15)]">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500/20">
                  <CheckCircle className="h-4 w-4 text-emerald-300" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-tech uppercase tracking-widest text-emerald-300/90">
                    Appareil reconnu
                  </p>
                  <p className="truncate font-tech text-lg font-bold text-white">{deviceLabel}</p>
                </div>
              </div>
            </div>
          )}

          {needsManualModel && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs font-sans text-white/70">IMEI propre — modèle non reconnu. Quel est le modèle ?</p>
              <input type="text" placeholder="ex : Galaxy A54, iPhone 13…"
                value={manualModel}
                onChange={e => { setManualModel(e.target.value); patch({ deviceModel: e.target.value }); }}
                className={inputCls} />
            </div>
          )}

          {checkFailed && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-xs font-sans text-amber-300">
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

      <div className="flex flex-col items-end gap-2 border-t border-white/5 pt-2 lg:col-span-2">
        {blockingReason && (
          <p className="text-[11px] font-sans text-red-400">{blockingReason}</p>
        )}
        <button type="button" disabled={!canProceed}
          onClick={handleNext}
          className="inline-flex items-center gap-2 rounded-xl bg-xeption-gold px-6 py-3 text-xs font-tech font-bold uppercase tracking-widest text-black shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none">
          Passer aux photos <ArrowRight className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
};
