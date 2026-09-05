import React, { useState } from 'react';
import { KeyRound, Loader2, ShieldCheck, X, AlertTriangle } from 'lucide-react';
import { changeOwnPassword, describePasswordWeakness } from '../../../services/staffSecurity';

/**
 * Changement de mot de passe par le membre lui-même.
 *
 * Jusqu'ici, la seule façon d'y arriver était de suivre un lien reçu par email.
 * Deux des quatre comptes staff sont sur un domaine sans enregistrement MX :
 * ces personnes ne pouvaient jamais changer le mot de passe qu'on leur avait
 * attribué. C'est ce trou que cet écran ferme.
 *
 * La direction est prévenue de chaque changement (journal `security_events`).
 * C'est dit à l'écran : un contrôle qu'on découvre après coup est vécu comme
 * une surveillance, un contrôle annoncé est une règle.
 */

interface ChangePasswordModalProps {
  onClose: () => void;
  onDone?: (message: string) => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose, onDone }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weakness = password ? describePasswordWeakness(password) : null;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = !weakness && !mismatch && confirm.length > 0 && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const result = await changeOwnPassword(password);
      onDone?.(
        result.auditWarning
          ? 'Mot de passe changé. La direction n’a pas pu être notifiée — signale-le.'
          : 'Mot de passe changé. La direction en a été informée.',
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Changement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-black/40 border border-white/15 text-white px-4 py-3 text-sm rounded-sm ' +
    'placeholder-white/40 focus:border-xeption-gold/60 outline-none transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-lg border border-white/15 bg-[#12120e] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-xeption-gold" />
            <h2 className="font-tech text-sm font-bold uppercase tracking-widest text-white">
              Changer mon mot de passe
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-2 rounded-sm border border-xeption-gold/25 bg-xeption-gold/[0.06] px-3 py-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-xeption-gold" />
            <p className="text-xs text-white/80">
              La direction est prévenue de chaque changement de mot de passe. Ton nouveau mot de
              passe, lui, n’est visible par personne.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-tech uppercase tracking-widest text-white/70">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="8 caractères minimum"
            />
            {weakness && <p className="mt-1.5 text-xs text-amber-300">{weakness}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-tech uppercase tracking-widest text-white/70">
              Confirme
            </label>
            <input
              type="password"
              className={inputCls}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="Retape-le"
            />
            {mismatch && <p className="mt-1.5 text-xs text-red-300">Les deux ne correspondent pas.</p>}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-sm border border-red-400/40 bg-red-500/10 px-3 py-2.5 text-xs text-red-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-xeption-gold py-3 text-xs
                       font-tech font-bold uppercase tracking-widest text-black transition-colors
                       hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
