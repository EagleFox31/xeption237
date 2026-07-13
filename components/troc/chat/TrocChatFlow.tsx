import React, { useEffect, useRef, useState, useMemo } from 'react';
import { ArrowRight, Camera, X } from 'lucide-react';
import type { TrocDeviceForm } from '../../../types';
import { KNOWN_BRANDS } from '../../../constants/trocCatalog';
import { fetchArgusModels, fetchArgusBrands, type TradeInModel } from '../../../services/trocEvaluationService';
import { BotBubble, UserBubble, TypingIndicator } from './ChatBubble';

// ─── Types ───────────────────────────────────────────────────────────────────

type StepId =
  | 'identity' | 'brand' | 'model' | 'blockers'
  | 'screen' | 'body' | 'condition' | 'photos' | 'imei';

interface CompletedStep {
  id: StepId;
  botMessage: string;
  userLabel: string;
}

export interface TrocChatFlowProps {
  form: TrocDeviceForm;
  onChange: (form: TrocDeviceForm) => void;
  photos: File[];
  onPhotosChange: (files: File[]) => void;
  isUploading: boolean;
  imeiStatus: string;
  imeiBlacklistStatus: string;
  imeiMatchState: string;
  imeiDeviceInfo: { brand?: string; model?: string } | null;
  isCheckingImei: boolean;
  onCheckImei: () => void;
  onPhotosReady: () => void;
  onComplete: () => void;
  error: string | null;
  setBasePrice?: (price: number) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SCREEN_OPTIONS = [
  { value: 'parfait',       label: 'Parfait, aucune trace' },
  { value: 'micro_rayures', label: 'Micro-rayures, difficile à voir' },
  { value: 'rayures',       label: 'Rayures visibles' },
  { value: 'fissuré',       label: 'Fissuré ou cassé' },
];

const BODY_OPTIONS = [
  { value: 'parfait',       label: 'Impeccable' },
  { value: 'micro_rayures', label: 'Micro-rayures' },
  { value: 'rayures',       label: 'Rayures visibles' },
  { value: 'bosses',        label: 'Bosses ou chocs' },
];

const BOT_MESSAGES: Record<StepId, string> = {
  identity:  "Bonjour ! Commençons par toi — ton prénom et ton numéro de téléphone.",
  brand:     "C'est quel appareil ? Dis-moi la marque d'abord.",
  model:     "Et c'est quel modèle exactement ?",
  blockers:  "Avant d'aller plus loin — l'appareil s'allume normalement ? Il n'a pas pris l'eau ?",
  screen:    "Comment tu décrirais l'état de l'écran ?",
  body:      "Et le boîtier — le dos et les côtés, ils ont l'air de quoi ?",
  condition: "La batterie tient à combien ? Il se charge normalement, et la biométrie marche ?",
  photos:    "Maintenant j'ai besoin de photos de l'appareil. Au moins une de l'écran, du dos et des côtés — plus c'est net, mieux c'est pour l'estimation.",
  imei:      "Dernière étape. Compose *#06# sur le clavier d'appel, l'IMEI s'affiche tout seul. Envoie-moi les 15 chiffres.",
};

const STEP_ORDER: StepId[] = [
  'identity', 'brand', 'model', 'blockers',
  'screen', 'body', 'condition', 'photos', 'imei',
];

// ─── Style helpers ────────────────────────────────────────────────────────────

const btnBase   = 'px-4 py-2.5 text-xs font-tech font-bold uppercase tracking-wider border transition-all';
const btnActive = `${btnBase} bg-xeption-gold text-black border-xeption-gold`;
const btnIdle   = `${btnBase} bg-transparent text-gray-300 border-white/15 hover:border-xeption-gold/40 hover:text-white`;
const btnGold   = `flex items-center gap-2 px-5 py-2.5 bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest text-xs transition-all`;
const btnGoldDisabled = `${btnGold} disabled:opacity-30 disabled:cursor-not-allowed`;

const isValidPhone = (v: string) => /^[62]\d{8}$/.test(v);

const batteryLabel = (v: number) => {
  if (v >= 85) return `${v} % — Excellente`;
  if (v >= 70) return `${v} % — Bonne`;
  if (v >= 50) return `${v} % — Correcte`;
  return `${v} % — Faible`;
};

// ─── Small sub-components ─────────────────────────────────────────────────────

const QuickButtons: React.FC<{
  options: { value: string; label: string }[];
  onSelect: (value: string, label: string) => void;
}> = ({ options, onSelect }) => (
  <div className="flex flex-wrap gap-2 mt-3">
    {options.map(o => (
      <button key={o.value} type="button"
        onClick={() => onSelect(o.value, o.label)}
        className={btnIdle}>
        {o.label}
      </button>
    ))}
  </div>
);

const YesNoRow: React.FC<{
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-sm text-gray-300 font-sans">{label}</span>
    <div className="flex gap-2 shrink-0">
      <button type="button" onClick={() => onChange(true)}
        className={value ? btnActive : btnIdle}>Oui</button>
      <button type="button" onClick={() => onChange(false)}
        className={!value ? `${btnBase} bg-white/10 text-white border-white/20` : btnIdle}>Non</button>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const TrocChatFlow: React.FC<TrocChatFlowProps> = ({
  form, onChange,
  photos, onPhotosChange, isUploading,
  imeiStatus, imeiBlacklistStatus, imeiMatchState, imeiDeviceInfo,
  isCheckingImei, onCheckImei,
  onPhotosReady, onComplete,
  error,
  setBasePrice,
}) => {
  const [stepIndex, setStepIndex]   = useState(0);
  const [history, setHistory]       = useState<CompletedStep[]>([]);
  const [isTyping, setIsTyping]     = useState(false);
  const [blocked, setBlocked]       = useState<null | 'powers_off' | 'water_damage'>(null);
  const bottomRef                   = useRef<HTMLDivElement>(null);

  // autocomplete
  const [argusBrands, setArgusBrands]     = useState<string[]>([]);
  const [argusModels, setArgusModels]     = useState<TradeInModel[]>([]);
  const [modelInput, setModelInput]       = useState(form.deviceModel);
  const [showModelDrop, setShowModelDrop] = useState(false);
  const [brandInput, setBrandInput]       = useState(form.deviceBrand);
  const [showBrandDrop, setShowBrandDrop] = useState(false);

  // condition step local state
  const [localBattery, setLocalBattery]       = useState(form.batteryHealth);
  const [localCharges, setLocalCharges]       = useState(form.chargesNormally);
  const [localBiometrics, setLocalBiometrics] = useState(form.biometricsWork);

  // blockers local state
  const [localPowersOn, setLocalPowersOn] = useState(form.powersOn ?? true);
  const [localWaterDmg, setLocalWaterDmg] = useState(form.hasWaterDamage ?? false);

  // photos + imei phase
  const [uploadTriggered, setUploadTriggered] = useState(false);
  const [imeiInput, setImeiInput]             = useState(form.imei || '');
  const [imeiPhase, setImeiPhase]             = useState<'input' | 'checking' | 'result'>('input');
  const prevIsUploading = useRef(false);

  const currentStepId = STEP_ORDER[stepIndex];

  // ── Load brands ────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    fetchArgusBrands().then(brands => {
      if (!active) return;
      const merged = new Set<string>(brands);
      for (const b of KNOWN_BRANDS) merged.add(b);
      setArgusBrands(Array.from(merged).sort((a, b) => a.localeCompare(b, 'fr')));
    });
    return () => { active = false; };
  }, []);

  // ── Load models when brand changes ─────────────────────────────────────────
  useEffect(() => {
    let active = true;
    if (form.deviceBrand) {
      fetchArgusModels(form.deviceBrand).then(m => { if (active) setArgusModels(m); });
    } else {
      setArgusModels([]);
    }
    return () => { active = false; };
  }, [form.deviceBrand]);

  // ── Watch isUploading → advance to IMEI step when upload done ─────────────
  useEffect(() => {
    if (uploadTriggered && prevIsUploading.current && !isUploading && !error) {
      setUploadTriggered(false);
      advanceToNext();
    }
    prevIsUploading.current = isUploading;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUploading]);

  // ── Watch IMEI check result ────────────────────────────────────────────────
  useEffect(() => {
    if (imeiPhase === 'checking' && !isCheckingImei) {
      setImeiPhase('result');
    }
  }, [isCheckingImei, imeiPhase]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isTyping, blocked, stepIndex, imeiPhase, isUploading]);

  // ── Core: advance to next step ─────────────────────────────────────────────
  const advance = (userLabel: string, formPatch: Partial<TrocDeviceForm>) => {
    const id  = currentStepId;
    const msg = BOT_MESSAGES[id];
    onChange({ ...form, ...formPatch });
    setHistory(prev => [...prev, { id, botMessage: msg, userLabel }]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      advanceToNext();
    }, 700);
  };

  const advanceToNext = () => setStepIndex(i => i + 1);

  const triggerBlocker = (type: 'powers_off' | 'water_damage', userLabel: string) => {
    onChange({ ...form, powersOn: type !== 'powers_off', hasWaterDamage: type === 'water_damage' });
    setHistory(prev => [...prev, { id: currentStepId, botMessage: BOT_MESSAGES[currentStepId], userLabel }]);
    setIsTyping(true);
    setTimeout(() => { setIsTyping(false); setBlocked(type); }, 700);
  };

  // ── Autocomplete helpers ───────────────────────────────────────────────────
  const filteredModels = useMemo(() => {
    if (!modelInput) return argusModels.slice(0, 8);
    const q = modelInput.toLowerCase();
    return argusModels.filter(m => m.model_name.toLowerCase().includes(q)).slice(0, 8);
  }, [argusModels, modelInput]);

  const filteredBrands = useMemo(() => {
    if (!brandInput) return argusBrands.slice(0, 10);
    const q = brandInput.toLowerCase();
    return argusBrands.filter(b => b.toLowerCase().includes(q)).slice(0, 10);
  }, [argusBrands, brandInput]);

  // ── Render active input ────────────────────────────────────────────────────
  const renderInput = () => {
    if (blocked) return null;

    switch (currentStepId) {

      // ── 1. Identité ───────────────────────────────────────────────────────
      case 'identity': {
        const nameOk  = form.customerName.trim().length >= 2;
        const phoneOk = isValidPhone(form.customerPhone);
        return (
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input type="text" placeholder="Ton prénom"
                value={form.customerName}
                onChange={e => onChange({ ...form, customerName: e.target.value })}
                className="bg-black/40 border border-white/10 text-white px-4 py-3 text-sm font-sans placeholder-gray-600 focus:border-xeption-gold/60 outline-none"
              />
              <input type="tel" placeholder="Numéro (ex: 677123456)"
                value={form.customerPhone}
                onChange={e => onChange({ ...form, customerPhone: e.target.value })}
                className="bg-black/40 border border-white/10 text-white px-4 py-3 text-sm font-sans placeholder-gray-600 focus:border-xeption-gold/60 outline-none"
              />
            </div>
            {!phoneOk && form.customerPhone.length > 0 && (
              <p className="text-xs text-red-400 font-sans">Numéro invalide (ex : 677123456)</p>
            )}
            <button type="button" disabled={!nameOk || !phoneOk}
              onClick={() => advance(`${form.customerName} · ${form.customerPhone}`, {})}
              className={`self-end ${btnGoldDisabled}`}>
              Continuer <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      }

      // ── 2. Marque ─────────────────────────────────────────────────────────
      case 'brand': {
        const topBrands = ['Samsung', 'Apple', 'Tecno', 'Infinix', 'Itel', 'Xiaomi', 'Huawei'];
        return (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {topBrands.map(b => (
                <button key={b} type="button"
                  onClick={() => advance(b, { deviceBrand: b, deviceModel: '' })}
                  className={btnIdle}>{b}</button>
              ))}
            </div>
            <div className="relative">
              <input type="text" placeholder="Autre marque…"
                value={brandInput}
                onChange={e => { setBrandInput(e.target.value); setShowBrandDrop(true); }}
                onFocus={() => setShowBrandDrop(true)}
                onBlur={() => setTimeout(() => setShowBrandDrop(false), 200)}
                className="w-full bg-black/40 border border-white/10 text-white px-4 py-2.5 text-sm font-sans placeholder-gray-600 focus:border-xeption-gold/60 outline-none"
              />
              {showBrandDrop && filteredBrands.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 max-h-40 overflow-y-auto bg-[#1a1a1a] border border-xeption-gold/30 shadow-xl">
                  {filteredBrands.map(b => (
                    <li key={b}
                      onMouseDown={e => { e.preventDefault(); advance(b, { deviceBrand: b, deviceModel: '' }); }}
                      className="px-4 py-2 text-sm text-gray-200 hover:bg-xeption-gold/20 hover:text-xeption-gold cursor-pointer border-b border-white/5 last:border-0">{b}</li>
                  ))}
                </ul>
              )}
            </div>
            {brandInput.trim().length >= 2 && !showBrandDrop && (
              <button type="button"
                onClick={() => advance(brandInput.trim(), { deviceBrand: brandInput.trim(), deviceModel: '' })}
                className={`self-end ${btnGold}`}>
                Confirmer <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      }

      // ── 3. Modèle ─────────────────────────────────────────────────────────
      case 'model':
        return (
          <div className="mt-3 flex flex-col gap-3">
            <div className="relative">
              <input type="text" placeholder="ex : Galaxy S23, iPhone 14…"
                value={modelInput}
                onChange={e => { setModelInput(e.target.value); setShowModelDrop(true); }}
                onFocus={() => setShowModelDrop(true)}
                onBlur={() => setTimeout(() => setShowModelDrop(false), 200)}
                autoComplete="off"
                className="w-full bg-black/40 border border-white/10 text-white px-4 py-3 text-sm font-sans placeholder-gray-600 focus:border-xeption-gold/60 outline-none"
              />
              {showModelDrop && filteredModels.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-[#1a1a1a] border border-xeption-gold/30 shadow-xl">
                  {filteredModels.map(m => (
                    <li key={m.id}
                      onMouseDown={e => {
                        e.preventDefault();
                        setModelInput(m.model_name);
                        setShowModelDrop(false);
                        if (setBasePrice) setBasePrice(m.base_price);
                        advance(m.model_name, { deviceModel: m.model_name, tradeInModelId: m.id });
                      }}
                      className="px-4 py-2.5 text-sm text-gray-200 hover:bg-xeption-gold/20 hover:text-xeption-gold cursor-pointer border-b border-white/5 last:border-0">{m.model_name}</li>
                  ))}
                </ul>
              )}
            </div>
            <button type="button" disabled={modelInput.trim().length < 2}
              onClick={() => advance(modelInput.trim(), { deviceModel: modelInput.trim() })}
              className={`self-end ${btnGoldDisabled}`}>
              Confirmer <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        );

      // ── 4. Blockers ───────────────────────────────────────────────────────
      case 'blockers': {
        const canContinue = localPowersOn && !localWaterDmg;
        return (
          <div className="mt-3 flex flex-col gap-4">
            <YesNoRow label="Il s'allume normalement ?" value={localPowersOn} onChange={setLocalPowersOn} />
            <YesNoRow label="Il a pris l'eau ?" value={localWaterDmg} onChange={setLocalWaterDmg} />
            <button type="button"
              onClick={() => {
                if (!localPowersOn) { triggerBlocker('powers_off', "Ne s'allume pas"); return; }
                if (localWaterDmg)  { triggerBlocker('water_damage', "Dégâts d'eau"); return; }
                advance('Tout va bien', { powersOn: true, hasWaterDamage: false });
              }}
              className={`self-end flex items-center gap-2 px-5 py-2.5 font-tech font-bold uppercase tracking-widest text-xs transition-all ${
                canContinue ? 'bg-xeption-gold hover:bg-white text-black' : 'bg-red-900/40 border border-red-800/60 text-red-300'
              }`}>
              {canContinue ? <><span>Continuer</span><ArrowRight className="w-3.5 h-3.5" /></> : 'Évaluation impossible'}
            </button>
          </div>
        );
      }

      // ── 5. Écran ──────────────────────────────────────────────────────────
      case 'screen':
        return <QuickButtons options={SCREEN_OPTIONS}
          onSelect={(v, l) => advance(l, { screenCondition: v })} />;

      // ── 6. Boîtier ────────────────────────────────────────────────────────
      case 'body':
        return <QuickButtons options={BODY_OPTIONS}
          onSelect={(v, l) => advance(l, { bodyCondition: v })} />;

      // ── 7. Condition (batterie + fonctionnel) ─────────────────────────────
      case 'condition': {
        const parts: string[] = [batteryLabel(localBattery)];
        if (!localCharges)    parts.push('charge KO');
        if (!localBiometrics) parts.push('biométrie KO');
        return (
          <div className="mt-3 flex flex-col gap-4">
            <div>
              <p className="text-xeption-gold font-tech font-bold text-sm mb-2">{batteryLabel(localBattery)}</p>
              <input type="range" min={0} max={100} value={localBattery}
                onChange={e => setLocalBattery(Number(e.target.value))}
                className="w-full accent-xeption-gold cursor-pointer" />
              <div className="flex justify-between text-[9px] text-gray-600 font-tech mt-1">
                <span>0 %</span><span>50 %</span><span>100 %</span>
              </div>
            </div>
            <YesNoRow label="Il se charge normalement ?" value={localCharges} onChange={setLocalCharges} />
            <YesNoRow label="La biométrie marche ?" value={localBiometrics} onChange={setLocalBiometrics} />
            <button type="button"
              onClick={() => advance(parts.join(' · '), { batteryHealth: localBattery, chargesNormally: localCharges, biometricsWork: localBiometrics })}
              className={`self-end ${btnGold}`}>
              Continuer <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      }

      // ── 8. Photos ─────────────────────────────────────────────────────────
      case 'photos': {
        const handleFiles = (files: FileList | null) => {
          if (!files) return;
          const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
          onPhotosChange([...photos, ...newFiles].slice(0, 6));
        };
        const removePhoto = (i: number) => onPhotosChange(photos.filter((_, idx) => idx !== i));
        const canSubmit = photos.length >= 1 && !isUploading;
        return (
          <div className="mt-3 flex flex-col gap-3">
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((f, i) => (
                  <div key={i} className="relative aspect-square bg-black/40 border border-white/10 overflow-hidden">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/70 flex items-center justify-center hover:bg-red-900/80 transition-colors">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer px-4 py-3 border border-dashed border-white/20 hover:border-xeption-gold/40 text-gray-400 hover:text-white transition-all text-sm font-sans">
              <Camera className="w-4 h-4" />
              {photos.length === 0 ? 'Ajouter des photos' : 'Ajouter d\'autres photos'}
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={e => handleFiles(e.target.files)} />
            </label>
            <p className="text-[10px] text-gray-500 font-sans">Écran · dos · côtés — au moins 1 photo.</p>
            <button type="button" disabled={!canSubmit}
              onClick={() => {
                const id  = currentStepId;
                const msg = BOT_MESSAGES[id];
                onChange({ ...form });
                setHistory(prev => [...prev, { id, botMessage: msg, userLabel: `${photos.length} photo${photos.length > 1 ? 's' : ''}` }]);
                setIsTyping(true);
                setUploadTriggered(true);
                onPhotosReady();
                setTimeout(() => setIsTyping(false), 800);
              }}
              className={`self-end ${btnGoldDisabled}`}>
              {isUploading ? 'Envoi en cours…' : <>Envoyer les photos <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        );
      }

      // ── 9. IMEI ───────────────────────────────────────────────────────────
      case 'imei': {
        const imeiOk = /^\d{15}$/.test(imeiInput.trim());

        if (imeiPhase === 'checking') {
          return (
            <div className="mt-3 flex items-center gap-3 text-sm text-gray-400 font-sans">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-xeption-gold/60 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
              Vérification en cours…
            </div>
          );
        }

        if (imeiPhase === 'result') {
          if (imeiBlacklistStatus === 'blacklisted') {
            return (
              <BotBubble variant="error">
                Cet IMEI est signalé comme volé ou bloqué. On ne peut pas continuer l'évaluation en ligne. Passe en boutique pour vérification.
              </BotBubble>
            );
          }
          if (imeiMatchState === 'mismatch') {
            return (
              <div className="mt-2 flex flex-col gap-3">
                <BotBubble variant="warning">
                  L'IMEI correspond à un autre appareil que ce que tu as indiqué. La confirmation se fera en boutique — on peut quand même continuer.
                </BotBubble>
                <button type="button" onClick={onComplete} className={`self-end ${btnGold}`}>
                  Continuer quand même <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }
          const deviceLabel = imeiDeviceInfo
            ? `${imeiDeviceInfo.brand ?? ''} ${imeiDeviceInfo.model ?? ''}`.trim()
            : null;
          return (
            <div className="mt-2 flex flex-col gap-3">
              <BotBubble>
                {deviceLabel
                  ? `IMEI propre. J'ai bien identifié ton ${deviceLabel}.`
                  : "IMEI propre. Le modèle sera confirmé en boutique."}
                {" "}On est bons, on peut passer au paiement.
              </BotBubble>
              <button type="button" onClick={onComplete} className={`self-end ${btnGold}`}>
                Passer au paiement <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        }

        // phase 'input'
        return (
          <div className="mt-3 flex flex-col gap-3">
            <input type="text" placeholder="ex : 358741090123456"
              value={imeiInput}
              onChange={e => setImeiInput(e.target.value.replace(/\D/g, '').slice(0, 15))}
              maxLength={15}
              className="bg-black/40 border border-white/10 text-white px-4 py-3 text-sm font-sans font-mono placeholder-gray-600 focus:border-xeption-gold/60 outline-none tracking-widest"
            />
            {!imeiOk && imeiInput.length > 0 && (
              <p className="text-xs text-gray-500 font-sans">L'IMEI fait exactement 15 chiffres.</p>
            )}
            <div className="flex items-center justify-between gap-3">
              <button type="button"
                onClick={() => {
                  setHistory(prev => [...prev, {
                    id: 'imei',
                    botMessage: BOT_MESSAGES.imei,
                    userLabel: "Je n'ai pas l'IMEI",
                  }]);
                  setIsTyping(true);
                  setTimeout(() => {
                    setIsTyping(false);
                    setImeiPhase('result');
                  }, 700);
                  // set imeiStatus to not_checked — goToPayment will fail, handled below
                }}
                className="text-xs text-gray-500 hover:text-gray-300 font-sans underline underline-offset-2 transition-colors">
                Je ne l'ai pas
              </button>
              <button type="button" disabled={!imeiOk}
                onClick={() => {
                  onChange({ ...form, imei: imeiInput.trim() });
                  setImeiPhase('checking');
                  setTimeout(() => onCheckImei(), 50);
                }}
                className={btnGoldDisabled}>
                Vérifier <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-1 p-6 min-h-[400px]">
      <div className="mb-4">
        <h2 className="text-xl font-tech font-bold uppercase text-white tracking-wider">Ton appareil</h2>
        <p className="text-xs text-gray-500 mt-1 font-sans">On y va question par question — ça prend 2 minutes.</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Historique */}
        {history.map(step => (
          <React.Fragment key={step.id}>
            <BotBubble>{step.botMessage}</BotBubble>
            <UserBubble label={step.userLabel} />
          </React.Fragment>
        ))}

        {/* Blocker */}
        {blocked && (
          <BotBubble variant="error">
            {blocked === 'powers_off'
              ? "L'appareil ne s'allume pas — on ne peut pas faire d'évaluation à distance. Passe en boutique, on regardera ça ensemble."
              : "Des dégâts d'eau, c'est bloquant pour une évaluation en ligne. Viens directement en boutique."}
          </BotBubble>
        )}

        {/* Étape courante */}
        {!blocked && (
          <div>
            <BotBubble>{BOT_MESSAGES[currentStepId]}</BotBubble>
            {renderInput()}
          </div>
        )}

        {isTyping && <TypingIndicator />}
      </div>

      <div ref={bottomRef} />
    </div>
  );
};
