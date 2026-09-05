import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { TrocDeviceForm } from '../../types';
import { KNOWN_BRANDS } from '../../constants/trocCatalog';
import { fetchArgusModels, fetchArgusBrands, type TradeInModel } from '../../services/trocEvaluationService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrocWizardProps {
  form: TrocDeviceForm;
  onChange: (form: TrocDeviceForm) => void;
  onNext: () => void;
  setBasePrice?: (price: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidPhone = (v: string) => /^[62]\d{8}$/.test(v);
const batteryLabel = (v: number) => {
  if (v >= 85) return 'Excellente';
  if (v >= 70) return 'Bonne';
  if (v >= 50) return 'Correcte';
  return 'Faible';
};

// ─── Step meta ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Toi' },
  { id: 2, label: "L'appareil" },
  { id: 3, label: "L'état" },
  { id: 4, label: 'Ça marche ?' },
];

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-[#1c1c16]/90 border border-white/20 text-white px-4 py-3 text-sm font-sans placeholder-gray-600 focus:border-xeption-gold/60 outline-none transition-all';
const labelCls = 'block text-[10px] font-tech uppercase tracking-widest text-white/70 mb-1.5';

// ─── Condition card ───────────────────────────────────────────────────────────

const ConditionCard: React.FC<{
  value: string;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}> = ({ label, description, selected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`text-left p-3 border transition-all ${
      selected
        ? 'border-xeption-gold bg-xeption-gold/10 text-white'
        : 'border-white/20 bg-[#1c1c16]/80 text-white/80 hover:border-xeption-gold/30 hover:text-white'
    }`}
  >
    <p className={`text-sm font-tech font-bold uppercase tracking-wider mb-0.5 ${selected ? 'text-xeption-gold' : ''}`}>
      {label}
    </p>
    <p className="text-[11px] font-sans leading-relaxed opacity-70">{description}</p>
  </button>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const TrocWizard: React.FC<TrocWizardProps> = ({ form, onChange, onNext, setBasePrice }) => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Autocomplete state
  const [argusBrands, setArgusBrands]     = useState<string[]>([]);
  const [argusModels, setArgusModels]     = useState<TradeInModel[]>([]);
  const [modelInput, setModelInput]       = useState(form.deviceModel);
  const [showModelDrop, setShowModelDrop] = useState(false);
  const [brandInput, setBrandInput]       = useState('');
  const [showBrandDrop, setShowBrandDrop] = useState(false);

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

  useEffect(() => {
    let active = true;
    if (form.deviceBrand) {
      fetchArgusModels(form.deviceBrand).then(m => { if (active) setArgusModels(m); });
    } else {
      setArgusModels([]);
    }
    return () => { active = false; };
  }, [form.deviceBrand]);

  const filteredModels = useMemo(() => {
    if (!modelInput) return argusModels.slice(0, 8);
    const q = modelInput.toLowerCase();
    return argusModels.filter(m => m.model_name.toLowerCase().includes(q)).slice(0, 8);
  }, [argusModels, modelInput]);

  const filteredBrands = useMemo(() => {
    const q = brandInput.toLowerCase();
    return argusBrands.filter(b => b.toLowerCase().includes(q)).slice(0, 10);
  }, [argusBrands, brandInput]);

  const patch = (partial: Partial<TrocDeviceForm>) => {
    onChange({ ...form, ...partial });
    setError(null);
  };

  // ── Validation par step ────────────────────────────────────────────────────

  const validate = (): boolean => {
    if (step === 1) {
      if (!form.customerName.trim() || form.customerName.trim().length < 2) {
        setError('Ton prénom est requis.'); return false;
      }
      if (!isValidPhone(form.customerPhone)) {
        setError('Numéro invalide — format attendu : 677123456.'); return false;
      }
    }
    if (step === 2) {
      if (!form.deviceBrand) { setError('Choisis une marque.'); return false; }
      if (!form.deviceModel || form.deviceModel.trim().length < 2) {
        setError('Indique le modèle de ton appareil.'); return false;
      }
    }
    if (step === 3) {
      if (!form.screenCondition) { setError("Indique l'état de l'écran."); return false; }
      if (!form.bodyCondition)   { setError("Indique l'état du boîtier."); return false; }
    }
    return true;
  };

  const goNext = () => {
    if (!validate()) return;
    if (step === 4) { onNext(); return; }
    if (step === 2 && modelInput.trim() && modelInput.trim() !== form.deviceModel) {
      patch({ deviceModel: modelInput.trim(), tradeInModelId: undefined }); // saisie manuelle → pas de modèle catalogue
    }
    setError(null);
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => { setError(null); setStep(s => s - 1); };

  // ── Blockers (step 4) ──────────────────────────────────────────────────────
  const isBlocked = !form.powersOn || form.hasWaterDamage;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 sm:p-8 flex flex-col gap-6">

      {/* Progression */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-0.5 bg-white/10">
          <div className="h-full bg-xeption-gold transition-all duration-300"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }} />
        </div>
        <span className="text-[10px] font-tech text-white/60 shrink-0">
          {step} / {STEPS.length} — {STEPS[step - 1].label}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-950/50 border border-red-800/50 text-red-300 text-sm font-sans">
          {error}
        </div>
      )}

      {/* ── Step 1 : Toi ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-tech font-bold uppercase text-white tracking-wider">Parlons de toi</h2>
            <p className="text-xs text-white/60 mt-1 font-sans">On en a besoin pour te recontacter avec ton offre.</p>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className={labelCls}>Prénom *</label>
              <input type="text" placeholder="Ton prénom"
                value={form.customerName}
                onChange={e => patch({ customerName: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Numéro de téléphone *</label>
              <input type="tel" placeholder="ex : 677 123 456"
                value={form.customerPhone}
                onChange={e => patch({ customerPhone: e.target.value })}
                className={inputCls} />
              {form.customerPhone.length > 0 && !isValidPhone(form.customerPhone) && (
                <p className="text-xs text-white/60 mt-1 font-sans">Format attendu : 677123456 ou 699123456</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Email <span className="text-white/50 normal-case tracking-normal">— optionnel</span></label>
              <input type="email" placeholder="Pour recevoir ton estimation"
                value={form.customerEmail || ''}
                onChange={e => patch({ customerEmail: e.target.value })}
                className={inputCls} />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2 : L'appareil ──────────────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-tech font-bold uppercase text-white tracking-wider">L'appareil</h2>
            <p className="text-xs text-white/60 mt-1 font-sans">Marque et modèle exact — ça compte pour l'estimation.</p>
          </div>

          {/* Marque */}
          <div>
            <label className={labelCls}>Marque *</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {['Samsung', 'Apple', 'Tecno', 'Infinix', 'Itel', 'Xiaomi', 'Huawei'].map(b => (
                <button key={b} type="button"
                  onClick={() => { patch({ deviceBrand: b, deviceModel: '' }); setModelInput(''); }}
                  className={`px-3 py-1.5 text-xs font-tech font-bold uppercase tracking-wider border transition-all ${
                    form.deviceBrand === b
                      ? 'border-xeption-gold bg-xeption-gold text-black'
                      : 'border-white/15 text-white/80 hover:border-xeption-gold/40 hover:text-white'
                  }`}>
                  {b}
                </button>
              ))}
            </div>
            <div className="relative">
              <input type="text" placeholder="Autre marque…"
                value={form.deviceBrand && !['Samsung','Apple','Tecno','Infinix','Itel','Xiaomi','Huawei'].includes(form.deviceBrand) ? form.deviceBrand : brandInput}
                onChange={e => { setBrandInput(e.target.value); patch({ deviceBrand: e.target.value, deviceModel: '', tradeInModelId: undefined }); setModelInput(''); setShowBrandDrop(true); }}
                onFocus={() => setShowBrandDrop(true)}
                onBlur={() => setTimeout(() => setShowBrandDrop(false), 200)}
                className={inputCls} />
              {showBrandDrop && filteredBrands.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 max-h-40 overflow-y-auto bg-[#1a1a1a] border border-xeption-gold/30 shadow-xl">
                  {filteredBrands.map(b => (
                    <li key={b}
                      onMouseDown={e => { e.preventDefault(); patch({ deviceBrand: b, deviceModel: '' }); setBrandInput(''); setModelInput(''); setShowBrandDrop(false); }}
                      className="px-4 py-2 text-sm text-white/90 hover:bg-xeption-gold/20 hover:text-xeption-gold cursor-pointer border-b border-white/5 last:border-0">{b}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Modèle */}
          <div>
            <label className={labelCls}>Modèle *</label>
            <div className="relative">
              <input type="text" placeholder="ex : Galaxy S23, iPhone 14…"
                value={modelInput}
                onChange={e => { setModelInput(e.target.value); setShowModelDrop(true); }}
                onFocus={() => setShowModelDrop(true)}
                onBlur={() => setTimeout(() => setShowModelDrop(false), 200)}
                autoComplete="off"
                className={inputCls} />
              {showModelDrop && filteredModels.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-[#1a1a1a] border border-xeption-gold/30 shadow-xl">
                  {filteredModels.map(m => (
                    <li key={m.id}
                      onMouseDown={e => {
                        e.preventDefault();
                        setModelInput(m.model_name);
                        patch({ deviceModel: m.model_name, tradeInModelId: m.id });
                        if (setBasePrice) setBasePrice(m.base_price);
                        setShowModelDrop(false);
                      }}
                      className="px-4 py-2.5 text-sm text-white/90 hover:bg-xeption-gold/20 hover:text-xeption-gold cursor-pointer border-b border-white/5 last:border-0">{m.model_name}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── Step 3 : L'état ──────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-tech font-bold uppercase text-white tracking-wider">L'état de l'appareil</h2>
            <p className="text-xs text-white/60 mt-1 font-sans">Sois honnête — notre technicien vérifiera en boutique de toute façon.</p>
          </div>

          {/* Écran */}
          <div>
            <label className={labelCls}>L'écran *</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'parfait',       label: 'Parfait',         description: 'Aucune trace visible' },
                { value: 'micro_rayures', label: 'Micro-rayures',   description: 'Visibles uniquement à la lumière' },
                { value: 'rayures',       label: 'Rayures',         description: 'Visibles à l\'œil nu' },
                { value: 'fissuré',       label: 'Fissuré',         description: 'Cassé ou fissuré' },
              ].map(o => (
                <ConditionCard key={o.value} {...o}
                  selected={form.screenCondition === o.value}
                  onSelect={() => patch({ screenCondition: o.value })} />
              ))}
            </div>
          </div>

          {/* Boîtier */}
          <div>
            <label className={labelCls}>Le boîtier *</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'parfait',       label: 'Impeccable',      description: 'Pas une égratignure' },
                { value: 'micro_rayures', label: 'Micro-rayures',   description: 'Rien de notable' },
                { value: 'rayures',       label: 'Rayures',         description: 'Rayures visibles' },
                { value: 'bosses',        label: 'Bosses',          description: 'Chocs ou bosses' },
              ].map(o => (
                <ConditionCard key={o.value} {...o}
                  selected={form.bodyCondition === o.value}
                  onSelect={() => patch({ bodyCondition: o.value })} />
              ))}
            </div>
          </div>

          {/* Batterie */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`${labelCls} mb-0`}>Batterie</label>
              <span className="text-xeption-gold text-sm font-tech font-bold">
                {form.batteryHealth} % — {batteryLabel(form.batteryHealth)}
              </span>
            </div>
            <input type="range" min={0} max={100}
              value={form.batteryHealth}
              onChange={e => patch({ batteryHealth: Number(e.target.value) })}
              className="w-full accent-xeption-gold cursor-pointer" />
            <div className="flex justify-between text-[9px] text-white/50 font-tech mt-1">
              <span>0 %</span><span>50 %</span><span>100 %</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4 : Ça marche ? ─────────────────────────────────────────── */}
      {step === 4 && (
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-tech font-bold uppercase text-white tracking-wider">Ça marche ?</h2>
            <p className="text-xs text-white/60 mt-1 font-sans">Les points qui affectent directement la valeur de reprise.</p>
          </div>

          {isBlocked && (
            <div className="px-4 py-3 bg-red-950/50 border border-red-800/50 text-red-300 text-sm font-sans leading-relaxed">
              {!form.powersOn
                ? "L'appareil ne s'allume pas — l'évaluation en ligne n'est pas possible. Passe en boutique directement."
                : "Des dégâts d'eau — l'évaluation en ligne n'est pas possible. Passe en boutique directement."}
            </div>
          )}

          <div className="flex flex-col gap-4">
            {[
              { label: "L'appareil s'allume normalement", field: 'powersOn' as const, invert: false },
              { label: "Il y a des dégâts d'eau", field: 'hasWaterDamage' as const, invert: true },
              { label: 'Il se charge normalement', field: 'chargesNormally' as const, invert: false },
              { label: 'La biométrie fonctionne', field: 'biometricsWork' as const, invert: false },
            ].map(({ label, field, invert }) => {
              const val = form[field] as boolean;
              return (
                <div key={field} className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
                  <span className="text-sm text-white/90 font-sans">{label}</span>
                  <div className="flex gap-2 shrink-0">
                    {[
                      { l: 'Oui', v: true },
                      { l: 'Non', v: false },
                    ].map(opt => {
                      const isSelected = val === opt.v;
                      const isWarning  = invert ? opt.v === true : opt.v === false;
                      return (
                        <button key={String(opt.v)} type="button"
                          onClick={() => patch({ [field]: opt.v })}
                          className={`px-4 py-2 text-xs font-tech font-bold uppercase tracking-wider border transition-all ${
                            isSelected
                              ? isWarning
                                ? 'bg-red-900/60 border-red-700/80 text-red-300'
                                : 'bg-xeption-gold border-xeption-gold text-black'
                              : 'border-white/15 text-white/70 hover:border-white/30 hover:text-white'
                          }`}>
                          {opt.l}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-white/15">
        {step > 1
          ? <button type="button" onClick={goBack}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-white/15 text-white/80 hover:text-white hover:border-white/30 text-xs font-tech uppercase tracking-widest transition-all">
              <ArrowLeft className="w-3.5 h-3.5" /> Retour
            </button>
          : <div />
        }
        <button type="button" onClick={goNext} disabled={step === 4 && isBlocked}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(255,215,0,0.2)] transition-all disabled:opacity-30 disabled:cursor-not-allowed">
          {step === 4 ? 'Continuer — Vérifier mon IMEI' : 'Suivant'}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
