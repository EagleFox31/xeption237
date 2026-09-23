import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Info, ChevronUp, ChevronDown, Loader2, CheckCircle, XCircle, Smartphone } from 'lucide-react';
import type { TradeInRequest, TrocEvaluationResult } from '../types';
import { supabase } from '../services/supabaseClient';

type PayState = 'idle' | 'initiating' | 'polling' | 'paid' | 'failed' | 'expired' | 'timeout';

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS  = 5 * 60 * 1_000;

interface LocationState {
  request?: TradeInRequest;
  result?: TrocEvaluationResult | null;
  sellMax?: number;
  marketplaceMax?: number;
}

const formatF = (amount: number): string =>
  new Intl.NumberFormat('fr-FR').format(Math.max(0, Math.round(amount)));

const round5k = (n: number) => Math.round(n / 5000) * 5000;

const listingFee = (priceMax: number): number => {
  if (priceMax < 100_000) return 100;
  if (priceMax < 200_000) return 200;
  if (priceMax < 500_000) return 500;
  return 1000;
};

const parseAmount = (raw: string): number => {
  const n = parseInt(raw.replace(/\D/g, ''), 10);
  return isNaN(n) ? 0 : n;
};

const formatPrice = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return new Intl.NumberFormat('fr-FR').format(parseInt(digits, 10));
};

const specMultiplier = (storageGb: number, ramGb: number): number => {
  let s = 1;
  if (storageGb >= 1000) s = 1.35;
  else if (storageGb >= 512) s = 1.25;
  else if (storageGb >= 256) s = 1.15;
  else if (storageGb >= 128) s = 1.08;

  let r = 1;
  if (ramGb >= 16) r = 1.12;
  else if (ramGb >= 12) r = 1.08;
  else if (ramGb >= 8) r = 1.05;
  else if (ramGb >= 6) r = 1.03;

  return s * r;
};

const GbInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: number;
}> = ({ label, value, onChange, placeholder = '0', step = 1 }) => {
  const num = parseInt(value) || 0;
  const dec = () => onChange(String(Math.max(0, num - step)));
  const inc = () => onChange(String(num + step));
  return (
    <div className="flex-1 min-w-0">
      <div className="text-zinc-300 text-[11px] font-tech uppercase tracking-wider mb-1.5 truncate">{label}</div>
      <div className="flex items-center bg-[#171720] border border-white/15 rounded-xl overflow-hidden focus-within:border-amber-400/50 transition-colors">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent pl-3 pr-1 py-3 text-white font-tech text-[14px] placeholder:text-zinc-600 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
        />
        <div className="flex flex-col border-l border-white/10 shrink-0">
          <button
            type="button"
            onClick={inc}
            className="px-2.5 py-1.5 text-zinc-400 active:text-white active:bg-white/10 border-b border-white/10 transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={dec}
            className="px-2.5 py-1.5 text-zinc-400 active:text-white active:bg-white/10 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ACCESSORIES = [
  { key: 'charger', label: 'Chargeur' },
  { key: 'box', label: 'Boîte d\'origine' },
  { key: 'screen', label: 'Écran parfait' },
  { key: 'battery', label: 'Batterie > 80 %' },
];

export const MarketplacePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as LocationState) || {};

  const request = state.request;
  const result = state.result;

  const creditValue =
    result?.tradeInValueCredit || result?.tradeInValue || request?.trade_in_value || 0;

  const baseMin = state.sellMax ?? round5k(creditValue * 0.9);
  const baseMax = state.marketplaceMax ?? round5k(creditValue * 1.15);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [minRaw, setMinRaw] = useState(baseMin > 0 ? formatPrice(String(baseMin)) : '');
  const [maxRaw, setMaxRaw] = useState(baseMax > 0 ? formatPrice(String(baseMax)) : '');
  const [phone, setPhone] = useState('');
  const [payPhone, setPayPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [storageRaw, setStorageRaw] = useState('');
  const [ramRaw, setRamRaw] = useState('');
  const [accessories, setAccessories] = useState<string[]>([]);

  const [payState, setPayState]   = useState<PayState>('idle');
  const [payRef, setPayRef]       = useState<string | null>(null);
  const [payError, setPayError]   = useState<string | null>(null);

  const minEdited = useRef(false);
  const maxEdited = useRef(false);
  const pollTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStart  = useRef<number>(0);

  useEffect(() => {
    document.body.classList.add('hide-mobile-bottom-nav');
    return () => document.body.classList.remove('hide-mobile-bottom-nav');
  }, []);

  // Auto-ajustement des prix quand RAM/Stockage changent
  useEffect(() => {
    const storageGb = parseInt(storageRaw) || 0;
    const ramGb = parseInt(ramRaw) || 0;
    if (storageGb <= 0 && ramGb <= 0) return;
    if (baseMin <= 0 && baseMax <= 0) return;

    const mult = specMultiplier(storageGb, ramGb);
    if (!minEdited.current && baseMin > 0) setMinRaw(formatPrice(String(round5k(baseMin * mult))));
    if (!maxEdited.current && baseMax > 0) setMaxRaw(formatPrice(String(round5k(baseMax * mult))));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageRaw, ramRaw]);

  const toggleAccessory = (key: string) => {
    setAccessories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const minVal = parseAmount(minRaw);
  const maxVal = parseAmount(maxRaw);

  const fee = useMemo(() => {
    const base = maxVal > 0 ? maxVal : minVal;
    if (base <= 0) return 0;
    return listingFee(base);
  }, [minVal, maxVal]);

  const isValid = minVal > 0 && maxVal >= minVal;

  const deviceBrand = request?.device_brand || 'Smartphone';
  const deviceModel = request?.device_model || '';
  const deviceLabel = deviceModel.toLowerCase().startsWith(deviceBrand.toLowerCase())
    ? deviceModel
    : `${deviceBrand} ${deviceModel}`.trim();
  const grade = (result?.tradeInGrade || request?.trade_in_grade || 'A').toUpperCase();
  const imeiLabel = request?.imei_status === 'valid' ? 'IMEI Garanti' : 'IMEI Vérifié';


  const insertListing = useCallback(async () => {
    setSubmitting(true);
    const { error } = await supabase.from('marketplace_listings').insert({
      device_brand:  deviceBrand,
      device_model:  deviceModel || deviceBrand,
      grade,
      imei_status:   request?.imei_status ?? null,
      ram_gb:        parseInt(ramRaw) || null,
      storage_gb:    parseInt(storageRaw) || null,
      accessories,
      price_min:     minVal,
      price_max:     maxVal,
      troc_ref:      request?.id ?? null,
      seller_phone:  phone.trim() || null,
      photo_urls:    request?.photo_urls ?? [],
    });
    setSubmitting(false);
    if (error) {
      console.error('[Marketplace] insert error:', error.message);
      setPayError(error.message);
      return;
    }
    navigate('/marketplace');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceBrand, deviceModel, grade, ramRaw, storageRaw, accessories, minVal, maxVal, phone]);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
  }, []);

  const pollStatus = useCallback(async (ref: string) => {
    if (Date.now() - pollStart.current > POLL_TIMEOUT_MS) {
      stopPolling();
      setPayState('timeout');
      return;
    }
    try {
      const { data } = await supabase.functions.invoke('get-payment-status', {
        body: { reference: ref },
      });
      const status: string = data?.status ?? 'pending';
      if (status === 'paid') {
        stopPolling();
        setPayState('paid');
        await insertListing();
      } else if (status === 'failed') {
        stopPolling();
        setPayState('failed');
      } else if (status === 'expired') {
        stopPolling();
        setPayState('expired');
      }
    } catch { /* réseau — on réessaie au prochain tick */ }
  }, [stopPolling, insertListing]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handlePay = async () => {
    const digits = payPhone.replace(/\D/g, '').replace(/^237/, '');
    if (!/^[62]\d{8}$/.test(digits)) {
      setPayError('Numéro invalide (ex : 6XX XXX XXX)');
      return;
    }
    setPayError(null);
    setPayState('initiating');
    try {
      const { data, error } = await supabase.functions.invoke('create-marketplace-payment', {
        body: { phone: payPhone, priceMax: maxVal },
      });
      if (error || data?.error) {
        setPayState('failed');
        setPayError(data?.error ?? error?.message ?? 'Erreur paiement');
        return;
      }
      const ref: string = data.reference;
      setPayRef(ref);
      setPayState('polling');
      pollStart.current = Date.now();
      pollTimer.current = setInterval(() => pollStatus(ref), POLL_INTERVAL_MS);
    } catch (err: any) {
      setPayState('failed');
      setPayError(err?.message ?? 'Erreur inconnue');
    }
  };

  const handleList = () => {
    if (!isValid) return;
    setPayPhone(phone.trim());
    setPayState('idle');
    setPayError(null);
    setStep(3);
  };

  const specsSummary = [
    ramRaw ? `${ramRaw} Go RAM` : '',
    storageRaw ? `${storageRaw} Go` : '',
    ...accessories.map((k) => ACCESSORIES.find((a) => a.key === k)?.label ?? ''),
  ].filter(Boolean).join(' · ');

  return (
    <div className="w-full min-h-[calc(100dvh-132px)] flex flex-col px-4 pt-2 pb-32 relative overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

      <div className="absolute -top-16 -right-16 w-72 h-72 bg-gradient-to-bl from-amber-400/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Retour */}
      {payState !== 'polling' && payState !== 'paid' && (
        <button
          type="button"
          onClick={() => step === 2 ? setStep(1) : step === 3 ? setStep(2) : navigate(-1)}
          className="flex items-center gap-1.5 text-zinc-200 hover:text-white text-[11px] font-tech transition-colors mb-2 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {step === 2 ? 'Modifier les caractéristiques' : step === 3 ? 'Modifier le prix' : 'Retour au bon de vente'}
        </button>
      )}

      {/* Titre + indicateur étape */}
      <div className="text-center pt-1 pb-3 shrink-0">
        <h1 className="text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ffe680] via-[#f5bf26] to-[#d99706] tracking-tight leading-tight">
          Marketplace Xeption
        </h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className={`h-1 w-10 rounded-full transition-all ${step >= 1 ? 'bg-amber-400' : 'bg-white/20'}`} />
          <div className={`h-1 w-10 rounded-full transition-all ${step >= 2 ? 'bg-amber-400' : 'bg-white/20'}`} />
          <div className={`h-1 w-10 rounded-full transition-all ${step >= 3 ? 'bg-amber-400' : 'bg-white/20'}`} />
        </div>
      </div>

      {/* ── ÉTAPE 1 : Caractéristiques ── */}
      {step === 1 && (
        <div className="rounded-2xl bg-[#0f0f13] border border-white/10 px-4 py-3 space-y-3">
          <div className="pb-2.5 border-b border-white/8">
            <div className="text-zinc-400 text-[9px] font-tech uppercase tracking-widest mb-0.5">Ton appareil</div>
            <div className="text-white font-tech font-bold text-[13px] leading-snug">{deviceLabel}</div>
            <div className="text-zinc-300 text-[11px] font-sans">Grade {grade} · {imeiLabel}</div>
          </div>

          <div className="flex gap-3">
            <GbInput label="RAM (Go)" value={ramRaw} onChange={setRamRaw} placeholder="8" step={2} />
            <GbInput label="Stockage (Go)" value={storageRaw} onChange={setStorageRaw} placeholder="128" step={64} />
          </div>

          <div>
            <div className="text-zinc-300 text-[11px] font-tech uppercase tracking-wider mb-2">État &amp; accessoires</div>
            <div className="grid grid-cols-2 gap-2">
              {ACCESSORIES.map((acc) => {
                const active = accessories.includes(acc.key);
                return (
                  <button
                    key={acc.key}
                    type="button"
                    onClick={() => toggleAccessory(acc.key)}
                    className={`py-2 px-3 rounded-xl text-[11px] font-tech font-bold border transition-all text-left ${
                      active ? 'bg-amber-400/15 border-amber-400/50 text-amber-300' : 'bg-white/5 border-white/10 text-zinc-400'
                    }`}
                  >
                    <span className={`inline-block w-3.5 ${active ? 'text-amber-400' : 'text-zinc-600'}`}>
                      {active ? '✓' : '○'}
                    </span>{' '}
                    {acc.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-0.5 border-t border-white/8">
            <label className="block text-zinc-300 text-[11px] font-tech uppercase tracking-wider mb-1.5">
              Ton numéro WhatsApp (facultatif)
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="ex : 6XX XXX XXX"
              className="w-full bg-[#171720] border border-white/15 rounded-xl px-3 py-2.5 text-white font-tech text-[13px] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 transition-colors"
            />
            <p className="mt-1 text-[9px] text-zinc-500 font-sans">
              Xeption te contacte quand un acheteur est trouvé.
            </p>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 : Prix ── */}
      {step === 2 && (
        <div className="space-y-3">
          {/* Récap compact step 1 */}
          <div className="rounded-2xl bg-[#0f0f13] border border-white/10 px-4 py-3">
            <div className="text-zinc-400 text-[9px] font-tech uppercase tracking-widest mb-0.5">Ton appareil</div>
            <div className="text-white font-tech font-bold text-[13px]">{deviceLabel}</div>
            {specsSummary && (
              <div className="text-zinc-300 text-[11px] font-sans mt-0.5">{specsSummary}</div>
            )}
          </div>

          {/* Inputs prix */}
          <div className="rounded-2xl bg-[#0f0f13] border border-white/10 px-4 py-3 space-y-3">
            <div>
              <label className="block text-zinc-300 text-[11px] font-tech uppercase tracking-wider mb-1.5">
                Prix min. que tu peux accepter (FCFA)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={minRaw}
                onChange={(e) => { minEdited.current = true; setMinRaw(formatPrice(e.target.value)); }}
                placeholder="ex : 150 000"
                className="w-full bg-[#171720] border border-white/15 rounded-xl px-3 py-2.5 text-white font-tech text-[13px] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-zinc-300 text-[11px] font-tech uppercase tracking-wider mb-1.5">
                Prix idéal (FCFA)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={maxRaw}
                onChange={(e) => { maxEdited.current = true; setMaxRaw(formatPrice(e.target.value)); }}
                placeholder="ex : 200 000"
                className="w-full bg-[#171720] border border-white/15 rounded-xl px-3 py-2.5 text-white font-tech text-[13px] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 transition-colors"
              />
              {minVal > 0 && maxVal > 0 && maxVal < minVal && (
                <p className="mt-1 text-[10px] text-red-400 font-sans">
                  Le prix idéal doit être ≥ au minimum.
                </p>
              )}
            </div>
          </div>

          {/* Frais de publication */}
          {fee > 0 && (
            <div className="rounded-2xl bg-amber-400/8 border border-amber-400/25 px-4 py-3">
              <div className="text-amber-300 text-[10px] font-tech uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Frais de publication
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-300 text-[11px] font-sans">Payé une seule fois</span>
                <span className="text-amber-300 font-tech font-black text-[15px]">
                  {formatF(fee)} XAF
                </span>
              </div>
              <div className="mt-1.5 text-[10px] text-zinc-500 font-sans">
                Zéro commission à la vente. Tu gardes 100 % du prix négocié.
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-amber-400/8 border border-amber-400/25 px-3 py-2.5 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span className="text-[11px] text-amber-200/80 font-sans leading-snug">
              Tu gardes ton appareil jusqu'à la transaction avec l'acheteur.
            </span>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 3 : Paiement frais de publication ── */}
      {step === 3 && (
        <div className="space-y-3">
          {/* Récap compact */}
          <div className="rounded-2xl bg-[#0f0f13] border border-white/10 px-4 py-3 flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-zinc-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-white font-tech font-bold text-[13px] truncate">{deviceLabel}</div>
              <div className="text-amber-300 font-tech font-black text-[12px]">
                {formatF(minVal)} – {formatF(maxVal)} F
              </div>
            </div>
          </div>

          {/* Paiement */}
          {(payState === 'idle' || payState === 'failed' || payState === 'expired' || payState === 'timeout') && (
            <div className="rounded-2xl bg-[#0f0f13] border border-white/10 px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 text-[12px] font-tech">Frais de publication</span>
                <span className="text-white font-tech font-black text-[15px]">{formatF(fee)} XAF</span>
              </div>
              <div>
                <label className="block text-zinc-300 text-[11px] font-tech uppercase tracking-wider mb-1.5">
                  Numéro Mobile Money (MTN / Orange)
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value)}
                  placeholder="ex : 6XX XXX XXX"
                  className="w-full bg-[#171720] border border-white/15 rounded-xl px-3 py-2.5 text-white font-tech text-[13px] placeholder:text-zinc-600 focus:outline-none focus:border-amber-400/50 transition-colors"
                />
              </div>
              {(payState === 'failed' || payState === 'expired' || payState === 'timeout') && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25">
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-red-300 font-sans">
                    {payState === 'timeout' ? 'Délai dépassé. Réessaie.' : payState === 'expired' ? 'Paiement expiré. Réessaie.' : (payError ?? 'Paiement échoué. Réessaie.')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* En attente USSD */}
          {(payState === 'initiating' || payState === 'polling') && (
            <div className="rounded-2xl bg-[#0f0f13] border border-white/10 px-4 py-8 flex flex-col items-center gap-3 text-center">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <div className="text-white font-tech font-bold text-[13px]">Confirme sur ton téléphone</div>
              <div className="text-zinc-400 text-[11px] font-sans max-w-[200px] leading-relaxed">
                Un message USSD va apparaître sur <span className="text-white font-tech">{payPhone}</span>. Accepte le paiement de {formatF(fee)} XAF.
              </div>
            </div>
          )}

          {/* Succès */}
          {payState === 'paid' && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-8 flex flex-col items-center gap-3 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <div className="text-white font-tech font-bold text-[13px]">Paiement confirmé</div>
              <div className="text-zinc-400 text-[11px] font-sans">Publication en cours…</div>
            </div>
          )}
        </div>
      )}

      {/* Barre fixe bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0d]/95 backdrop-blur-xl border-t border-white/10 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.9)]">
        {step === 1 && (
          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-black font-tech font-black text-[13px] uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(251,191,36,0.3)]"
          >
            Choisir mon prix
            <ArrowLeft className="w-4 h-4 rotate-180 shrink-0" />
          </button>
        )}
        {step === 2 && (
          <button
            type="button"
            onClick={handleList}
            disabled={!isValid}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 disabled:from-zinc-700 disabled:via-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-black font-tech font-black text-[13px] uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(251,191,36,0.3)] disabled:shadow-none"
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            Payer et publier
          </button>
        )}
        {step === 3 && (payState === 'idle' || payState === 'failed' || payState === 'expired' || payState === 'timeout') && (
          <button
            type="button"
            onClick={handlePay}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-black font-tech font-black text-[13px] uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(251,191,36,0.3)]"
          >
            Payer {formatF(fee)} XAF par Mobile Money
          </button>
        )}
        {step === 3 && (payState === 'initiating' || payState === 'polling') && (
          <div className="w-full py-4 rounded-2xl bg-zinc-800 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span className="text-zinc-400 font-tech text-[12px]">En attente de confirmation…</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketplacePage;
