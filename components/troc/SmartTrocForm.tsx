import React from 'react';
import { ChevronDown, AlertTriangle } from 'lucide-react';
import type { TrocDeviceForm } from '../../types';
import { SCREEN_CONDITIONS, BODY_CONDITIONS, CAMERA_CONDITIONS, REPAIR_OPTIONS, CONDITION_LABELS } from '../../constants/trocConditions';
import { KNOWN_BRANDS, STORAGES, RAMS } from '../../constants/trocCatalog';
import { fetchArgusModels, fetchArgusBrands, type TradeInModel } from '../../services/trocEvaluationService';
import { AutocompleteInput } from '../common/AutocompleteInput';

const ACQUISITION_OPTIONS = [
  { value: 'used', label: "Occasion à l'achat" },
  { value: 'new', label: "Neuf à l'achat" },
] as const;

const OWNERSHIP_OPTIONS = [
  { value: 'unknown', label: 'Je ne sais pas' },
  { value: 'first', label: '1er propriétaire' },
  { value: 'second', label: '2e propriétaire' },
  { value: 'third_plus', label: '3e propriétaire ou plus' },
] as const;

const isValidCamPhone = (phone: string) => /^[62]\d{8}$/.test(phone);
const isValidPurchaseDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  return d <= new Date();
};

const isPurchaseDateOk = (form: TrocDeviceForm): boolean =>
  !!form.purchaseDateUnknown ||
  (!!form.purchaseDate.trim() && isValidPurchaseDate(form.purchaseDate));

const isFormValid = (form: TrocDeviceForm): boolean =>
  !!(
    form.customerName.trim() &&
    form.customerPhone.trim() &&
    isValidCamPhone(form.customerPhone) &&
    form.deviceBrand.trim() &&
    form.deviceModel.trim() &&
    form.acquisitionCondition &&
    isPurchaseDateOk(form) &&
    form.screenCondition.trim() &&
    form.bodyCondition.trim()
  );

const getHint = (form: TrocDeviceForm): string | null => {
  if (!form.customerName.trim()) return 'Nom du client requis.';
  if (!form.customerPhone.trim()) return 'Numéro de téléphone requis.';
  if (!isValidCamPhone(form.customerPhone)) return 'Téléphone invalide (ex : 677123456).';
  if (!form.deviceBrand.trim()) return "Marque de l'appareil requise.";
  if (!form.deviceModel.trim()) return "Modèle de l'appareil requis.";
  if (!form.purchaseDateUnknown && !form.purchaseDate.trim()) return "Date d'achat requise.";
  if (!form.purchaseDateUnknown && form.purchaseDate.trim() && !isValidPurchaseDate(form.purchaseDate)) {
    return "Date d'achat invalide (pas dans le futur).";
  }
  if (!form.screenCondition.trim()) return "État de l'écran requis.";
  if (!form.bodyCondition.trim()) return 'État du boîtier requis.';
  return null;
};

// Bloquants réels — empêchent l'évaluation et le rachat.
const getBlockerWarning = (form: TrocDeviceForm): string | null => {
  if (form.powersOn === false) return "L'appareil ne s'allume pas — évaluation impossible.";
  if (form.hasWaterDamage === true) return "Dégâts d'eau détectés — évaluation impossible.";
  return null;
};

// Notes informatives — l'évaluation continue, simple rappel pour le dépôt.
const getInfoNotice = (form: TrocDeviceForm): string | null => {
  if (form.accountUnlocked === false) {
    return "Compte Google / iCloud non retiré : pas de souci, notre technicien le retirera avec vous lors du dépôt en boutique.";
  }
  return null;
};

interface SmartTrocFormProps {
  form: TrocDeviceForm;
  onChange: (form: TrocDeviceForm) => void;
  onNext: () => void;
  setBasePrice?: (price: number) => void;
}

// Toggle Oui / Non
const YesNoToggle: React.FC<{
  label: string;
  hint?: string;
  value: boolean;
  yesLabel?: string;
  noLabel?: string;
  onChange: (v: boolean) => void;
}> = ({ label, hint, value, yesLabel = 'Oui', noLabel = 'Non', onChange }) => (
  <div className="flex flex-col gap-1.5">
    <span className={labelClass}>{label}</span>
    {hint && <span className="text-[10px] text-white/50 font-sans -mt-1">{hint}</span>}
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex-1 py-2.5 text-xs font-tech font-bold uppercase tracking-wider transition-all rounded-sm border ${
          value
            ? 'bg-xeption-gold text-black border-xeption-gold'
            : 'bg-transparent text-white/60 border-white/20 hover:border-white/20'
        }`}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 py-2.5 text-xs font-tech font-bold uppercase tracking-wider transition-all rounded-sm border ${
          !value
            ? 'bg-white/10 text-white border-white/20'
            : 'bg-transparent text-white/60 border-white/20 hover:border-white/20'
        }`}
      >
        {noLabel}
      </button>
    </div>
  </div>
);

