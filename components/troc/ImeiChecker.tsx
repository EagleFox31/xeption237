import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, ShieldX, ArrowRight, Loader2, Info } from 'lucide-react';
import { ImeiHelpModal } from './ImeiHelpModal';

type ImeiStatus = 'not_checked' | 'valid' | 'invalid' | 'check_failed';
type BlacklistStatus = 'unknown' | 'clear' | 'blacklisted';
type ImeiMatchState = 'unknown' | 'match' | 'mismatch' | 'not_verified';
type ImeiDeviceInfo = { brand: string; model: string };

interface ImeiCheckerProps {
  imei: string;
  onChange: (imei: string) => void;
  imeiStatus: ImeiStatus;
  blacklistStatus: BlacklistStatus;
  imeiMatchState?: ImeiMatchState;
  imeiDeviceInfo?: ImeiDeviceInfo | null;
  imeiDeviceSource?: 'provider' | 'historical' | 'declared' | null;
  imeiEvidenceCount?: number;
  expectedBrand?: string;
  expectedModel?: string;
  onCheck: () => void;
  isChecking: boolean;
  onSkip: () => void;
}

export const ImeiChecker: React.FC<ImeiCheckerProps> = ({
  imei,
  onChange,
  imeiStatus,
  blacklistStatus,
  imeiMatchState,
  imeiDeviceInfo,
  imeiDeviceSource: _imeiDeviceSource,
  imeiEvidenceCount: _imeiEvidenceCount,
  expectedBrand,
  expectedModel,
  onCheck,
  isChecking,
  onSkip,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const norm = (value?: string) => (value || '').trim().toLowerCase();

  const hasDetected = Boolean(norm(imeiDeviceInfo?.brand) || norm(imeiDeviceInfo?.model));
  const hasExpected = Boolean(norm(expectedBrand) || norm(expectedModel));
  const brandMatches =
    !norm(expectedBrand) || !norm(imeiDeviceInfo?.brand) || norm(expectedBrand) === norm(imeiDeviceInfo?.brand);
  const modelMatches =
    !norm(expectedModel) || !norm(imeiDeviceInfo?.model) || norm(expectedModel) === norm(imeiDeviceInfo?.model);
  const matchesForm = brandMatches && modelMatches;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h2 className="text-xl font-tech font-bold uppercase text-white tracking-wider">Vérification IMEI</h2>
        <p className="text-xs text-white/60 mt-1 font-sans">Optionnel — garantit que l'appareil n'est pas signalé volé</p>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className="block text-[10px] font-tech font-bold uppercase tracking-widest text-white/60">
            Code IMEI (15 chiffres)
          </label>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1 text-[10px] font-tech uppercase tracking-widest text-xeption-gold/80 hover:text-xeption-gold transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            Comment trouver ?
          </button>
        </div>
        <input
          type="text"
          placeholder="IMEI - ex: 353879234567890"
          value={imei}
          onChange={(e) => onChange(e.target.value)}
          maxLength={15}
          className="w-full bg-[#1c1c16]/90 border border-white/20 text-white px-4 py-3 text-sm font-mono placeholder-gray-600 focus:border-xeption-gold/60 focus:bg-black/60 outline-none transition-all rounded-sm tracking-widest"
        />
        <p className="text-xs text-white mt-2 font-sans">
          Composez <span className="text-xeption-gold font-tech font-bold tracking-widest">*#06#</span> sur l'appareil pour l'obtenir —{' '}
          <span className="text-xeption-gold font-bold">prenez l'IMEI 1</span> (SIM principale)
        </p>
      </div>

      {imeiStatus === 'valid' && (
        <div className="flex items-center gap-3 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-sm">
          <ShieldCheck className="w-5 h-5 text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-tech font-bold text-green-400">
              {blacklistStatus === 'clear' ? 'IMEI vérifié — appareil sain' : 'Format IMEI valide — Appareil identifié.'}
            </p>
            <p className="text-xs text-white/60 mt-0.5 font-sans">
              {blacklistStatus === 'clear' ? 'Aucune alerte détectée sur cet appareil.' : 'La vérification anti-vol sera confirmée en boutique.'}
            </p>
            {hasExpected && (
              <p className="text-xs text-white/80 mt-2 font-sans">
                Appareil déclaré : <span className="text-white font-semibold">{expectedBrand || '—'} {expectedModel || '—'}</span>
              </p>
            )}
            {hasDetected && (
              <p className="text-xs text-white/80 mt-1 font-sans">
                Identifié via IMEI : <span className="text-white font-semibold">{imeiDeviceInfo?.brand || '—'} {imeiDeviceInfo?.model || '—'}</span>
              </p>
            )}
            {!hasDetected && (
              <p className="text-xs text-yellow-300 mt-2 font-sans">
                L'appareil sera identifié lors de la remise en boutique.
              </p>
            )}
            {hasDetected && hasExpected && (
              <p className={`text-xs mt-1 font-sans ${matchesForm ? 'text-green-300' : 'text-yellow-300'}`}>
                {matchesForm
                  ? 'Correspond à l\'appareil déclaré.'
                  : 'Différent de l\'appareil déclaré — confirmation en boutique.'}
              </p>
            )}
            {imeiMatchState === 'not_verified' && (
              <p className="text-xs mt-1 font-sans text-yellow-300">
                L'appareil sera confirmé lors de la remise en boutique.
              </p>
            )}
            {imeiMatchState === 'mismatch' && (
              <p className="text-xs mt-1 font-sans text-red-300">
                L'appareil détecté ne correspond pas à ce que vous avez déclaré — venez en boutique.
              </p>
            )}
          </div>
        </div>
      )}

      {(imeiStatus === 'invalid' || blacklistStatus === 'blacklisted') && (
        <div className="flex items-center gap-3 px-4 py-3 bg-xeption-red/10 border border-xeption-red/30 rounded-sm">
          <ShieldX className="w-5 h-5 text-xeption-red shrink-0" />
          <div>
            <p className="text-sm font-tech font-bold text-xeption-red">
              {imeiStatus === 'invalid' ? 'IMEI Invalide' : 'Appareil signalé volé — troc impossible'}
            </p>
            <p className="text-xs text-white/60 mt-0.5 font-sans">
              {imeiStatus === 'invalid' ? 'Le code IMEI saisi n\'est pas valide.' : 'Cet appareil est signalé comme volé ou perdu.'}
            </p>
          </div>
        </div>
      )}

      {imeiStatus === 'check_failed' && (
        <div className="flex items-center gap-3 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-sm">
          <ShieldAlert className="w-5 h-5 text-yellow-400 shrink-0" />
          <div>
            <p className="text-sm font-tech font-bold text-yellow-400">Vérification indisponible</p>
            <p className="text-xs text-white/60 mt-0.5 font-sans">La confirmation se fera lors de la remise en boutique.</p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCheck}
          disabled={isChecking || imei.length !== 15}
          className="flex-1 flex items-center justify-center gap-2 bg-xeption-gold hover:bg-white text-black font-tech font-bold uppercase tracking-widest py-3 text-sm shadow-[0_0_20px_rgba(255,215,0,0.2)] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Vérification…
            </>
          ) : (
            <>
              Vérifier <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <button
          onClick={onSkip}
          className="px-5 bg-white/5 border border-white/20 hover:border-white/30 hover:bg-white/10 text-white/70 hover:text-white font-tech font-bold uppercase tracking-widest text-sm transition-all rounded-sm"
        >
          Passer
        </button>
      </div>

      <ImeiHelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
};