const inputClass =
  'w-full bg-[#1c1c16]/90 border border-white/20 text-white px-4 py-3 text-sm font-sans placeholder-gray-600 focus:border-xeption-gold/60 focus:bg-black/60 outline-none transition-all rounded-sm';
const selectClass =
  'w-full bg-[#1c1c16]/90 border border-white/20 text-white px-4 py-3 pr-9 text-sm font-sans focus:border-xeption-gold/60 outline-none transition-all rounded-sm appearance-none cursor-pointer';
const labelClass =
  'block text-[10px] font-tech font-bold uppercase tracking-widest text-white/60 mb-1.5';

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, ...props }) => (
  <div className="relative">
    <select {...props} className={selectClass}>
      {children}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
  </div>
);

export const SmartTrocForm: React.FC<SmartTrocFormProps> = ({ form, onChange, onNext, setBasePrice }) => {
  const valid = isFormValid(form);
  const hint = getHint(form);
  const blockerWarning = getBlockerWarning(form);
  const infoNotice = getInfoNotice(form);
  const update = (field: keyof TrocDeviceForm, value: string | number | boolean) =>
    onChange({ ...form, [field]: value });

  const [argusBrands, setArgusBrands] = React.useState<string[]>([]);
  const [argusModels, setArgusModels] = React.useState<TradeInModel[]>([]);
  const [showModelSuggestions, setShowModelSuggestions] = React.useState(false);

  // Charge la liste des marques connues une fois au montage (fusion DB Argus + fallback hardcodé).
  React.useEffect(() => {
    let active = true;
    fetchArgusBrands().then((brands) => {
      if (!active) return;
      // Fusion DB + constants : assure que les marques courantes sont là même si DB vide.
      const merged = new Set<string>(brands);
      for (const b of KNOWN_BRANDS) merged.add(b);
      setArgusBrands(Array.from(merged).sort((a, b) => a.localeCompare(b, 'fr')));
    });
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    let active = true;
    if (form.deviceBrand) {
      fetchArgusModels(form.deviceBrand).then((models) => {
        if (active) setArgusModels(models);
      });
    } else {
      setArgusModels([]);
    }
    return () => { active = false; };
  }, [form.deviceBrand]);

  const handleBrandChange = (value: string) => {
    // Si la marque change, on reset le modèle (le précédent peut ne plus exister chez la nouvelle marque).
    if (value !== form.deviceBrand) {
      onChange({ ...form, deviceBrand: value, deviceModel: '' });
      if (setBasePrice) setBasePrice(0);
    } else {
      onChange({ ...form, deviceBrand: value });
    }
  };

  const handleModelSelect = (m: TradeInModel) => {
    // On garde l'id catalogue → le serveur lit le base_price par id (exact), pas par nom.
    onChange({ ...form, deviceModel: m.model_name, tradeInModelId: m.id });
    setShowModelSuggestions(false);
    if (setBasePrice) setBasePrice(m.base_price);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Saisie manuelle → plus de modèle catalogue → reset id + base price (fallback market intel).
    onChange({ ...form, deviceModel: e.target.value, tradeInModelId: undefined });
    if (setBasePrice) setBasePrice(0);
    setShowModelSuggestions(true);
  };

  const filteredModels = React.useMemo(() => {
    if (!form.deviceModel) return argusModels;
    const lower = form.deviceModel.toLowerCase();
    return argusModels.filter(m => m.model_name.toLowerCase().includes(lower));
  }, [argusModels, form.deviceModel]);

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h2 className="text-xl font-tech font-bold uppercase text-white tracking-wider">Ton appareil</h2>
        <p className="text-xs text-white/60 mt-1 font-sans">Remplis les infos pour lancer le scan visuel IA</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="customerName" className={labelClass}>
            Nom complet
          </label>
          <input
            id="customerName"
            type="text"
            placeholder="Nom du client"
            value={form.customerName}
            onChange={(e) => update('customerName', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="customerPhone" className={labelClass}>
            Téléphone
          </label>
          <input
            id="customerPhone"
            type="tel"
            placeholder="Téléphone (ex: 677123456)"
            value={form.customerPhone}
            onChange={(e) => update('customerPhone', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor="customerEmail" className={labelClass}>
            Email (Optionnel)
          </label>
          <input
            id="customerEmail"
            type="email"
            placeholder="Votre adresse email"
            value={form.customerEmail || ''}
            onChange={(e) => update('customerEmail', e.target.value)}
            className={inputClass}
          />
        </div>
        
        {form.customerEmail && form.customerEmail.trim().length > 0 && (
          <label className="flex items-center gap-3 cursor-pointer group p-3 bg-[#1c1c16]/90 border border-white/20 rounded-sm hover:border-xeption-gold/30 transition-all">
            <div className={`w-5 h-5 border flex items-center justify-center transition-all ${form.createAccount ? 'bg-xeption-gold border-xeption-gold' : 'border-white/20 group-hover:border-xeption-gold/50'}`}>
              {form.createAccount && <div className="w-2.5 h-2.5 bg-black" />}
            </div>
            <input 
              type="checkbox" 
              className="hidden" 
              checked={form.createAccount || false} 
              onChange={(e) => update('createAccount', e.target.checked)}
            />
            <div>
              <p className="text-sm text-white font-sans font-medium">Créer un compte pour sauvegarder mon estimation</p>
              <p className="text-[10px] text-white/60 font-sans mt-0.5">Un lien de connexion magique vous sera envoyé par e-mail.</p>
            </div>
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="deviceBrand" className={labelClass}>
            Marque
          </label>
          <AutocompleteInput
            id="deviceBrand"
            value={form.deviceBrand}
            onChange={handleBrandChange}
            suggestions={argusBrands}
            placeholder="Tapez la marque (ex : Samsung)"
            freeTextHint="Marque non listée — pas de souci, on valide en boutique."
          />
        </div>
        <div className="relative">
          <label htmlFor="deviceModel" className={labelClass}>
            Modèle
          </label>
          <input
            id="deviceModel"
            type="text"
            placeholder="Modèle (ex: Galaxy S22)"
            value={form.deviceModel}
            onChange={handleModelChange}
            onFocus={() => setShowModelSuggestions(true)}
            onBlur={() => setTimeout(() => setShowModelSuggestions(false), 200)}
            className={inputClass}
            autoComplete="off"
          />
          {showModelSuggestions && filteredModels.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-[#1a1a1a] border border-xeption-gold/30 rounded-sm shadow-xl">
              {filteredModels.map(m => (
                <li
                  key={m.id}
                  onMouseDown={(e) => { e.preventDefault(); handleModelSelect(m); }}
                  className="px-4 py-2.5 text-sm text-white/90 hover:bg-xeption-gold/20 hover:text-xeption-gold cursor-pointer transition-colors border-b border-white/5 last:border-0"
                >
                  {m.model_name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="deviceStorage" className={labelClass}>
            Stockage
          </label>
          <SelectField id="deviceStorage" value={form.deviceStorage} onChange={(e) => update('deviceStorage', e.target.value)}>
            <option value="">Stockage</option>
            {STORAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
        </div>
        <div>
          <label htmlFor="deviceRam" className={labelClass}>
            RAM
          </label>
          <SelectField id="deviceRam" value={form.deviceRam} onChange={(e) => update('deviceRam', e.target.value)}>
            <option value="">RAM</option>
            {RAMS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="acquisitionCondition" className={labelClass}>Achat initial</label>
          <SelectField
            id="acquisitionCondition"
            value={form.acquisitionCondition}
            onChange={(e) => update('acquisitionCondition', e.target.value)}
          >
            {ACQUISITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </SelectField>
        </div>
        <div>
          <label htmlFor="purchaseDate" className={labelClass}>Date d&apos;achat</label>
          <input
            id="purchaseDate"
            type="date"
            value={form.purchaseDateUnknown ? '' : form.purchaseDate}
            onChange={(e) => update('purchaseDate', e.target.value)}
            disabled={!!form.purchaseDateUnknown}
            className={`${inputClass} [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-70 disabled:opacity-40`}
            max={new Date().toISOString().slice(0, 10)}
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={!!form.purchaseDateUnknown}
              onChange={(e) => {
                const unknown = e.target.checked;
                onChange({
                  ...form,
                  purchaseDateUnknown: unknown,
                  purchaseDate: unknown ? '' : form.purchaseDate,
                });
              }}
              className="w-4 h-4 rounded border-white/20 bg-[#1c1c16]/90 text-xeption-gold focus:ring-xeption-gold"
            />
            <span className="text-[11px] text-white/70 font-sans group-hover:text-white/80">Je ne sais pas</span>
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="ownershipRank" className={labelClass}>Rang propriétaire (optionnel)</label>
        <SelectField
          id="ownershipRank"
          value={form.ownershipRank}
          onChange={(e) => update('ownershipRank', e.target.value)}
        >
          {OWNERSHIP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </SelectField>
      </div>

      <div>
        <label htmlFor="batteryHealth" className={labelClass}>
          Santé batterie — <span className="text-xeption-gold">{form.batteryHealth}%</span>
        </label>
        <div className="relative">
          <input
            id="batteryHealth"
            type="range"
            min={0}
            max={100}
            value={form.batteryHealth}
            onChange={(e) => update('batteryHealth', Number(e.target.value))}
            className="w-full accent-xeption-gold cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-white/50 font-tech mt-1">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="screenCondition" className={labelClass}>État de l'écran</label>
          <SelectField id="screenCondition" value={form.screenCondition} onChange={(e) => update('screenCondition', e.target.value)}>
            <option value="">État de l'écran</option>
            {SCREEN_CONDITIONS.map((c) => (
              <option key={c} value={c}>{CONDITION_LABELS[c] ?? c}</option>
            ))}
          </SelectField>
        </div>
        <div>
          <label htmlFor="bodyCondition" className={labelClass}>État du boîtier</label>
          <SelectField id="bodyCondition" value={form.bodyCondition} onChange={(e) => update('bodyCondition', e.target.value)}>
            <option value="">État du boîtier</option>
            {BODY_CONDITIONS.map((c) => (
              <option key={c} value={c}>{CONDITION_LABELS[c] ?? c}</option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="cameraCondition" className={labelClass}>Caméra</label>
          <SelectField id="cameraCondition" value={form.cameraCondition} onChange={(e) => update('cameraCondition', e.target.value)}>
            {CAMERA_CONDITIONS.map((c) => (
              <option key={c} value={c}>{CONDITION_LABELS[c] ?? c}</option>
            ))}
          </SelectField>
        </div>
        <div>
          <label htmlFor="previousRepairs" className={labelClass}>Réparations</label>
          <SelectField id="previousRepairs" value={form.previousRepairs} onChange={(e) => update('previousRepairs', e.target.value)}>
            {REPAIR_OPTIONS.map((r) => (
              <option key={r} value={r}>{CONDITION_LABELS[r] ?? r}</option>
            ))}
          </SelectField>
        </div>
      </div>

      {/* État fonctionnel */}
      <div className="flex flex-col gap-3 border border-white/5 rounded-sm p-4">
        <span className={labelClass}>État fonctionnel</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <YesNoToggle
            label="S'allume normalement ?"
            value={form.powersOn}
            onChange={(v) => update('powersOn', v)}
          />
          <YesNoToggle
            label="Se charge normalement ?"
            value={form.chargesNormally}
            onChange={(v) => update('chargesNormally', v)}
          />
          <YesNoToggle
            label="Biométrie fonctionnelle ?"
            hint="Empreinte / Face ID"
            value={form.biometricsWork}
            onChange={(v) => update('biometricsWork', v)}
          />
          <YesNoToggle
            label="Compte Google / iCloud retiré ?"
            value={form.accountUnlocked}
            onChange={(v) => update('accountUnlocked', v)}
          />
          <YesNoToggle
            label="Dégâts d'eau ?"
            value={form.hasWaterDamage}
            yesLabel="Oui"
            noLabel="Non"
            onChange={(v) => update('hasWaterDamage', v)}
          />
        </div>
      </div>

      {/* Accessoires & documents */}
      <div className="flex flex-col gap-3 border border-white/5 rounded-sm p-4">
        <span className={labelClass}>Accessoires & documents</span>
        <div className="grid grid-cols-2 gap-3">
          <YesNoToggle
            label="Boîte d'origine ?"
            value={form.hasOriginalBox}
            onChange={(v) => update('hasOriginalBox', v)}
          />
          <YesNoToggle
            label="Facture d'achat ?"
            value={form.hasInvoice}
            onChange={(v) => update('hasInvoice', v)}
          />
        </div>
      </div>

      {blockerWarning && (
        <div className="flex items-start gap-2 bg-red-950/50 border border-red-800/60 rounded-sm p-3">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-red-300 text-xs font-sans">{blockerWarning}</p>
        </div>
      )}

      {infoNotice && (
        <div className="flex items-start gap-2 bg-amber-950/40 border border-amber-700/40 rounded-sm p-3">
          <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
          <p className="text-amber-200 text-xs font-sans">{infoNotice}</p>
        </div>
      )}

      {hint && <p className="text-xs text-red-400 font-sans text-center">{hint}</p>}

      <button
        onClick={onNext}
        disabled={!valid}
        className="w-full bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-4 text-sm shadow-[0_0_20px_rgba(255,215,0,0.25)] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
      >
        Continuer
      </button>
    </div>
  );
};

